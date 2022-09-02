-- converting existing matomo table to partitioned witg pg_partman
-- usage : ON_ERROR_STOP=1 psql < partition.sql

--- pg_partman setup

CREATE SCHEMA IF NOT EXISTS partman;
CREATE EXTENSION IF NOT EXISTS pg_partman SCHEMA partman;

--- backup and recreate a new partionned matomo table

CREATE TABLE IF NOT EXISTS matomo_tmp as (select * from matomo);

ALTER TABLE IF EXISTS matomo RENAME TO matomo_backup;

CREATE TABLE IF NOT EXISTS matomo
(
    idsite                      text,
    idvisit                     text,
    actions                     text,
    country                     text,
    region                      text,
    city                        text,
    operatingsystemname         text,
    devicemodel                 text,
    devicebrand                 text,
    visitduration               text,
    dayssincefirstvisit         text,
    visitortype                 text,
    sitename                    text,
    userid                      text,
    serverdateprettyfirstaction date,
    action_id                   text,
    action_type                 text,
    action_eventcategory        text,
    action_eventaction          text,
    action_eventname            text,
    action_eventvalue           decimal,
    action_timespent            text,
    action_timestamp            timestamp with time zone DEFAULT now(),
    usercustomproperties        json,
    usercustomdimensions        json,
    dimension1                  text,
    dimension2                  text,
    dimension3                  text,
    dimension4                  text,
    dimension5                  text,
    dimension6                  text,
    dimension7                  text,
    dimension8                  text,
    dimension9                  text,
    dimension10                 text,
    action_url                  text,
    sitesearchkeyword           text,
    action_title                text
) PARTITION BY RANGE (action_timestamp);

ALTER TABLE IF EXISTS matomo ADD CONSTRAINT unique_action_id UNIQUE (action_id, action_timestamp);
ALTER TABLE IF EXISTS matomo ALTER COLUMN action_eventvalue TYPE decimal USING action_eventvalue::decimal;
CREATE INDEX IF NOT EXISTS idx_action_timestamp_matomo ON matomo (action_timestamp);
CREATE INDEX IF NOT EXISTS idx_idvisit_matomo ON matomo(idvisit);
CREATE INDEX IF NOT EXISTS idx_action_eventcategory_matomo ON matomo(action_eventcategory);
CREATE INDEX IF NOT EXISTS idx_action_type_matomo ON matomo(action_type);
CREATE INDEX IF NOT EXISTS idx_action_eventaction_matomo ON matomo(action_eventaction);

SELECT partman.create_parent('public.matomo', 'action_timestamp', 'native', 'monthly');

-- Import des données depuis la table standard vers la table partitionnée
CALL partman.partition_data_proc('public.matomo', p_source_table := 'public.matomo_tmp', p_order:= 'DESC');

VACUUM ANALYZE public.matomo;

DROP TABLE if exists matomo_tmp;

