import { sql } from 'kysely'
import { ActionDetail, Visit } from 'types/matomo-api'

import { DESTINATION_TABLE, PARTITIONED_MATOMO_TABLE_NAME } from './config.js'
import { db, pool } from './db.js'

const MATOMO_INSERT_COLUMNS = [
  'action_id',
  'action_timestamp',
  'idsite',
  'idvisit',
  'actions',
  'country',
  'region',
  'city',
  'operatingsystemname',
  'devicemodel',
  'devicebrand',
  'visitduration',
  'dayssincefirstvisit',
  'visitortype',
  'sitename',
  'userid',
  'serverdateprettyfirstaction',
  'action_type',
  'action_eventcategory',
  'action_eventaction',
  'action_eventname',
  'action_eventvalue',
  'action_timespent',
  'usercustomproperties',
  'usercustomdimensions',
  'dimension1',
  'dimension2',
  'dimension3',
  'dimension4',
  'dimension5',
  'dimension6',
  'dimension7',
  'dimension8',
  'dimension9',
  'dimension10',
  'action_url',
  'sitesearchkeyword',
  'action_title',
  'visitorid',
  'referrertype',
  'referrername',
  'resolution'
] as const

const MATOMO_INSERT_COLUMN_SQL = sql.join(
  MATOMO_INSERT_COLUMNS.map((column) => sql.id(column)),
  sql`,\n`
)

/**
 *
 * @param {Client} client
 * @param {import("types").Event} event
 *
 * @return {Promise<void>}
 */
export const importEvent = async (event: MatomoActionDetail): Promise<void> => {
  // Build a sanitized, typed data object to reduce drift and ensure defaults in one place
  const eventData = {
    action_id: event.action_id ?? '',
    action_timestamp: event.action_timestamp
      ? new Date(event.action_timestamp)
      : new Date(),
    idsite: event.idsite ?? '',
    idvisit: event.idvisit ?? '',
    actions: event.actions ?? null,
    country: event.country ?? null,
    region: event.region ?? null,
    city: event.city ?? null,
    operatingsystemname: event.operatingsystemname ?? null,
    devicemodel: event.devicemodel ?? null,
    devicebrand: event.devicebrand ?? null,
    visitduration: event.visitduration ?? null,
    dayssincefirstvisit: event.dayssincefirstvisit ?? null,
    visitortype: event.visitortype ?? null,
    sitename: event.sitename ?? null,
    userid: event.userid ?? null,
    serverdateprettyfirstaction: event.serverdateprettyfirstaction
      ? new Date(event.serverdateprettyfirstaction)
      : null,
    action_type: event.action_type ?? '',
    action_eventcategory: event.action_eventcategory ?? '',
    action_eventaction: event.action_eventaction ?? '',
    action_eventname: event.action_eventname ?? '',
    action_eventvalue: event.action_eventvalue
      ? Number(event.action_eventvalue)
      : 0,
    action_timespent: event.action_timespent ?? '0',
    usercustomproperties: event.usercustomproperties ?? null,
    usercustomdimensions: event.usercustomdimensions ?? null,
    dimension1: event.dimension1 ?? null,
    dimension2: event.dimension2 ?? null,
    dimension3: event.dimension3 ?? null,
    dimension4: event.dimension4 ?? null,
    dimension5: event.dimension5 ?? null,
    dimension6: event.dimension6 ?? null,
    dimension7: event.dimension7 ?? null,
    dimension8: event.dimension8 ?? null,
    dimension9: event.dimension9 ?? null,
    dimension10: event.dimension10 ?? null,
    action_url: event.action_url ?? null,
    sitesearchkeyword: event.sitesearchkeyword ?? null,
    action_title: event.action_title ?? null,
    visitorid: event.visitorid ?? null,
    referrertype: event.referrertype ?? null,
    referrername: event.referrername ?? null,
    resolution: event.resolution ?? null
  }

  // Minimal runtime validation for required fields
  if (!eventData.action_id || eventData.action_id.trim().length === 0) {
    throw new Error('importEvent(): action_id is required and cannot be empty')
  }
  if (
    !(eventData.action_timestamp instanceof Date) ||
    isNaN(eventData.action_timestamp.getTime())
  ) {
    throw new Error('importEvent(): action_timestamp is invalid')
  }

  try {
    if (!pool || typeof pool.connect !== 'function') {
      throw new Error('Database connection pool is invalid or undefined')
    }
    // Use different insertion logic based on DESTINATION_TABLE
    if (DESTINATION_TABLE === PARTITIONED_MATOMO_TABLE_NAME) {
      // Use stored procedure for partitioned table (handles automatic partition creation)
      await sql`
        SELECT insert_into_matomo_partitioned(
          ${sql.join(
            MATOMO_INSERT_COLUMNS.map((column) => sql`${eventData[column]}`),
            sql`, `
          )}
        )
      `.execute(db)
    } else {
      // Direct INSERT for standard (non-partitioned) table
      await sql`
        INSERT INTO ${sql.id(DESTINATION_TABLE)} (
          ${MATOMO_INSERT_COLUMN_SQL}
        ) VALUES (
          ${sql.join(
            MATOMO_INSERT_COLUMNS.map((column) => sql`${eventData[column]}`),
            sql`, `
          )}
        )
        ON CONFLICT (action_id) DO NOTHING
      `.execute(db)
    }
  } catch (err) {
    // Add context for troubleshooting
    const minimalContext = {
      action_id: eventData.action_id,
      action_timestamp: eventData.action_timestamp,
      idsite: eventData.idsite,
      idvisit: eventData.idvisit
    }

    console.error('importEvent(): failed to insert event', minimalContext)

    // Log error details but avoid exposing sensitive information
    console.error(
      'importEvent(): error',
      err instanceof Error ? err.message : 'Unknown error'
    )
    throw err
  }
}

const matomoProps = [
  'idSite',
  'idVisit',
  'actions',
  'country',
  'region',
  'city',
  'operatingSystemName',
  'deviceModel',
  'deviceBrand',
  'visitDuration',
  'daysSinceFirstVisit',
  'visitorType',
  'visitorId',
  'referrerType',
  'referrerName',
  'siteName',
  'userId',
  'resolution'
] as const

/** @type Record<string, (a: import("types/matomo-api").ActionDetail) => string | number> */
const actionProps = {
  action_type: (action: ActionDetail) => action.type,
  action_title: (action: ActionDetail) => action.title,
  action_eventcategory: (action: ActionDetail) => action.eventCategory,
  action_eventaction: (action: ActionDetail) => action.eventAction,
  action_eventname: (action: ActionDetail) => action.eventName,
  action_eventvalue: (action: ActionDetail) => action.eventValue,
  action_timespent: (action: ActionDetail) => action.timeSpent,
  action_timestamp: (action: ActionDetail) =>
    new Date(action.timestamp * 1000).toISOString(),
  action_url: (action: ActionDetail) => action.url,
  sitesearchkeyword: (action: ActionDetail) => action.siteSearchKeyword
}

export const getEventsFromMatomoVisit = (
  matomoVisit: Visit
): MatomoActionDetail[] => {
  return matomoVisit.actionDetails.map((actionDetail, actionIndex) => {
    const usercustomproperties: Record<string, any> = {}
    for (let k = 1; k < 10; k++) {
      const property = actionDetail.customVariables?.[k]
      if (!property) continue // max 10 custom variables
      //@ts-expect-error implicit any type
      usercustomproperties[property[`customVariableName${k}`]] =
        //@ts-expect-error implicit any type
        property[`customVariableValue${k}`]
    }

    /** @type {Record<string, string>} */
    const usercustomdimensions = {}
    for (let k = 1; k < 11; k++) {
      const dimension = `dimension${k}`
      //@ts-expect-error implicit any type
      const value = actionDetail[dimension] || matomoVisit[dimension]
      if (!value) continue // max 10 custom variables
      //@ts-expect-error implicit any type
      usercustomdimensions[dimension] = value
    }

    const event = {
      // default matomo visit properties
      ...matomoProps.reduce(
        (a, prop) => ({ ...a, [prop.toLowerCase()]: matomoVisit[prop] }),
        {}
      ),
      serverdateprettyfirstaction: new Date(
        (matomoVisit.firstActionTimestamp || 0) * 1000
      ).toISOString(),
      // action specific properties
      ...Object.keys(actionProps).reduce(
        (a, prop) => ({
          ...a,
          [prop.toLowerCase()]:
            actionProps[prop as ActionPropsKeys](actionDetail)
        }),
        {
          action_id: `${matomoVisit.idVisit}_${actionIndex}`
        }
      ),
      // custom variables
      usercustomproperties,
      // custom dimensions
      // We keep both for backwards compatibility.
      // Current implementation is flat with one column for each dimension.
      usercustomdimensions,
      ...usercustomdimensions
    }
    return event
  })
}

type ActionPropsKeys = keyof typeof actionProps

type AllMatomoActionDetailKeys =
  | Lowercase<(typeof matomoProps)[number]>
  | Lowercase<ActionPropsKeys>
  | 'dimension1'
  | 'dimension2'
  | 'dimension3'
  | 'dimension4'
  | 'dimension5'
  | 'dimension6'
  | 'dimension7'
  | 'dimension8'
  | 'dimension9'
  | 'dimension10'
  | 'action_id'
  | 'usercustomproperties'
  | 'usercustomdimensions'
  | 'serverdateprettyfirstaction'

type MatomoActionDetail = Partial<
  Record<AllMatomoActionDetailKeys, string> & { usercustomproperties: any } & {
    usercustomdimensions: any
  }
>
