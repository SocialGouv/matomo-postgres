const { Client } = require("pg");
const pAll = require("p-all");
const debug = require("debug")("importDate");
const formatISO = require("date-fns/formatISO");

const { importEvent, getEventsFromMatomoVisit } = require("./importEvent");

const { RESULTPERPAGE, MATOMO_SITE, DESTINATION_TABLE } = require("./config");

/**
 * return date as ISO yyyy-mm-dd
 *
 * @param {Date} date date
 *
 * @returns {string}
 */
// @ts-ignore
const isoDate = (date) => formatISO(date, { representation: "date" });

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
  )} WHERE action_timestamp::date='${isoDate(date)}';`;
  const result = await client.query(text);
  return parseInt((result && result.rows && result.rows.length && result.rows[0].count) || 0);
};

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
  const limit = parseInt(RESULTPERPAGE);
  const offset = filterOffset || (await getRecordsCount(client, date));
  if (!offset) {
    debug(`${isoDate(date)}: load ${limit} visits`);
  } else {
    debug(`${isoDate(date)}: load ${limit} more visits after ${offset}`);
  }
  // fetch visits details
  const visits = await new Promise((resolve) =>
    piwikApi(
      {
        method: "Live.getLastVisitsDetails",
        period: "day",
        date: isoDate(date),
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
    debug(`no more valid events after ${isoDate(date)}`);
    return [];
  }

  // serial-import events into PG
  const importedEvents = await pAll(
    allEvents.map((event) => () => {
      importEvent(client, event);
    }),
    { concurrency: 10, stopOnError: true }
  );

  // continue to next page if necessary
  if (visits.length === limit) {
    const nextOffset = offset + limit;
    const nextEvents = await importDate(client, piwikApi, date, nextOffset);
    return [...importedEvents, ...(nextEvents || [])];
  }

  debug(`finished importing ${isoDate(date)}, offset ${offset}`);

  return importedEvents || [];
};

module.exports = { importDate };
