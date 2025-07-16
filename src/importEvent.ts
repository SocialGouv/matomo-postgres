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
  // Use the stored procedure for safe insertion with automatic partition creation
  await sql`
    SELECT insert_into_matomo_partitioned(
      ${event.action_id ?? ''},
      ${event.action_timestamp ? new Date(event.action_timestamp) : new Date()},
      ${event.idsite ?? ''},
      ${event.idvisit ?? ''},
      ${event.actions ?? null},
      ${event.country ?? null},
      ${event.region ?? null},
      ${event.city ?? null},
      ${event.operatingsystemname ?? null},
      ${event.devicemodel ?? null},
      ${event.devicebrand ?? null},
      ${event.visitduration ?? null},
      ${event.dayssincefirstvisit ?? null},
      ${event.visitortype ?? null},
      ${event.sitename ?? null},
      ${event.userid ?? null},
      ${
        event.serverdateprettyfirstaction
          ? new Date(event.serverdateprettyfirstaction)
          : null
      },
      ${event.action_type ?? ''},
      ${event.action_eventcategory ?? ''},
      ${event.action_eventaction ?? ''},
      ${event.action_eventname ?? ''},
      ${event.action_eventvalue ? Number(event.action_eventvalue) : 0},
      ${event.action_timespent ?? '0'},
      ${event.usercustomproperties ?? null},
      ${event.usercustomdimensions ?? null},
      ${event.dimension1 ?? null},
      ${event.dimension2 ?? null},
      ${event.dimension3 ?? null},
      ${event.dimension4 ?? null},
      ${event.dimension5 ?? null},
      ${event.dimension6 ?? null},
      ${event.dimension7 ?? null},
      ${event.dimension8 ?? null},
      ${event.dimension9 ?? null},
      ${event.dimension10 ?? null},
      ${event.action_url ?? null},
      ${event.sitesearchkeyword ?? null},
      ${event.action_title ?? null},
      ${event.visitorid ?? null},
      ${event.referrertype ?? null},
      ${event.referrername ?? null},
      ${event.resolution ?? null}
    )
  `.execute(db)
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
      const property =
        actionDetail.customVariables && actionDetail.customVariables[k]
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
