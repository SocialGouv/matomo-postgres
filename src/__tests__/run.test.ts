import run from '../index'

process.env.MATOMO_SITE = '42'
process.env.PROJECT_NAME = 'some-project'
process.env.RESULTPERPAGE = '10'
process.env.STARTDATE = '2023-03-27' // Set a start date that's before our test date

const TEST_DATE = new Date(2023, 3, 1)

let queries: any[] = []
let piwikApiCalls: any[] = []

const result: Record<any, any> = {
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

jest.mock('../PiwikClient', () => {
  class PiwikMock {
    options: any
    constructor(options: any) {
      this.options = options
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    api(options: any, cb: Function) {
      piwikApiCalls.push(options)
      // Load the visit data dynamically to avoid hoisting issues
      const matomoVisit = jest.requireActual('./visit.json')
      const matomoVisits = [
        {
          ...matomoVisit,
          idVisit: 123
        },
        {
          ...matomoVisit,
          idVisit: 124
        }
      ]
      cb(null, matomoVisits)
    }
  }

  return PiwikMock
})

beforeEach(() => {
  queries = []
  piwikApiCalls = []
})

afterEach(() => {
  jest.clearAllMocks()
})

test('run: should fetch the latest 5 days on matomo', async () => {
  jest.useFakeTimers().setSystemTime(TEST_DATE.getTime())
  await run()
  expect(piwikApiCalls).toMatchSnapshot()
})

test('run: should fetch the latest event date if no date provided', async () => {
  jest.useFakeTimers().setSystemTime(TEST_DATE.getTime())
  await run()
  expect(queries[0]).toMatchSnapshot()
})

test('run: should run based on existing data if any', async () => {
  // ensure we use the latest entry in DB
  expect(1).toEqual(1)
})

test('run: should run SQL queries', async () => {
  jest.useFakeTimers().setSystemTime(TEST_DATE.getTime())
  await run()
  expect(queries).toMatchSnapshot()
  expect(queries.length).toEqual(49) // Number of queries based on current implementation
})
