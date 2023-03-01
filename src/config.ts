import { MatomoTableName } from "types";

export const MATOMO_KEY = process.env.MATOMO_KEY || "";
export const MATOMO_URL = process.env.MATOMO_URL || "https://matomo.fabrique.social.gouv.fr/";
export const MATOMO_SITE = process.env.MATOMO_SITE || 0;
export const PGDATABASE = process.env.PGDATABASE || "";
export const DESTINATION_TABLE: MatomoTableName = process.env.DESTINATION_TABLE || "matomo";
export const OFFSET = process.env.OFFSET || "3";
export const RESULTPERPAGE = process.env.RESULTPERPAGE || "500";
