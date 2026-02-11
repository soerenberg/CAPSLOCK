import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  ListGroup,
  Navbar,
  Row,
  Stack,
  Table
} from 'react-bootstrap';
import './App.css';

const MODE_OPTIONS = [
  {
    id: 'capitals_from_countries',
    label: 'Guess capitals from countries',
    promptKind: 'country',
    promptLabel: 'Country',
    answerAccept: 'capital names and aliases'
  },
  {
    id: 'countries_from_capitals',
    label: 'Guess countries from capitals',
    promptKind: 'capital',
    promptLabel: 'Capital',
    answerAccept: 'country names and aliases'
  },
  {
    id: 'connect',
    label: 'Connect capitals and countries',
    promptKind: 'country',
    promptLabel: 'Match',
    answerAccept: 'country-capital pairings'
  },
  {
    id: 'countries_from_flags',
    label: 'Guess countries from flags',
    promptKind: 'flag',
    promptLabel: 'Flag',
    answerAccept: 'country names and aliases'
  },
  {
    id: 'flags_from_countries',
    label: 'Guess flags from country names',
    promptKind: 'country',
    promptLabel: 'Country',
    answerAccept: 'country flag selection'
  },
  {
    id: 'locate_capitals_map',
    label: 'Locate capitals on a map',
    promptKind: 'capital',
    promptLabel: 'Capital location',
    answerAccept: 'map position'
  },
  {
    id: 'show_table',
    label: 'Show countries, capitals, flags',
    promptKind: 'country',
    promptLabel: 'Country table',
    answerAccept: 'n/a'
  }
];

const FLAVORS = {
  frappe: {
    name: 'Frappe',
    colors: {
      base: '#303446',
      mantle: '#292c3c',
      crust: '#232634',
      text: '#c6d0f5',
      subtext: '#a5adce',
      surface: '#414559',
      border: '#626880',
      rose: '#f2d5cf',
      green: '#a6d189',
      red: '#e78284',
      blue: '#8caaee',
      yellow: '#e5c890'
    }
  },
  latte: {
    name: 'Latte',
    colors: {
      base: '#eff1f5',
      mantle: '#e6e9ef',
      crust: '#dce0e8',
      text: '#4c4f69',
      subtext: '#6c6f85',
      surface: '#ccd0da',
      border: '#acb0be',
      rose: '#dc8a78',
      green: '#40a02b',
      red: '#d20f39',
      blue: '#1e66f5',
      yellow: '#df8e1d'
    }
  },
  macchiato: {
    name: 'Macchiato',
    colors: {
      base: '#24273a',
      mantle: '#1e2030',
      crust: '#181926',
      text: '#cad3f5',
      subtext: '#a5adcb',
      surface: '#363a4f',
      border: '#5b6078',
      rose: '#f4dbd6',
      green: '#a6da95',
      red: '#ed8796',
      blue: '#8aadf4',
      yellow: '#eed49f'
    }
  },
  mocha: {
    name: 'Mocha',
    colors: {
      base: '#1e1e2e',
      mantle: '#181825',
      crust: '#11111b',
      text: '#cdd6f4',
      subtext: '#a6adc8',
      surface: '#313244',
      border: '#585b70',
      rose: '#f5e0dc',
      green: '#a6e3a1',
      red: '#f38ba8',
      blue: '#89b4fa',
      yellow: '#f9e2af'
    }
  }
};

const FONT_OPTIONS = [
  {
    id: 'jetbrains',
    label: 'JetBrains Mono',
    css: '"JetBrains Mono", "SFMono-Regular", Menlo, Consolas, monospace',
    license: 'SIL Open Font License 1.1',
    attributionRequired: false,
    attribution: ''
  },
  {
    id: 'fira',
    label: 'Fira Code',
    css: '"Fira Code", "SFMono-Regular", Menlo, Consolas, monospace',
    license: 'SIL Open Font License 1.1',
    attributionRequired: false,
    attribution: ''
  },
  {
    id: 'source',
    label: 'Source Code Pro',
    css: '"Source Code Pro", "SFMono-Regular", Menlo, Consolas, monospace',
    license: 'SIL Open Font License 1.1',
    attributionRequired: false,
    attribution: ''
  }
];

const MAP_WIDTH = 900;
const MAP_HEIGHT = 450;

function normalizeInput(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(total / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function shuffle(array) {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function sample(array, size) {
  if (size >= array.length) return shuffle(array);
  return shuffle(array).slice(0, size);
}

function uniquePromptItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toPromptItem(modeId, id) {
  const mode = MODE_OPTIONS.find((entry) => entry.id === modeId);
  return {
    kind: mode?.promptKind || 'country',
    id
  };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function App() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [screen, setScreen] = useState('menu');
  const [flavorId, setFlavorId] = useState('frappe');
  const [fontId, setFontId] = useState('jetbrains');

  const [mode, setMode] = useState('capitals_from_countries');
  const [scopeType, setScopeType] = useState('world');
  const [scopeValue, setScopeValue] = useState('world');
  const [countMode, setCountMode] = useState('all');

  const [runConfig, setRunConfig] = useState(null);
  const [runState, setRunState] = useState(null);
  const [tableData, setTableData] = useState({ items: [], label: 'World' });

  const [guessInput, setGuessInput] = useState('');
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [timerNow, setTimerNow] = useState(Date.now());
  const [selectedFlagId, setSelectedFlagId] = useState('');
  const [connectSelection, setConnectSelection] = useState(null);
  const [mapTransform, setMapTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [mapGuess, setMapGuess] = useState(null);
  const [pinchDistance, setPinchDistance] = useState(0);

  const inputRef = useRef(null);
  const mapRef = useRef(null);

  const flavor = FLAVORS[flavorId];
  const font = FONT_OPTIONS.find((entry) => entry.id === fontId) || FONT_OPTIONS[0];

  useEffect(() => {
    const timer = setInterval(() => setTimerNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/data/countries.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load countries (${response.status})`);
        }
        return response.json();
      })
      .then((payload) => {
        setCountries(payload);
        setLoading(false);
      })
      .catch((error) => {
        setLoadError(error.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (screen === 'quiz' && runState && (isTextMode(runState.mode) || runState.mode === 'countries_from_flags')) {
      inputRef.current?.focus();
    }
  }, [screen, runState]);

  useEffect(() => {
    if (!feedback.text) return () => {};
    const delay = feedback.type === 'success' ? 500 : 1000;
    const timer = setTimeout(() => setFeedback({ type: '', text: '' }), delay);
    return () => clearTimeout(timer);
  }, [feedback]);

  const continents = useMemo(() => {
    const set = new Set();
    countries.forEach((country) => country.continents.forEach((entry) => set.add(entry)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [countries]);

  const groups = useMemo(() => {
    const set = new Set();
    countries.forEach((country) => country.groups.forEach((entry) => set.add(entry)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [countries]);

  const scopedCountries = useMemo(() => {
    if (scopeType === 'world') return countries;
    if (scopeType === 'continent') {
      return countries.filter((country) => country.continents.includes(scopeValue));
    }
    if (scopeType === 'group') {
      return countries.filter((country) => country.groups.includes(scopeValue));
    }
    return countries;
  }, [countries, scopeType, scopeValue]);

  const scopeLabel = useMemo(() => {
    if (scopeType === 'world') return 'World';
    return scopeValue;
  }, [scopeType, scopeValue]);

  const countOptions = useMemo(() => {
    const total = scopedCountries.length;
    return [
      { id: 'all', label: `All (${total})`, disabled: false },
      { id: '100', label: '100', disabled: total < 100 },
      { id: '50', label: '50', disabled: total < 50 },
      { id: '25', label: '25', disabled: total < 25 },
      { id: '10', label: '10', disabled: total < 10 },
      { id: 'infinity', label: '∞', disabled: mode === 'connect' || mode === 'show_table' }
    ];
  }, [scopedCountries.length, mode]);

  useEffect(() => {
    const selected = countOptions.find((option) => option.id === countMode);
    if (!selected || selected.disabled) {
      setCountMode('all');
    }
  }, [countMode, countOptions]);

  function filterCountriesByScope(type, value) {
    if (type === 'world') return countries;
    if (type === 'continent') return countries.filter((country) => country.continents.includes(value));
    return countries.filter((country) => country.groups.includes(value));
  }

  function getCountValue(selectedCountMode, total) {
    if (selectedCountMode === 'all') return total;
    if (selectedCountMode === 'infinity') return total;
    return Math.min(total, Number(selectedCountMode));
  }

  function modeMetadata(modeId) {
    return MODE_OPTIONS.find((entry) => entry.id === modeId) || MODE_OPTIONS[0];
  }

  function setupRun(modeId, scope, selectedCountMode, explicitPromptItems = null) {
    const metadata = modeMetadata(modeId);
    const scopeItems = filterCountriesByScope(scope.type, scope.value);

    let selectedIds;
    if (explicitPromptItems && explicitPromptItems.length > 0) {
      const wanted = new Set(explicitPromptItems.map((item) => item.id));
      selectedIds = scopeItems.filter((country) => wanted.has(country.id)).map((country) => country.id);
    } else {
      const count = getCountValue(selectedCountMode, scopeItems.length);
      selectedIds = sample(scopeItems.map((country) => country.id), count);
    }

    if (selectedIds.length === 0) return;

    const byId = Object.fromEntries(countries.map((country) => [country.id, country]));
    const shuffled = shuffle(selectedIds);
    const infinity = selectedCountMode === 'infinity';
    const promptCapitalById = {};

    if (modeId === 'countries_from_capitals') {
      selectedIds.forEach((id) => {
        const capitalOptions = byId[id].capitals;
        promptCapitalById[id] = capitalOptions[Math.floor(Math.random() * capitalOptions.length)]?.name || '';
      });
    }

    const nextRunConfig = {
      mode: modeId,
      scope,
      countMode: selectedCountMode,
      promptLabel: metadata.promptLabel,
      answerAccept: metadata.answerAccept
    };

    if (modeId === 'show_table') {
      setTableData({ items: shuffled.map((id) => byId[id]), label: scope.label });
      setRunConfig(nextRunConfig);
      setScreen('table');
      return;
    }

    const initial = {
      mode: modeId,
      scope,
      selectedIds,
      baseIds: selectedIds,
      queue: shuffled,
      promptCapitalById,
      byId,
      infinity,
      wrongItems: [],
      skippedItems: [],
      numCorrect: 0,
      numWrong: 0,
      numSkipped: 0,
      startedAt: Date.now(),
      finishedAt: null,
      gameUsesPointScore: modeId === 'locate_capitals_map',
      pointScore: 0,
      maxPointScore: 0,
      connectLeft: modeId === 'connect' ? [...selectedIds].sort((a, b) => byId[a].name.localeCompare(byId[b].name)) : [],
      connectRight: modeId === 'connect'
        ? [...selectedIds].sort((a, b) => byId[a].capitals[0]?.name.localeCompare(byId[b].capitals[0]?.name))
        : [],
      availableFlagIds: modeId === 'flags_from_countries' ? shuffle(selectedIds) : []
    };

    setRunConfig(nextRunConfig);
    setRunState(initial);
    setGuessInput('');
    setFeedback({ type: '', text: '' });
    setSelectedFlagId('');
    setConnectSelection(null);
    setMapGuess(null);
    setMapTransform({ scale: 1, x: 0, y: 0 });
    setScreen('quiz');
  }

  function finishRun(nextState) {
    setRunState({ ...nextState, finishedAt: Date.now() });
    setScreen('evaluation');
  }

  function appendUniquePrompt(list, item) {
    if (list.some((entry) => entry.id === item.id && entry.kind === item.kind)) return list;
    return [...list, item];
  }

  function isTextMode(modeId) {
    return modeId === 'capitals_from_countries' || modeId === 'countries_from_capitals';
  }

  function currentCountry(state) {
    const id = state?.queue?.[0];
    return id ? state.byId[id] : null;
  }

  function evaluateTextGuess() {
    if (!runState || (!isTextMode(runState.mode) && runState.mode !== 'countries_from_flags')) return;
    const country = currentCountry(runState);
    if (!country) return;

    const guess = normalizeInput(guessInput);
    if (!guess) return;

    let accepted = [];
    if (runState.mode === 'capitals_from_countries') {
      accepted = country.capitals.flatMap((capital) => [capital.name, ...(capital.aliases || [])]);
    } else {
      accepted = [country.name, ...(country.aliases || [])];
    }

    const valid = accepted.map(normalizeInput).includes(guess);

    if (valid) {
      onCorrectAnswer();
      setFeedback({ type: 'success', text: 'Correct' });
      setGuessInput('');
      return;
    }

    const prompt = toPromptItem(runState.mode, country.id);
    setRunState((previous) => ({
      ...previous,
      numWrong: previous.numWrong + 1,
      wrongItems: appendUniquePrompt(previous.wrongItems, prompt)
    }));
    setFeedback({ type: 'danger', text: 'Wrong' });
  }

  function onCorrectAnswer() {
    setRunState((previous) => {
      const [, ...rest] = previous.queue;
      let nextQueue = rest;

      if (previous.infinity) {
        const nextId = previous.baseIds[Math.floor(Math.random() * previous.baseIds.length)];
        nextQueue = [...rest, nextId];
      }

      const nextState = {
        ...previous,
        queue: nextQueue,
        numCorrect: previous.numCorrect + 1
      };

      if (!previous.infinity && nextQueue.length === 0) {
        setTimeout(() => finishRun(nextState), 0);
      }

      return nextState;
    });
  }

  function onSkip() {
    if (!runState) return;
    const country = currentCountry(runState);
    if (!country) return;

    setRunState((previous) => {
      const [current, ...rest] = previous.queue;
      const moved = [...rest, current];
      const prompt = toPromptItem(previous.mode, current);

      return {
        ...previous,
        queue: moved,
        numSkipped: previous.numSkipped + 1,
        skippedItems: appendUniquePrompt(previous.skippedItems, prompt)
      };
    });

    setGuessInput('');
    setSelectedFlagId('');
    setMapGuess(null);
  }

  function onAbort() {
    if (!runState) return;

    setRunState((previous) => {
      let skippedItems = previous.skippedItems;
      let numSkipped = previous.numSkipped;

      if (!previous.infinity) {
        previous.queue.forEach((id) => {
          skippedItems = appendUniquePrompt(skippedItems, toPromptItem(previous.mode, id));
        });
        numSkipped += previous.queue.length;
      }

      const nextState = {
        ...previous,
        skippedItems,
        numSkipped
      };

      setTimeout(() => finishRun(nextState), 0);
      return nextState;
    });
  }

  function renderPromptTitle(state) {
    const country = currentCountry(state);
    if (!country) return null;

    if (state.mode === 'capitals_from_countries') {
      return (
        <Stack direction="horizontal" gap={3} className="align-items-center">
          <img src={country.flag.path} alt={`${country.name} flag`} className="flag-medium" />
          <div className="prompt-title">{country.name}</div>
        </Stack>
      );
    }

    if (state.mode === 'countries_from_capitals') {
      return <div className="prompt-title">{state.promptCapitalById[country.id] || country.capitals[0]?.name}</div>;
    }

    if (state.mode === 'countries_from_flags') {
      return <img src={country.flag.path} alt="Current flag" className="flag-large" />;
    }

    if (state.mode === 'flags_from_countries') {
      return <div className="prompt-title">{country.name}</div>;
    }

    if (state.mode === 'locate_capitals_map') {
      const capital = country.capitals[0]?.name || 'Unknown capital';
      return (
        <Stack direction="horizontal" gap={2} className="align-items-center prompt-title">
          <img src={country.flag.path} alt={`${country.name} flag`} className="flag-inline" />
          <span>{country.name}</span>
          <span className="muted">-</span>
          <span>{capital}</span>
        </Stack>
      );
    }

    return null;
  }

  function evaluateConnectPair(countryId, capitalId) {
    if (!runState) return;
    const country = runState.byId[countryId];
    const capital = runState.byId[capitalId]?.capitals[0]?.name;
    const isMatch = normalizeInput(capital) === normalizeInput(country?.capitals[0]?.name);

    if (isMatch) {
      setFeedback({ type: 'success', text: 'Correct' });
      setRunState((previous) => {
        const left = previous.connectLeft.filter((id) => id !== countryId);
        const right = previous.connectRight.filter((id) => id !== capitalId);
        const nextState = {
          ...previous,
          connectLeft: left,
          connectRight: right,
          numCorrect: previous.numCorrect + 1
        };
        if (left.length === 0 && right.length === 0) {
          setTimeout(() => finishRun(nextState), 0);
        }
        return nextState;
      });
      return;
    }

    setFeedback({ type: 'danger', text: 'Wrong' });
    setRunState((previous) => ({
      ...previous,
      numWrong: previous.numWrong + 1,
      wrongItems: appendUniquePrompt(previous.wrongItems, toPromptItem(previous.mode, countryId))
    }));
  }

  function connectTap(side, id) {
    if (!connectSelection) {
      setConnectSelection({ side, id });
      return;
    }

    if (connectSelection.side === side) {
      setConnectSelection({ side, id });
      return;
    }

    const countryId = side === 'country' ? id : connectSelection.id;
    const capitalId = side === 'capital' ? id : connectSelection.id;
    evaluateConnectPair(countryId, capitalId);
    setConnectSelection(null);
  }

  function confirmFlagChoice() {
    if (!runState || !selectedFlagId) return;
    const country = currentCountry(runState);
    if (!country) return;

    if (selectedFlagId === country.id) {
      setFeedback({ type: 'success', text: 'Correct' });
      setRunState((previous) => {
        const [current, ...rest] = previous.queue;
        const nextState = {
          ...previous,
          queue: rest,
          availableFlagIds: previous.availableFlagIds.filter((id) => id !== current),
          numCorrect: previous.numCorrect + 1
        };
        if (rest.length === 0) {
          setTimeout(() => finishRun(nextState), 0);
        }
        return nextState;
      });
    } else {
      setFeedback({ type: 'danger', text: 'Wrong' });
      setRunState((previous) => ({
        ...previous,
        numWrong: previous.numWrong + 1,
        wrongItems: appendUniquePrompt(previous.wrongItems, toPromptItem(previous.mode, country.id))
      }));
    }

    setSelectedFlagId('');
  }

  function projectLonLat(lon, lat) {
    const x = ((lon + 180) / 360) * MAP_WIDTH;
    const y = ((90 - lat) / 180) * MAP_HEIGHT;
    return { x, y };
  }

  function inverseProject(x, y) {
    const lon = (x / MAP_WIDTH) * 360 - 180;
    const lat = 90 - (y / MAP_HEIGHT) * 180;
    return { lon, lat };
  }

  function setMapGuessFromClient(clientX, clientY) {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (clientX - rect.left - mapTransform.x) / mapTransform.scale;
    const y = (clientY - rect.top - mapTransform.y) / mapTransform.scale;
    const location = inverseProject(x, y);
    setMapGuess(location);
  }

  function onMapWheel(event) {
    if (!(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();

    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;

    const factor = event.deltaY < 0 ? 1.1 : 0.9;
    setMapTransform((previous) => {
      const nextScale = Math.max(0.8, Math.min(5, previous.scale * factor));
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const scaleRatio = nextScale / previous.scale;
      const nextX = px - (px - previous.x) * scaleRatio;
      const nextY = py - (py - previous.y) * scaleRatio;
      return { scale: nextScale, x: nextX, y: nextY };
    });
  }

  function onMapTouchMove(event) {
    if (event.touches.length !== 2) return;
    const [a, b] = event.touches;
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    if (!pinchDistance) {
      setPinchDistance(distance);
      return;
    }

    const factor = distance / pinchDistance;
    setMapTransform((previous) => ({
      ...previous,
      scale: Math.max(0.8, Math.min(5, previous.scale * factor))
    }));
    setPinchDistance(distance);
  }

  function onMapTouchEnd() {
    setPinchDistance(0);
  }

  function confirmMapGuess() {
    if (!runState || !mapGuess) return;
    const country = currentCountry(runState);
    if (!country) return;

    const distances = country.capitals.map((capital) =>
      haversineKm(mapGuess.lat, mapGuess.lon, capital.lat || 0, capital.lon || 0)
    );

    const minDistance = Math.min(...distances);

    setRunState((previous) => {
      const [, ...rest] = previous.queue;
      let gain = 0;
      if (minDistance <= 100) {
        gain = 100;
      } else if (minDistance <= 500) {
        gain = Math.floor((500 - minDistance) / 4);
      }

      const nextState = {
        ...previous,
        queue: rest,
        numCorrect: previous.numCorrect + 1,
        pointScore: previous.pointScore + gain,
        maxPointScore: previous.maxPointScore + 100
      };

      if (rest.length === 0) {
        setTimeout(() => finishRun(nextState), 0);
      }

      return nextState;
    });

    setMapGuess(null);
  }

  function startMainRun() {
    setupRun(
      mode,
      {
        type: scopeType,
        value: scopeValue,
        label: scopeLabel
      },
      countMode
    );
  }

  function rerunFrom(items) {
    if (!runState || !runConfig) return;
    const unique = uniquePromptItems(items);
    setupRun(runConfig.mode, runConfig.scope, 'all', unique);
  }

  function backToMenu() {
    setRunConfig(null);
    setRunState(null);
    setGuessInput('');
    setFeedback({ type: '', text: '' });
    setSelectedFlagId('');
    setConnectSelection(null);
    setMapGuess(null);
    setMapTransform({ scale: 1, x: 0, y: 0 });
    setScreen('menu');
  }

  const runElapsed = runState ? formatDuration(timerNow - runState.startedAt) : '00:00:00';

  const appStyle = {
    '--ctp-base': flavor.colors.base,
    '--ctp-mantle': flavor.colors.mantle,
    '--ctp-crust': flavor.colors.crust,
    '--ctp-text': flavor.colors.text,
    '--ctp-subtext': flavor.colors.subtext,
    '--ctp-surface': flavor.colors.surface,
    '--ctp-border': flavor.colors.border,
    '--ctp-green': flavor.colors.green,
    '--ctp-red': flavor.colors.red,
    '--ctp-blue': flavor.colors.blue,
    '--ctp-yellow': flavor.colors.yellow,
    '--app-font': font.css
  };

  if (loading) {
    return <div className="app-root" style={appStyle}>Loading country data...</div>;
  }

  if (loadError) {
    return <div className="app-root" style={appStyle}>Failed to load data: {loadError}</div>;
  }

  return (
    <div className="app-root" style={appStyle}>
      <Navbar className="app-nav" expand="md">
        <Container>
          <Navbar.Brand className="app-title">CAPSLOCK</Navbar.Brand>
          <Stack direction="horizontal" gap={2}>
            <Badge bg="secondary" className="theme-badge">{flavor.name}</Badge>
            <Badge bg="secondary" className="theme-badge">{font.label}</Badge>
          </Stack>
        </Container>
      </Navbar>

      <Container className="app-content py-4">
        {screen === 'menu' && (
          <Row className="g-4">
            <Col lg={8}>
              <Card className="panel-card">
                <Card.Body>
                  <Card.Title>Start Run</Card.Title>

                  <div className="menu-section">
                    <div className="menu-label">What?</div>
                    <Form.Select value={mode} onChange={(event) => setMode(event.target.value)}>
                      {MODE_OPTIONS.map((entry) => (
                        <option key={entry.id} value={entry.id}>{entry.label}</option>
                      ))}
                    </Form.Select>
                  </div>

                  <div className="menu-section">
                    <div className="menu-label">Where?</div>
                    <Stack direction="horizontal" gap={2} className="mb-2 flex-wrap">
                      <Button
                        variant={scopeType === 'world' ? 'primary' : 'outline-secondary'}
                        onClick={() => {
                          setScopeType('world');
                          setScopeValue('world');
                        }}
                      >
                        Entire world
                      </Button>
                      <Button
                        variant={scopeType === 'continent' ? 'primary' : 'outline-secondary'}
                        onClick={() => {
                          setScopeType('continent');
                          setScopeValue(continents[0] || 'Europe');
                        }}
                      >
                        Continents
                      </Button>
                      <Button
                        variant={scopeType === 'group' ? 'primary' : 'outline-secondary'}
                        onClick={() => {
                          setScopeType('group');
                          setScopeValue(groups[0] || 'Scandinavia');
                        }}
                      >
                        Groups
                      </Button>
                    </Stack>
                    {scopeType === 'continent' && (
                      <Form.Select value={scopeValue} onChange={(event) => setScopeValue(event.target.value)}>
                        {continents.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                      </Form.Select>
                    )}
                    {scopeType === 'group' && (
                      <Form.Select value={scopeValue} onChange={(event) => setScopeValue(event.target.value)}>
                        {groups.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                      </Form.Select>
                    )}
                  </div>

                  <div className="menu-section">
                    <div className="menu-label">How many?</div>
                    <div className="count-grid">
                      {countOptions.map((entry) => (
                        <Button
                          key={entry.id}
                          disabled={entry.disabled}
                          variant={countMode === entry.id ? 'primary' : 'outline-secondary'}
                          onClick={() => setCountMode(entry.id)}
                        >
                          {entry.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="d-grid mt-4">
                    <Button size="lg" onClick={startMainRun}>Start</Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4}>
              <Card className="panel-card h-100">
                <Card.Body>
                  <Card.Title>Appearance</Card.Title>

                  <Form.Group className="mb-3">
                    <Form.Label>Catppuccin Flavor</Form.Label>
                    <Form.Select value={flavorId} onChange={(event) => setFlavorId(event.target.value)}>
                      {Object.entries(FLAVORS).map(([id, entry]) => (
                        <option key={id} value={id}>{entry.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Font</Form.Label>
                    <Form.Select value={fontId} onChange={(event) => setFontId(event.target.value)}>
                      {FONT_OPTIONS.map((entry) => (
                        <option key={entry.id} value={entry.id}>{entry.label}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <ListGroup>
                    {FONT_OPTIONS.map((entry) => (
                      <ListGroup.Item key={entry.id} className="tiny-meta">
                        <div>{entry.label}</div>
                        <div>{entry.license}</div>
                        {entry.attributionRequired && <div>{entry.attribution}</div>}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {screen === 'quiz' && runState && runState.mode !== 'connect' && runState.mode !== 'flags_from_countries' && runState.mode !== 'locate_capitals_map' && (
          <Card className="panel-card">
            <Card.Body>
              {renderPromptTitle(runState)}

              <div className="mt-3 d-flex gap-2 align-items-start flex-wrap">
                <Form.Control
                  ref={inputRef}
                  type="text"
                  value={guessInput}
                  placeholder="Enter your guess"
                  onChange={(event) => setGuessInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      evaluateTextGuess();
                    }
                  }}
                  className="guess-input"
                />
                <Button onClick={evaluateTextGuess}>Enter</Button>
                <Button variant="outline-secondary" onClick={onSkip}>Skip</Button>
              </div>

              {feedback.text && (
                <Alert variant={feedback.type === 'success' ? 'success' : 'danger'} className="mt-3 tiny-feedback">
                  {feedback.text}
                </Alert>
              )}

              <div className="status-row mt-3">
                <span>{runState.numCorrect} guesses made, {runState.queue.length} pending</span>
                <span>{runElapsed}</span>
              </div>

              <div className="d-grid mt-3">
                <Button variant="danger" onClick={onAbort}>Abort</Button>
              </div>
            </Card.Body>
          </Card>
        )}

        {screen === 'quiz' && runState && runState.mode === 'connect' && (
          <Card className="panel-card">
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <h5>Countries</h5>
                  <div className="scroll-box">
                    {runState.connectLeft.map((id) => (
                      <div
                        key={id}
                        className={`pair-item ${connectSelection?.side === 'country' && connectSelection?.id === id ? 'selected' : ''}`}
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData('text/plain', `country:${id}`)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          const value = event.dataTransfer.getData('text/plain');
                          if (value.startsWith('capital:')) {
                            evaluateConnectPair(id, value.slice(8));
                          }
                        }}
                        onClick={() => connectTap('country', id)}
                      >
                        <img src={runState.byId[id].flag.path} alt="flag" className="flag-inline" />
                        <span>{runState.byId[id].name}</span>
                      </div>
                    ))}
                  </div>
                </Col>

                <Col md={6}>
                  <h5>Capitals</h5>
                  <div className="scroll-box">
                    {runState.connectRight.map((id) => (
                      <div
                        key={id}
                        className={`pair-item ${connectSelection?.side === 'capital' && connectSelection?.id === id ? 'selected' : ''}`}
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData('text/plain', `capital:${id}`)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          const value = event.dataTransfer.getData('text/plain');
                          if (value.startsWith('country:')) {
                            evaluateConnectPair(value.slice(8), id);
                          }
                        }}
                        onClick={() => connectTap('capital', id)}
                      >
                        <span>{runState.byId[id].capitals[0]?.name || 'Unknown'}</span>
                      </div>
                    ))}
                  </div>
                </Col>
              </Row>

              {feedback.text && (
                <Alert variant={feedback.type === 'success' ? 'success' : 'danger'} className="mt-3 tiny-feedback">
                  {feedback.text}
                </Alert>
              )}

              <div className="status-row mt-3">
                <span>{runState.numCorrect} guesses made, {runState.connectLeft.length} pending</span>
                <span>{runElapsed}</span>
              </div>

              <div className="d-grid mt-3">
                <Button variant="danger" onClick={() => {
                  setRunState((previous) => {
                    let skippedItems = previous.skippedItems;
                    previous.connectLeft.forEach((id) => {
                      skippedItems = appendUniquePrompt(skippedItems, toPromptItem(previous.mode, id));
                    });

                    const nextState = {
                      ...previous,
                      skippedItems,
                      numSkipped: previous.numSkipped + previous.connectLeft.length
                    };

                    setTimeout(() => finishRun(nextState), 0);
                    return nextState;
                  });
                }}>
                  Abort
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}

        {screen === 'quiz' && runState && runState.mode === 'flags_from_countries' && (
          <Card className="panel-card">
            <Card.Body>
              {renderPromptTitle(runState)}

              <div className="flag-grid mt-3">
                {runState.availableFlagIds.map((id) => (
                  <button
                    type="button"
                    key={id}
                    className={`flag-choice ${selectedFlagId === id ? 'selected' : ''}`}
                    onClick={() => setSelectedFlagId(id)}
                  >
                    <img src={runState.byId[id].flag.path} alt={runState.byId[id].name} height={25} />
                  </button>
                ))}
              </div>

              {feedback.text && (
                <Alert variant={feedback.type === 'success' ? 'success' : 'danger'} className="mt-3 tiny-feedback">
                  {feedback.text}
                </Alert>
              )}

              <div className="fixed-controls mt-3">
                <Button disabled={!selectedFlagId} onClick={confirmFlagChoice}>Confirm</Button>
                <Button variant="outline-secondary" onClick={onSkip}>Skip</Button>
                <Button variant="danger" onClick={onAbort}>Abort</Button>
              </div>

              <div className="status-row mt-2">
                <span>{runState.numCorrect} guesses made, {runState.queue.length} pending</span>
                <span>{runElapsed}</span>
              </div>
            </Card.Body>
          </Card>
        )}

        {screen === 'quiz' && runState && runState.mode === 'locate_capitals_map' && (
          <Card className="panel-card">
            <Card.Body>
              {renderPromptTitle(runState)}

              <div
                ref={mapRef}
                className="map-shell mt-3"
                onWheel={onMapWheel}
                onClick={(event) => setMapGuessFromClient(event.clientX, event.clientY)}
                onTouchMove={onMapTouchMove}
                onTouchEnd={onMapTouchEnd}
              >
                <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="map-svg">
                  <g transform={`translate(${mapTransform.x} ${mapTransform.y}) scale(${mapTransform.scale})`}>
                    <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} className="map-ocean" />
                    {Array.from({ length: 12 }).map((_, index) => (
                      <line
                        key={`v-${index}`}
                        x1={(index * MAP_WIDTH) / 12}
                        y1="0"
                        x2={(index * MAP_WIDTH) / 12}
                        y2={MAP_HEIGHT}
                        className="map-grid"
                      />
                    ))}
                    {Array.from({ length: 6 }).map((_, index) => (
                      <line
                        key={`h-${index}`}
                        x1="0"
                        y1={(index * MAP_HEIGHT) / 6}
                        x2={MAP_WIDTH}
                        y2={(index * MAP_HEIGHT) / 6}
                        className="map-grid"
                      />
                    ))}
                    {countries.slice(0, 193).map((country) => {
                      const position = projectLonLat(country.capitals[0]?.lon || 0, country.capitals[0]?.lat || 0);
                      return <circle key={country.id} cx={position.x} cy={position.y} r="1" className="map-country-dot" />;
                    })}
                    {mapGuess && (() => {
                      const marker = projectLonLat(mapGuess.lon, mapGuess.lat);
                      return <circle cx={marker.x} cy={marker.y} r="6" className="map-marker" />;
                    })()}
                  </g>
                </svg>
              </div>

              <div className="fixed-controls mt-3">
                <Button disabled={!mapGuess} onClick={confirmMapGuess}>Confirm</Button>
                <Button variant="outline-secondary" onClick={onSkip}>Skip</Button>
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setMapTransform({ scale: 1, x: 0, y: 0 });
                    setMapGuess(null);
                  }}
                >
                  Reset view
                </Button>
                <Button variant="danger" onClick={onAbort}>Abort</Button>
              </div>

              <div className="status-row mt-2">
                <span>{runState.numCorrect} guesses made, {runState.queue.length} pending</span>
                <span>{runElapsed}</span>
              </div>
            </Card.Body>
          </Card>
        )}

        {screen === 'table' && (
          <Card className="panel-card">
            <Card.Body>
              <h5>{tableData.label}</h5>
              <div className="table-wrap">
                <Table bordered hover className="country-table">
                  <thead>
                    <tr>
                      <th>FLAG</th>
                      <th>ISO 3166-1 ALPHA-2</th>
                      <th>NAME AND ALIASES</th>
                      <th>CONTINENTS</th>
                      <th>CAPITAL(S)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.items.map((country) => (
                      <tr key={country.id}>
                        <td><img src={country.flag.path} alt={country.name} height={64} /></td>
                        <td>{country.id}</td>
                        <td>
                          <strong>{country.name}</strong>
                          <div className="cell-lines">{[...country.aliases].sort((a, b) => a.localeCompare(b)).join('\n')}</div>
                        </td>
                        <td className="cell-lines">{country.continents.join('\n')}</td>
                        <td className="cell-lines">{country.capitals.map((capital) => capital.name).join('\n')}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              <div className="d-grid mt-3">
                <Button onClick={backToMenu}>Back to main menu</Button>
              </div>
            </Card.Body>
          </Card>
        )}

        {screen === 'evaluation' && runState && (
          <Card className="panel-card">
            <Card.Body>
              {!runState.gameUsesPointScore && (
                <h5>
                  {runState.numCorrect} correct, {runState.numWrong} mistakes, {runState.numSkipped} skipped
                </h5>
              )}

              {runState.gameUsesPointScore && (
                <h5>Score: {runState.pointScore} out of {runState.maxPointScore}</h5>
              )}

              <p>Time: {formatDuration((runState.finishedAt || timerNow) - runState.startedAt)}</p>

              <Stack direction="horizontal" gap={2} className="flex-wrap">
                <Button
                  variant="outline-secondary"
                  disabled={runState.wrongItems.length === 0}
                  onClick={() => rerunFrom(runState.wrongItems)}
                >
                  Rerun mistakes
                </Button>
                <Button
                  variant="outline-secondary"
                  disabled={runState.skippedItems.length === 0}
                  onClick={() => rerunFrom(runState.skippedItems)}
                >
                  Rerun skips
                </Button>
                <Button
                  variant="outline-secondary"
                  disabled={runState.wrongItems.length + runState.skippedItems.length === 0}
                  onClick={() => rerunFrom(uniquePromptItems([...runState.wrongItems, ...runState.skippedItems]))}
                >
                  Rerun mistakes & skips
                </Button>
                {!['locate_capitals_map', 'show_table'].includes(runState.mode) && (
                  <Button
                    variant="outline-secondary"
                    onClick={() => {
                      const union = uniquePromptItems([...runState.wrongItems, ...runState.skippedItems]);
                      const ids = new Set(union.map((entry) => entry.id));
                      const items = runState.selectedIds.filter((id) => ids.has(id)).map((id) => runState.byId[id]);
                      setTableData({ items, label: 'Reveal answers' });
                      setScreen('table');
                    }}
                  >
                    Reveal answers
                  </Button>
                )}
                <Button onClick={backToMenu}>To main menu</Button>
              </Stack>

              <Row className="g-3 mt-2">
                <Col md={6}>
                  <h6>Wrongly guessed</h6>
                  <ListGroup>
                    {runState.wrongItems.map((item) => (
                      <ListGroup.Item key={`w-${item.kind}-${item.id}`}>
                        {item.kind === 'flag' ? (
                          <img src={runState.byId[item.id]?.flag.path} alt={runState.byId[item.id]?.name} className="flag-inline" />
                        ) : (
                          <span>{runState.byId[item.id]?.name}</span>
                        )}
                      </ListGroup.Item>
                    ))}
                    {runState.wrongItems.length === 0 && <ListGroup.Item>None</ListGroup.Item>}
                  </ListGroup>
                </Col>

                <Col md={6}>
                  <h6>Skipped</h6>
                  <ListGroup>
                    {runState.skippedItems.map((item) => (
                      <ListGroup.Item key={`s-${item.kind}-${item.id}`}>
                        {item.kind === 'flag' ? (
                          <img src={runState.byId[item.id]?.flag.path} alt={runState.byId[item.id]?.name} className="flag-inline" />
                        ) : (
                          <span>{runState.byId[item.id]?.name}</span>
                        )}
                      </ListGroup.Item>
                    ))}
                    {runState.skippedItems.length === 0 && <ListGroup.Item>None</ListGroup.Item>}
                  </ListGroup>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}
      </Container>
    </div>
  );
}

export default App;
