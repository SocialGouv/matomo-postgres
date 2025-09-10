import { Kysely, sql } from 'kysely'

const PARTITIONED_MATOMO_TABLE_NAME =
  process.env.PARTITIONED_MATOMO_TABLE_NAME || 'matomo_partitioned'

export async function up(db: Kysely<any>): Promise<void> {
  // Create conditional index for convention collective analysis
  await sql`
    CREATE INDEX IF NOT EXISTS idx_convention_analysis_matomo_partitioned
    ON ${sql.id(PARTITIONED_MATOMO_TABLE_NAME)} (action_type, action_url, action_timestamp)
    WHERE action_url LIKE 'https://code.travail.gouv.fr/convention-collective/%'
  `.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop the conditional index
  await sql`
    DROP INDEX IF EXISTS idx_convention_analysis_matomo_partitioned
  `.execute(db)
}
