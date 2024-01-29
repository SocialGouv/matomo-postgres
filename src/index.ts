import pAll from "p-all";

import startDebug from "debug";

import eachDayOfInterval from "date-fns/eachDayOfInterval";
import PiwikClient from "piwik-client";

import lodash from "lodash"

import { MATOMO_KEY, MATOMO_URL, MATOMO_SITE, INITIAL_OFFSET, MONGO_URL } from "./config";

import { importDate } from "./importDate";
import db, { connectDB } from "./mongodb";

const debug = startDebug("index");

async function run(date?: string) {
  debug("run, date=" + date);

  const piwik = new PiwikClient(MATOMO_URL, MATOMO_KEY);

  // priority:
  //  - optional parameter date
  //  - last event in the table
  //  - optional env.STARTDATE
  //  - today

  let referenceDate;
  if (!referenceDate && date) referenceDate = new Date(date);
  if (!referenceDate) referenceDate = await findLastEventInMatomo();
  if (!referenceDate && process.env.STARTDATE) referenceDate = new Date(process.env.STARTDATE);
  if (!referenceDate) referenceDate = new Date(new Date().getTime() - +INITIAL_OFFSET * 24 * 60 * 60 * 1000);

  const dates = eachDayOfInterval({
    start: referenceDate,
    end: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
  });

  debug(`import starting at : ${dates[0].toISOString()}`);

  // for each date, serial-import data
  const res = await pAll(
    dates.map((date) => () => importDate(piwik.api.bind(piwik), date)),
    { concurrency: 1, stopOnError: true }
  );

  debug("close");
  for (let dayResult of res) {
    
    for (let category in dayResult) {
      const normalizeKey = category.replace(" ", "").replace(".", "_");
      dayResult[normalizeKey] = dayResult[category];
      await saveInDb(normalizeKey, dayResult);
    }

  }

  console.log('done');
  return res;
}

async function saveInDb(category: string, data: Record<string, any>, date ?: Date) {
  let value = lodash.get(data, category)
  if (Array.isArray(value)) {
    // Save in db
    if (value.length) {
      if (date) value.forEach(v => v.date = date)
      await db.collection("old-matomo_" + category).insertMany(value);
    }
  } else {
    for (let subCat in value) {
      const normalizeKey = subCat.replace(" ", "").replace(".", "_");
      value[normalizeKey] = value[subCat];
      if (subCat != "date") await saveInDb(category + "." + normalizeKey, data, (value as Record<string, unknown>).date as Date);
      // console.log(category,data);
    }
  }
}

export default run;

if (require.main === module) {
  (async () => {
    if (!MATOMO_SITE) return console.error("Missing env MATOMO_SITE");
    if (!MATOMO_KEY) return console.error("Missing env MATOMO_KEY");
    if (!MONGO_URL) return console.error("Missing env MONGO_URL");
    await connectDB();
    await run();
    debug("run finished");
  })();
}

async function findLastEventInMatomo() {
  const result = await db.collection("UserId_getUsers").find({}).limit(1).sort({date: 1}).toArray();
  if (result.length && result[0].date) return result[0].date;
  return null;
}
