const { Client } = require("pg");

const { DESTINATION_TABLE } = require("./config");
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
    sitesearchkeyword           text,
    serverdateprettyfirstaction date,
    action_id                   text UNIQUE,
    action_type                 text,
    action_title                text,
    action_url                  text,
    action_eventcategory        text,
    action_eventaction          text,
    action_eventname            text,
    action_eventvalue           text,
    action_timespent            text,
    action_timestamp            timestamp with time zone,
    usercustomproperties        json,
    usercustomdimensions        json
)`;
  await client.query(text, []);
  const addUserCustomDimensionColumn = `ALTER TABLE IF EXISTS  ${client.escapeIdentifier(DESTINATION_TABLE)} 
  ADD COLUMN IF NOT EXISTS "usercustomdimensions" json;`;
  await client.query(addUserCustomDimensionColumn, []);

  const addActionUrlColumn = `ALTER TABLE IF EXISTS  ${client.escapeIdentifier(DESTINATION_TABLE)} 
  ADD COLUMN IF NOT EXISTS "action_url" text;`;
  await client.query(addActionUrlColumn, []);

  const addSiteSearchKeyword = `ALTER TABLE IF EXISTS  ${client.escapeIdentifier(DESTINATION_TABLE)} 
  ADD COLUMN IF NOT EXISTS "sitesearchkeyword" text;`;
  await client.query(addSiteSearchKeyword, []);

  const addActionName = `ALTER TABLE IF EXISTS  ${client.escapeIdentifier(DESTINATION_TABLE)} 
  ADD COLUMN IF NOT EXISTS "action_title" text;`;
  await client.query(addActionName, []);

  // --------------------------------------------- //
  // If you add new query: Don't forget to update  //
  // const `NB_REQUEST_TO_INIT_DB` (index.test.js) //
  // --------------------------------------------- //
}

module.exports = { createTable };
