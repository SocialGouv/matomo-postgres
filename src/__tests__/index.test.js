const mock_pgQuery = jest.fn();
const mock_matomoApi = jest.fn();

process.env.MATOMO_SITE = "42";
process.env.PROJECT_NAME = "some-project";

const matomoVisit = require("./visit.json");

const run = require("../index");

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
      return mock_pgQuery(...args);
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
});

test("run: should create table", async () => {
  mock_pgQuery.mockReturnValue({ rows: [{ action_timestamp: new Date("2020-01-01T00:00:00.000Z").getTime() }] });
  mock_matomoApi.mockImplementation((options, cb) => {
    return cb(null, []);
  });
  await run();
  expect(mock_pgQuery.mock.calls[0]).toMatchSnapshot();
});

test("run: should make 3 matomo API calls and add 16 dbs events", async () => {
  jest.useFakeTimers("modern").setSystemTime(new Date("2021-08-01T00:00:00.000Z").getTime());
  mock_pgQuery.mockReturnValueOnce({ rows: [] });
  mock_pgQuery.mockReturnValue({ rows: [{ count: 0 }] });

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

  const expectedMatomoCalls = [
    ["2021-07-29", "42"],
    ["2021-07-30", "42"],
    ["2021-07-31", "42"],
  ];

  //console.log("MOCK MATO", mock_matomoApi.mock.calls);
  //console.log("MOCK", mock_pgQuery.mock.calls);
  // check matomo requests
  expect(mock_matomoApi.mock.calls.length).toEqual(expectedMatomoCalls.length);
  expect(mock_matomoApi.mock.calls.map((c) => [c[0].date, c[0].idSite])).toEqual(expectedMatomoCalls);
  // check the 4 events inserted
  expect(mock_pgQuery.mock.calls.length).toEqual(1 + expectedMatomoCalls.length * (4 + 1));
  expect(mock_pgQuery.mock.calls).toMatchSnapshot();
});

test("run: should use now if nothing in DB", async () => {
  jest.useFakeTimers("modern").setSystemTime(new Date("2020-01-01").getTime());
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

  const expectedMatomoCalls = [
    ["2019-12-29", "42"],
    ["2019-12-30", "42"],
    ["2019-12-31", "42"],
  ];

  // check matomo requests
  expect(mock_matomoApi.mock.calls.length).toEqual(expectedMatomoCalls.length);
  expect(mock_matomoApi.mock.calls.map((c) => [c[0].date, c[0].idSite])).toEqual(expectedMatomoCalls);
  // check the 4 events inserted
  expect(mock_pgQuery.mock.calls.length).toEqual(1 + expectedMatomoCalls.length * (2 + 1));
  expect(mock_pgQuery.mock.calls).toMatchSnapshot();
});

test("run: should use given date if any", async () => {
  jest.useFakeTimers("modern").setSystemTime(new Date("2020-01-01").getTime());
  mock_pgQuery.mockReturnValue({ rows: [] });

  mock_matomoApi.mockImplementation((options, cb) => {
    return cb(null, [
      {
        ...matomoVisit,
        idVisit: 123,
      },
    ]);
  });

  await run("2019-07-01");

  const expectedMatomoCalls = [
    ["2019-06-28", "42"],
    ["2019-06-29", "42"],
    ["2019-06-30", "42"],
  ];

  // check matomo requests
  expect(mock_matomoApi.mock.calls.length).toEqual(expectedMatomoCalls.length);
  expect(mock_matomoApi.mock.calls.map((c) => [c[0].date, c[0].idSite])).toEqual(expectedMatomoCalls);
  // check the 4 events inserted
  expect(mock_pgQuery.mock.calls.length).toEqual(1 + expectedMatomoCalls.length * (2 + 1));
  expect(mock_pgQuery.mock.calls).toMatchSnapshot();
});

test("run: should use STARTDATE if any", async () => {
  process.env.STARTDATE = "2019-07-15";
  jest.useFakeTimers("modern").setSystemTime(new Date("2020-01-01").getTime());
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

  const expectedMatomoCalls = [
    ["2019-07-12", "42"],
    ["2019-07-13", "42"],
    ["2019-07-14", "42"],
  ];

  // check matomo requests
  expect(mock_matomoApi.mock.calls.length).toEqual(expectedMatomoCalls.length);
  expect(mock_matomoApi.mock.calls.map((c) => [c[0].date, c[0].idSite])).toEqual(expectedMatomoCalls);
  // check the 4 events inserted
  expect(mock_pgQuery.mock.calls.length).toEqual(1 + expectedMatomoCalls.length * (2 + 1));
  expect(mock_pgQuery.mock.calls).toMatchSnapshot();
});
