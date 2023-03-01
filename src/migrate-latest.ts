import * as path from "path";
import { promises as fs } from "fs";
import { Migrator, FileMigrationProvider } from "kysely";
import { db } from "./db";

async function migrateToLatest() {
  const extension = await db
    .selectFrom("pg_extension")
    //@ts-ignore
    .select("extname")
    //@ts-ignore
    .where("extname", "=", "pg_partman")
    .executeTakeFirst();

  if (extension) {
    console.error("pg_partman extension detected; Skip migrations");
    return;
  }

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: __dirname + "/migrations",
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("failed to migrate");
    console.error(error);
    process.exit(1);
  } else {
    if (!results?.length) {
      console.log("No migration to run");
    }
  }

  await db.destroy();
}

migrateToLatest();
