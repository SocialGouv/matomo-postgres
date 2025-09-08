import { eachDayOfInterval } from 'date-fns'
import startDebug from 'debug'
import { Kysely, sql } from 'kysely'
import pAll from 'p-all'

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
  //  - last event in the table
  //  - optional env.STARTDATE
  //  - today

  let referenceDate
  if (!referenceDate && date) {
    referenceDate = new Date(date)
    console.log(
      `✅ Using provided date parameter: ${referenceDate.toISOString()}`
    )
  }

  if (!referenceDate) {
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
  const dates = eachDayOfInterval({
    start: referenceDate,
    end: endDate
  })

  console.log(`📊 Import date range determined:`)
  console.log(`  - Start date: ${dates[0].toISOString()}`)
  console.log(`  - End date: ${endDate.toISOString()}`)
  console.log(`  - Total days to process: ${dates.length}`)

  debug(`import starting at : ${dates[0].toISOString()}`)

  console.log(`🔄 Starting sequential import for each date...`)

  // for each date, serial-import data
  const res = await pAll(
    dates.map((date, index) => () => {
      console.log(
        `📅 Processing date ${index + 1}/${dates.length}: ${date.toISOString().split('T')[0]}`
      )
      return importDate(piwik.api.bind(piwik), date)
    }),
    { concurrency: 1, stopOnError: true }
  )

  const totalEvents = res.flat().length
  console.log(`✅ Import process completed`)
  console.log(`📈 Summary:`)
  console.log(`  - Days processed: ${dates.length}`)
  console.log(`  - Total events imported: ${totalEvents}`)

  debug('close')

  return res
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
