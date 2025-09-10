import { promises as fs } from 'fs'
import { FileMigrationProvider, Migrator } from 'kysely'
import * as path from 'path'

import { MATOMO_TABLE_NAME } from './config.js'
import { db } from './db.js'

async function migrateToLatest() {
  console.log(`Starting migrate to latest`)

  try {
    const migrator = new Migrator({
      db,
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: path.join(
          path.dirname(new URL(import.meta.url).pathname),
          'migrations'
        )
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
    } else if (!results?.length) {
      console.log('No migration to run')
    }
  } catch (uncaughtError) {
    console.error('UNCAUGHT ERROR during migration:')
    console.error(
      'Error message:',
      uncaughtError instanceof Error
        ? uncaughtError.message
        : String(uncaughtError)
    )
    console.error(
      'Error stack:',
      uncaughtError instanceof Error
        ? uncaughtError.stack
        : 'No stack trace available'
    )
    console.error('Full error object:', uncaughtError)
    process.exit(1)
  }
}

export default migrateToLatest

export async function startMigration() {
  await migrateToLatest()
  // Don't destroy the db connection here since the main application will need it
}
