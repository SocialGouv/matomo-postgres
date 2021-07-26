const PiwikClient = require("piwik-client");
const { Client } = require("pg");

const START_DATE = process.env.START_DATE || "2021-06-01";
const DESTINATION_TABLE = process.env.DESTINATION_TABLE || "matomo";
const MATOMO_KEY = process.env.MATOMO_KEY;
const MATOMO_SITEID = process.env.MATOMO_SITEID;
const MATOMO_URL = process.env.MATOMO_URL || "https://matomo.fabrique.social.gouv.fr/";

const RESULTPERPAGE = 20000;

const startDate = new Date(START_DATE);
const connectionString = process.env.PGDATABASE;

function getDaysArray(s, e) {
  for (var a = [], d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    a.push(new Date(d).toISOString().split("T")[0]);
  }
  return a;
}

function getPreviousDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

(async () => {
  const client = new Client({ connectionString });
  await client.connect();
  console.log("START");

  const m = new Matomo(MATOMO_URL, MATOMO_KEY, MATOMO_SITEID);

  const dates = getDaysArray(new Date(startDate), new Date());
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
    const events = getEvents(visits[0]);
    const event = events[0];
    const lastEvent = (
      await client.query(
        `select * from ${DESTINATION_TABLE} where action_id=$1 order by action_timestamp desc limit 1`,
        [event.action_id]
      )
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
              `select * from ${DESTINATION_TABLE} where action_id=$1 order by action_timestamp desc limit 1`,
              [event.action_id]
            )
          ).rows[0];
          if (lastEvent) {
            console.log(`SKIP ${event.action_id} ${dates[o]} (${i}/${visits.length})`);
            continue;
          }

          console.log(`DOING ${event.action_id} (${i}/${visits.length})`);

          const text = `insert into ${DESTINATION_TABLE}
        (idSite, idVisit, actions, country, region, city, operatingSystemName, deviceModel, deviceBrand, visitDuration, daysSinceFirstVisit, visitorType, siteName, userId, serverDatePrettyFirstAction, action_id, action_type, action_eventCategory, action_eventAction, action_eventName, action_eventValue,action_timeSpent, action_timestamp, userCustomProperties)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`;

          const value = Object.keys(event).map((e) => event[e]);
          await client.query(text, value);
        } catch (e) {
          console.log("e", e);
        }
      }
    }
  }
})();

function getEvents(visit) {
  const arr = [];
  for (let j = 0; j < visit.actionDetails.length; j++) {
    const obj = {};
    obj.idSite = visit.idSite;
    obj.idVisit = visit.idVisit;
    obj.actions = visit.actions;

    obj.country = visit.country;
    obj.region = visit.region;
    obj.city = visit.city;
    obj.operatingSystemName = visit.operatingSystemName;
    obj.deviceModel = visit.deviceModel;
    obj.deviceBrand = visit.deviceBrand;
    obj.visitDuration = visit.visitDuration;
    obj.daysSinceFirstVisit = visit.daysSinceFirstVisit;
    obj.visitorType = visit.visitorType;
    obj.siteName = visit.siteName;
    obj.userId = visit.userId;
    obj.serverDatePrettyFirstAction = new Date(visit.serverDatePrettyFirstAction);
    obj.action_id = `${visit.idVisit}_${j}`;
    obj.action_type = visit.actionDetails[j].type;
    obj.action_eventCategory = visit.actionDetails[j].eventCategory;
    obj.action_eventAction = visit.actionDetails[j].eventAction;
    obj.action_eventName = visit.actionDetails[j].eventName;
    obj.action_eventValue = visit.actionDetails[j].eventValue;
    obj.action_timeSpent = visit.actionDetails[j].timeSpent;
    obj.action_timestamp = new Date(visit.actionDetails[j].timestamp * 1000);
    obj.userCustomProperties = {};
    for (let k = 1; k < 10; k++) {
      const property = visit.customVariables && visit.customVariables[`${j}`];
      if (!property) continue; // max 10 custom variables
      obj.userCustomProperties[property[`customVariableName${k}`]] = property[`customVariableValue${k}`];
    }
    arr.push(obj);
  }
  return arr;
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
