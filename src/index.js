require("dotenv").config({ path: "./.env.msp" });

const pAll = require("p-all");

const PiwikClient = require("piwik-client");
const { Client } = require("pg");

const { MATOMO_KEY, MATOMO_URL, MATOMO_SITE, PGDATABASE, DESTINATION_TABLE, OFFSET } = require("./config");

const { createTable } = require("./createTable");
const { importDate } = require("./importDate");

function getDaysArray(referenceDate, daysOffset) {
  return Array.from({ length: daysOffset }).map(
    (v, i) => new Date(referenceDate.getTime() - (daysOffset - i) * 24 * 60 * 60 * 1000)
  );
}

// run a sync with a 3-days range
/**
 *
 * @param {string} [date]
 * @returns
 */
async function run(date) {
  const client = new Client({ connectionString: PGDATABASE });
  await client.connect();

  const piwik = new PiwikClient(MATOMO_URL, MATOMO_KEY);

  await createTable(client);

  // priority:
  //  - optional parameter date
  //  - optional env.STARTDATE
  //  - last event in the table
  //  - today

  let referenceDate;
  if (!referenceDate && date) referenceDate = new Date(date);
  if (!referenceDate && process.env.STARTDATE) referenceDate = new Date(process.env.STARTDATE);
  if (!referenceDate) referenceDate = await findLastEventInMatomo(client);
  if (!referenceDate) referenceDate = new Date();

  console.log("START", referenceDate);
  const offset = getDaysBetween(referenceDate, new Date());
  const dates = getDaysArray(new Date(), offset);

  // for each date, serial-import data
  const res = await pAll(
    dates.map((date) => () => importDate(client, piwik.api.bind(piwik), date)),
    { concurrency: 1 }
  );

  client.end();

  return res;
}

module.exports = run;

if (require.main === module) {
  (async () => {
    if (!MATOMO_SITE) return console.error("Missing env MATOMO_SITE");
    if (!MATOMO_KEY) return console.error("Missing env MATOMO_KEY");
    if (!PGDATABASE) return console.error("Missing env PGDATABASE");
    await run();
    console.log("run finished");
  })();
}

function getDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(+end - +start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

async function findLastEventInMatomo(client) {
  const a = await client.query(`select * from ${DESTINATION_TABLE} order by action_timestamp desc limit 1`);
  if (!a.rows.length || !a.rows[0].action_timestamp) return null;
  const d = new Date(a.rows[0].action_timestamp);
  d.setDate(d.getDate() - +OFFSET);
  return d;
}
