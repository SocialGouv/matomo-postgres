import { Kysely } from "kysely";

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
  if (!referenceDate) referenceDate = new Date();

  console.log("referenceDate", referenceDate);

  const dates = eachDayOfInterval({
    start: referenceDate,
    end: new Date(),
  });

  debug(`import : ${dates.join(", ")}`);

  /*
  // for each date, serial-import data
  const res = await pAll(
    dates.map((date) => () => importDate(client, piwik.api.bind(piwik), date)),
    { concurrency: 1, stopOnError: true }
  );

  await client.end();
  debug("close");

  return res;
  */
}

module.exports = run;

if (require.main === module) {
  (async () => {
    if (!MATOMO_SITE) return console.error("Missing env MATOMO_SITE");
    if (!MATOMO_KEY) return console.error("Missing env MATOMO_KEY");
    if (!PGDATABASE) return console.error("Missing env PGDATABASE");
    await run();
    debug("run finished");
  })();
}

async function findLastEventInMatomo(db: Kysely<Database>) {
  const a = await db
    .selectFrom(DESTINATION_TABLE)
    .select("action_timestamp")
    .orderBy("action_timestamp", "desc")
    .limit(1)
    .execute();
  console.log(a);
  /*
  client.query(
    `select action_timestamp from ${client.escapeIdentifier(DESTINATION_TABLE)} order by action_timestamp desc limit 1`
  );
  if (!a.rows.length || !a.rows[0].action_timestamp) return null;
  const d = new Date(a.rows[0].action_timestamp);
  d.setDate(d.getDate() - +OFFSET);
  return d;
  */
}
