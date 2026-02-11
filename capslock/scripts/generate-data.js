const fs = require('fs');
const path = require('path');
const countriesRaw = require('world-countries');

const root = path.resolve(__dirname, '..');
const flagsSrcDir = path.join(root, 'node_modules', 'country-flag-icons', '3x2');
const flagsDestDir = path.join(root, 'public', 'flags');
const dataDestDir = path.join(root, 'public', 'data');
const dataDestFile = path.join(dataDestDir, 'countries.json');

const EU = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
  'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
]);

const NATO = new Set([
  'AL', 'BE', 'BG', 'CA', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IT', 'LV', 'LT', 'LU',
  'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'TR', 'GB', 'US'
]);

const COMMONWEALTH = new Set([
  'AG', 'AU', 'BS', 'BD', 'BB', 'BZ', 'BW', 'BN', 'CM', 'CA', 'CY', 'DM', 'FJ', 'GM', 'GH', 'GD', 'GY', 'IN',
  'JM', 'KE', 'KI', 'LS', 'MW', 'MY', 'MV', 'MT', 'MU', 'MZ', 'NA', 'NR', 'NZ', 'NG', 'PK', 'PG', 'RW', 'KN',
  'LC', 'VC', 'WS', 'SC', 'SL', 'SG', 'SB', 'ZA', 'LK', 'TZ', 'TG', 'TO', 'TT', 'TV', 'UG', 'GB', 'VU', 'ZM'
]);

const POST_SOVIET = new Set([
  'AM', 'AZ', 'BY', 'EE', 'GE', 'KZ', 'KG', 'LV', 'LT', 'MD', 'RU', 'TJ', 'TM', 'UA', 'UZ'
]);
const BALTICS = new Set(['EE', 'LV', 'LT']);
const NORDICS = new Set(['DK', 'FI', 'IS', 'NO', 'SE']);
const SCANDINAVIA = new Set(['DK', 'NO', 'SE']);
const BALKAN = new Set(['AL', 'BA', 'BG', 'HR', 'GR', 'ME', 'MK', 'RO', 'RS', 'SI', 'XK']);
const SOUTHEAST_EUROPE = new Set(['AL', 'BA', 'BG', 'GR', 'HR', 'ME', 'MK', 'MD', 'RO', 'RS', 'SI']);
const CENTRAL_EUROPE = new Set(['AT', 'CZ', 'DE', 'HU', 'LI', 'PL', 'SK', 'SI', 'CH']);
const CENTRAL_ASIA = new Set(['KZ', 'KG', 'TJ', 'TM', 'UZ']);
const SOUTHEAST_ASIA = new Set(['BN', 'KH', 'ID', 'LA', 'MY', 'MM', 'PH', 'SG', 'TH', 'TL', 'VN']);
const WESTERN_ASIA = new Set(['AM', 'AZ', 'BH', 'CY', 'GE', 'IQ', 'IL', 'JO', 'KW', 'LB', 'OM', 'PS', 'QA', 'SA', 'SY', 'TR', 'AE', 'YE']);
const SAHEL = new Set(['BF', 'CM', 'TD', 'GM', 'ML', 'MR', 'NE', 'NG', 'SN', 'SD']);
const MICRONESIAN = new Set(['FM', 'KI', 'MH', 'NR', 'PW']);
const POLYNESIA = new Set(['NZ', 'TO', 'TV', 'WS']);

function asciiNormalize(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupe(strings) {
  const seen = new Set();
  const out = [];
  for (const raw of strings) {
    if (!raw) continue;
    const value = String(raw).trim();
    if (!value) continue;
    const key = asciiNormalize(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function mapContinents(country) {
  const region = country.region;
  const sub = country.subregion;
  const continents = new Set();

  if (region === 'Africa') continents.add('Africa');
  if (region === 'Asia') continents.add('Asia');
  if (region === 'Europe') continents.add('Europe');
  if (region === 'Oceania') continents.add('Oceania');

  if (region === 'Americas') {
    if (sub === 'South America') {
      continents.add('South America');
    } else {
      continents.add('North America');
    }
  }

  if (country.cca2 === 'RU' || country.cca2 === 'TR' || country.cca2 === 'KZ' || country.cca2 === 'AZ' || country.cca2 === 'GE' || country.cca2 === 'AM') {
    continents.add('Europe');
    continents.add('Asia');
  }

  return Array.from(continents);
}

function mapGroups(country) {
  const groups = new Set();
  const id = country.cca2;
  const region = country.region;
  const sub = country.subregion;

  if (region === 'Africa') groups.add('Africa');
  if (region === 'Asia' || region === 'Oceania') groups.add('Asia and the Pacific');

  if (sub === 'Caribbean') groups.add('Caribbean');
  if (sub === 'Central America') groups.add('Central America');
  if (sub === 'South America') groups.add('South America');
  if (sub === 'North America') groups.add('North America');

  if (sub === 'Northern Europe') groups.add('Northern Europe');
  if (sub === 'Southern Europe') groups.add('Southern Europe');
  if (sub === 'Eastern Europe') groups.add('Eastern Europe');
  if (sub === 'Western Europe') groups.add('Western Europe');

  if (sub === 'Northern Africa') groups.add('Northern Africa');
  if (sub === 'Eastern Africa') groups.add('Eastern Africa');
  if (sub === 'Western Africa') groups.add('Western Africa');

  if (EU.has(id)) groups.add('European Union');
  if (NATO.has(id)) groups.add('NATO');
  if (COMMONWEALTH.has(id)) groups.add('Commonwealth of Nations');
  if (POST_SOVIET.has(id)) groups.add('Post-Soviet States');
  if (BALTICS.has(id)) groups.add('Baltics');
  if (NORDICS.has(id)) groups.add('Nordics');
  if (SCANDINAVIA.has(id)) groups.add('Scandinavia');
  if (BALKAN.has(id)) groups.add('Balkan States');
  if (SOUTHEAST_EUROPE.has(id)) groups.add('Southeast Europe');
  if (CENTRAL_EUROPE.has(id)) groups.add('Central Europe');
  if (CENTRAL_ASIA.has(id)) groups.add('Central Asia');
  if (SOUTHEAST_ASIA.has(id)) groups.add('Southeast Asia');
  if (WESTERN_ASIA.has(id)) groups.add('Western Asia');
  if (SAHEL.has(id)) groups.add('Sahel Region');
  if (MICRONESIAN.has(id)) groups.add('Micronesian');
  if (POLYNESIA.has(id)) groups.add('Polynesia');

  if (region === 'Americas' && id !== 'US' && id !== 'CA') groups.add('Latin America');

  if (!country.landlocked) groups.add('Island States');

  return Array.from(groups).sort((a, b) => a.localeCompare(b));
}

function collectAliases(country) {
  const aliases = [];

  aliases.push(country.name.common, country.name.official);
  aliases.push(...(country.altSpellings || []));

  if (country.name.native) {
    for (const value of Object.values(country.name.native)) {
      aliases.push(value.common, value.official);
    }
  }

  if (country.translations) {
    for (const value of Object.values(country.translations)) {
      aliases.push(value.common, value.official);
    }
  }

  if (country.cca2 === 'US') aliases.push('USA', 'United States');
  if (country.cca2 === 'TR') aliases.push('Turkey', 'Türkiye');
  if (country.cca2 === 'CI') aliases.push('Ivory Coast');
  if (country.cca2 === 'CZ') aliases.push('Czechia', 'Czech Republic');

  return dedupe(aliases);
}

function buildCountry(country) {
  const id = country.cca2;
  const name = country.name.official;
  const aliases = collectAliases(country);
  const continents = mapContinents(country);
  const groups = mapGroups(country);
  const lat = country.latlng?.[0] ?? 0;
  const lon = country.latlng?.[1] ?? 0;

  const capitals = (country.capital || []).map((capital) => ({
    name: capital,
    aliases: dedupe([capital]),
    lat,
    lon
  }));

  return {
    id,
    name,
    aliases,
    continents,
    groups,
    capitals,
    flag: {
      path: `/flags/${id}.svg`,
      source: 'country-flag-icons',
      license: 'MIT',
      attributionRequired: false
    }
  };
}

function main() {
  fs.mkdirSync(flagsDestDir, { recursive: true });
  fs.mkdirSync(dataDestDir, { recursive: true });

  const countries = countriesRaw
    .filter((country) => country.unMember && country.cca2 && country.cca2.length === 2 && country.cca2 !== 'VA')
    .map(buildCountry)
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const country of countries) {
    const source = path.join(flagsSrcDir, `${country.id}.svg`);
    const target = path.join(flagsDestDir, `${country.id}.svg`);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target);
    }
  }

  fs.writeFileSync(dataDestFile, JSON.stringify(countries, null, 2));

  console.log(`Generated ${countries.length} countries -> ${path.relative(root, dataDestFile)}`);
}

main();
