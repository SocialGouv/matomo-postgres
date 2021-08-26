require("dotenv").config({ path: "./.env.msp" });

const pAll = require("p-all");

const PiwikClient = require("piwik-client");
const { Client } = require("pg");

const MATOMO_KEY = process.env.MATOMO_KEY || "";
const MATOMO_URL = process.env.MATOMO_URL || "https://matomo.fabrique.social.gouv.fr/";
const MATOMO_SITE = process.env.MATOMO_SITE || 0;
const PGDATABASE = process.env.PGDATABASE || "";
const OFFSET = process.env.OFFSET || "3";

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
  //  - today

  const DEFAULTSTARTDATE = process.env.STARTDATE; // Start date when you think started to collect data in matomo
  const referenceDate = date ? new Date(date) : DEFAULTSTARTDATE ? new Date(DEFAULTSTARTDATE) : new Date();

  // select a J-3 range from reference date
  const dates = getDaysArray(referenceDate, parseInt(OFFSET));

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
