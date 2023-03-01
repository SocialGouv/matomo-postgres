import { Client } from "pg";
import pAll from "p-all";
import startDebug from "debug";
import formatISO from "date-fns/formatISO";
import { Database, db } from "./db";
import { sql } from "kysely";
import { Visits } from "../types/matomo-api";

import { importEvent, getEventsFromMatomoVisit } from "./importEvent";

import { RESULTPERPAGE, MATOMO_SITE, DESTINATION_TABLE } from "./config";

const debug = startDebug("importDate");
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
 * @param {Date} date datetime as ISO string
 *
 * @returns {Promise<any>}
 */
const getRecordsCount = async (date: string): Promise<number> => {
  const result = await db
    .selectFrom(DESTINATION_TABLE)
    .select(db.fn.count<string>("idvisit").distinct().as("count"))
    .where(sql`date(action_timestamp at time zone 'UTC')`, "=", date)
    //`date("${date}")`)
    .executeTakeFirst();
  console.log("result", result);
  return (result && parseInt(result.count)) || 0;
};

export const importDate = async (piwikApi: any, date: Date, filterOffset = 0): Promise<any> => {
  const limit = parseInt(RESULTPERPAGE);
  const offset = filterOffset || (await getRecordsCount(isoDate(date)));
  console.log("offset", offset);
  if (!offset) {
    debug(`${isoDate(date)}: load ${limit} visits`);
  } else {
    debug(`${isoDate(date)}: load ${limit} more visits after ${offset}`);
  }
  // fetch visits details
  const visits: Visits = await new Promise((resolve) =>
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
      (err: Error, responseObject = []) => {
        if (err) {
          console.error("err", err);
          resolve([]);
        }
        return resolve(responseObject || []);
      }
    )
  );

  debug(`fetched ${visits.length} visits`);

  // flatten events
  const allEvents = visits.flatMap(getEventsFromMatomoVisit);

  if (!allEvents.length) {
    debug(`no more valid events after ${isoDate(date)}`);
    return [];
  }

  debug(`import ${allEvents.length} events`);

  // serial-import events into PG
  const importedEvents = await pAll(
    allEvents.map((event: any) => () => importEvent(event)),
    { concurrency: 10, stopOnError: true }
  );

  // continue to next page if necessary
  if (visits.length === limit) {
    const nextOffset = +offset + +limit;
    const nextEvents = await importDate(piwikApi, date, nextOffset);
    return [...importedEvents, ...(nextEvents || [])];
  }

  debug(`finished importing ${isoDate(date)}, offset ${offset}`);

  return importedEvents || [];
};

module.exports = { importDate };
