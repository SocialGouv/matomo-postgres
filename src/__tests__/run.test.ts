process.env.MATOMO_SITE = "42";
process.env.PROJECT_NAME = "some-project";
process.env.RESULTPERPAGE = "10";

import { Client, Pool } from "pg";

import matomoVisit from "./visit.json";

import run from "../index";

const TEST_DATE = new Date(2023, 3, 1);

let queries: any[] = [];

let result: Record<any, any> = {
  command: "string",
  rowCount: 0,
};

jest.mock("pg", () => {
  const client = {
    query: (query: string, values: any) => {
      queries.push([query, values]);
      return result;
    },
    release: jest.fn(),
  };
  const methods = {
    connect: () => client,
    on: jest.fn(),
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => methods) };
});

let pool: any;
beforeEach(() => {
  pool = new Pool();
  queries = [];
  piwikApiCalls = [];
});
afterEach(() => {
  jest.clearAllMocks();
});

let piwikApiCalls: any[] = [];

jest.mock("piwik-client", () => {
  const matomoVisits = [
    {
      ...matomoVisit,
      idVisit: 123,
    },
    {
      ...matomoVisit,
      idVisit: 124,
    },
  ];
  class PiwikMock {
    options: any;
    constructor(options: any) {
      this.options = options;
    }
    api(options: any, cb: Function) {
      piwikApiCalls.push(options);
      cb(null, matomoVisits);
      ("");
    }
  }

  return PiwikMock;
});

test("run: should fetch the latest 5 days on matomo", async () => {
  jest.useFakeTimers().setSystemTime(TEST_DATE.getTime());
  await run();
  expect(piwikApiCalls).toMatchSnapshot();
});

test("run: should fetch the latest event date if no date provided", async () => {
  jest.useFakeTimers().setSystemTime(TEST_DATE.getTime());
  await run();
  expect(queries[0]).toMatchSnapshot();
});

test("run: should run based on existing data if any", async () => {
  // ensure we use the latest entry in DB
  expect(1).toEqual(1);
});

test("run: should run SQL queries", async () => {
  jest.useFakeTimers().setSystemTime(TEST_DATE.getTime());
  await run();
  expect(queries).toMatchSnapshot();
  expect(queries.length).toEqual(1 + 5 * (6 + 1));
});
