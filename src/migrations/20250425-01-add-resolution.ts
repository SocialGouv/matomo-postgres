import { Kysely, sql } from 'kysely'

const MATOMO_TABLE_NAME = process.env.MATOMO_TABLE_NAME || 'matomo'

export async function up(db: Kysely<any>): Promise<void> {
  // Check if the column already exists before trying to add it
  const columnExists = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = ${MATOMO_TABLE_NAME}
      AND column_name = 'resolution'
    ) as exists
  `.execute(db)

  if (!columnExists.rows[0].exists) {
    await db.schema
      .alterTable(MATOMO_TABLE_NAME)
      .addColumn('resolution', 'text')
      .execute()
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable(MATOMO_TABLE_NAME)
    .dropColumn('resolution')
    .execute()
}
