const pAll = require("p-all");
const debug = require("debug")("index");
const eachDayOfInterval = require("date-fns/eachDayOfInterval");
const PiwikClient = require("piwik-client");
const { Client } = require("pg");

const { MATOMO_KEY, MATOMO_URL, MATOMO_SITE, PGDATABASE, DESTINATION_TABLE, OFFSET } = require("./config");

const { createTable } = require("./createTable");
const { importDate } = require("./importDate");

// run a sync with a 3-days range
/**
 *
 * @param {string} [date]
 * @returns
 */
async function run(date) {
  debug("run, date=" + date);
  const client = new Client({ connectionString: PGDATABASE });
  await client.connect();

  const piwik = new PiwikClient(MATOMO_URL, MATOMO_KEY);

  await createTable(client);

  // priority:
  //  - optional parameter date
  //  - last event in the table
  //  - optional env.STARTDATE
  //  - today

  let referenceDate;
  if (!referenceDate && date) referenceDate = new Date(date);
  if (!referenceDate) referenceDate = await findLastEventInMatomo(client);
  if (!referenceDate && process.env.STARTDATE) referenceDate = new Date(process.env.STARTDATE);
  if (!referenceDate) referenceDate = new Date();

  // @ts-ignore
  const dates = eachDayOfInterval({
    start: referenceDate,
    end: new Date(),
  });

  debug(`import : ${dates.join(", ")}`);

  // for each date, serial-import data
  const res = await pAll(
    dates.map((date) => () => importDate(client, piwik.api.bind(piwik), date)),
    { concurrency: 1, stopOnError: true }
  );

  await client.end();
  debug("close");

  return res;
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

async function findLastEventInMatomo(client) {
  const a = await client.query(
    `select action_timestamp from ${client.escapeIdentifier(DESTINATION_TABLE)} order by action_timestamp desc limit 1`
  );
  if (!a.rows.length || !a.rows[0].action_timestamp) return null;
  const d = new Date(a.rows[0].action_timestamp);
  d.setDate(d.getDate() - +OFFSET);
  return d;
}
