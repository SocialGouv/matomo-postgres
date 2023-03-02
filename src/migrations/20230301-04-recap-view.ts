import { Kysely, sql } from "kysely";

const DESTINATION_TABLE = process.env.DESTINATION_TABLE || "matomo";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE MATERIALIZED VIEW IF NOT EXISTS ${sql.id(
    DESTINATION_TABLE + "_recap"
  )} (action_date, actions, rows, visits, visitors) AS
        SELECT 
          date(action_timestamp AT TIME ZONE 'UTC') as action_date,
          count(distinct action_id) as actions,
          count(*) as rows,count(distinct idvisit) as visits,
          count (distinct visitorid) as visitors
        FROM ${sql.id(DESTINATION_TABLE)} 
        GROUP by date(action_timestamp AT TIME ZONE 'UTC');`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP MATERIALIZED VIEW ${sql.id(DESTINATION_TABLE)}_recap;`.execute(db);
}
