import startDebug from 'debug'
import { Kysely, PostgresDialect } from 'kysely'
import pkg from 'pg'
import { MatomoTable } from 'types'
const { Pool } = pkg

import { PGDATABASE } from './config.js'

startDebug('db')

export interface Database {
  [key: string]: MatomoTable
}

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: PGDATABASE,
      ssl: {
        rejectUnauthorized: false
      }
    })
  }),
  log(event) {
    if (event.level === 'query') {
      // debug(event.query.sql);
      // debug(event.query.parameters);
    }
  }
})
