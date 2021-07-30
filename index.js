require("dotenv").config();
const PiwikClient = require("piwik-client");
const { Client } = require("pg");

const MATOMO_KEY = process.env.MATOMO_KEY || "";
const DEFAULTSTARTDATE = "2020-01-01";
const MATOMO_URL = process.env.MATOMO_URL || "https://matomo.fabrique.social.gouv.fr/";
const RESULTPERPAGE = 20000;
const connectionString = process.env.PGDATABASE || "";

const client = new Client({ connectionString });

(async () => {
  await client.connect();
  await run(37, "msp");
  await run(22, "oz");
})();

function getDaysArray(s, e) {
  for (var a = [], d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    a.push(new Date(d).toISOString().split("T")[0]);
  }
  return a;
}

async function run(siteId, project) {
  const m = new Matomo(MATOMO_URL, MATOMO_KEY, siteId);

  await createTable(project);

  const arr = (await client.query(`SELECT * FROM ${project} ORDER BY action_timestamp DESC  LIMIT 1;`)).rows;

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
      await client.query(`select * from ${project} where action_id=$1 order by action_timestamp desc limit 1`, [
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
            await client.query(`select * from ${project} where action_id=$1 order by action_timestamp desc limit 1`, [
              event.action_id,
            ])
          ).rows[0];
          if (lastEvent) {
            console.log(`SKIP ${event.action_id} ${dates[o]} (${i}/${visits.length})`);
            continue;
          }

          console.log(`DOING ${event.action_id} (${i}/${visits.length})`);

          const text = `insert into ${project}
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
