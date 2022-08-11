#!/bin/bash -e

echo "Creating partman extension"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE SCHEMA partman;
    CREATE EXTENSION pg_partman SCHEMA partman;
EOSQL

echo "ADDING pg_partman_bgw TO postgresql.conf"
echo "shared_preload_libraries = 'pg_partman_bgw'" >> $PGDATA/postgresql.conf
echo "pg_partman_bgw.interval = 3600" >> $PGDATA/postgresql.conf
echo "pg_partman_bgw.role = '$POSTGRES_USER'" >> $PGDATA/postgresql.conf
echo "pg_partman_bgw.dbname = '$POSTGRES_DB'" >> $PGDATA/postgresql.conf