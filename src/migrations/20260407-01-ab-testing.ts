import { Kysely, sql } from 'kysely'

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

  // Drop the previous version of the stored procedure so the signature can grow
  // (CREATE OR REPLACE refuses to change parameter lists in PL/pgSQL).
  await sql`DROP FUNCTION IF EXISTS insert_into_matomo_partitioned(
    text, timestamptz, text, text, text, text, text, text, text, text, text,
    text, text, text, text, text, date, text, text, text, text, numeric, text,
    json, json, text, text, text, text, text, text, text, text, text, text,
    text, text, text, text, text, text, text
  )`.execute(db)

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
      p_resolution text DEFAULT NULL,
      p_experiments jsonb DEFAULT NULL
    )
    RETURNS void
    LANGUAGE plpgsql
    SECURITY INVOKER
    AS $$
    BEGIN
        PERFORM create_weekly_partition_if_not_exists('${sql.raw(PARTITIONED_MATOMO_TABLE_NAME)}', p_action_timestamp);

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
          resolution,
          experiments
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
          p_resolution,
          p_experiments
        )
        ON CONFLICT (action_id, action_timestamp) DO NOTHING;
    END;
    $$;
  `.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop the new version of the stored procedure
  await sql`DROP FUNCTION IF EXISTS insert_into_matomo_partitioned(
    text, timestamptz, text, text, text, text, text, text, text, text, text,
    text, text, text, text, text, date, text, text, text, text, numeric, text,
    json, json, text, text, text, text, text, text, text, text, text, text,
    text, text, text, text, text, text, text, jsonb
  )`.execute(db)

  // Restore the previous version (without experiments) so the downgrade is usable
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
        PERFORM create_weekly_partition_if_not_exists('${sql.raw(PARTITIONED_MATOMO_TABLE_NAME)}', p_action_timestamp);

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
