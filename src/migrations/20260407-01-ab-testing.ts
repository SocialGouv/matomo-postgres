import { Kysely } from 'kysely'

const MATOMO_TABLE_NAME = process.env.MATOMO_TABLE_NAME || 'matomo'
const PARTITIONED_MATOMO_TABLE_NAME =
  process.env.PARTITIONED_MATOMO_TABLE_NAME || 'matomo_partitioned'

export async function up(db: Kysely<any>): Promise<void> {
  // Add column for AB Testing
  await db.schema
    .alterTable(MATOMO_TABLE_NAME)
    .addColumn('experiments', 'jsonb')
    .execute()
  await db.schema
    .alterTable(PARTITIONED_MATOMO_TABLE_NAME)
    .addColumn('experiments', 'jsonb')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop column for AB Testing
  await db.schema
    .alterTable(MATOMO_TABLE_NAME)
    .dropColumn('experiments')
    .execute()
  await db.schema
    .alterTable(PARTITIONED_MATOMO_TABLE_NAME)
    .dropColumn('experiments')
    .execute()
}
