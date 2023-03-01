import { Kysely, sql } from "kysely";

import pAll from "p-all";

import startDebug from "debug";

import eachDayOfInterval from "date-fns/eachDayOfInterval";
import PiwikClient from "piwik-client";
//const { Client } from "pg";
import { Database, db } from "./db";

import { MATOMO_KEY, MATOMO_URL, MATOMO_SITE, PGDATABASE, DESTINATION_TABLE, OFFSET } from "./config";

//const { createTable } = require("./createTable");
import { importDate } from "./importDate";

const debug = startDebug("index");

async function run(date?: string) {
  debug("run, date=" + date);
  //const client = db
  //const client = new Client({ connectionString: PGDATABASE });
  //await client.connect();

  const piwik = new PiwikClient(MATOMO_URL, MATOMO_KEY);

  // todo
  //await createTable(client);

  // priority:
  //  - optional parameter date
  //  - last event in the table
  //  - optional env.STARTDATE
  //  - today

  let referenceDate;
  if (!referenceDate && date) referenceDate = new Date(date);
  if (!referenceDate) referenceDate = await findLastEventInMatomo(db);
  if (!referenceDate && process.env.STARTDATE) referenceDate = new Date(process.env.STARTDATE);
  if (!referenceDate) referenceDate = new Date(new Date().getTime() - +OFFSET * 24 * 60 * 60 * 1000);

  // debug(`import : reference date : ${referenceDate}`);
  // return;

  const dates = eachDayOfInterval({
    start: referenceDate,
    end: new Date(),
  });

  debug(`import starting at : ${dates[0].toISOString()}`);

  // for each date, serial-import data
  const res = await pAll(
    dates.map((date) => () => importDate(piwik.api.bind(piwik), date)),
    { concurrency: 1, stopOnError: true }
  );

  debug("close");

  return res;
}

export default run;

if (require.main === module) {
  (async () => {
    if (!MATOMO_SITE) return console.error("Missing env MATOMO_SITE");
    if (!MATOMO_KEY) return console.error("Missing env MATOMO_KEY");
    if (!PGDATABASE) return console.error("Missing env PGDATABASE");
    await run();
    debug("run finished");
    db.destroy();
  })();
}

async function findLastEventInMatomo(db: Kysely<Database>) {
  const latest = await db
    .selectFrom(DESTINATION_TABLE)
    .select(sql<string>`action_timestamp at time zone 'UTC'`.as("action_timestamp"))
    .orderBy("action_timestamp", "desc")
    .limit(1)
    .executeTakeFirst();

  if (latest) {
    const date = new Date(latest.action_timestamp);
    return new Date(date.getTime() - +OFFSET * 24 * 60 * 60 * 1000);
  }

  return null;
}
