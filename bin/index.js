#!/usr/bin/env node

// DIAGNOSTIC: Log environment state at entry point
console.log('🔍 [DIAGNOSTIC] bin/index.js starting...')
console.log('🔍 [DIAGNOSTIC] PGDATABASE env var:', process.env.PGDATABASE ? `SET (length: ${process.env.PGDATABASE.length})` : 'NOT SET OR EMPTY')
console.log('🔍 [DIAGNOSTIC] NODE_ENV:', process.env.NODE_ENV || 'NOT SET')
console.log('🔍 [DIAGNOSTIC] Current working directory:', process.cwd())
console.log('🔍 [DIAGNOSTIC] About to import db module...\n')

import { db } from '../dist/db.js'
import run from '../dist/index.js'
import { startMigration } from '../dist/migrate-latest.js'

console.log('🔍 [DIAGNOSTIC] Modules imported successfully\n')

async function start(date) {
  console.log(`\nRunning migrations\n`)
  await startMigration()
  console.log(`\nStarting import\n`)
  await run(date)
  db.destroy()
}

const date =
  (process.argv[process.argv.length - 1].match(/^\d\d\d\d-\d\d-\d\d$/) &&
    process.argv[process.argv.length - 1]) ||
  ''
console.log(`\nRunning @socialgouv/matomo-postgres ${date}\n`)
start(date)
