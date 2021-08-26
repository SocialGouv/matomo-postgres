const { Client } = require("pg");
const pAll = require("p-all");

const { importEvent, getEventsFromMatomoVisit } = require("./importEvent");

const MATOMO_SITE = process.env.MATOMO_SITE || 0;
const DESTINATION_TABLE = process.env.DESTINATION_TABLE || "matomo";
const RESULTPERPAGE = process.env.RESULTPERPAGE || "500";

/**
 * check count if imported rows for given date
 *
 * @param {Client} client PG client
 * @param {Date} date datetime as ISO string
 *
 * @returns {Promise<any>}
 */
const getRecordsCount = async (client, date) => {
  const text = `SELECT COUNT(distinct idvisit) FROM ${client.escapeIdentifier(
    DESTINATION_TABLE
  )} WHERE action_timestamp::date='${date.toISOString().substring(0, 10)}';`;
  const result = await client.query(text);
  return parseInt((result && result.rows && result.rows.length && result.rows[0].count) || 0);
};

const shortStamp = (stp) => new Date(stp).toISOString().substring(0, 10);

/**
 * import all matomo data for a given date
 *
 * @param {Client} client PG client
 * @param {any} piwikApi piwik.api instance
 * @param {Date} date datetime as ISO string
 *
 * @returns {Promise<any[]>}
 */
const importDate = async (client, piwikApi, date, filterOffset = 0) => {
  const minTimestamp = date.getTime();
  const limit = parseInt(RESULTPERPAGE);
  const offset = filterOffset || (await getRecordsCount(client, date));
  if (!offset) {
    console.info(`${shortStamp(minTimestamp)}: load ${limit} visits`);
  } else {
    console.info(`${shortStamp(minTimestamp)}: load ${limit} more visits after ${offset}`);
  }
  // fetch visits details
  const visits = await new Promise((resolve) =>
    piwikApi(
      {
        method: "Live.getLastVisitsDetails",
        period: "day",
        date: new Date(minTimestamp).toISOString().substring(0, 10),
        filter_limit: limit,
        filter_offset: offset,
        filter_sort_order: "asc",
        idSite: MATOMO_SITE,
      },
      (err, responseObject = []) => {
        if (err) {
          console.error("err", err);
          resolve([]);
        }
        return resolve(responseObject || []);
      }
    )
  );

  // flatten events
  const allEvents = visits.flatMap(getEventsFromMatomoVisit);

  if (!allEvents.length) {
    console.info(`no more valid events after ${new Date(minTimestamp).toISOString()}`);
    return [];
  }

  // serial-import events into PG
  const importedEvents = await pAll(
    allEvents.map((event) => () => importEvent(client, event)),
    { concurrency: 10, stopOnError: true }
  );

  // continue to next page if necessary
  if (visits.length === limit) {
    const nextOffset = offset + limit;
    const nextEvents = await importDate(client, piwikApi, date, nextOffset);
    return [...importedEvents, ...(nextEvents || [])];
  }

  return importedEvents || [];
};

module.exports = { importDate };
