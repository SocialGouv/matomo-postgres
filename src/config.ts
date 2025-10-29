import { MatomoTableName } from 'types'

// DIAGNOSTIC: Log when config is being loaded
console.log('🔍 [DIAGNOSTIC] config.ts module loading...')
console.log('🔍 [DIAGNOSTIC] Reading environment variables:')
console.log('  - PGDATABASE:', process.env.PGDATABASE ? `SET (length: ${process.env.PGDATABASE.length})` : 'NOT SET OR EMPTY')
console.log('  - MATOMO_URL:', process.env.MATOMO_URL ? 'SET' : 'NOT SET (will use default)')
console.log('  - MATOMO_SITE:', process.env.MATOMO_SITE ? 'SET' : 'NOT SET (will use default)')
console.log('  - MATOMO_KEY:', process.env.MATOMO_KEY ? 'SET' : 'NOT SET')

export const MATOMO_KEY = process.env.MATOMO_KEY || ''
export const MATOMO_URL =
  process.env.MATOMO_URL || 'https://matomo.fabrique.social.gouv.fr/'
export const MATOMO_SITE = process.env.MATOMO_SITE || 0
export const PGDATABASE = process.env.PGDATABASE || ''
export const INITIAL_OFFSET = process.env.INITIAL_OFFSET || '3'
export const RESULTPERPAGE = process.env.RESULTPERPAGE || '500'
export const FORCE_STARTDATE = process.env.FORCE_STARTDATE === 'true'

console.log('🔍 [DIAGNOSTIC] config.ts module loaded\n')

// We will create both a normal and a partitioned table (MATOMO_TABLE_NAME and PARTITIONED_MATOMO_TABLE_NAME)
// and use DESTINATION_TABLE to determine which one to write to.
export const DESTINATION_TABLE: MatomoTableName =
  process.env.DESTINATION_TABLE || 'matomo'
export const MATOMO_TABLE_NAME: MatomoTableName =
  process.env.MATOMO_TABLE_NAME || 'matomo'
export const PARTITIONED_MATOMO_TABLE_NAME: MatomoTableName =
  process.env.PARTITIONED_MATOMO_TABLE_NAME || 'matomo_partitioned'
