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
    action_title                text
) PARTITION BY RANGE (action_timestamp);
`;

  await client.query(text, []);

  const migrations = [
    `CREATE INDEX IF NOT EXISTS idx_dimension1 ON matomo(dimension1);
     CREATE INDEX IF NOT EXISTS idx_dimension2 ON matomo(dimension2);
     CREATE INDEX IF NOT EXISTS idx_dimension3 ON matomo(dimension3);
     CREATE INDEX IF NOT EXISTS idx_dimension4 ON matomo(dimension4);
     CREATE INDEX IF NOT EXISTS idx_dimension5 ON matomo(dimension5);
     CREATE INDEX IF NOT EXISTS idx_userid ON matomo(userid);`,
  ];

  for (const query of migrations) {
    await client.query(query, []);
  }
}

module.exports = { createTable };
