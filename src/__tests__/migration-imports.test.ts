import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

describe('Migration Import Validation', () => {
  it('should not have src/ imports in migration files', async () => {
    const migrationsDir = join(__dirname, '../migrations')
    const migrationFiles = await readdir(migrationsDir)
    const tsFiles = migrationFiles.filter((file) => file.endsWith('.ts'))

    const problematicFiles: string[] = []

    for (const file of tsFiles) {
      const filePath = join(migrationsDir, file)
      const content = await readFile(filePath, 'utf-8')

      // Check for imports from 'src/' paths
      const srcImportRegex =
        /(?:import\s+[^;]+from\s+['"]src\/|require\s*\(\s*['"]src\/)/g
      const matches = content.match(srcImportRegex)

      if (matches) {
        problematicFiles.push(`${file}: ${matches.join(', ')}`)
      }
    }

    if (problematicFiles.length > 0) {
      fail(
        `Migration files contain problematic src/ imports that will fail in production:\n${problematicFiles.join('\n')}\n\nMigration files should use direct constants or relative imports instead.`
      )
    }
  })

  it('should have at least one migration file', async () => {
    const migrationsDir = join(__dirname, '../migrations')
    const migrationFiles = await readdir(migrationsDir)
    const tsFiles = migrationFiles.filter((file) => file.endsWith('.ts'))

    expect(tsFiles.length).toBeGreaterThan(0)
  })
})
