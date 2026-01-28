import { addDays } from 'date-fns'
import startDebug from 'debug'
import { Kysely, sql } from 'kysely'

import {
  DESTINATION_TABLE,
  INITIAL_OFFSET,
  MATOMO_KEY,
  MATOMO_SITE,
  MATOMO_URL
} from './config.js'
import { Database, db } from './db.js'
import { importDate } from './importDate.js'
import PiwikClient from './PiwikClient.js'

const debug = startDebug('index')

async function run(date?: string) {
  console.log(`🚀 Starting data import process`)
  debug('run, date=' + date)

  console.log(`🔗 Initializing Matomo client`)
  console.log(`  - Matomo URL: ${MATOMO_URL}`)
  console.log(`  - Matomo Site ID: ${MATOMO_SITE}`)
  const piwik = new PiwikClient(MATOMO_URL, MATOMO_KEY)

  console.log(`📅 Determining reference date for import...`)

  // priority:
  //  - optional parameter date
  //  - STARTDATE (if FORCE_STARTDATE is true)
  //  - last event in the table
  //  - STARTDATE (if FORCE_STARTDATE is false)
  //  - today

  let referenceDate
  if (!referenceDate && date) {
    referenceDate = new Date(date)
    console.log(
      `✅ Using provided date parameter: ${referenceDate.toISOString()}`
    )
  }

  // Check FORCE_STARTDATE mode first
  const forceStartDate = process.env.FORCE_STARTDATE === 'true'
  if (!referenceDate && forceStartDate && process.env.STARTDATE) {
    referenceDate = new Date(process.env.STARTDATE)
    console.log(
      `✅ FORCE_STARTDATE enabled - Using STARTDATE environment variable: ${referenceDate.toISOString()}`
    )
  }

  // Only query database if not forcing STARTDATE
  if (!referenceDate && !forceStartDate) {
    console.log(`🔍 Looking for last event in database...`)
    referenceDate = await findLastEventInMatomo(db)
    if (referenceDate) {
      console.log(
        `✅ Found last event, starting from: ${referenceDate.toISOString()}`
      )
    } else {
      console.log(`ℹ️ No previous events found in database`)
    }
  }

  // Fallback to STARTDATE if database had no results
  if (!referenceDate && process.env.STARTDATE) {
    referenceDate = new Date(process.env.STARTDATE)
    console.log(
      `✅ Using STARTDATE environment variable: ${referenceDate.toISOString()}`
    )
  }

  if (!referenceDate) {
    referenceDate = new Date(
      new Date().getTime() - +INITIAL_OFFSET * 24 * 60 * 60 * 1000
    )
    console.log(
      `✅ Using default offset (${INITIAL_OFFSET} days ago): ${referenceDate.toISOString()}`
    )
  }

  const endDate = new Date(new Date().getTime() + 24 * 60 * 60 * 1000)

  console.log(`📊 Import date range determined:`)
  console.log(`  - Start date: ${referenceDate.toISOString()}`)
  console.log(`  - End date: ${endDate.toISOString()}`)

  debug(`import starting at : ${referenceDate.toISOString()}`)

  console.log(`🔄 Starting sequential import for each date...`)

  let daysProcessed = 0
  let totalEventsImported = 0

  for (
    let current = new Date(referenceDate);
    current <= endDate;
    current = addDays(current, 1)
  ) {
    daysProcessed += 1
    const dayIso = current.toISOString().split('T')[0]
    console.log(`📅 Processing day ${daysProcessed}: ${dayIso}`)

    const result = await importDate(piwik.api.bind(piwik), current)
    totalEventsImported += result.eventsImported

    console.log(
      `✅ Finished ${dayIso}: pages=${result.pages} visits=${result.visitsFetched} events=${result.eventsImported}`
    )
  }

  console.log(`✅ Import process completed`)
  console.log(`📈 Summary:`)
  console.log(`  - Days processed: ${daysProcessed}`)
  console.log(`  - Total events imported: ${totalEventsImported}`)

  debug('close')

  return {
    daysProcessed,
    eventsImportedTotal: totalEventsImported
  }
}

async function findLastEventInMatomo(db: Kysely<Database>) {
  const latest = await db
    .selectFrom(DESTINATION_TABLE)
    .select(
      sql<string>`action_timestamp at time zone 'UTC'`.as('action_timestamp')
    )
    .orderBy('action_timestamp', 'desc')
    .limit(1)
    .executeTakeFirst()

  if (latest) {
    // check from the day before just to be sure we have all events
    const date = new Date(
      new Date(latest.action_timestamp).getTime() - 2 * 24 * 60 * 60 * 1000
    )

    return date
  }

  return null
}

export default run
