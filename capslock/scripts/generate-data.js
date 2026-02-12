const fs = require('fs');
const path = require('path');
const countries = require('world-countries');

const outputDir = path.join(__dirname, '..', 'public', 'data');
const flagsDir = path.join(__dirname, '..', 'public', 'flags');

const unique = (items) => Array.from(new Set(items.filter(Boolean)));

const NORDICS = ['DK', 'FI', 'IS', 'NO', 'SE'];
const SCANDINAVIA = ['DK', 'NO', 'SE'];
const BALTICS = ['EE', 'LV', 'LT'];
const BALKANS = ['AL', 'BA', 'BG', 'HR', 'GR', 'XK', 'ME', 'MK', 'RO', 'RS', 'SI', 'TR'];
const CENTRAL_EUROPE = ['AT', 'CH', 'CZ', 'DE', 'HU', 'LI', 'PL', 'SK', 'SI'];
const SOUTHEAST_EUROPE = ['AL', 'BA', 'BG', 'HR', 'GR', 'XK', 'ME', 'MK', 'RO', 'RS', 'SI', 'TR'];
const POST_SOVIET = [
  'AM',
  'AZ',
  'BY',
  'EE',
  'GE',
  'KZ',
  'KG',
  'LV',
  'LT',
  'MD',
  'RU',
  'TJ',
  'TM',
  'UA',
  'UZ',
];
const SAHEL = ['BF', 'TD', 'ML', 'MR', 'NE', 'NG', 'SN', 'SD'];
const NATO = [
  'AL',
  'BE',
  'BG',
  'CA',
  'HR',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IS',
  'IT',
  'LV',
  'LT',
  'LU',
  'ME',
  'NL',
  'MK',
  'NO',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'TR',
  'GB',
  'US',
];
const EU = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
];
const COMMONWEALTH = [
  'AG',
  'AU',
  'BS',
  'BD',
  'BB',
  'BZ',
  'BW',
  'BN',
  'CM',
  'CA',
  'CY',
  'DM',
  'FJ',
  'GM',
  'GH',
  'GD',
  'GY',
  'IN',
  'IE',
  'JM',
  'KE',
  'KI',
  'LS',
  'MW',
  'MY',
  'MV',
  'MT',
  'MU',
  'MZ',
  'NA',
  'NR',
  'NZ',
  'NG',
  'PK',
  'PG',
  'RW',
  'KN',
  'LC',
  'VC',
  'WS',
  'SC',
  'SL',
  'SG',
  'SB',
  'ZA',
  'LK',
  'SZ',
  'TZ',
  'TO',
  'TT',
  'TV',
  'UG',
  'GB',
  'VU',
  'ZM',
];
const ISLAND_STATES = [
  'AG',
  'BS',
  'BH',
  'BB',
  'CV',
  'KM',
  'CY',
  'DM',
  'DO',
  'FJ',
  'GD',
  'IS',
  'ID',
  'IE',
  'JM',
  'JP',
  'KI',
  'MG',
  'MV',
  'MT',
  'MH',
  'MU',
  'FM',
  'NR',
  'NZ',
  'PW',
  'PG',
  'PH',
  'WS',
  'ST',
  'SC',
  'SG',
  'SB',
  'LK',
  'TL',
  'TO',
  'TT',
  'TV',
  'GB',
];

const getGroupsFromSubregion = (subregion) => {
  if (!subregion) return [];
  const map = {
    'Central America': 'Central America',
    Caribbean: 'Caribbean',
    'South America': 'South America',
    'Northern America': 'North America',
    'Northern Europe': 'Northern Europe',
    'Western Europe': 'Western Europe',
    'Eastern Europe': 'Eastern Europe',
    'Southern Europe': 'Southern Europe',
    'Central Asia': 'Central Asia',
    'Western Asia': 'Western Asia',
    'Southern Asia': 'South Asia',
    'Eastern Asia': 'East Asia',
    'South-Eastern Asia': 'Southeast Asia',
    'Southeastern Asia': 'Southeast Asia',
    'Northern Africa': 'Northern Africa',
    'Western Africa': 'Western Africa',
    'Eastern Africa': 'Eastern Africa',
    'Middle Africa': 'Middle Africa',
    'Southern Africa': 'Southern Africa',
    Micronesia: 'Micronesian',
    Polynesia: 'Polynesia',
  };
  return map[subregion] ? [map[subregion]] : [];
};

const buildGroups = (country) => {
  const groups = [];
  if (country.region === 'Asia' || country.region === 'Oceania') {
    groups.push('Asia and the Pacific');
  }

  groups.push(...getGroupsFromSubregion(country.subregion));

  if (country.subregion === 'Central America' || country.subregion === 'South America' || country.subregion === 'Caribbean' || country.cca2 === 'MX') {
    groups.push('Latin America');
  }

  if (BALKANS.includes(country.cca2)) groups.push('Balkan States');
  if (BALTICS.includes(country.cca2)) groups.push('Baltics');
  if (CENTRAL_EUROPE.includes(country.cca2)) groups.push('Central Europe');
  if (SOUTHEAST_EUROPE.includes(country.cca2)) groups.push('Southeast Europe');
  if (SCANDINAVIA.includes(country.cca2)) groups.push('Scandinavia');
  if (NORDICS.includes(country.cca2)) groups.push('Nordics');
  if (POST_SOVIET.includes(country.cca2)) groups.push('Post-Soviet States');
  if (SAHEL.includes(country.cca2)) groups.push('Sahel Region');
  if (NATO.includes(country.cca2)) groups.push('NATO');
  if (EU.includes(country.cca2)) groups.push('European Union');
  if (COMMONWEALTH.includes(country.cca2)) groups.push('Commonwealth of Nations');
  if (ISLAND_STATES.includes(country.cca2)) groups.push('Island States');

  return unique(groups);
};

const inferContinents = (country) => {
  if (Array.isArray(country.continents) && country.continents.length) {
    return country.continents;
  }

  const region = country.region;
  if (region === 'Americas') {
    const sub = country.subregion || '';
    if (['South America'].includes(sub)) return ['South America'];
    if (['Northern America', 'Central America', 'Caribbean'].includes(sub)) {
      return ['North America'];
    }
    return ['North America'];
  }

  if (region === 'Asia') return ['Asia'];
  if (region === 'Europe') return ['Europe'];
  if (region === 'Africa') return ['Africa'];
  if (region === 'Oceania') return ['Oceania'];
  if (region === 'Antarctic') return ['Antarctica'];
  return [];
};

const buildAliases = (country) => {
  const aliases = [];
  if (country.name?.common) aliases.push(country.name.common);
  if (country.name?.official) aliases.push(country.name.official);
  if (Array.isArray(country.altSpellings)) aliases.push(...country.altSpellings);
  if (country.translations) {
    Object.values(country.translations).forEach((translation) => {
      if (translation?.common) aliases.push(translation.common);
      if (translation?.official) aliases.push(translation.official);
    });
  }
  return unique(aliases);
};

const buildCapitals = (country) => {
  const names = country.capital || [];
  return names.map((name) => ({
    name,
    aliases: [],
  }));
};

const buildCountryEntry = (country) => ({
  id: country.cca2,
  name: country.name?.official || country.name?.common || country.cca2,
  aliases: buildAliases(country),
  continents: inferContinents(country),
  groups: buildGroups(country),
  capitals: buildCapitals(country),
  flag: {
    path: `/flags/${country.cca2}.svg`,
    source: 'country-flag-icons',
    license: 'MIT',
    attributionRequired: false,
  },
});

const generate = () => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  if (!fs.existsSync(flagsDir)) fs.mkdirSync(flagsDir, { recursive: true });

  const entries = countries
    .filter((c) => c.unMember && c.cca2)
    .map((c) => buildCountryEntry(c))
    .sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(path.join(outputDir, 'countries.json'), JSON.stringify(entries, null, 2));

  const flagSourceDir = path.join(__dirname, '..', 'node_modules', 'country-flag-icons', '3x2');
  entries.forEach((entry) => {
    const src = path.join(flagSourceDir, `${entry.id}.svg`);
    const dest = path.join(flagsDir, `${entry.id}.svg`);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  });

  console.log(`Generated ${entries.length} countries and copied flags.`);
};

generate();
