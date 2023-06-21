#!/usr/bin/env node

const { default: run } = require("../dist/index");
const { default: migrate } = require("../dist/migrate-latest");

async function start(date) {
  console.log(`\nRunning migrations\n`);
  await migrate();
  console.log(`\nStarting import\n`);
  await run(date);
}

if (require.main === module) {
  const date =
    (process.argv[process.argv.length - 1].match(/^\d\d\d\d-\d\d-\d\d$/) && process.argv[process.argv.length - 1]) ||
    "";
  console.log(`\nRunning @socialgouv/matomo-postgres ${date}\n`);
  start(date);
}
