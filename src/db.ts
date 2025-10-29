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

export const pool = new Pool({
  connectionString: PGDATABASE,
  ssl: {
    rejectUnauthorized: false
  }
})

// Validate pool is properly initialized
if (!pool || typeof pool.connect !== 'function') {
  throw new Error('Failed to initialize PostgreSQL connection pool')
}

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: pool
  }),
  log(event) {
    if (event.level === 'query') {
      // debug(event.query.sql)
      // debug(event.query.parameters)
    }
  }
})

// Validate the Kysely instance
if (!db) {
  throw new Error('Failed to initialize Kysely database instance')
}
