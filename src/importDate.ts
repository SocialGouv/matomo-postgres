import { formatISO } from 'date-fns'
import startDebug from 'debug'
import { sql } from 'kysely'
import pAll from 'p-all'

import { Visit, Visits } from '../types/matomo-api'
import { DESTINATION_TABLE, MATOMO_SITE, RESULTPERPAGE } from './config.js'
import { db, pool } from './db.js'
import { getEventsFromMatomoVisit, importEvent } from './importEvent.js'

const debug = startDebug('importDate')

export type ImportDateResult = {
  /** ISO yyyy-mm-dd */
  date: string
  pages: number
  visitsFetched: number
  eventsImported: number
}

/** return date as ISO yyyy-mm-dd */
const isoDate = (date: Date) => formatISO(date, { representation: 'date' })

/** check how many visits complete for a given date */
const getRecordsCount = async (date: string): Promise<number> => {
  if (!pool || typeof pool.connect !== 'function') {
    throw new Error(
      'Database connection pool is invalid or undefined in getRecordsCount'
    )
  }

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
): Promise<ImportDateResult> => {
  const limit = parseInt(RESULTPERPAGE)
  // Guard against misconfiguration that can cause infinite pagination loops
  // (e.g. limit=NaN makes `visits.length < limit` always false).
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error(
      `Invalid RESULTPERPAGE: expected a positive integer, got '${RESULTPERPAGE}'`
    )
  }

  const dateIso = isoDate(date)
  let offset = filterOffset || (await getRecordsCount(dateIso))
  if (!Number.isFinite(offset) || offset < 0) {
    offset = 0
  }

  let pages = 0
  let visitsFetched = 0
  let eventsImported = 0

  while (true) {
    pages += 1
    if (!offset) {
      debug(`${dateIso}: load ${limit} visits`)
    } else {
      debug(`${dateIso}: load ${limit} more visits after ${offset}`)
    }

    // fetch visits details
    const visits: Visits = await new Promise((resolve, reject) =>
      piwikApi(
        {
          method: 'Live.getLastVisitsDetails',
          period: 'day',
          date: dateIso,
          // minTimestamp: isoDate(new Date()) === isoDate(date) ? date.getTime() / 1000 : undefined, // if today, dont go further (??)
          filter_limit: limit,
          filter_offset: offset,
          filter_sort_order: 'asc',
          idSite: MATOMO_SITE
        },
        (err: Error, visits: Visit[] = []) => {
          if (err) {
            return reject(err)
          }
          return resolve(visits)
        }
      )
    )

    visitsFetched += visits.length
    debug(`fetched ${visits.length} visits`)

    // flatten all events
    const allEvents = visits.flatMap(getEventsFromMatomoVisit)

    if (allEvents.length) {
      debug(`import ${allEvents.length} events`)

      // import events into PG
      await pAll(
        allEvents.map((event: any) => () => importEvent(event)),
        { concurrency: 10, stopOnError: true }
      )

      eventsImported += allEvents.length
    } else {
      debug(`no events to import on this page (${dateIso}, offset ${offset})`)
    }

    // stop if we didn't fetch a full page
    if (visits.length < limit) {
      break
    }

    offset += limit
  }

  debug(
    `finished importing ${dateIso}, pages ${pages}, visits ${visitsFetched}`
  )

  return {
    date: dateIso,
    pages,
    visitsFetched,
    eventsImported
  }
}
