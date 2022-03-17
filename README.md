# @socialgouv/matomo-postgres

![header](./header.png)

Extract matomo data from [`Live.getLastVisitsDetails`](https://developer.matomo.org/api-reference/reporting-api) API and push events and visits informations to Postgres.

## Usage

```sh
npx @socialgouv/matomo-postgres
```

### Environment variables Deployment

| name              | value                                          |
| ----------------- | ---------------------------------------------- |
| MATOMO_KEY\*      | matomo api token                               |
| MATOMO_SITE\*     | matomo site id                                 |
| MATOMO_URL\*      | matomo url                                     |
| PGDATABASE\*      | Postgres connection string                     |
| DESTINATION_TABLE | `matomo`                                       |
| STARTDATE         | default to today()                             |
| RESULTPERPAGE     | matomo pagination : `100`                      |
| OFFSET            | default days to check in the past; default = 3 |

## Dev

```sh
docker-compose up
export MATOMO_URL=
export MATOMO_SITE=
export MATOMO_KEY=
export DESTINATION_TABLE=
export STARTDATE=
export OFFSET=
export PGDATABASE=postgres://postgres:postgres@127.0.0.1:5455/postgres
yarn start
```

Use `yarn test -u` to update the snapshots
