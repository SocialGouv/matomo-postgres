const mock_pgQuery = jest.fn();
const mock_matomoApi = jest.fn();
const formatISO = require("date-fns/formatISO");
const addDays = require("date-fns/addDays");

const { OFFSET } = require("../config");

process.env.MATOMO_SITE = "42";
process.env.PROJECT_NAME = "some-project";

const matomoVisit = require("./visit.json");

const run = require("../index");

const NB_REQUEST_TO_INIT_DB = 21; // Number of query to init DB (createTable.js)
const TEST_DATE = new Date();

// @ts-ignore
const isoDate = (date) => formatISO(date, { representation: "date" });

jest.mock("pg", () => {
  class Client {
    escapeIdentifier(name) {
      return name;
    }
    end() {}
    connect() {
      return Promise.resolve();
    }
    query(...args) {
      return Promise.resolve(mock_pgQuery(...args));
    }
  }
  return {
    Client,
  };
});

jest.mock("piwik-client", () => {
  class MatomoClient {
    api(...args) {
      return mock_matomoApi(...args);
    }
  }
  return MatomoClient;
});

beforeEach(() => {
  jest.resetAllMocks();
  jest.resetModules();
  process.env.STARTDATE = "";
  //process.env.OFFSET = "";
});

test("run: should create table", async () => {
  mock_pgQuery.mockReturnValue({ rows: [] });
  mock_matomoApi.mockImplementation((options, cb) => {
    return cb(null, []);
  });
  await run();
  expect(mock_pgQuery.mock.calls[0]).toMatchSnapshot();
});

test("run: should fetch the latest event date if no date provided", async () => {
  jest.useFakeTimers("modern").setSystemTime(TEST_DATE.getTime());
  mock_pgQuery.mockReturnValue({ rows: [] });

  mock_matomoApi.mockImplementation((options, cb) => {
    return cb(null, [
      {
        ...matomoVisit,
        idVisit: 123,
      },
      {
        ...matomoVisit,
        idVisit: 124,
      },
    ]);
  });

  await run();

  // check matomo requests
  expect(mock_matomoApi.mock.calls[0][0].date).toEqual(isoDate(TEST_DATE));
  expect(mock_matomoApi.mock.calls[0][0].filter_offset).toEqual(0);

  // check db queries
  expect(mock_pgQuery.mock.calls[NB_REQUEST_TO_INIT_DB][0]).toEqual(
    // call 0 is create table
    // call 1 is add column usercustomdimension
    // call 2 is add column action_url
    // ...
    //
    "select action_timestamp from matomo order by action_timestamp desc limit 1"
  );
});

test("run: should resume using latest event date - offset if no date provided", async () => {
  jest.useFakeTimers("modern").setSystemTime(TEST_DATE.getTime());

  const LAST_EVENT_DATE_OFFSET = 2;
  // @ts-ignore
  const LAST_EVENT_DATE = addDays(TEST_DATE, -LAST_EVENT_DATE_OFFSET);

  mock_pgQuery.mockReturnValue({ rows: [{ action_timestamp: LAST_EVENT_DATE.getTime() }] });

  mock_matomoApi.mockImplementation((options, cb) => {
    return cb(null, [
      {
        ...matomoVisit,
        idVisit: 123,
      },
      {
        ...matomoVisit,
        idVisit: 124,
      },
    ]);
  });

  await run();

  // check matomo requests
  expect(mock_matomoApi.mock.calls[0][0].date).toEqual(
    // @ts-ignore
    isoDate(addDays(LAST_EVENT_DATE, -parseInt(OFFSET)))
  );
  expect(mock_matomoApi.mock.calls[0][0].filter_offset).toEqual(0);

  const daysCount = LAST_EVENT_DATE_OFFSET + parseInt(OFFSET) + 1;
  expect(mock_matomoApi.mock.calls.length).toEqual(daysCount);

  // check db queries
  expect(mock_pgQuery.mock.calls.length).toEqual(NB_REQUEST_TO_INIT_DB + 1 + daysCount * 7); // NB_REQUEST_TO_INIT_DB + select queries + days offset
});

test("run: should use today date if nothing in DB", async () => {
  jest.useFakeTimers("modern").setSystemTime(TEST_DATE.getTime());
  mock_pgQuery.mockReturnValue({ rows: [] });

  mock_matomoApi.mockImplementation((options, cb) => {
    return cb(null, [
      {
        ...matomoVisit,
        idVisit: 123,
      },
    ]);
  });

  await run();

  // check matomo requests
  expect(mock_matomoApi.mock.calls.length).toEqual(1);
  expect(mock_matomoApi.mock.calls[0][0].date).toEqual(isoDate(TEST_DATE));

  // check the 4 events inserted
  expect(mock_pgQuery.mock.calls.length).toEqual(NB_REQUEST_TO_INIT_DB + 5); // NB_REQUEST_TO_INIT_DB + check date + latest + 2 inserts
});

test("run: should use given date if any", async () => {
  jest.useFakeTimers("modern").setSystemTime(TEST_DATE.getTime());
  mock_pgQuery.mockReturnValue({ rows: [] });

  mock_matomoApi.mockImplementation((options, cb) => {
    return cb(null, [
      {
        ...matomoVisit,
        idVisit: 123,
      },
    ]);
  });

  // @ts-ignore
  await run(isoDate(addDays(TEST_DATE, -10)) + "T00:00:00.000Z");

  expect(mock_matomoApi.mock.calls.length).toEqual(11);
  expect(mock_pgQuery.mock.calls.length).toEqual(NB_REQUEST_TO_INIT_DB + 11 * 4); // NB_REQUEST_TO_INIT_DB + inserts. no initial select as date is provided
});

test("run: should use STARTDATE if any", async () => {
  // @ts-ignore
  process.env.STARTDATE = isoDate(addDays(TEST_DATE, -5)) + "T00:00:00.000Z";
  jest.useFakeTimers("modern").setSystemTime(TEST_DATE.getTime());
  mock_pgQuery.mockReturnValue({ rows: [] });

  mock_matomoApi.mockImplementation((options, cb) => {
    return cb(null, [
      {
        ...matomoVisit,
        idVisit: 123,
      },
    ]);
  });

  await run();

  expect(mock_matomoApi.mock.calls.length).toEqual(6);

  expect(mock_pgQuery.mock.calls.length).toEqual(NB_REQUEST_TO_INIT_DB + 1 + 6 * 4); // NB_REQUEST_TO_INIT_DB + initial select + inserts.
});
