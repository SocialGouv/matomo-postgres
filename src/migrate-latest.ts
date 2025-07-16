import { promises as fs } from 'fs'
import { FileMigrationProvider, Migrator } from 'kysely'
import * as path from 'path'

import { DESTINATION_TABLE } from './config'
import { db } from './db'

async function migrateToLatest() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: __dirname + '/migrations'
    }),
    // allow to have mutliple migratable instances in a single schema
    migrationTableName: `${DESTINATION_TABLE}_migration`,
    migrationLockTableName: `${DESTINATION_TABLE}_migration_lock`
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

if (require.main === module) {
  start()
}
