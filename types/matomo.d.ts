export type Visits = Visit[];

export type Visit = {
  idSite: string;
  idVisit: string;
  visitIp: any;
  visitorId: boolean;
  fingerprint: boolean;
  actionDetails: ActionDetail[];
  goalConversions: number;
  siteCurrency: string;
  siteCurrencySymbol: string;
  serverDate: string;
  visitServerHour: string;
  lastActionTimestamp: number;
  lastActionDateTime: string;
  siteName: string;
  serverTimestamp: number;
  firstActionTimestamp: number;
  serverTimePretty: string;
  serverDatePretty: string;
  serverDatePrettyFirstAction: string;
  serverTimePrettyFirstAction: string;
  userId: any;
  visitorType: string;
  visitorTypeIcon: string;
  visitConverted: string;
  visitConvertedIcon?: string;
  visitCount: string;
  visitEcommerceStatus: string;
  visitEcommerceStatusIcon?: string;
  daysSinceFirstVisit: number;
  secondsSinceFirstVisit: string;
  daysSinceLastEcommerceOrder: number;
  secondsSinceLastEcommerceOrder: string;
  visitDuration: string;
  visitDurationPretty: string;
  searches: string;
  actions: string;
  interactions: string;
  referrerType: string;
  referrerTypeName: string;
  referrerName: string;
  referrerKeyword: string;
  referrerKeywordPosition: any;
  referrerUrl?: string;
  referrerSearchEngineUrl?: string;
  referrerSearchEngineIcon?: string;
  referrerSocialNetworkUrl?: string;
  referrerSocialNetworkIcon?: string;
  languageCode: string;
  language: string;
  deviceType: string;
  deviceTypeIcon: string;
  deviceBrand: string;
  deviceModel: string;
  operatingSystem: string;
  operatingSystemName: string;
  operatingSystemIcon: string;
  operatingSystemCode: string;
  operatingSystemVersion: string;
  browserFamily: string;
  browserFamilyDescription: string;
  browser: string;
  browserName: string;
  browserIcon: string;
  browserCode: string;
  browserVersion: string;
  totalEcommerceRevenue: string;
  totalEcommerceConversions: string;
  totalEcommerceItems: string;
  totalAbandonedCartsRevenue: string;
  totalAbandonedCarts: string;
  totalAbandonedCartsItems: string;
  events: string;
  continent: string;
  continentCode: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  region?: string;
  regionCode?: string;
  city?: string;
  location: string;
  latitude: string;
  longitude: string;
  visitLocalTime: string;
  visitLocalHour: string;
  daysSinceLastVisit: number;
  secondsSinceLastVisit: string;
  resolution: string;
  plugins: string;
  pluginsIcons?: PluginsIcon[];
  dimension1?: string;
  dimension2: string;
  dimension3?: string;
  dimension4?: string;
  dimension5?: string;
  experiments: Experiment[];
  customVariables: any;
  formConversions: number;
  sessionReplayUrl: any;
  campaignId: string;
  campaignContent: string;
  campaignKeyword: string;
  campaignMedium: string;
  campaignName: string;
  campaignSource: string;
  campaignGroup: string;
  campaignPlacement: string;
};

export interface ActionDetail {
  type: string;
  url?: string;
  pageTitle?: string;
  pageIdAction?: string;
  idpageview?: string;
  serverTimePretty: string;
  pageId?: string;
  pageviewPosition?: string;
  title: string;
  subtitle?: string;
  icon: string;
  iconSVG?: string;
  timestamp: number;
  dimension1?: string;
  dimension2?: string;
  dimension3?: string;
  dimension4?: string;
  dimension5?: string;
  formName?: string;
  formId?: string;
  formStatus?: string;
  converted?: string;
  submitted?: number;
  timeToFirstSubmission?: string;
  timeSpent: any;
  timeHesitation?: string;
  leftBlank?: number;
  fields?: Field[];
  eventCategory?: string;
  eventAction?: string;
  timeSpentPretty?: string;
  eventName?: string;
  eventValue?: number;
  revenue: any;
  items?: string;
  itemDetails?: ItemDetail[];
  customVariables?: CustomVariables;
  server_time?: string;
  goalName?: string;
  goalId?: string;
  goalPageId?: string;
  orderId?: string;
  revenueSubTotal?: number;
  revenueTax?: number;
  revenueShipping?: number;
  revenueDiscount?: number;
  siteSearchKeyword: string;
}

export interface Field {
  fieldName: string;
  timeSpent: string;
  timeHesitation: string;
  leftBlank: string;
  submitted: string;
}

export interface ItemDetail {
  itemSKU: string;
  itemName: string;
  itemCategory: string;
  price: any;
  quantity: string;
  categories: string[];
}

export interface CustomVariables {
  "1": N1;
  "2": N2;
}

export interface N1 {
  customVariablePageName1: string;
  customVariablePageValue1: string;
}

export interface N2 {
  customVariablePageName2: string;
  customVariablePageValue2: string;
}

export interface PluginsIcon {
  pluginIcon: string;
  pluginName: string;
}

export interface Experiment {
  idexperiment: string;
  name: string;
  variation: Variation;
}

export interface Variation {
  idvariation: any;
  name: string;
}
