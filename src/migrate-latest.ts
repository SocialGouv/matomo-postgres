import { promises as fs } from 'fs'
import { FileMigrationProvider, Migrator } from 'kysely'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import { MATOMO_TABLE_NAME } from './config.js'
import { db } from './db.js'

async function migrateToLatest() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: __dirname + '/migrations'
    }),
    // allow to have mutliple migratable instances in a single schema
    migrationTableName: `${MATOMO_TABLE_NAME}_migration`,
    migrationLockTableName: `${MATOMO_TABLE_NAME}_migration_lock`
  })

  const { error, results } = await migrator.migrateToLatest()

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration "${it.migrationName}" was executed successfully`)
    } else if (it.status === 'Error') {
      console.error(`failed to execute migration "${it.migrationName}"`)
    }
  })

  if (error) {
    console.error('failed to migrate')
    console.error(error)
    process.exit(1)
  } else {
    if (!results?.length) {
      console.log('No migration to run')
    }
  }
}

export default migrateToLatest

async function start() {
  await migrateToLatest()
  await db.destroy()
}

start()
