import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { MatomoTable, MatomoTableName } from "types";
const { PGDATABASE } = require("./config");

// Keys of this interface are table names.
export type Database = Record<MatomoTableName, MatomoTable>;

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: PGDATABASE,
    }),
  }),
});
