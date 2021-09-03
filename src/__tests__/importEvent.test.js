process.env.MATOMO_SITE = "42";
process.env.PROJECT_NAME = "some-project";

const matomoVisit = require("./visit.json");
const { getEventsFromMatomoVisit, importEvent } = require("../importEvent");

test("importEvent: should extract events from matomo visit actionsDetails and create insert queries", () => {
  //@ts-expect-error
  const visits = getEventsFromMatomoVisit(matomoVisit);
  expect(visits).toMatchSnapshot();
  const spy = jest.fn();
  const fakeClient = {
    escapeIdentifier(name) {
      return name;
    },
    query: spy,
  };
  visits.map((visit) => importEvent(fakeClient, visit));
  expect(spy.mock.calls).toMatchSnapshot();
});
