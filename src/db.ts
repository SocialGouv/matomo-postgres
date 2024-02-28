import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { MatomoTable } from "types";
import startDebug from "debug";
import { PGDATABASE } from "./config";

const debug = startDebug("db");

export interface Database {
  [key: string]: MatomoTable;
}

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: PGDATABASE,
      ssl: {
        rejectUnauthorized: false,
      }
    }),
  }),
  log(event) {
    if (event.level === "query") {
      // debug(event.query.sql);
      // debug(event.query.parameters);
    }
  },
});
