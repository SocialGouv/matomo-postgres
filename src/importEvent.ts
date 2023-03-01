import { Client } from "pg";
import { ActionDetail, Visit } from "types/matomo-api";

import { DESTINATION_TABLE } from "./config";
import { Database, db } from "./db";

/**
 *
 * @param {Client} client
 * @param {import("types").Event} event
 *
 * @return {Promise<Record<"rows", any[]>>}
 */
export const importEvent = (event: any) =>
  db
    .insertInto(DESTINATION_TABLE)
    .values(event)
    .onConflict((oc) => {
      console.error("warning : event skipped (conflict)");
      return oc.doNothing();
    })
    .execute();

const matomoProps = [
  "idSite",
  "idVisit",
  "actions",
  "country",
  "region",
  "city",
  "operatingSystemName",
  "deviceModel",
  "deviceBrand",
  "visitDuration",
  "daysSinceFirstVisit",
  "visitorType",
  "visitorId",
  "referrerType",
  "referrerName",
  "siteName",
  "userId",
];

/** @type Record<string, (a: import("types/matomo-api").ActionDetail) => string | number> */
const actionProps = {
  action_type: (action: ActionDetail) => action.type,
  action_title: (action: ActionDetail) => action.title,
  action_eventcategory: (action: ActionDetail) => action.eventCategory,
  action_eventaction: (action: ActionDetail) => action.eventAction,
  action_eventname: (action: ActionDetail) => action.eventName,
  action_eventvalue: (action: ActionDetail) => action.eventValue,
  action_timespent: (action: ActionDetail) => action.timeSpent,
  action_timestamp: (action: ActionDetail) => new Date(action.timestamp * 1000).toISOString(),
  action_url: (action: ActionDetail) => action.url,
  sitesearchkeyword: (action: ActionDetail) => action.siteSearchKeyword,
};

export const getEventsFromMatomoVisit = (matomoVisit: Visit) => {
  return matomoVisit.actionDetails.map((actionDetail, actionIndex) => {
    /** @type {Record<string, string>} */
    const usercustomproperties = {};
    for (let k = 1; k < 10; k++) {
      const property = actionDetail.customVariables && actionDetail.customVariables[k];
      if (!property) continue; // max 10 custom variables
      //@ts-ignore
      usercustomproperties[property[`customVariableName${k}`]] = property[`customVariableValue${k}`];
    }

    /** @type {Record<string, string>} */
    const usercustomdimensions = {};
    for (let k = 1; k < 11; k++) {
      const dimension = `dimension${k}`;
      //@ts-ignore
      const value = actionDetail[dimension] || matomoVisit[dimension];
      if (!value) continue; // max 10 custom variables
      //@ts-ignore
      usercustomdimensions[dimension] = value;
    }

    const event = {
      // default matomo visit properties
      //@ts-ignore
      ...matomoProps.reduce((a, prop) => ({ ...a, [prop.toLowerCase()]: matomoVisit[prop] }), {}),
      serverdateprettyfirstaction: new Date((matomoVisit.firstActionTimestamp || 0) * 1000).toISOString(),
      // action specific properties
      //@ts-ignore
      ...Object.keys(actionProps).reduce((a, prop) => ({ ...a, [prop]: actionProps[prop](actionDetail) }), {
        action_id: `${matomoVisit.idVisit}_${actionIndex}`,
      }),
      // custom variables
      usercustomproperties,
      // custom dimensions
      // We keep both for backwards compatibility.
      // Current implementation is flat with one column for each dimension.
      usercustomdimensions,
      ...usercustomdimensions,
    };
    return event;
  });
};
