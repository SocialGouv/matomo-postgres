import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { MatomoTable, MatomoTableName } from "types";
const { PGDATABASE } = require("./config");

export interface Database {
  [key: string]: MatomoTable;
}

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: PGDATABASE,
    }),
  }),
  log(event) {
    if (event.level === "query") {
      //  console.log(event.query.sql);
      //console.log(event.query.parameters);
    }
  },
});
