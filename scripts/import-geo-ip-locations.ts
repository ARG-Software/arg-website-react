import fs from 'node:fs';
import readline from 'node:readline';

import { createClient } from '@supabase/supabase-js';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env', quiet: true });

const blocksPath = process.argv[2];
const locationsPath = process.argv[3];
const batchSize = Number(process.env.GEO_IP_IMPORT_BATCH_SIZE || 1000);

if (!blocksPath || !locationsPath) {
  throw new Error(
    'Usage: tsx scripts/import-geo-ip-locations.ts <GeoLite2-City-Blocks-IPv4.csv> <GeoLite2-City-Locations-en.csv>'
  );
}

const supabase = createClient(
  requiredEnv('ADMIN_DATABASE_URL'),
  requiredEnv('ADMIN_DATABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const locations = await loadLocations(locationsPath);
let rows: Record<string, string | null>[] = [];
let imported = 0;

for await (const block of readCsv(blocksPath)) {
  const location = locations.get(block.geoname_id) || locations.get(block.registered_country_geoname_id);
  if (!location?.country_code) continue;

  rows.push({
    network: block.network,
    country_code: location.country_code,
    region: location.region,
    city: location.city,
    timezone: location.timezone,
    source: 'maxmind_geolite2_city_csv',
  });

  if (rows.length >= batchSize) {
    imported += await upsertRows(rows);
    rows = [];
  }
}

if (rows.length) {
  imported += await upsertRows(rows);
}

console.log(`Imported ${imported} geo IP ranges into geo_ip_locations`);

async function loadLocations(filePath: string) {
  const locationsByGeonameId = new Map<string, Record<string, string | null>>();

  for await (const row of readCsv(filePath)) {
    if (!row.geoname_id) continue;

    locationsByGeonameId.set(row.geoname_id, {
      country_code: normalizeCountryCode(row.country_iso_code),
      region: clean(row.subdivision_1_name),
      city: clean(row.city_name),
      timezone: clean(row.time_zone),
    });
  }

  return locationsByGeonameId;
}

async function upsertRows(rowsToUpsert: Record<string, string | null>[]) {
  const { error } = await supabase
    .from('geo_ip_locations')
    .upsert(rowsToUpsert, { onConflict: 'network' });

  if (error) throw error;
  return rowsToUpsert.length;
}

async function* readCsv(filePath: string) {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let headers: string[] | null = null;

  for await (const line of lines) {
    const values = parseCsvLine(line);

    if (!headers) {
      headers = values;
      continue;
    }

    yield Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  }
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === ',' && !quoted) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
}

function normalizeCountryCode(value: string) {
  const countryCode = clean(value)?.toUpperCase() || null;
  return countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : null;
}

function clean(value: string) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
