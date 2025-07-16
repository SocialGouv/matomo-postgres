import { Kysely, sql } from 'kysely'

const DESTINATION_TABLE = process.env.DESTINATION_TABLE || 'matomo'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable(DESTINATION_TABLE)
    .ifNotExists()
    .addColumn('action_id', 'text', (col) => col.unique().notNull())
    .addColumn('idsite', 'text')
    .addColumn('idvisit', 'text')
    .addColumn('actions', 'text')
    .addColumn('country', 'text')
    .addColumn('region', 'text')
    .addColumn('city', 'text')
    .addColumn('operatingsystemname', 'text')
    .addColumn('devicemodel', 'text')
    .addColumn('devicebrand', 'text')
    .addColumn('visitduration', 'text')
    .addColumn('dayssincefirstvisit', 'text')
    .addColumn('visitortype', 'text')
    .addColumn('sitename', 'text')
    .addColumn('userid', 'text')
    .addColumn('serverdateprettyfirstaction', 'date')
    .addColumn('action_type', 'text')
    .addColumn('action_eventcategory', 'text')
    .addColumn('action_eventaction', 'text')
    .addColumn('action_eventname', 'text')
    .addColumn('action_eventvalue', 'numeric')
    .addColumn('action_timespent', 'text')
    .addColumn('action_timestamp', 'timestamptz', (col) =>
      col.defaultTo(sql`now()`)
    )
    .addColumn('usercustomproperties', 'json')
    .addColumn('usercustomdimensions', 'json')
    .addColumn('dimension1', 'text')
    .addColumn('dimension2', 'text')
    .addColumn('dimension3', 'text')
    .addColumn('dimension4', 'text')
    .addColumn('dimension5', 'text')
    .addColumn('dimension6', 'text')
    .addColumn('dimension7', 'text')
    .addColumn('dimension8', 'text')
    .addColumn('dimension9', 'text')
    .addColumn('dimension10', 'text')
    .addColumn('action_url', 'text')
    .addColumn('sitesearchkeyword', 'text')
    .addColumn('action_title', 'text')
    .addColumn('visitorid', 'text')
    .addColumn('referrertype', 'text')
    .addColumn('referrername', 'text')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable(DESTINATION_TABLE).execute()
}
