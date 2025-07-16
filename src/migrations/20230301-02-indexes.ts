import { Kysely, sql } from 'kysely'

const MATOMO_TABLE_NAME = process.env.MATOMO_TABLE_NAME || 'matomo'

const indexes = [
  {
    name: 'idx_action_eventaction_matomo',
    columns: ['action_eventaction']
  },
  {
    name: 'idx_action_eventcategory_matomo',
    columns: ['action_eventcategory']
  },
  {
    name: 'idx_action_id',
    columns: ['action_id']
  },
  {
    name: 'idx_action_timestamp_matomo',
    columns: ['action_timestamp']
  },
  {
    name: 'idx_action_type_matomo',
    columns: ['action_type']
  },
  {
    name: 'idx_actionurl',
    columns: ['action_url']
  },
  {
    name: 'idx_dimension1',
    columns: ['dimension1']
  },
  {
    name: 'idx_dimension2',
    columns: ['dimension2']
  },
  {
    name: 'idx_dimension3',
    columns: ['dimension3']
  },
  {
    name: 'idx_dimension4',
    columns: ['dimension4']
  },
  {
    name: 'idx_dimension5',
    columns: ['dimension5']
  },
  {
    name: 'idx_idvisit_matomo',
    columns: ['idvisit']
  },
  {
    name: 'idx_region',
    columns: ['region']
  },
  {
    name: 'idx_userid',
    columns: ['userid']
  },
  {
    name: 'idx_visitorid',
    columns: ['visitorid']
  }
]

export async function up(db: Kysely<any>): Promise<void> {
  indexes.forEach(async (index) => {
    await db.schema
      .createIndex(index.name)
      .ifNotExists()
      .on(MATOMO_TABLE_NAME)
      .using('btree')
      .columns(index.columns)
      .execute()
  })
  await db.schema
    .createIndex('actions_day')
    .ifNotExists()
    .on(MATOMO_TABLE_NAME)
    .expression(sql`date(timezone('UTC', action_timestamp))`)
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  indexes.forEach(async (index) => {
    await db.schema.dropIndex(index.name).execute()
  })
  db.schema.dropIndex('actions_day').execute()
}
