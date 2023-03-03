process.env.MATOMO_SITE = "42";
process.env.PROJECT_NAME = "some-project";

import matomoVisit from "./visit.json";
import { getEventsFromMatomoVisit } from "../importEvent";

test("getEventsFromMatomoVisit: should merge action events", () => {
  // @ts-ignore
  const visits = getEventsFromMatomoVisit(matomoVisit);
  expect(visits).toMatchSnapshot();
});
