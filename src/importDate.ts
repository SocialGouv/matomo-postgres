import startDebug from "debug";
import formatISO from "date-fns/formatISO";

import { RESULTPERPAGE, MATOMO_SITE } from "./config";

const debug = startDebug("importDate");

/** return date as ISO yyyy-mm-dd */
const isoDate = (date: Date) => formatISO(date, { representation: "date" });

/** import all event from givent date */
export const importDate = async (piwikApi: any, date: Date, filterOffset = 0): Promise<any> => {
  const limit = parseInt(RESULTPERPAGE);
  const offset = filterOffset;
  if (!offset) {
    debug(`${isoDate(date)}: load ${limit} visits`);
  } else {
    debug(`${isoDate(date)}: load ${limit} more visits after ${offset}`);
  }

  console.log(date);

  const methods = [
    "Events.getCategory",
    "Events.getAction",
    "Events.getName",
    "DevicesDetection.getType",
    "DevicesDetection.getOsFamilies",
    "DevicesDetection.getOsVersions",
    "DevicesDetection.getBrowsers",
    "DevicesDetection.getBrowserVersions",
    "DevicesDetection.getBrowserEngines",
    "Insights.getInsightsOverview",
    "Referrers.getAll",
    "UserId.getUsers",
    "Actions.getPageUrls",
    "Actions.getEntryPageUrls",
    "Actions.getExitPageUrls",
    "Actions.getOutlinks",
  ]
  const result: Record<string, unknown> = {};
  for( let method of methods) {
      const methodResult = await new Promise((resolve) =>
        piwikApi(
          {
            method,
            period: "day",
            date: isoDate(date),
            // minTimestamp: isoDate(new Date()) === isoDate(date) ? date.getTime() / 1000 : undefined, // if today, dont go further (??)
            filter_limit: limit,
            filter_offset: offset,
            filter_sort_order: "asc",
            idSite: MATOMO_SITE,
          },
          (err: Error, result: Record<string, unknown>[] = []) => {
            if (err) {
              console.error("err", err);
              resolve([]);
            }
            if (Array.isArray(result)) result.forEach(v => v.date = date);
            else (result as Record<string, unknown>).date = date;
            resolve(result);
          }
        )
    );

    result[method] = methodResult;
  }

  return result;
};

module.exports = { importDate };
