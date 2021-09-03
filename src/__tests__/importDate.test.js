const { importDate } = require("../importDate");

const mock_pgQuery = jest.fn();
const mock_matomoApi = jest.fn();

process.env.MATOMO_SITE = "42";
process.env.PROJECT_NAME = "some-project";

const matomoVisit = require("./visit.json");

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

test("importDate: should import all events for a given date", async () => {
  const pgSpy = jest.fn().mockResolvedValue();
  const matomoSpy = jest.fn().mockImplementation((options, cb) => {
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
  const fakeClient = {
    escapeIdentifier(name) {
      return name;
    },
    query: pgSpy,
  };
  await importDate(fakeClient, matomoSpy, new Date("2021-08-02"));
  expect(matomoSpy.mock.calls.map((c) => c[0])).toMatchSnapshot();
  expect(pgSpy.mock.calls).toMatchSnapshot();
});

test("importDate: should import when new results", async () => {
  const pgResult = { rows: [] };
  const pgSpy = jest.fn().mockResolvedValue(pgResult);
  const matomoSpy = jest.fn().mockImplementation((options, cb) => {
    return cb(null, [
      {
        ...matomoVisit,
        idVisit: 123,
      },
    ]);
  });
  const fakeClient = {
    query: pgSpy,
    escapeIdentifier(name) {
      return name;
    },
  };

  const imported = await importDate(fakeClient, matomoSpy, new Date("2021-08-03T00:00:00"));
  expect(pgSpy.mock.calls.length).toEqual(3);
  expect(imported.length).toEqual(2);
  expect(matomoSpy.mock.calls[0][0].filter_offset).toEqual(0);
});

test("importDate: should offset matomo calls when results already exist", async () => {
  const pgResult = { rows: [{ count: 42 }] };
  const pgSpy = jest.fn().mockResolvedValue(pgResult);
  const matomoSpy = jest.fn().mockImplementation((options, cb) => {
    return cb(null, [
      {
        ...matomoVisit,
        idVisit: 123,
      },
    ]);
  });
  const fakeClient = {
    query: pgSpy,
    escapeIdentifier(name) {
      return name;
    },
  };

  const imported = await importDate(fakeClient, matomoSpy, new Date("2021-08-03T00:00:00"));
  expect(pgSpy.mock.calls.length).toEqual(3);
  expect(imported.length).toEqual(2);
  expect(matomoSpy.mock.calls[0][0].filter_offset).toEqual(42);
});

test("importDate: should NOT import when no matomo results", async () => {
  const pgSpy = jest.fn().mockResolvedValue({ rows: [{ action_timestamp: 1627948800000 }] });
  const matomoSpy = jest.fn().mockImplementation((options, cb) => {
    return cb(null, []);
  });
  const fakeClient = {
    query: pgSpy,
    escapeIdentifier(name) {
      return name;
    },
  };
  const imported = await importDate(fakeClient, matomoSpy, new Date("2021-08-03"));
  expect(pgSpy.mock.calls.length).toEqual(1);
  expect(imported.length).toEqual(0);
});
