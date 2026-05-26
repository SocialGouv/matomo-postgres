import { Kysely, sql } from 'kysely'

import {
  DESTINATION_TABLE,
  MATOMO_TABLE_NAME,
  PARTITIONED_MATOMO_TABLE_NAME
} from './config.js'

// Kysely migrations operate on MATOMO_TABLE_NAME (default `matomo`), but
// several deployments run multiple cronjobs against a single database with
// distinct DESTINATION_TABLEs (matomo_back, matomo_app, matomo_landing, ...).
// Schema changes applied to `matomo` never reach those custom destinations,
// and INSERTs fail with `column "..." does not exist`. After running the
// regular migrations, mirror any missing columns from MATOMO_TABLE_NAME onto
// DESTINATION_TABLE so writes stay schema-compatible.
export async function syncDestinationTableSchema(
  db: Kysely<any>
): Promise<void> {
  if (
    DESTINATION_TABLE === MATOMO_TABLE_NAME ||
    DESTINATION_TABLE === PARTITIONED_MATOMO_TABLE_NAME
  ) {
    return
  }

  type MissingColumn = { attname: string; coltype: string }
  const { rows } = await sql<MissingColumn>`
    SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS coltype
    FROM pg_attribute a
    WHERE a.attrelid = ${MATOMO_TABLE_NAME}::regclass
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND NOT EXISTS (
        SELECT 1 FROM pg_attribute b
        WHERE b.attrelid = ${DESTINATION_TABLE}::regclass
          AND b.attname = a.attname
          AND b.attnum > 0
          AND NOT b.attisdropped
      )
  `.execute(db)

  for (const { attname, coltype } of rows) {
    console.log(
      `Syncing schema: adding column "${attname}" ${coltype} to ${DESTINATION_TABLE}`
    )
    await sql`
      ALTER TABLE ${sql.id(DESTINATION_TABLE)}
      ADD COLUMN ${sql.id(attname)} ${sql.raw(coltype)}
    `.execute(db)
  }
}
