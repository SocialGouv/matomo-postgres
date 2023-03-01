import { ColumnType } from "kysely";

import "./missing";

export * from "./matomo";

export type MatomoTableName = "matomo" | string;

export interface MatomoTable {
  idsite: string;
  idvisit: string;
  actions: string;
  country: string;
  region: string;
  city: string;
  operatingsystemname: string;
  devicemodel: string;
  devicebrand: string;
  visitduration: string;
  dayssincefirstvisit: string;
  visitortype: string;
  sitename: string;
  userid: string;
  serverdateprettyfirstaction: ColumnType<Date>;
  action_id: string;
  action_type: string;
  action_eventcategory: string;
  action_eventaction: string;
  action_eventname: string;
  action_eventvalue: number;
  action_timespent: string;
  action_timestamp: ColumnType<Date>;
  usercustomproperties: Record<string, any>;
  usercustomdimensions: Record<string, any>;
  dimension1: string;
  dimension2: string;
  dimension3: string;
  dimension4: string;
  dimension5: string;
  dimension6: string;
  dimension7: string;
  dimension8: string;
  dimension9: string;
  dimension10: string;
  action_url: string;
  sitesearchkeyword: string;
  action_title: string;
  visitorid: string;
  referrertype: string;
  referrername: string;
}
