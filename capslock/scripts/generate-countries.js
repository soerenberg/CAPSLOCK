const fs = require("fs");
const path = require("path");
const allCountries = require("world-countries");

const OUTPUT_DIR = path.join(__dirname, "..", "public");
const FLAGS_DIR = path.join(OUTPUT_DIR, "flags");
const DATA_DIR = path.join(OUTPUT_DIR, "data");
const DATA_PATH = path.join(DATA_DIR, "countries.json");
const FLAGS_SRC_DIR = path.join(
  __dirname,
  "..",
  "node_modules",
  "country-flag-icons",
  "3x2"
);

function deaccent(input) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeCapitalAliases(capitals) {
  const set = new Set();
  for (const cap of capitals) {
    if (!cap) continue;
    set.add(cap);
    const deaccented = deaccent(cap);
    if (deaccented && deaccented !== cap) set.add(deaccented);
  }
  return Array.from(set);
}

function inferContinents(country) {
  const region = country.region || "";
  const sub = country.subregion || "";
  if (region === "Americas") {
    if (/South America/i.test(sub)) return ["South America"];
    if (/Central America|Caribbean|North America/i.test(sub)) {
      return ["North America"];
    }
    return ["North America"];
  }
  if (region === "Europe") return ["Europe"];
  if (region === "Africa") return ["Africa"];
  if (region === "Oceania") return ["Oceania"];
  if (region === "Asia") return ["Asia"];
  if (region === "Antarctic") return ["Antarctica"];
  return [];
}

const continentOverrides = {
  RU: ["Europe", "Asia"],
  TR: ["Europe", "Asia"],
  KZ: ["Europe", "Asia"],
  AZ: ["Europe", "Asia"],
  GE: ["Europe", "Asia"],
  EG: ["Africa", "Asia"],
};

function buildAliases(country) {
  const aliases = new Set();
  if (country.name?.common) aliases.add(country.name.common);
  if (Array.isArray(country.altSpellings)) {
    for (const a of country.altSpellings) aliases.add(a);
  }
  if (country.translations) {
    for (const t of Object.values(country.translations)) {
      if (t?.common) aliases.add(t.common);
    }
  }
  return Array.from(aliases);
}

function buildGroups(country) {
  const groups = new Set();
  if (country.subregion) groups.add(country.subregion);
  if (country.unRegionalGroup) groups.add(country.unRegionalGroup);
  if (!country.subregion && country.region) groups.add(country.region);
  const code = country.cca2;
  GROUP_DEFS.forEach((group) => {
    if (group.members.has(code)) groups.add(group.name);
  });
  return Array.from(groups);
}

function ensureDirs() {
  fs.mkdirSync(FLAGS_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const GROUP_DEFS = [
  {
    name: "European Union",
    members: new Set([
      "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR",
      "HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK",
      "SI","ES","SE",
    ]),
  },
  {
    name: "NATO",
    members: new Set([
      "AL","BE","BG","CA","HR","CZ","DK","EE","FI","FR","DE","GR",
      "HU","IS","IT","LV","LT","LU","ME","NL","MK","NO","PL","PT",
      "RO","SK","SI","ES","SE","TR","GB","US",
    ]),
  },
  {
    name: "Nordics",
    members: new Set(["DK","FI","IS","NO","SE"]),
  },
  {
    name: "Scandinavia",
    members: new Set(["DK","NO","SE"]),
  },
  {
    name: "Baltics",
    members: new Set(["EE","LV","LT"]),
  },
  {
    name: "Balkan States",
    members: new Set(["AL","BA","BG","HR","GR","XK","ME","MK","RO","RS","SI"]),
  },
  {
    name: "Central Europe",
    members: new Set(["AT","CZ","DE","HU","PL","SK","SI","CH","LI"]),
  },
  {
    name: "Southeast Asia",
    members: new Set(["BN","KH","ID","LA","MM","MY","PH","SG","TH","TL","VN"]),
  },
  {
    name: "Sahel Region",
    members: new Set(["BF","CF","TD","ER","GM","GN","ML","MR","NE","NG","SN","SD","SS"]),
  },
  {
    name: "Maghreb",
    members: new Set(["DZ","LY","MA","MR","TN"]),
  },
  {
    name: "Gulf Cooperation Council",
    members: new Set(["BH","KW","OM","QA","SA","AE"]),
  },
  {
    name: "Caribbean",
    members: new Set([
      "AG","BS","BB","BZ","CU","DM","DO","GD","HT","JM","KN","LC",
      "VC","TT",
    ]),
  },
  {
    name: "Latin America",
    members: new Set([
      "AR","BO","BR","CL","CO","CR","EC","SV","GT","HN","MX","NI",
      "PA","PY","PE","UY","VE",
    ]),
  },
  {
    name: "Commonwealth of Nations",
    members: new Set([
      "AG","AU","BS","BB","BZ","BW","BN","CM","CA","CY","DM","FJ",
      "GM","GH","GD","GY","IN","IE","JM","KE","KI","LS","MW","MY",
      "MV","MT","MU","MZ","NA","NR","NZ","NG","PK","PG","RW","KN",
      "LC","VC","WS","SC","SL","SG","SB","ZA","LK","TZ","TO","TT",
      "TV","UG","GB","VU","ZM",
    ]),
  },
];

function copyFlag(cca2) {
  const src = path.join(FLAGS_SRC_DIR, `${cca2}.svg`);
  const dest = path.join(FLAGS_DIR, `${cca2}.svg`);
  if (!fs.existsSync(src)) return null;
  fs.copyFileSync(src, dest);
  return `/flags/${cca2}.svg`;
}

function buildData() {
  const unMembers = allCountries.filter(
    (c) => c.unMember && c.cca2 && c.name?.official && c.cca2 !== "VA"
  );

  const data = unMembers
    .map((country) => {
      const id = country.cca2;
      const continents =
        continentOverrides[id] || inferContinents(country);
      const flagPath = copyFlag(id);
      return {
        id,
        name: country.name.official,
        aliases: buildAliases(country),
        continents,
        groups: buildGroups(country),
        capitals: normalizeCapitalAliases(country.capital || []),
        flag: {
          path: flagPath,
          source: "country-flag-icons",
          license: "MIT",
          attributionRequired: false,
        },
      };
    })
    .filter((c) => c.flag.path && c.capitals.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return data;
}

function main() {
  ensureDirs();
  const data = buildData();
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  console.log(`Wrote ${data.length} countries to ${DATA_PATH}`);
}

main();
