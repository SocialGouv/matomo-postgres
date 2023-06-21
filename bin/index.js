#!/usr/bin/env node

const { default: run } = require("../dist/index");

if (require.main === module) {
  const date =
    (process.argv[process.argv.length - 1].match(/^\d\d\d\d-\d\d-\d\d$/) && process.argv[process.argv.length - 1]) ||
    "";
  console.log(`\nRunning @socialgouv/matomo-postgres ${date}\n`);
  console.log(`\nRunning migrations\n`);
  require("../dist/migrate-latest");
  console.log(`\nStarting import\n`);
  run(date);
}
