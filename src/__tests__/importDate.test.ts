// Set environment variables BEFORE any imports
process.env.MATOMO_SITE = '42'
process.env.PROJECT_NAME = 'some-project'
process.env.RESULTPERPAGE = '10'
process.env.DESTINATION_TABLE = 'matomo'

import { Pool } from 'pg'

import { importDate } from '../importDate'
import matomoVisit from './visit.json'

const TEST_DATE = new Date(2023, 3, 15)

let queries: any[] = []

const result = {
  command: 'string',
  rowCount: 0
}

jest.mock('pg', () => {
  const client = {
    query: (query: string, values: any) => {
      queries.push([query, values])
      return result
    },
    release: jest.fn()
  }
  const methods = {
    connect: () => client,
    on: jest.fn(),
    query: jest.fn()
  }
  return { Pool: jest.fn(() => methods) }
})

let pool: any
beforeEach(() => {
  pool = new Pool()
  queries = []
})
afterEach(() => {
  jest.clearAllMocks()
})

test('importDate: should import given date', async () => {
  const piwikApi = jest.fn()

  piwikApi.mockImplementation((options, cb) => {
    cb(null, [
      {
        ...matomoVisit,
        idVisit: 123
      },
      {
        ...matomoVisit,
        idVisit: 124
      }
    ])
  })

  pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

  await importDate(piwikApi, TEST_DATE)

  expect(piwikApi.mock.calls.length).toEqual(1)

  expect(piwikApi.mock.calls[0][0]).toMatchInlineSnapshot(`
{
  "date": "2023-04-15",
  "filter_limit": 10,
  "filter_offset": 0,
  "filter_sort_order": "asc",
  "idSite": "42",
  "method": "Live.getLastVisitsDetails",
  "period": "day",
}
`)
  expect(queries[0]).toMatchInlineSnapshot(`
[
  "select count(distinct "idvisit") as "count" from "matomo" where date(timezone('UTC', action_timestamp)) = $1",
  [
    "2023-04-15",
  ],
]
`)
  expect(queries.length).toEqual(1 + matomoVisit.actionDetails.length * 2)
})

test('importDate: should paginate matomo API calls and produce 46 queries', async () => {
  const piwikApi = jest.fn()
  let calls = 0

  piwikApi.mockImplementation((options, cb) => {
    cb(
      null,
      Array.from({ length: calls ? 5 : 10 }, (k, _v) => ({
        ...matomoVisit,
        idVisit: k
      }))
    )
    calls++
  })

  pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })

  await importDate(piwikApi, TEST_DATE)

  expect(piwikApi.mock.calls.length).toEqual(2)

  expect(piwikApi.mock.calls[0][0]).toMatchInlineSnapshot(`
{
  "date": "2023-04-15",
  "filter_limit": 10,
  "filter_offset": 0,
  "filter_sort_order": "asc",
  "idSite": "42",
  "method": "Live.getLastVisitsDetails",
  "period": "day",
}
`)
  expect(piwikApi.mock.calls[1][0]).toMatchInlineSnapshot(`
{
  "date": "2023-04-15",
  "filter_limit": 10,
  "filter_offset": 10,
  "filter_sort_order": "asc",
  "idSite": "42",
  "method": "Live.getLastVisitsDetails",
  "period": "day",
}
`)

  expect(queries.length).toEqual(1 + matomoVisit.actionDetails.length * 15)
  expect(queries).toMatchSnapshot()
})
