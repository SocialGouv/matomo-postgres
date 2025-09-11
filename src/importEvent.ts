import { sql } from 'kysely'
import { ActionDetail, Visit } from 'types/matomo-api'

import { db } from './db.js'

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
    // Keep the stored procedure but centralize mapping to avoid parameter mis-ordering
    await sql`
      SELECT insert_into_matomo_partitioned(
        ${eventData.action_id},
        ${eventData.action_timestamp},
        ${eventData.idsite},
        ${eventData.idvisit},
        ${eventData.actions},
        ${eventData.country},
        ${eventData.region},
        ${eventData.city},
        ${eventData.operatingsystemname},
        ${eventData.devicemodel},
        ${eventData.devicebrand},
        ${eventData.visitduration},
        ${eventData.dayssincefirstvisit},
        ${eventData.visitortype},
        ${eventData.sitename},
        ${eventData.userid},
        ${eventData.serverdateprettyfirstaction},
        ${eventData.action_type},
        ${eventData.action_eventcategory},
        ${eventData.action_eventaction},
        ${eventData.action_eventname},
        ${eventData.action_eventvalue},
        ${eventData.action_timespent},
        ${eventData.usercustomproperties},
        ${eventData.usercustomdimensions},
        ${eventData.dimension1},
        ${eventData.dimension2},
        ${eventData.dimension3},
        ${eventData.dimension4},
        ${eventData.dimension5},
        ${eventData.dimension6},
        ${eventData.dimension7},
        ${eventData.dimension8},
        ${eventData.dimension9},
        ${eventData.dimension10},
        ${eventData.action_url},
        ${eventData.sitesearchkeyword},
        ${eventData.action_title},
        ${eventData.visitorid},
        ${eventData.referrertype},
        ${eventData.referrername},
        ${eventData.resolution}
      )
    `.execute(db)
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
