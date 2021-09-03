const MATOMO_KEY = process.env.MATOMO_KEY || "";
const MATOMO_URL = process.env.MATOMO_URL || "https://matomo.fabrique.social.gouv.fr/";
const MATOMO_SITE = process.env.MATOMO_SITE || 0;
const PGDATABASE = process.env.PGDATABASE || "";
const DESTINATION_TABLE = process.env.DESTINATION_TABLE || "matomo";
const OFFSET = process.env.OFFSET || "3";
const RESULTPERPAGE = process.env.RESULTPERPAGE || "500";

module.exports = { MATOMO_KEY, MATOMO_URL, MATOMO_SITE, PGDATABASE, DESTINATION_TABLE, OFFSET, RESULTPERPAGE };
