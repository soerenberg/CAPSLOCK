import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  ButtonGroup,
  ToggleButton,
  Form,
  Alert,
  Table,
  Badge,
} from 'react-bootstrap';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { geoEqualEarth } from 'd3-geo';
import './App.css';

const MODE = {
  GUESS_CAPITALS: 'guess-capitals',
  GUESS_COUNTRIES: 'guess-countries',
  CONNECT: 'connect',
  GUESS_FROM_FLAGS: 'guess-from-flags',
  GUESS_FLAGS: 'guess-flags',
  LOCATE_CAPITALS: 'locate-capitals',
  SHOW_TABLE: 'show-table',
};

const COUNT_MODE = {
  ALL: 'all',
  HUNDRED: '100',
  FIFTY: '50',
  TWENTY_FIVE: '25',
  TEN: '10',
  INFINITE: 'infinite',
};

const MODE_META = {
  [MODE.GUESS_CAPITALS]: {
    label: 'Guess capitals from countries',
    promptLabel: 'Country',
    answerAccept: 'Capital',
  },
  [MODE.GUESS_COUNTRIES]: {
    label: 'Guess countries from capitals',
    promptLabel: 'Capital',
    answerAccept: 'Country',
  },
  [MODE.CONNECT]: {
    label: 'Connect capitals and countries',
    promptLabel: 'Country',
    answerAccept: 'Capital',
  },
  [MODE.GUESS_FROM_FLAGS]: {
    label: 'Guess countries from flags',
    promptLabel: 'Flag',
    answerAccept: 'Country',
  },
  [MODE.GUESS_FLAGS]: {
    label: 'Guess flags from country names',
    promptLabel: 'Country',
    answerAccept: 'Flag',
  },
  [MODE.LOCATE_CAPITALS]: {
    label: 'Locate capitals on a map',
    promptLabel: 'Country',
    answerAccept: 'Location',
  },
  [MODE.SHOW_TABLE]: {
    label: 'Show countries, capitals, flags',
    promptLabel: 'Country',
    answerAccept: 'Capital',
  },
};

const COUNT_CHOICES = [
  { mode: COUNT_MODE.ALL, label: (n) => `All (${n})` },
  { mode: COUNT_MODE.HUNDRED, label: () => '100' },
  { mode: COUNT_MODE.FIFTY, label: () => '50' },
  { mode: COUNT_MODE.TWENTY_FIVE, label: () => '25' },
  { mode: COUNT_MODE.TEN, label: () => '10' },
  { mode: COUNT_MODE.INFINITE, label: () => '∞' },
];

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const WORLD_SCOPE = { type: 'world', value: 'world', label: 'Entire world' };

const normalize = (input) => {
  if (!input) return '';
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const formatDuration = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(total / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

const buildAnswerSet = (values) =>
  new Set(values.map((value) => normalize(value)).filter(Boolean));

const uniqueBy = (items, keyFn) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getScopeLabel = (scope) => {
  if (!scope) return '';
  if (scope.type === 'world') return 'Entire world';
  if (scope.type === 'continent') return scope.value;
  if (scope.type === 'group') return scope.value;
  return scope.value;
};

const getCountryLabel = (country) => country?.name ?? '';

const getCapitalLabel = (country, promptCapital) => {
  if (promptCapital) return promptCapital;
  return country?.capitals?.[0]?.name ?? 'Unknown';
};

const getFlagPath = (country) => country?.flag?.path ?? '';

const useTimer = (active, startTime) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active || !startTime) return undefined;
    const tick = () => setElapsed(Date.now() - startTime);
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [active, startTime]);

  return elapsed;
};

const useCountries = () => {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch(`${process.env.PUBLIC_URL}/data/countries.json`)
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setCountries(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { countries, loading };
};

function App() {
  const { countries, loading } = useCountries();
  const [screen, setScreen] = useState('menu');
  const [mode, setMode] = useState(MODE.GUESS_CAPITALS);
  const [scope, setScope] = useState(WORLD_SCOPE);
  const [countMode, setCountMode] = useState(COUNT_MODE.ALL);

  const [runConfig, setRunConfig] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentAnswerMap, setCurrentAnswerMap] = useState({});
  const [wrongItems, setWrongItems] = useState([]);
  const [skippedItems, setSkippedItems] = useState([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [finishTime, setFinishTime] = useState(null);
  const [usesPointScore, setUsesPointScore] = useState(false);
  const [pointScore, setPointScore] = useState(0);
  const [maxPointScore, setMaxPointScore] = useState(0);
  const elapsed = useTimer(screen !== 'menu' && screen !== 'table' && !finishTime, startTime);
  const finalElapsed = finishTime && startTime ? finishTime - startTime : elapsed;

  const scopeOptions = useMemo(() => {
    const continents = Array.from(
      new Set(countries.flatMap((c) => c.continents || []))
    ).sort();
    const groups = Array.from(new Set(countries.flatMap((c) => c.groups || []))).sort();
    return {
      continents,
      groups,
    };
  }, [countries]);

  const selectedCountries = useMemo(() => {
    if (scope?.type === 'continent') {
      return countries.filter((c) => c.continents?.includes(scope.value));
    }
    if (scope?.type === 'group') {
      return countries.filter((c) => c.groups?.includes(scope.value));
    }
    return countries;
  }, [countries, scope]);

  const selectedCount = selectedCountries.length;

  const resetRunStats = () => {
    setWrongItems([]);
    setSkippedItems([]);
    setCorrectCount(0);
    setWrongCount(0);
    setSkippedCount(0);
    setPointScore(0);
    setMaxPointScore(0);
    setUsesPointScore(false);
  };

  const startRun = ({ customQueue = null, customMode = null } = {}) => {
    const runMode = customMode ?? mode;
    const baseItems = customQueue ?? selectedCountries.map((c) => c.id);
    let runQueue = shuffle(baseItems);

    if (!customQueue && runMode !== MODE.SHOW_TABLE) {
      if (countMode !== COUNT_MODE.ALL && countMode !== COUNT_MODE.INFINITE) {
        const limit = parseInt(countMode, 10);
        if (limit && baseItems.length > limit) {
          runQueue = shuffle(baseItems).slice(0, limit);
        }
      }
    }

    const answerMap = {};
    if (runMode === MODE.GUESS_COUNTRIES) {
      runQueue.forEach((id) => {
        const country = countries.find((c) => c.id === id);
        const options = country?.capitals?.map((cap) => cap.name).filter(Boolean) || [];
        const capital =
          options.length > 0 ? options[Math.floor(Math.random() * options.length)] : 'Unknown';
        answerMap[id] = capital;
      });
    }

    resetRunStats();
    setRunConfig({
      mode: runMode,
      scope,
      countMode,
      promptLabel: MODE_META[runMode].promptLabel,
      answerAccept: MODE_META[runMode].answerAccept,
    });
    setQueue(runQueue);
    setCurrentAnswerMap(answerMap);
    setStartTime(Date.now());
    setFinishTime(null);
    setScreen(runMode === MODE.SHOW_TABLE ? 'table' : 'run');
    setUsesPointScore(runMode === MODE.LOCATE_CAPITALS);
  };

  const finishRun = () => {
    setFinishTime(Date.now());
    setScreen('evaluation');
  };

  const rerunFromList = (items) => {
    if (!items.length) return;
    const ids = uniqueBy(items, (item) => item.id).map((item) => item.id);
    startRun({ customQueue: ids, customMode: runConfig.mode });
  };

  const goToTableWithList = (items) => {
    if (!items.length) return;
    const ids = uniqueBy(items, (item) => item.id).map((item) => item.id);
    setRunConfig((prev) => ({
      ...prev,
      mode: MODE.SHOW_TABLE,
      scope: { type: 'custom', value: 'Selection' },
    }));
    setQueue(ids);
    setScreen('table');
  };

  const recordWrong = (item) => {
    setWrongCount((prev) => prev + 1);
    setWrongItems((prev) => uniqueBy([...prev, item], (p) => `${p.kind}-${p.id}`));
  };

  const recordSkipped = (item) => {
    setSkippedCount((prev) => prev + 1);
    setSkippedItems((prev) => uniqueBy([...prev, item], (p) => `${p.kind}-${p.id}`));
  };

  const handleAbort = (kind) => {
    if (countMode !== COUNT_MODE.INFINITE) {
      queue.forEach((id) => recordSkipped({ kind, id }));
    }
    finishRun();
  };

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app-title">CAPSLOCK</div>
        <div className="loading">Loading data…</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-title">CAPSLOCK</div>
      {screen === 'menu' && (
        <MainMenu
          mode={mode}
          setMode={setMode}
          scope={scope}
          setScope={setScope}
          countMode={countMode}
          setCountMode={setCountMode}
          scopeOptions={scopeOptions}
          selectedCount={selectedCount}
          onStart={() => startRun()}
        />
      )}

      {screen === 'run' && runConfig?.mode === MODE.GUESS_CAPITALS && (
        <TextGuessGame
          queue={queue}
          setQueue={setQueue}
          countries={countries}
          currentAnswerMap={currentAnswerMap}
          mode={runConfig.mode}
          promptLabel={runConfig.promptLabel}
          answerAccept={runConfig.answerAccept}
          onAbort={() => handleAbort('country')}
          onFinish={finishRun}
          onCorrect={() => setCorrectCount((prev) => prev + 1)}
          onWrong={recordWrong}
          onSkip={recordSkipped}
          correctCount={correctCount}
          elapsed={elapsed}
          countMode={countMode}
        />
      )}

      {screen === 'run' && runConfig?.mode === MODE.GUESS_COUNTRIES && (
        <TextGuessGame
          queue={queue}
          setQueue={setQueue}
          countries={countries}
          currentAnswerMap={currentAnswerMap}
          mode={runConfig.mode}
          promptLabel={runConfig.promptLabel}
          answerAccept={runConfig.answerAccept}
          onAbort={() => handleAbort('capital')}
          onFinish={finishRun}
          onCorrect={() => setCorrectCount((prev) => prev + 1)}
          onWrong={recordWrong}
          onSkip={recordSkipped}
          correctCount={correctCount}
          elapsed={elapsed}
          countMode={countMode}
        />
      )}

      {screen === 'run' && runConfig?.mode === MODE.GUESS_FROM_FLAGS && (
        <FlagGuessTextGame
          queue={queue}
          setQueue={setQueue}
          countries={countries}
          mode={runConfig.mode}
          promptLabel={runConfig.promptLabel}
          answerAccept={runConfig.answerAccept}
          onAbort={() => handleAbort('flag')}
          onFinish={finishRun}
          onCorrect={() => setCorrectCount((prev) => prev + 1)}
          onWrong={recordWrong}
          onSkip={recordSkipped}
          correctCount={correctCount}
          elapsed={elapsed}
          countMode={countMode}
        />
      )}

      {screen === 'run' && runConfig?.mode === MODE.GUESS_FLAGS && (
        <FlagSelectionGame
          queue={queue}
          setQueue={setQueue}
          countries={countries}
          onAbort={() => handleAbort('country')}
          onFinish={finishRun}
          onCorrect={() => setCorrectCount((prev) => prev + 1)}
          onWrong={recordWrong}
          onSkip={recordSkipped}
          correctCount={correctCount}
          elapsed={elapsed}
          countMode={countMode}
        />
      )}

      {screen === 'run' && runConfig?.mode === MODE.CONNECT && (
        <ConnectGame
          queue={queue}
          countries={countries}
          onAbort={() => {
            queue.forEach((id) => recordSkipped({ kind: 'country', id }));
            finishRun();
          }}
          onFinish={finishRun}
          onCorrect={() => setCorrectCount((prev) => prev + 1)}
          onWrong={recordWrong}
          correctCount={correctCount}
          elapsed={elapsed}
        />
      )}

      {screen === 'run' && runConfig?.mode === MODE.LOCATE_CAPITALS && (
        <MapGame
          queue={queue}
          setQueue={setQueue}
          countries={countries}
          onAbort={() => handleAbort('country')}
          onFinish={finishRun}
          onSkip={recordSkipped}
          onScore={(points, maxPoints) => {
            setPointScore((prev) => prev + points);
            setMaxPointScore((prev) => prev + maxPoints);
          }}
          onCorrect={() => setCorrectCount((prev) => prev + 1)}
          elapsed={elapsed}
          countMode={countMode}
          correctCount={correctCount}
        />
      )}

      {screen === 'table' && (
        <CountryTable
          countries={countries}
          ids={queue.length ? queue : selectedCountries.map((c) => c.id)}
          scopeLabel={getScopeLabel(scope)}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'evaluation' && (
        <EvaluationScreen
          runConfig={runConfig}
          correctCount={correctCount}
          wrongCount={wrongCount}
          skippedCount={skippedCount}
          wrongItems={wrongItems}
          skippedItems={skippedItems}
          countries={countries}
          elapsed={finalElapsed}
          usesPointScore={usesPointScore}
          pointScore={pointScore}
          maxPointScore={maxPointScore}
          onRerunMistakes={() => rerunFromList(wrongItems)}
          onRerunSkips={() => rerunFromList(skippedItems)}
          onRerunAll={() => rerunFromList(uniqueBy([...wrongItems, ...skippedItems], (i) => i.id))}
          onReveal={() => goToTableWithList(uniqueBy([...wrongItems, ...skippedItems], (i) => i.id))}
          onMainMenu={() => {
            resetRunStats();
            setFinishTime(null);
            setScreen('menu');
          }}
        />
      )}
    </div>
  );
}

const MainMenu = ({
  mode,
  setMode,
  scope,
  setScope,
  countMode,
  setCountMode,
  scopeOptions,
  selectedCount,
  onStart,
}) => (
  <Container className="menu-screen">
    <Section title="What?">
      <ButtonGroup className="menu-group" aria-label="Game mode">
        {Object.values(MODE).map((value) => {
          const isDisabled = false;
          if (value === MODE.SHOW_TABLE) {
            return (
              <ToggleButton
                key={value}
                id={`mode-${value}`}
                type="radio"
                variant={mode === value ? 'primary' : 'outline-light'}
                name="mode"
                value={value}
                disabled={isDisabled}
                checked={mode === value}
                onChange={(e) => setMode(e.currentTarget.value)}
              >
                {MODE_META[value].label}
              </ToggleButton>
            );
          }
          return (
            <ToggleButton
              key={value}
              id={`mode-${value}`}
              type="radio"
              variant={mode === value ? 'primary' : 'outline-light'}
              name="mode"
              value={value}
              disabled={isDisabled}
              checked={mode === value}
              onChange={(e) => setMode(e.currentTarget.value)}
            >
              {MODE_META[value].label}
            </ToggleButton>
          );
        })}
      </ButtonGroup>
    </Section>

    <Section title="Where?">
      <div className="menu-subtitle">Continents</div>
      <ButtonGroup className="menu-group" aria-label="Continents">
        <ToggleButton
          id="scope-world"
          type="radio"
          variant={scope?.type === 'world' ? 'primary' : 'outline-light'}
          name="scope"
          value="world"
          checked={scope?.type === 'world'}
          onChange={() => setScope(WORLD_SCOPE)}
        >
          Entire world
        </ToggleButton>
        {scopeOptions.continents.map((cont) => (
          <ToggleButton
            key={cont}
            id={`scope-${cont}`}
            type="radio"
            variant={scope?.type === 'continent' && scope.value === cont ? 'primary' : 'outline-light'}
            name="scope"
            value={cont}
            checked={scope?.type === 'continent' && scope.value === cont}
            onChange={() => setScope({ type: 'continent', value: cont, label: cont })}
          >
            {cont}
          </ToggleButton>
        ))}
      </ButtonGroup>

      <div className="menu-subtitle">Other groups</div>
      <ButtonGroup className="menu-group" aria-label="Groups">
        {scopeOptions.groups.map((group) => (
          <ToggleButton
            key={group}
            id={`group-${group}`}
            type="radio"
            variant={scope?.type === 'group' && scope.value === group ? 'primary' : 'outline-light'}
            name="scope"
            value={group}
            checked={scope?.type === 'group' && scope.value === group}
            onChange={() => setScope({ type: 'group', value: group, label: group })}
          >
            {group}
          </ToggleButton>
        ))}
      </ButtonGroup>
    </Section>

    <Section title="How many?">
      <ButtonGroup className="menu-group" aria-label="Count">
        {COUNT_CHOICES.map((choice) => {
          const label = choice.label(selectedCount);
          let disabled = false;
          if (choice.mode === COUNT_MODE.INFINITE && mode === MODE.CONNECT) {
            disabled = true;
          }
          if ([COUNT_MODE.HUNDRED, COUNT_MODE.FIFTY, COUNT_MODE.TWENTY_FIVE, COUNT_MODE.TEN].includes(
            choice.mode
          )) {
            const number = parseInt(choice.mode, 10);
            if (selectedCount < number) disabled = true;
          }
          return (
            <ToggleButton
              key={choice.mode}
              id={`count-${choice.mode}`}
              type="radio"
              variant={countMode === choice.mode ? 'primary' : 'outline-light'}
              name="count"
              value={choice.mode}
              checked={countMode === choice.mode}
              disabled={disabled}
              onChange={(e) => setCountMode(e.currentTarget.value)}
            >
              {label}
            </ToggleButton>
          );
        })}
      </ButtonGroup>
    </Section>

    <div className="menu-actions">
      <Button className="start-button" onClick={onStart}>
        Start
      </Button>
      <div className="menu-meta">{selectedCount} countries in selection</div>
    </div>
  </Container>
);

const Section = ({ title, children }) => (
  <section className="menu-section">
    <div className="menu-title">{title}</div>
    {children}
  </section>
);

const TextGuessGame = ({
  queue,
  setQueue,
  countries,
  currentAnswerMap,
  mode,
  promptLabel,
  answerAccept,
  onAbort,
  onFinish,
  onCorrect,
  onWrong,
  onSkip,
  correctCount,
  elapsed,
  countMode,
}) => {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [queue]);

  useEffect(() => {
    if (!queue.length) {
      onFinish();
    }
  }, [queue, onFinish]);

  const currentId = queue[0];
  const country = countries.find((c) => c.id === currentId);
  if (!country) return null;

  const prompt =
    mode === MODE.GUESS_CAPITALS
      ? getCountryLabel(country)
      : getCapitalLabel(country, currentAnswerMap[currentId]);

  const answers =
    mode === MODE.GUESS_CAPITALS
      ? buildAnswerSet(
          country.capitals.flatMap((cap) => [cap.name, ...(cap.aliases || [])])
        )
      : buildAnswerSet([country.name, ...(country.aliases || [])]);

  const submit = () => {
    const normalized = normalize(input);
    if (!normalized) return;
    if (answers.has(normalized)) {
      setFeedback({ type: 'success', text: 'Correct' });
      setInput('');
      onCorrect();
      setQueue((prev) => prev.slice(1));
      setTimeout(() => setFeedback(null), 500);
    } else {
      setFeedback({ type: 'danger', text: 'Wrong' });
      onWrong({ kind: mode === MODE.GUESS_COUNTRIES ? 'capital' : 'country', id: currentId });
      setTimeout(() => setFeedback(null), 1000);
    }
  };

  const skip = () => {
    onSkip({ kind: mode === MODE.GUESS_COUNTRIES ? 'capital' : 'country', id: currentId });
    setQueue((prev) => {
      const rest = prev.slice(1);
      if (countMode === COUNT_MODE.INFINITE && rest.length === 0) {
        return shuffle(prev);
      }
      return [...rest, currentId];
    });
    setInput('');
  };

  return (
    <Container className="run-screen">
      <PromptCard
        label={promptLabel}
        value={prompt}
        flag={mode === MODE.GUESS_CAPITALS ? getFlagPath(country) : null}
      />
      <div className="input-row">
        <Form.Control
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          className={feedback?.type === 'danger' ? 'input-wrong' : ''}
          placeholder={`Enter ${answerAccept.toLowerCase()}...`}
        />
        <Button variant="primary" onClick={submit}>
          Enter
        </Button>
        <Button variant="secondary" onClick={skip}>
          Skip
        </Button>
        {feedback && (
          <Alert className={`feedback feedback-${feedback.type}`} variant={feedback.type}>
            {feedback.text}
          </Alert>
        )}
      </div>

      <div className="status-row">
        <span>
          {correctCount} guesses made, {queue.length} pending
        </span>
        <span className="timer">{formatDuration(elapsed)}</span>
      </div>

      <div className="abort-row">
        <Button variant="danger" onClick={onAbort}>
          Abort
        </Button>
      </div>
    </Container>
  );
};

const FlagGuessTextGame = ({
  queue,
  setQueue,
  countries,
  mode,
  promptLabel,
  answerAccept,
  onAbort,
  onFinish,
  onCorrect,
  onWrong,
  onSkip,
  correctCount,
  elapsed,
  countMode,
}) => {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [queue]);

  useEffect(() => {
    if (!queue.length) onFinish();
  }, [queue, onFinish]);

  const currentId = queue[0];
  const country = countries.find((c) => c.id === currentId);
  if (!country) return null;
  const answers = buildAnswerSet([country.name, ...(country.aliases || [])]);

  const submit = () => {
    const normalized = normalize(input);
    if (!normalized) return;
    if (answers.has(normalized)) {
      setFeedback({ type: 'success', text: 'Correct' });
      setInput('');
      onCorrect();
      setQueue((prev) => prev.slice(1));
      setTimeout(() => setFeedback(null), 500);
    } else {
      setFeedback({ type: 'danger', text: 'Wrong' });
      onWrong({ kind: 'flag', id: currentId });
      setTimeout(() => setFeedback(null), 1000);
    }
  };

  const skip = () => {
    onSkip({ kind: 'flag', id: currentId });
    setQueue((prev) => {
      const rest = prev.slice(1);
      if (countMode === COUNT_MODE.INFINITE && rest.length === 0) {
        return shuffle(prev);
      }
      return [...rest, currentId];
    });
    setInput('');
  };

  return (
    <Container className="run-screen">
      <PromptCard
        label={promptLabel}
        value={country.name}
        flag={getFlagPath(country)}
        large
        showOnlyFlag
      />
      <div className="input-row">
        <Form.Control
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          className={feedback?.type === 'danger' ? 'input-wrong' : ''}
          placeholder={`Enter ${answerAccept.toLowerCase()}...`}
        />
        <Button variant="primary" onClick={submit}>
          Enter
        </Button>
        <Button variant="secondary" onClick={skip}>
          Skip
        </Button>
        {feedback && (
          <Alert className={`feedback feedback-${feedback.type}`} variant={feedback.type}>
            {feedback.text}
          </Alert>
        )}
      </div>
      <div className="status-row">
        <span>
          {correctCount} guesses made, {queue.length} pending
        </span>
        <span className="timer">{formatDuration(elapsed)}</span>
      </div>
      <div className="abort-row">
        <Button variant="danger" onClick={onAbort}>
          Abort
        </Button>
      </div>
    </Container>
  );
};

const FlagSelectionGame = ({
  queue,
  setQueue,
  countries,
  onAbort,
  onFinish,
  onCorrect,
  onWrong,
  onSkip,
  correctCount,
  elapsed,
  countMode,
}) => {
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [availableFlags, setAvailableFlags] = useState(queue);

  useEffect(() => {
    setAvailableFlags(queue);
  }, [queue]);

  useEffect(() => {
    if (!queue.length) onFinish();
  }, [queue, onFinish]);

  const currentId = queue[0];
  const country = countries.find((c) => c.id === currentId);
  if (!country) return null;

  const confirm = () => {
    if (!selectedFlag) return;
    if (selectedFlag === currentId) {
      setFeedback({ type: 'success', text: 'Correct' });
      onCorrect();
      setQueue((prev) => prev.slice(1));
      setAvailableFlags((prev) => prev.filter((id) => id !== currentId));
      setSelectedFlag(null);
      setTimeout(() => setFeedback(null), 500);
    } else {
      setFeedback({ type: 'danger', text: 'Wrong' });
      onWrong({ kind: 'country', id: currentId });
      setSelectedFlag(null);
      setTimeout(() => setFeedback(null), 1000);
    }
  };

  const skip = () => {
    onSkip({ kind: 'country', id: currentId });
    setQueue((prev) => {
      const rest = prev.slice(1);
      if (countMode === COUNT_MODE.INFINITE && rest.length === 0) {
        return shuffle(prev);
      }
      return [...rest, currentId];
    });
    setSelectedFlag(null);
  };

  return (
    <Container className="run-screen">
      <PromptCard label="Country" value={country.name} />
      <div className="flag-grid">
        {availableFlags.map((id) => {
          const flagCountry = countries.find((c) => c.id === id);
          if (!flagCountry) return null;
          return (
            <button
              key={id}
              type="button"
              className={`flag-button ${selectedFlag === id ? 'selected' : ''}`}
              onClick={() => setSelectedFlag(id)}
            >
              <img src={getFlagPath(flagCountry)} alt={flagCountry.name} />
            </button>
          );
        })}
      </div>

      <div className="button-row fixed-actions">
        <Button variant="primary" onClick={confirm} disabled={!selectedFlag}>
          Confirm
        </Button>
        <Button variant="secondary" onClick={skip}>
          Skip
        </Button>
        <Button variant="danger" onClick={onAbort}>
          Abort
        </Button>
      </div>
      <div className="status-row">
        <span>
          {correctCount} guesses made, {queue.length} pending
        </span>
        {feedback && (
          <Alert className={`feedback feedback-${feedback.type}`} variant={feedback.type}>
            {feedback.text}
          </Alert>
        )}
        <span className="timer">{formatDuration(elapsed)}</span>
      </div>
    </Container>
  );
};

const ConnectGame = ({ queue, countries, onAbort, onFinish, onCorrect, onWrong, correctCount, elapsed }) => {
  const initialIds = useMemo(() => queue, [queue]);
  const [leftIds, setLeftIds] = useState(() => initialIds);
  const [rightIds, setRightIds] = useState(() => initialIds);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    if (leftIds.length === 0) onFinish();
  }, [leftIds, onFinish]);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));

  const handleDragEnd = ({ active, over }) => {
    if (!over) return;
    const [activeKind, activeId] = active.id.split(':');
    const [overKind, overId] = over.id.split(':');
    if (activeKind === overKind) return;
    const countryId = activeKind === 'country' ? activeId : overId;
    const matchId = activeKind === 'country' ? overId : activeId;

    if (countryId === matchId) {
      setFlash('success');
      onCorrect();
      setLeftIds((prev) => prev.filter((id) => id !== countryId));
      setRightIds((prev) => prev.filter((id) => id !== matchId));
    } else {
      setFlash('danger');
      onWrong({ kind: 'country', id: countryId });
    }
    setTimeout(() => setFlash(null), 500);
  };

  return (
    <Container className="run-screen">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <Row>
          <Col md={6} className="scroll-column">
            <div className="column-title">Countries</div>
            <div className="list-box">
              {leftIds
                .map((id) => countries.find((c) => c.id === id))
                .filter(Boolean)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((country) => (
                  <DraggableItem
                    key={`country-${country.id}`}
                    id={`country:${country.id}`}
                    content={
                      <div className="drag-item">
                        <img src={getFlagPath(country)} alt="" />
                        <span>{country.name}</span>
                      </div>
                    }
                  />
                ))}
            </div>
          </Col>
          <Col md={6} className="scroll-column">
            <div className="column-title">Capitals</div>
            <div className="list-box">
              {rightIds
                .map((id) => countries.find((c) => c.id === id))
                .filter(Boolean)
                .sort((a, b) =>
                  (a.capitals?.[0]?.name || '').localeCompare(b.capitals?.[0]?.name || '')
                )
                .map((country) => (
                  <DraggableItem
                    key={`capital-${country.id}`}
                    id={`capital:${country.id}`}
                    content={
                      <div className="drag-item">
                        <span>{country.capitals?.[0]?.name || 'Unknown'}</span>
                      </div>
                    }
                  />
                ))}
            </div>
          </Col>
        </Row>
      </DndContext>
      {flash && <div className={`flash flash-${flash}`}>{flash === 'success' ? 'Correct' : 'Wrong'}</div>}
      <div className="status-row">
        <span>{correctCount} guesses made, {leftIds.length} pending</span>
        <span className="timer">{formatDuration(elapsed)}</span>
      </div>
      <div className="abort-row">
        <Button variant="danger" onClick={onAbort}>
          Abort
        </Button>
      </div>
    </Container>
  );
};

const DraggableItem = ({ id, content }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const { setNodeRef: setDropRef } = useDroppable({ id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setDropRef} className="droppable">
      <div
        ref={setNodeRef}
        style={style}
        className="drag-wrapper"
        {...listeners}
        {...attributes}
      >
        {content}
      </div>
    </div>
  );
};

const MapGame = ({
  queue,
  setQueue,
  countries,
  onAbort,
  onFinish,
  onSkip,
  onScore,
  onCorrect,
  elapsed,
  countMode,
  correctCount,
}) => {
  const [marker, setMarker] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState([0, 20]);
  const mapRef = useRef(null);
  const projectionConfig = { scale: 160 };

  useEffect(() => {
    if (!queue.length) onFinish();
  }, [queue, onFinish]);

  const currentId = queue[0];
  const country = countries.find((c) => c.id === currentId);
  if (!country) return null;

  const promptCapital = country.capitals?.[0]?.name || 'Unknown';

  const handleClick = (event) => {
    if (!mapRef.current) return;
    const svg = mapRef.current.querySelector('svg');
    if (!svg) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());
    const projection = geoEqualEarth().scale(projectionConfig.scale).translate([400, 250]);
    const coords = projection.invert([svgPoint.x, svgPoint.y]);
    if (coords) {
      setMarker({ coordinates: coords });
    }
  };

  const handleConfirm = () => {
    if (!marker) return;
    const capitals = country.capitals || [];
    const distances = capitals
      .map((cap) => haversineKm(marker.coordinates[1], marker.coordinates[0], cap.lat, cap.lon))
      .filter((d) => Number.isFinite(d));
    const minDistance = distances.length ? Math.min(...distances) : 9999;
    let points = 0;
    if (minDistance <= 100) {
      points = 100;
    } else if (minDistance <= 500) {
      points = Math.floor((500 - minDistance) / 4);
    }
    onScore(points, 100);
    onCorrect();
    setQueue((prev) => {
      const rest = prev.slice(1);
      if (countMode === COUNT_MODE.INFINITE && rest.length === 0) {
        return shuffle(prev);
      }
      return rest;
    });
    setMarker(null);
  };

  const handleSkip = () => {
    onSkip({ kind: 'country', id: currentId });
    setQueue((prev) => {
      const rest = prev.slice(1);
      if (countMode === COUNT_MODE.INFINITE && rest.length === 0) {
        return shuffle(prev);
      }
      return [...rest, currentId];
    });
    setMarker(null);
  };

  const resetView = () => {
    setZoom(1);
    setCenter([0, 20]);
  };

  const handleWheel = (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.min(8, Math.max(1, prev * delta)));
  };

  return (
    <Container className="run-screen">
      <div className="map-header">
        <img src={getFlagPath(country)} alt={country.name} />
        <span>{country.name}</span>
        <span className="map-sep">-</span>
        <span>{promptCapital}</span>
      </div>
      <div className="map-container" ref={mapRef} onWheel={handleWheel}>
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={projectionConfig}
          width={800}
          height={500}
          onClick={handleClick}
        >
          <ZoomableGroup center={center} zoom={zoom} onMoveEnd={({ coordinates, zoom: z }) => {
            setCenter(coordinates);
            setZoom(z);
          }}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography key={geo.rsmKey} geography={geo} className="map-geo" />
                ))
              }
            </Geographies>
            {marker && (
              <Marker coordinates={marker.coordinates}>
                <circle r={5} className="map-marker" />
              </Marker>
            )}
          </ZoomableGroup>
        </ComposableMap>
      </div>
      <div className="button-row fixed-actions">
        <Button variant="primary" onClick={handleConfirm} disabled={!marker}>
          Confirm
        </Button>
        <Button variant="secondary" onClick={handleSkip}>
          Skip
        </Button>
        <Button variant="secondary" onClick={resetView}>
          Reset view
        </Button>
        <Button variant="danger" onClick={onAbort}>
          Abort
        </Button>
      </div>
      <div className="status-row">
        <span>
          {correctCount} guesses made, {queue.length} pending
        </span>
        <span className="timer">{formatDuration(elapsed)}</span>
      </div>
    </Container>
  );
};

const CountryTable = ({ countries, ids, scopeLabel, onBack }) => {
  const rows = useMemo(() => {
    const list = ids.map((id) => countries.find((c) => c.id === id)).filter(Boolean);
    return shuffle(list);
  }, [countries, ids]);

  return (
    <Container className="table-screen">
      <div className="table-header">
        <div className="subtitle">{scopeLabel}</div>
        <Button variant="secondary" onClick={onBack}>
          Back to main menu
        </Button>
      </div>
      <div className="table-wrapper">
        <Table striped bordered hover variant="dark" className="country-table">
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
            {rows.map((country) => (
              <tr key={country.id}>
                <td>
                  <img className="table-flag" src={getFlagPath(country)} alt={country.name} />
                </td>
                <td>{country.id}</td>
                <td>
                  <strong>{country.name}</strong>
                  <div className="alias-list">
                    {[...(country.aliases || [])]
                      .filter((alias) => alias !== country.name)
                      .sort()
                      .map((alias) => (
                        <div key={alias}>{alias}</div>
                      ))}
                  </div>
                </td>
                <td>
                  {(country.continents || []).map((cont) => (
                    <div key={cont}>{cont}</div>
                  ))}
                </td>
                <td>
                  {(country.capitals || []).map((cap) => (
                    <div key={cap.name}>{cap.name}</div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Container>
  );
};

const EvaluationScreen = ({
  runConfig,
  correctCount,
  wrongCount,
  skippedCount,
  wrongItems,
  skippedItems,
  countries,
  elapsed,
  usesPointScore,
  pointScore,
  maxPointScore,
  onRerunMistakes,
  onRerunSkips,
  onRerunAll,
  onReveal,
  onMainMenu,
}) => {
  const wrongList = wrongItems.map((item) => renderPromptItem(item, countries));
  const skippedList = skippedItems.map((item) => renderPromptItem(item, countries));
  const showReveal =
    runConfig?.mode !== MODE.LOCATE_CAPITALS && runConfig?.mode !== MODE.SHOW_TABLE;

  return (
    <Container className="evaluation-screen">
      <div className="evaluation-title">Run complete</div>
      <div className="evaluation-score">
        {usesPointScore
          ? `Score: ${pointScore} out of ${maxPointScore}`
          : `${correctCount} correct, ${wrongCount} mistakes, ${skippedCount} skipped`}
      </div>
      <div className="evaluation-time">Time: {formatDuration(elapsed)}</div>
      <div className="button-row">
        <Button variant="secondary" onClick={onRerunMistakes} disabled={!wrongItems.length}>
          Rerun mistakes
        </Button>
        <Button variant="secondary" onClick={onRerunSkips} disabled={!skippedItems.length}>
          Rerun skips
        </Button>
        <Button
          variant="secondary"
          onClick={onRerunAll}
          disabled={!wrongItems.length && !skippedItems.length}
        >
          Rerun mistakes & skips
        </Button>
        {showReveal && (
          <Button
            variant="outline-light"
            onClick={onReveal}
            disabled={!wrongItems.length && !skippedItems.length}
          >
            Reveal answers
          </Button>
        )}
        <Button variant="primary" onClick={onMainMenu}>
          To main menu
        </Button>
      </div>
      <Row className="evaluation-lists">
        <Col md={6}>
          <div className="list-title">Wrong guesses</div>
          {wrongList.length ? wrongList : <div className="empty">None</div>}
        </Col>
        <Col md={6}>
          <div className="list-title">Skipped</div>
          {skippedList.length ? skippedList : <div className="empty">None</div>}
        </Col>
      </Row>
    </Container>
  );
};

const PromptCard = ({ label, value, flag, large, showOnlyFlag }) => (
  <div className={`prompt-card ${large ? 'large' : ''}`}>
    <div className="prompt-label">{label}</div>
    {!showOnlyFlag && <div className="prompt-value">{value}</div>}
    {flag && (
      <div className="prompt-flag">
        <img src={flag} alt="flag" />
      </div>
    )}
  </div>
);

const renderPromptItem = (item, countries) => {
  const country = countries.find((c) => c.id === item.id);
  if (!country) return null;
  if (item.kind === 'flag') {
    return (
      <div key={`${item.kind}-${item.id}`} className="result-item">
        <img src={getFlagPath(country)} alt={country.name} />
        <span>{country.name}</span>
      </div>
    );
  }
  if (item.kind === 'capital') {
    return (
      <div key={`${item.kind}-${item.id}`} className="result-item">
        <span>{country.capitals?.[0]?.name || 'Unknown'}</span>
        <Badge bg="secondary">{country.name}</Badge>
      </div>
    );
  }
  return (
    <div key={`${item.kind}-${item.id}`} className="result-item">
      <span>{country.name}</span>
      <Badge bg="secondary">{country.capitals?.[0]?.name || 'Unknown'}</Badge>
    </div>
  );
};

export default App;
