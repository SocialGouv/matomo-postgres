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
    dimension1                  text,
    dimension2                  text,
    dimension3                  text,
    dimension4                  text,
    dimension5                  text,
    dimension6                  text,
    dimension7                  text,
    dimension8                  text,
    dimension9                  text,
    dimension10                 text,
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
    `ALTER TABLE IF EXISTS ${table} ADD COLUMN IF NOT EXISTS "dimension1" text;`,
    `ALTER TABLE IF EXISTS ${table} ADD COLUMN IF NOT EXISTS "dimension2" text;`,
    `ALTER TABLE IF EXISTS ${table} ADD COLUMN IF NOT EXISTS "dimension3" text;`,
    `ALTER TABLE IF EXISTS ${table} ADD COLUMN IF NOT EXISTS "dimension4" text;`,
    `ALTER TABLE IF EXISTS ${table} ADD COLUMN IF NOT EXISTS "dimension5" text;`,
    `ALTER TABLE IF EXISTS ${table} ADD COLUMN IF NOT EXISTS "dimension6" text;`,
    `ALTER TABLE IF EXISTS ${table} ADD COLUMN IF NOT EXISTS "dimension7" text;`,
    `ALTER TABLE IF EXISTS ${table} ADD COLUMN IF NOT EXISTS "dimension8" text;`,
    `ALTER TABLE IF EXISTS ${table} ADD COLUMN IF NOT EXISTS "dimension9" text;`,
    `ALTER TABLE IF EXISTS ${table} ADD COLUMN IF NOT EXISTS "dimension10" text;`,
    `CREATE INDEX IF NOT EXISTS idx_action_timestamp ON ${table} (action_timestamp);`,
    `CREATE INDEX IF NOT EXISTS idx_idvisit ON ${table}(idvisit);`,
    `CREATE INDEX IF NOT EXISTS idx_action_eventcategory ON ${table}(action_eventcategory);`,
    `CREATE INDEX IF NOT EXISTS idx_action_type ON ${table}(action_type);`,
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_eventaction ON ${table}(action_eventaction);`,
  ];

  // --------------------------------------------- //
  // If you add new query: Don't forget to update  //
  // const `NB_REQUEST_TO_INIT_DB` (index.test.js) //
  // --------------------------------------------- //

  for (const query of migrations) {
    await client.query(query, []);
  }
}

module.exports = { createTable };
