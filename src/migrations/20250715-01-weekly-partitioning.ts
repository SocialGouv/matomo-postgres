import { Kysely, sql } from 'kysely'
import { PARTITIONED_MATOMO_TABLE_NAME } from 'src/config'

export async function up(db: Kysely<any>): Promise<void> {
  // First, create the partitioned table structure as a partitioned table
  await sql`
    CREATE TABLE ${sql.id(`${PARTITIONED_MATOMO_TABLE_NAME}`)} (
      action_id text NOT NULL,
      idsite text,
      idvisit text,
      actions text,
      country text,
      region text,
      city text,
      operatingsystemname text,
      devicemodel text,
      devicebrand text,
      visitduration text,
      dayssincefirstvisit text,
      visitortype text,
      sitename text,
      userid text,
      serverdateprettyfirstaction date,
      action_type text,
      action_eventcategory text,
      action_eventaction text,
      action_eventname text,
      action_eventvalue numeric,
      action_timespent text,
      action_timestamp timestamptz NOT NULL DEFAULT now(),
      usercustomproperties json,
      usercustomdimensions json,
      dimension1 text,
      dimension2 text,
      dimension3 text,
      dimension4 text,
      dimension5 text,
      dimension6 text,
      dimension7 text,
      dimension8 text,
      dimension9 text,
      dimension10 text,
      action_url text,
      sitesearchkeyword text,
      action_title text,
      visitorid text,
      referrertype text,
      referrername text,
      resolution text
    ) PARTITION BY RANGE (action_timestamp);
  `.execute(db)

  // Add unique constraint that includes partition key
  await sql`
    ALTER TABLE ${sql.id(`${PARTITIONED_MATOMO_TABLE_NAME}`)}
    ADD CONSTRAINT ${sql.id(`${PARTITIONED_MATOMO_TABLE_NAME}_action_id_timestamp_unique`)}
    UNIQUE (action_id, action_timestamp)
  `.execute(db)

  // Create function for automatic weekly partition creation
  await sql`
    CREATE OR REPLACE FUNCTION create_weekly_partition_if_not_exists(table_name text, partition_date timestamptz)
    RETURNS void AS $$
    DECLARE
        partition_name text;
        start_date timestamptz;
        end_date timestamptz;
        year_week text;
    BEGIN
        -- Calculate the start of the week (Monday)
        start_date := date_trunc('week', partition_date);
        end_date := start_date + interval '1 week';

        -- Generate partition name using ISO week format (YYYY-WW)
        year_week := to_char(start_date, 'IYYY') || 'w' || to_char(start_date, 'IW');
        partition_name := table_name || '_' || year_week;

        -- Check if partition already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = partition_name
            AND n.nspname = current_schema()
        ) THEN
            -- Create the partition
            EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                partition_name, table_name, start_date, end_date);

            RAISE NOTICE 'Created partition % for range % to %', partition_name, start_date, end_date;
        END IF;
    END;
    $$ LANGUAGE plpgsql;
  `.execute(db)

  // Create trigger function that automatically creates partitions on insert
  await sql`
    CREATE OR REPLACE FUNCTION ${sql.id(`${PARTITIONED_MATOMO_TABLE_NAME}_partition_trigger`)}()
    RETURNS trigger AS $$
    BEGIN
        PERFORM create_weekly_partition_if_not_exists('${sql.raw(PARTITIONED_MATOMO_TABLE_NAME)}', NEW.action_timestamp);
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `.execute(db)

  // Create trigger that fires before insert
  await sql`
    CREATE TRIGGER ${sql.id(`${PARTITIONED_MATOMO_TABLE_NAME}_auto_partition`)}
    BEFORE INSERT ON ${sql.id(`${PARTITIONED_MATOMO_TABLE_NAME}`)}
    FOR EACH ROW EXECUTE FUNCTION ${sql.id(`${PARTITIONED_MATOMO_TABLE_NAME}_partition_trigger`)}();
  `.execute(db)

  // Create stored procedure for safe insertion with automatic partition creation
  await sql`
    CREATE OR REPLACE FUNCTION insert_into_matomo_partitioned(
      p_action_id text,
      p_action_timestamp timestamptz,
      p_idsite text DEFAULT '',
      p_idvisit text DEFAULT '',
      p_actions text DEFAULT NULL,
      p_country text DEFAULT NULL,
      p_region text DEFAULT NULL,
      p_city text DEFAULT NULL,
      p_operatingsystemname text DEFAULT NULL,
      p_devicemodel text DEFAULT NULL,
      p_devicebrand text DEFAULT NULL,
      p_visitduration text DEFAULT NULL,
      p_dayssincefirstvisit text DEFAULT NULL,
      p_visitortype text DEFAULT NULL,
      p_sitename text DEFAULT NULL,
      p_userid text DEFAULT NULL,
      p_serverdateprettyfirstaction date DEFAULT NULL,
      p_action_type text DEFAULT '',
      p_action_eventcategory text DEFAULT '',
      p_action_eventaction text DEFAULT '',
      p_action_eventname text DEFAULT '',
      p_action_eventvalue numeric DEFAULT 0,
      p_action_timespent text DEFAULT '0',
      p_usercustomproperties json DEFAULT NULL,
      p_usercustomdimensions json DEFAULT NULL,
      p_dimension1 text DEFAULT NULL,
      p_dimension2 text DEFAULT NULL,
      p_dimension3 text DEFAULT NULL,
      p_dimension4 text DEFAULT NULL,
      p_dimension5 text DEFAULT NULL,
      p_dimension6 text DEFAULT NULL,
      p_dimension7 text DEFAULT NULL,
      p_dimension8 text DEFAULT NULL,
      p_dimension9 text DEFAULT NULL,
      p_dimension10 text DEFAULT NULL,
      p_action_url text DEFAULT NULL,
      p_sitesearchkeyword text DEFAULT NULL,
      p_action_title text DEFAULT NULL,
      p_visitorid text DEFAULT NULL,
      p_referrertype text DEFAULT NULL,
      p_referrername text DEFAULT NULL,
      p_resolution text DEFAULT NULL
    )
    RETURNS void
    LANGUAGE plpgsql
    SECURITY INVOKER
    AS $$
    BEGIN
        -- Ensure partition exists for the given timestamp
        PERFORM create_weekly_partition_if_not_exists('${sql.raw(PARTITIONED_MATOMO_TABLE_NAME)}', p_action_timestamp);

        -- Insert the data with conflict handling
        INSERT INTO ${sql.id(PARTITIONED_MATOMO_TABLE_NAME)} (
          action_id,
          action_timestamp,
          idsite,
          idvisit,
          actions,
          country,
          region,
          city,
          operatingsystemname,
          devicemodel,
          devicebrand,
          visitduration,
          dayssincefirstvisit,
          visitortype,
          sitename,
          userid,
          serverdateprettyfirstaction,
          action_type,
          action_eventcategory,
          action_eventaction,
          action_eventname,
          action_eventvalue,
          action_timespent,
          usercustomproperties,
          usercustomdimensions,
          dimension1,
          dimension2,
          dimension3,
          dimension4,
          dimension5,
          dimension6,
          dimension7,
          dimension8,
          dimension9,
          dimension10,
          action_url,
          sitesearchkeyword,
          action_title,
          visitorid,
          referrertype,
          referrername,
          resolution
        ) VALUES (
          p_action_id,
          p_action_timestamp,
          p_idsite,
          p_idvisit,
          p_actions,
          p_country,
          p_region,
          p_city,
          p_operatingsystemname,
          p_devicemodel,
          p_devicebrand,
          p_visitduration,
          p_dayssincefirstvisit,
          p_visitortype,
          p_sitename,
          p_userid,
          p_serverdateprettyfirstaction,
          p_action_type,
          p_action_eventcategory,
          p_action_eventaction,
          p_action_eventname,
          p_action_eventvalue,
          p_action_timespent,
          p_usercustomproperties,
          p_usercustomdimensions,
          p_dimension1,
          p_dimension2,
          p_dimension3,
          p_dimension4,
          p_dimension5,
          p_dimension6,
          p_dimension7,
          p_dimension8,
          p_dimension9,
          p_dimension10,
          p_action_url,
          p_sitesearchkeyword,
          p_action_title,
          p_visitorid,
          p_referrertype,
          p_referrername,
          p_resolution
        )
        ON CONFLICT (action_id, action_timestamp) DO NOTHING;
    END;
    $$;
  `.execute(db)

  // Create indexes on the partitioned table
  const indexes = [
    {
      name: `idx_action_eventaction_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['action_eventaction']
    },
    {
      name: `idx_action_eventcategory_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['action_eventcategory']
    },
    {
      name: `idx_action_id_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['action_id']
    },
    {
      name: `idx_action_timestamp_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['action_timestamp']
    },
    {
      name: `idx_action_type_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['action_type']
    },
    {
      name: `idx_actionurl_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['action_url']
    },
    {
      name: `idx_dimension1_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['dimension1']
    },
    {
      name: `idx_dimension2_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['dimension2']
    },
    {
      name: `idx_dimension3_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['dimension3']
    },
    {
      name: `idx_dimension4_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['dimension4']
    },
    {
      name: `idx_dimension5_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['dimension5']
    },
    {
      name: `idx_idvisit_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['idvisit']
    },
    {
      name: `idx_region_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['region']
    },
    {
      name: `idx_userid_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['userid']
    },
    {
      name: `idx_visitorid_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['visitorid']
    },
    {
      name: `idx_category_timestamp_${PARTITIONED_MATOMO_TABLE_NAME}`,
      columns: ['action_eventcategory', 'action_timestamp']
    }
  ]

  // Create indexes
  for (const index of indexes) {
    await db.schema
      .createIndex(index.name)
      .on(PARTITIONED_MATOMO_TABLE_NAME)
      .using('btree')
      .columns(index.columns)
      .execute()
  }

  // Create the date-based index
  await db.schema
    .createIndex(`actions_day_${PARTITIONED_MATOMO_TABLE_NAME}`)
    .on(PARTITIONED_MATOMO_TABLE_NAME)
    .expression(sql`date(timezone('UTC', action_timestamp))`)
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop trigger and function
  await sql`DROP TRIGGER IF EXISTS ${sql.id(`${PARTITIONED_MATOMO_TABLE_NAME}_auto_partition`)} ON ${sql.id(PARTITIONED_MATOMO_TABLE_NAME)}`.execute(
    db
  )
  await sql`DROP FUNCTION IF EXISTS ${sql.id(`${PARTITIONED_MATOMO_TABLE_NAME}_partition_trigger`)}()`.execute(
    db
  )
  await sql`DROP FUNCTION IF EXISTS create_weekly_partition_if_not_exists(text, timestamptz)`.execute(
    db
  )
  await sql`DROP FUNCTION IF EXISTS insert_into_matomo_partitioned`.execute(db)

  // Drop the partitioned table (this will also drop all partitions)
  await db.schema.dropTable(PARTITIONED_MATOMO_TABLE_NAME).ifExists().execute()
}
