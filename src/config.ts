import { MatomoTableName } from 'types'

export const MATOMO_KEY = process.env.MATOMO_KEY || ''
export const MATOMO_URL =
  process.env.MATOMO_URL || 'https://matomo.fabrique.social.gouv.fr/'
export const MATOMO_SITE = process.env.MATOMO_SITE || 0
export const PGDATABASE = process.env.PGDATABASE || ''
export const INITIAL_OFFSET = process.env.INITIAL_OFFSET || '3'
export const RESULTPERPAGE = process.env.RESULTPERPAGE || '500'
export const FORCE_STARTDATE = process.env.FORCE_STARTDATE === 'true'

// We will create both a normal and a partitioned table (MATOMO_TABLE_NAME and PARTITIONED_MATOMO_TABLE_NAME)
// and use DESTINATION_TABLE to determine which one to write to.
export const DESTINATION_TABLE: MatomoTableName =
  process.env.DESTINATION_TABLE || 'matomo'
export const MATOMO_TABLE_NAME: MatomoTableName =
  process.env.MATOMO_TABLE_NAME || 'matomo'
export const PARTITIONED_MATOMO_TABLE_NAME: MatomoTableName =
  process.env.PARTITIONED_MATOMO_TABLE_NAME || 'matomo_partitioned'
