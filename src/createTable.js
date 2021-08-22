const { Client } = require("pg");

const DESTINATION_TABLE = process.env.DESTINATION_TABLE || "matomo";

/**
 *
 * @param {Client} client
 */
async function createTable(client) {
  const text = `CREATE TABLE IF NOT EXISTS ${client.escapeIdentifier(DESTINATION_TABLE)}
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
    action_id                   text UNIQUE,
    action_type                 text,
    action_eventcategory        text,
    action_eventaction          text,
    action_eventname            text,
    action_eventvalue           text,
    action_timespent            text,
    action_timestamp            timestamp with time zone,
    usercustomproperties        json
)`;
  await client.query(text, []);
}

module.exports = { createTable };
