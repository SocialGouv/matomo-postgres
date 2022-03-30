const { Client } = require("pg");

const { DESTINATION_TABLE } = require("./config");

/**
 *
 * @param {Client} client
 */
async function createTable(client) {
  const table = client.escapeIdentifier(DESTINATION_TABLE);
  const text = `CREATE TABLE IF NOT EXISTS ${table}
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
    action_eventvalue           decimal,
    action_timespent            text,
    action_timestamp            timestamp with time zone,
    usercustomproperties        json,
    usercustomdimensions        json,
    action_url                  text,
    sitesearchkeyword           text,
    action_title                text
)`;

  await client.query(text, []);

  const migrations = [
    `ALTER TABLE IF EXISTS ${table} ADD COLUMN IF NOT EXISTS "usercustomdimensions" json;`,
    `ALTER TABLE IF EXISTS ${table} ADD COLUMN IF NOT EXISTS "action_url" text;`,
    `ALTER TABLE IF EXISTS ${table} ADD COLUMN IF NOT EXISTS "sitesearchkeyword" text;`,
    `ALTER TABLE IF EXISTS ${table} ADD COLUMN IF NOT EXISTS "action_title" text;`,
    `ALTER TABLE IF EXISTS ${table} ALTER COLUMN action_eventvalue TYPE decimal USING action_eventvalue::decimal;`,
  ];

  // --------------------------------------------- //
  // If you add new query: Don't forget to update  //
  // const `NB_REQUEST_TO_INIT_DB` (index.test.js) //
  // --------------------------------------------- //

  migrations.forEach(async (query) => {
    await client.query(query, []);
  });
}

module.exports = { createTable };
