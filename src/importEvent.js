const { Client } = require("pg");

const { DESTINATION_TABLE } = require("./config");

/**
 *
 * @param {Client} client
 * @param {import("types").Event} event
 *
 * @return {Promise<Record<"rows", any[]>>}
 */
const importEvent = (client, event) => {
  const eventKeys = Object.keys(event);
  const text = `insert into ${client.escapeIdentifier(DESTINATION_TABLE)}
        (${eventKeys.join(", ")})
        values (${eventKeys.map((k, i) => `\$${i + 1}`).join(", ")})
        ON CONFLICT DO NOTHING`;
  const values = [...eventKeys.map((k) => event[k])];
  return client.query(text, values).catch((e) => {
    console.log("QUERY error", e);
    return { rows: [] };
  });
};

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
  "siteName",
  "userId",
];

/** @type Record<string, (a: import("types/matomo").ActionDetail) => string | number> */
const actionProps = {
  action_type: (action) => action.type,
  action_title: (action) => action.title,
  action_eventcategory: (action) => action.eventCategory,
  action_eventaction: (action) => action.eventAction,
  action_eventname: (action) => action.eventName,
  action_eventvalue: (action) => action.eventValue,
  action_timespent: (action) => action.timeSpent,
  action_timestamp: (action) => new Date(action.timestamp * 1000).toISOString(),
  action_url: (action) => action.url,
  siteSearchKeyword: (action) => action.siteSearchKeyword,
};

/**
 * Convert a single matomo visit {<import("types/matomo").Visit} to multiple {Event[]}
 *
 * @param {Partial<import("types/matomo").Visit>} matomoVisit
 *
 * @return {import("types").Event[]} list of events
 *
 */
const getEventsFromMatomoVisit = (matomoVisit) => {
  return matomoVisit.actionDetails.map((actionDetail, actionIndex) => {
    /** @type {Record<string, string>} */
    const usercustomproperties = {};
    for (let k = 1; k < 10; k++) {
      const property = actionDetail.customVariables && actionDetail.customVariables[k];
      if (!property) continue; // max 10 custom variables
      usercustomproperties[property[`customVariableName${k}`]] = property[`customVariableValue${k}`];
    }

    /** @type {Record<string, string>} */
    const usercustomdimensions = {};
    for (let k = 1; k < 10; k++) {
      const dimension = `dimension${k}`;
      const value = actionDetail[dimension] || matomoVisit[dimension];
      if (!value) continue; // max 10 custom variables
      usercustomdimensions[dimension] = value;
    }

    /** @type {import("types").Event} */
    // @ts-ignore
    const event = {
      // default matomo visit properties
      ...matomoProps.reduce((a, prop) => ({ ...a, [prop.toLowerCase()]: matomoVisit[prop] }), {}),
      serverdateprettyfirstaction: new Date((matomoVisit.firstActionTimestamp || 0) * 1000).toISOString(),
      // action specific properties
      ...Object.keys(actionProps).reduce((a, prop) => ({ ...a, [prop]: actionProps[prop](actionDetail) }), {
        action_id: `${matomoVisit.idVisit}_${actionIndex}`,
      }),
      // custom variables
      usercustomproperties,
      ...usercustomdimensions,
    };
    return event;
  });
};

module.exports = { getEventsFromMatomoVisit, importEvent };
