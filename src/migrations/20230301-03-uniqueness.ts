import { Kysely, sql } from "kysely";

const DESTINATION_TABLE = process.env.DESTINATION_TABLE || "matomo";

export async function up(db: Kysely<any>): Promise<void> {
  const constraintExists = await db
    .selectFrom("information_schema.table_constraints")
    .where("constraint_name", "=", "unique_action_id")
    .where("table_name", "=", DESTINATION_TABLE)
    .select("table_name")
    .executeTakeFirst();

  // create constraint only if not exist
  if (!constraintExists || !constraintExists.table_name) {
    await sql`ALTER TABLE IF EXISTS ${sql.id(
      DESTINATION_TABLE
    )} ADD CONSTRAINT unique_action_id UNIQUE (action_id)`.execute(db);
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE IF EXISTS ${sql.id(DESTINATION_TABLE)} DROP CONSTRAINT IF EXISTS unique_action_id;`.execute(db);
}
