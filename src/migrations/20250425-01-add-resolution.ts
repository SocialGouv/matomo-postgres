import { Kysely } from 'kysely'

const MATOMO_TABLE_NAME = process.env.MATOMO_TABLE_NAME || 'matomo'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable(MATOMO_TABLE_NAME)
    .addColumn('resolution', 'text')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable(MATOMO_TABLE_NAME)
    .dropColumn('resolution')
    .execute()
}
