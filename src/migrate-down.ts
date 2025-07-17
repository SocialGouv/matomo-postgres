import { promises as fs } from 'fs'
import { FileMigrationProvider, Migrator } from 'kysely'
import * as path from 'path'

import { db } from './db.js'

async function migrateDown() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: './migrations'
    })
  })

  const { error, results } = await migrator.migrateDown()

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(
        `down migration "${it.migrationName}" was executed successfully`
      )
    } else if (it.status === 'Error') {
      console.error(`failed to execute down migration "${it.migrationName}"`)
    }
  })

  if (error) {
    console.error('failed to down migrate')
    console.error(error)
    process.exit(1)
  }

  await db.destroy()
}

migrateDown()
