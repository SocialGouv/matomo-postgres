#!/usr/bin/env node

import { db } from '../dist/db.js'
import run from '../dist/index.js'
import migrate from '../dist/migrate-latest.js'

async function start(date) {
  console.log(`\nRunning migrations\n`)
  await migrate()
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
