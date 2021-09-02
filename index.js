require("dotenv").config({ path: "./.env.oz" });

const PiwikClient = require("piwik-client");
const { Client } = require("pg");

const MATOMO_KEY = process.env.MATOMO_KEY || "";
const MATOMO_URL = process.env.MATOMO_URL || "https://matomo.fabrique.social.gouv.fr/";
const MATOMO_SITE = process.env.MATOMO_SITE || 37;

const PROJECT_NAME = process.env.PROJECT_NAME || "";
const PGDATABASE = process.env.PGDATABASE || "";

const DEFAULTSTARTDATE = process.env.STARTDATE || "2020-01-01"; // Start date when you think started to collect data in matomo
const RESULTPERPAGE = process.env.RESULTPERPAGE || 20000; // You may need to increase this for high traffic website

const client = new Client({ connectionString: PGDATABASE });

(async () => {
  if (!PROJECT_NAME) return console.error("Missing env PROJECT_NAME");
  if (!MATOMO_SITE) return console.error("Missing env MATOMO_SITE");
  if (!MATOMO_KEY) return console.error("Missing env MATOMO_KEY");
  if (!PGDATABASE) return console.error("Missing env PGDATABASE");
  await client.connect();
  await run();
})();

function getDaysArray(s, e) {
  for (var a = [], d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    a.push(new Date(d).toISOString().split("T")[0]);
  }
  return a;
}

async function run() {
  const m = new Matomo(MATOMO_URL, MATOMO_KEY, MATOMO_SITE);

  await createTable(PROJECT_NAME);

  const arr = (await client.query(`SELECT * FROM ${PROJECT_NAME} ORDER BY action_timestamp DESC  LIMIT 1;`)).rows;

  let startDate = arr.length ? new Date(arr[0].action_timestamp) : new Date(DEFAULTSTARTDATE);
  startDate.setDate(startDate.getDate() - 3); // We remove 3 days, to be sure

  const dates = getDaysArray(startDate, new Date());
  dates.pop();

  // FIND LAST DAY SCRAPPED
  let currentIndex = 0;
  for (let o = 0; o < dates.length; o++) {
    const date = dates[o];
    const visits = await m.get({
      method: "Live.getLastVisitsDetails",
      period: "day",
      date: date,
      filter_limit: 1,
      filter_sort_order: "asc",
    });
    if (!visits.length) continue;

    const events = getEvents(visits[0]);
    const event = events[0];
    const lastEvent = (
      await client.query(`select * from ${PROJECT_NAME} where action_id=$1 order by action_timestamp desc limit 1`, [
        event.action_id,
      ])
    ).rows[0];
    currentIndex = o;
    if (!lastEvent) break;
    console.log(`${date} OK`);
  }
  currentIndex--;

  console.log("START ", dates[currentIndex]);
  for (let o = currentIndex; o < dates.length; o++) {
    const date = dates[o];
    const visits = await m.get({
      method: "Live.getLastVisitsDetails",
      period: "day",
      date: date,
      filter_limit: RESULTPERPAGE,
      filter_sort_order: "asc",
    });

    console.log("VISITS ", dates[o], visits.length);

    for (let i = 0; i < visits.length; i++) {
      const events = getEvents(visits[i]);

      for (let j = 0; j < events.length; j++) {
        try {
          const event = events[j];
          const lastEvent = (
            await client.query(
              `select * from ${PROJECT_NAME} where action_id=$1 order by action_timestamp desc limit 1`,
              [event.action_id]
            )
          ).rows[0];
          if (lastEvent) {
            console.log(`SKIP ${event.action_id} ${dates[o]} (${i}/${visits.length})`);
            continue;
          }

          console.log(`DOING ${event.action_id} (${i}/${visits.length})`);

          const text = `insert into ${PROJECT_NAME}
        (idsite, idvisit, actions, country, region, city, operatingsystemname, devicemodel, devicebrand, visitduration, dayssincefirstvisit, visitortype, sitename, userid, serverdateprettyfirstaction, action_id, action_type, action_eventcategory, action_eventaction, action_eventname, action_eventvalue,action_timespent, action_timestamp, usercustomproperties)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`;

          const value = Object.keys(event).map((e) => event[e]);
          await client.query(text, value);
        } catch (e) {
          console.log("e", e);
        }
      }
    }
  }

  console.log("END", PROJECT_NAME);
}

function getEvents(visit) {
  const arr = [];
  for (let j = 0; j < visit.actionDetails.length; j++) {
    const obj = {};
    obj.idsite = visit.idSite;
    obj.idvisit = visit.idVisit;
    obj.actions = visit.actions;

    obj.country = visit.country;
    obj.region = visit.region;
    obj.city = visit.city;
    obj.operatingsystemname = visit.operatingSystemName;
    obj.devicemodel = visit.deviceModel;
    obj.devicebrand = visit.deviceBrand;
    obj.visitduration = visit.visitDuration;
    obj.dayssincefirstvisit = visit.daysSinceFirstVisit;
    obj.visitortype = visit.visitorType;
    obj.sitename = visit.siteName;
    obj.userid = visit.userId;
    obj.serverdateprettyfirstaction = new Date(visit.serverDatePrettyFirstAction);
    obj.action_id = `${visit.idVisit}_${j}`;
    obj.action_type = visit.actionDetails[j].type;
    obj.action_eventcategory = visit.actionDetails[j].eventCategory;
    obj.action_eventaction = visit.actionDetails[j].eventAction;
    obj.action_eventname = visit.actionDetails[j].eventName;
    obj.action_eventvalue = visit.actionDetails[j].eventValue;
    obj.action_timespent = visit.actionDetails[j].timeSpent;
    obj.action_timestamp = new Date(visit.actionDetails[j].timestamp * 1000);
    obj.usercustomproperties = {};
    for (let k = 1; k < 10; k++) {
      const property = visit.customVariables && visit.customVariables[`${j}`];
      if (!property) continue; // max 10 custom variables
      obj.usercustomproperties[property[`customVariableName${k}`]] = property[`customVariableValue${k}`];
    }
    arr.push(obj);
  }
  return arr;
}

async function createTable(project) {
  const text = `CREATE TABLE IF NOT EXISTS ${project}
  (
    idsite                      text,
    idvisit                     text,
    actions                     text,
    country                     text,
    region                      text,
    city                        text,
    operatingsystemname         text,
    devicemodel                 text,
    devicebrand                 text,
    visitduration               text,
    dayssincefirstvisit         text,
    visitortype                 text,
    sitename                    text,
    userid                      text,
    serverdateprettyfirstaction date,
    action_id                   text,
    action_type                 text,
    action_eventcategory        text,
    action_eventaction          text,
    action_eventname            text,
    action_eventvalue           text,
    action_timespent            text,
    action_timestamp            date,
    usercustomproperties        json
)`;
  await client.query(text);
}

class Matomo {
  constructor(baseUrl, token, siteId) {
    this.piwik = new PiwikClient(baseUrl, token);
    this.siteId = siteId;
  }
  async get(params) {
    return new Promise((resolve, reject) => {
      this.piwik.api({ ...params, idSite: this.siteId }, (err, responseObject = []) => {
        if (err) console.log("err", err);
        return resolve(responseObject || []);
      });
    });
  }
}
