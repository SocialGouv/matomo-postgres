const { Client } = require("pg");

const { DESTINATION_TABLE } = require("./config");

/**
 *
 * @param {Client} client
 */
async function createTable(client) {
  const table = client.escapeIdentifier(DESTINATION_TABLE);
  const text = `

CREATE SCHEMA IF NOT EXISTS partman;
CREATE EXTENSION IF NOT EXISTS pg_partman SCHEMA partman;
CREATE TABLE IF NOT EXISTS ${table}
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
    action_eventvalue           decimal,
    action_timespent            text,
    action_timestamp            timestamp with time zone DEFAULT now(),
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
    action_title                text,
    visitorid                   text,
    referrertype                text,
    referrername                text
) PARTITION BY RANGE (action_timestamp);
`;

  await client.query(text, []);

  const migrations = [
    `CREATE INDEX IF NOT EXISTS idx_dimension1 ON ${table}(dimension1);
     CREATE INDEX IF NOT EXISTS idx_dimension2 ON ${table}(dimension2);
     CREATE INDEX IF NOT EXISTS idx_dimension3 ON ${table}(dimension3);
     CREATE INDEX IF NOT EXISTS idx_dimension4 ON ${table}(dimension4);
     CREATE INDEX IF NOT EXISTS idx_dimension5 ON ${table}(dimension5);
     CREATE INDEX IF NOT EXISTS idx_userid ON ${table}(userid);
     CREATE INDEX IF NOT EXISTS idx_actionurl ON ${table}(action_url);
     CREATE INDEX IF NOT EXISTS idx_region ON ${table}(region);`,
    `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS visitorid text;
     ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS referrertype text;
     ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS referrername text;
     CREATE INDEX IF NOT EXISTS idx_visitorid ON ${table}(visitorid);`,
  ];

  for (const query of migrations) {
    await client.query(query, []);
  }
}

module.exports = { createTable };
