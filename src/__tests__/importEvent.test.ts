import { Visit } from 'types/matomo-api'

import { getEventsFromMatomoVisit } from '../importEvent'
import matomoVisit from './visit.json'

process.env.MATOMO_SITE = '42'
process.env.PROJECT_NAME = 'some-project'
process.env.RESULTPERPAGE = '10'

test('getEventsFromMatomoVisit: should merge action events', () => {
  const visits = getEventsFromMatomoVisit(matomoVisit as unknown as Visit)
  expect(visits).toMatchSnapshot()
})
