import startDebug from 'debug'
import { Kysely, PostgresDialect } from 'kysely'
import pkg from 'pg'
import { MatomoTable } from 'types'
const { Pool } = pkg

import { PGDATABASE } from './config.js'

startDebug('db')

// DIAGNOSTIC: Log environment state at module load time
console.log('🔍 [DIAGNOSTIC] db.ts module loading...')
console.log('🔍 [DIAGNOSTIC] PGDATABASE value:', PGDATABASE ? `SET (length: ${PGDATABASE.length})` : 'NOT SET OR EMPTY')
console.log('🔍 [DIAGNOSTIC] Pool constructor type:', typeof Pool)

export interface Database {
  [key: string]: MatomoTable
}

export const pool = new Pool({
  connectionString: PGDATABASE,
  ssl: {
    rejectUnauthorized: false
  }
})

// DIAGNOSTIC: Log pool creation details
console.log('🔍 [DIAGNOSTIC] Pool created:', pool ? 'YES' : 'NO')
console.log('🔍 [DIAGNOSTIC] Pool has connect method:', pool && typeof pool.connect === 'function' ? 'YES' : 'NO')
console.log('🔍 [DIAGNOSTIC] Pool object keys:', pool ? Object.keys(pool).join(', ') : 'N/A')

// Validate pool is properly initialized
if (!pool || typeof pool.connect !== 'function') {
  throw new Error('Failed to initialize PostgreSQL connection pool')
}

// DIAGNOSTIC: Log dialect creation
console.log('🔍 [DIAGNOSTIC] Creating PostgresDialect with pool...')
const dialect = new PostgresDialect({ pool: pool })
console.log('🔍 [DIAGNOSTIC] PostgresDialect created:', dialect ? 'YES' : 'NO')

export const db = new Kysely<Database>({
  dialect: dialect,
  log(event) {
    if (event.level === 'query') {
      // debug(event.query.sql)
      // debug(event.query.parameters)
    }
  }
})

// DIAGNOSTIC: Log final db instance
console.log('🔍 [DIAGNOSTIC] Kysely db instance created:', db ? 'YES' : 'NO')
console.log('🔍 [DIAGNOSTIC] db.ts module loaded successfully\n')

// Validate the Kysely instance
if (!db) {
  throw new Error('Failed to initialize Kysely database instance')
}
