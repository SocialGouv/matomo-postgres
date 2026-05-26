import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // The EXCEPTION handler was added to 20250715-01-weekly-partitioning.ts in
  // commit 7d703de, but that file had already been applied on existing
  // databases, so kysely never re-ran it. This migration re-applies the
  // CREATE OR REPLACE on already-deployed databases so they stop crashing
  // with `relation "matomo_partitioned_YYYYwWW" already exists` under the
  // p-all concurrent import.
  await sql`
    CREATE OR REPLACE FUNCTION create_weekly_partition_if_not_exists(table_name text, partition_date timestamptz)
    RETURNS void AS $$
    DECLARE
        partition_name text;
        start_date timestamptz;
        end_date timestamptz;
        year_week text;
    BEGIN
        start_date := date_trunc('week', partition_date);
        end_date := start_date + interval '1 week';

        year_week := to_char(start_date, 'IYYY') || 'w' || to_char(start_date, 'IW');
        partition_name := table_name || '_' || year_week;

        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = partition_name
            AND n.nspname = current_schema()
        ) THEN
            EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                partition_name, table_name, start_date, end_date);

            RAISE NOTICE 'Created partition % for range % to %', partition_name, start_date, end_date;
        END IF;
    EXCEPTION
        WHEN duplicate_table THEN
            RAISE NOTICE 'Partition % already exists (created concurrently)', partition_name;
    END;
    $$ LANGUAGE plpgsql;
  `.execute(db)
}

export async function down(_db: Kysely<any>): Promise<void> {
  // No-op: rolling back would re-introduce the race condition crash.
}
