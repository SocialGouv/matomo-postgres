import { Kysely } from 'kysely'

const DESTINATION_TABLE = process.env.DESTINATION_TABLE || 'matomo'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable(DESTINATION_TABLE)
    .addColumn('resolution', 'text')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable(DESTINATION_TABLE)
    .dropColumn('resolution')
    .execute()
}
