import formatISO from 'date-fns/formatISO'
import startDebug from 'debug'
import { sql } from 'kysely'
import pAll from 'p-all'

import { Visit, Visits } from '../types/matomo-api'
import { DESTINATION_TABLE, MATOMO_SITE, RESULTPERPAGE } from './config'
import { db } from './db'
import { getEventsFromMatomoVisit, importEvent } from './importEvent'

const debug = startDebug('importDate')

/** return date as ISO yyyy-mm-dd */
const isoDate = (date: Date) => formatISO(date, { representation: 'date' })

/** check how many visits complete for a given date */
const getRecordsCount = async (date: string): Promise<number> => {
  const result = await db
    .selectFrom(DESTINATION_TABLE)
    .select(db.fn.count<string>('idvisit').distinct().as('count'))
    // UTC to be iso with matomo matomo data
    .where(sql`date(timezone('UTC', action_timestamp))`, '=', date)
    .executeTakeFirst()
  // start at previous visit in case action didnt finished to record
  const count = Math.max(0, (result && parseInt(result.count) - 1) || 0)
  return count
}

/** import all event from givent date */
export const importDate = async (
  piwikApi: any,
  date: Date,
  filterOffset = 0
): Promise<any> => {
  const limit = parseInt(RESULTPERPAGE)
  const offset = filterOffset || (await getRecordsCount(isoDate(date)))
  if (!offset) {
    debug(`${isoDate(date)}: load ${limit} visits`)
  } else {
    debug(`${isoDate(date)}: load ${limit} more visits after ${offset}`)
  }

  // fetch visits details
  const visits: Visits = await new Promise((resolve) =>
    piwikApi(
      {
        method: 'Live.getLastVisitsDetails',
        period: 'day',
        date: isoDate(date),
        // minTimestamp: isoDate(new Date()) === isoDate(date) ? date.getTime() / 1000 : undefined, // if today, dont go further (??)
        filter_limit: limit,
        filter_offset: offset,
        filter_sort_order: 'asc',
        idSite: MATOMO_SITE
      },
      (err: Error, visits: Visit[] = []) => {
        if (err) {
          console.error('err', err)
          resolve([])
        }
        return resolve(visits)
      }
    )
  )

  debug(`fetched ${visits.length} visits`)

  // flatten all events
  const eventsFromVisits = visits.flatMap(getEventsFromMatomoVisit)

  const allEvents = eventsFromVisits.filter((_event) => {
    return true
  })

  if (!allEvents.length) {
    debug(`no more valid events after ${isoDate(date)}`)
    return []
  }

  debug(`import ${allEvents.length} events`)

  // serial-import events into PG
  const importedEvents = await pAll(
    allEvents.map((event: any) => () => importEvent(event)),
    { concurrency: 10, stopOnError: true }
  )

  // continue to next page if necessary
  if (visits.length === limit) {
    const nextOffset = offset + limit
    const nextEvents = await importDate(piwikApi, date, nextOffset)
    return [...importedEvents, ...(nextEvents || [])]
  }

  debug(`finished importing ${isoDate(date)}, offset ${offset}`)

  return importedEvents || []
}

module.exports = { importDate }
