# @socialgouv/matomo-postgres

![header](./header.png)

Extract matomo data from [`Live.getLastVisitsDetails`](https://developer.matomo.org/api-reference/reporting-api) API and push events and visits informations to Postgres.

Use [pg_partman](https://github.com/pgpartman/pg_partman) to partition data by month.

## Usage

Create the [initial table](./initial.sql) database table then run the following job with correct environment variables.

```sh
npx @socialgouv/matomo-postgres
```

### Environment variables Deployment

| name              | value                                                    |
| ----------------- | -------------------------------------------------------- |
| MATOMO_KEY\*      | matomo api token                                         |
| MATOMO_SITE\*     | matomo site id                                           |
| MATOMO_URL\*      | matomo url                                               |
| PGDATABASE\*      | Postgres connection string                               |
| DESTINATION_TABLE | `matomo`                                                 |
| STARTDATE         | default to today()                                       |
| RESULTPERPAGE     | matomo pagination (defaults to 500)                      |
| INITIAL_OFFSET    | How many days to fetch on initialisation (defaults to 3) |

## Dev

```sh
docker-compose up
export MATOMO_URL=
export MATOMO_SITE=
export MATOMO_KEY=
export DESTINATION_TABLE= # optional
export STARTDATE= # optional
export OFFSET= # optional
export PGDATABASE=postgres://postgres:postgres@127.0.0.1:5455/postgres
yarn start
```

Use `yarn test -u` to update the snapshots

## Database migrations

`yarn migrate` is run on each `yarn start` with Kysely migrations at [./src/migrations](./src/migrations/)
