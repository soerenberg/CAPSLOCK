import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Button,
  ButtonGroup,
  Card,
  Col,
  Container,
  Form,
  ListGroup,
  Offcanvas,
  Row,
} from "react-bootstrap";
import "./App.css";

const FLAVORS = [
  { id: "latte", label: "Latte" },
  { id: "frappe", label: "Frappe" },
  { id: "macchiato", label: "Macchiato" },
  { id: "mocha", label: "Mocha" },
];

const FONTS = [
  {
    id: "jetbrains",
    label: "JetBrains Mono",
    family: "'JetBrains Mono', monospace",
    license: "OFL",
    source: "Google Fonts",
    attributionRequired: false,
  },
  {
    id: "fira",
    label: "Fira Code",
    family: "'Fira Code', monospace",
    license: "OFL",
    source: "Google Fonts",
    attributionRequired: false,
  },
  {
    id: "ibm",
    label: "IBM Plex Mono",
    family: "'IBM Plex Mono', monospace",
    license: "OFL",
    source: "Google Fonts",
    attributionRequired: false,
  },
  {
    id: "sourcecode",
    label: "Source Code Pro",
    family: "'Source Code Pro', monospace",
    license: "OFL",
    source: "Google Fonts",
    attributionRequired: false,
  },
];

const MODES = [
  {
    id: "country-to-capital",
    label: "Guess capitals from countries",
    promptLabel: "Country",
    answerAccept: "Capital",
  },
  {
    id: "capital-to-country",
    label: "Guess countries from capitals",
    promptLabel: "Capital",
    answerAccept: "Country",
  },
  {
    id: "connect",
    label: "Connect capitals and countries",
    promptLabel: "Country",
    answerAccept: "Capital",
  },
];

const COUNT_OPTIONS = [
  { id: "all", label: "All" },
  { id: "100", label: "100" },
  { id: "50", label: "50" },
  { id: "25", label: "25" },
  { id: "10", label: "10" },
  { id: "infinite", label: "∞" },
];

function ConnectItem({ id, children, className }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <ListGroup.Item
      ref={(node) => {
        setNodeRef(node);
        setDropRef(node);
      }}
      className={`${className} ${isOver ? "is-over" : ""} ${
        isDragging ? "is-dragging" : ""
      }`}
      style={style}
      {...listeners}
      {...attributes}
    >
      {children}
    </ListGroup.Item>
  );
}

function normalize(input) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatTime(seconds) {
  const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sample(array, count) {
  return shuffle(array).slice(0, count);
}

export default function App() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [screen, setScreen] = useState("menu");
  const [mode, setMode] = useState("country-to-capital");
  const [scope, setScope] = useState({ type: "world", value: "world" });
  const [countMode, setCountMode] = useState("all");
  const [theme, setTheme] = useState("frappe");
  const [fontChoice, setFontChoice] = useState("jetbrains");
  const [showMenu, setShowMenu] = useState(false);

  const [runConfig, setRunConfig] = useState(null);
  const [queue, setQueue] = useState([]);
  const [poolItems, setPoolItems] = useState([]);
  const [capitalChoices, setCapitalChoices] = useState({});
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [wrongList, setWrongList] = useState([]);
  const [skippedList, setSkippedList] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [inputState, setInputState] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState(null);

  const inputRef = useRef(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

  useEffect(() => {
    fetch("/data/countries.json")
      .then((res) => res.json())
      .then((data) => {
        setCountries(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (screen !== "quiz") return undefined;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 500);
    return () => clearInterval(interval);
  }, [screen, startTime]);

  useEffect(() => {
    if (screen === "quiz" && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [screen, queue, inputState]);

  const continents = useMemo(() => {
    const set = new Set();
    countries.forEach((c) => c.continents.forEach((ct) => set.add(ct)));
    return Array.from(set).sort();
  }, [countries]);

  const groups = useMemo(() => {
    const set = new Set();
    countries.forEach((c) => c.groups.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [countries]);

  const filteredCountries = useMemo(() => {
    if (scope.type === "world") return countries;
    if (scope.type === "continent") {
      return countries.filter((c) => c.continents.includes(scope.value));
    }
    if (scope.type === "group") {
      return countries.filter((c) => c.groups.includes(scope.value));
    }
    return countries;
  }, [countries, scope]);

  const countOptions = useMemo(() => {
    const total = filteredCountries.length;
    return COUNT_OPTIONS.map((opt) => {
      if (opt.id === "all") {
        return { ...opt, label: `All (${total})`, disabled: total === 0 };
      }
      if (opt.id === "infinite") {
        return { ...opt, disabled: mode === "connect" };
      }
      const num = Number(opt.id);
      return { ...opt, disabled: total < num };
    });
  }, [filteredCountries, mode]);

  function chooseCapital(country) {
    if (!country.capitals || country.capitals.length === 0) return "";
    return country.capitals[Math.floor(Math.random() * country.capitals.length)];
  }

  function buildItems(baseCountries, modeId) {
    const choices = {};
    baseCountries.forEach((country) => {
      choices[country.id] = chooseCapital(country);
    });

    if (modeId === "country-to-capital") {
      return {
        items: baseCountries.map((country) => ({
          id: country.id,
          country,
          promptLabel: country.name,
        })),
        choices,
      };
    }

    if (modeId === "capital-to-country") {
      return {
        items: baseCountries.map((country) => ({
          id: country.id,
          country,
          capital: choices[country.id],
          promptLabel: choices[country.id],
        })),
        choices,
      };
    }

    return {
      items: baseCountries.map((country) => ({
        id: country.id,
        country,
        capital: choices[country.id],
        promptLabel: country.name,
      })),
      choices,
    };
  }

  function startRun({ overrideIds = null, overrideCount = null } = {}) {
    const modeConfig = MODES.find((m) => m.id === mode);
    const available = overrideIds
      ? countries.filter((c) => overrideIds.includes(c.id))
      : filteredCountries;

    let selected = available;
    const effectiveCount = overrideCount || countMode;
    if (effectiveCount !== "all" && effectiveCount !== "infinite") {
      selected = sample(available, Number(effectiveCount));
    }

    const { items, choices } = buildItems(selected, mode);
    const initialQueue = shuffle(items);

    setRunConfig({
      mode,
      scope,
      countMode: effectiveCount,
      promptLabel: modeConfig.promptLabel,
      answerAccept: modeConfig.answerAccept,
    });

    setCapitalChoices(choices);
    setPoolItems(items);
    setQueue(initialQueue);
    setCorrectCount(0);
    setWrongCount(0);
    setSkippedCount(0);
    setWrongList([]);
    setSkippedList([]);
    setInputValue("");
    setInputState("idle");
    setElapsed(0);
    setStartTime(Date.now());
    setScreen("quiz");
  }

  function addToList(setter, item) {
    setter((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });
  }

  function markWrong(item) {
    setWrongCount((prev) => prev + 1);
    addToList(setWrongList, {
      id: item.id,
      label: item.promptLabel,
    });
  }

  function markSkipped(item) {
    setSkippedCount((prev) => prev + 1);
    addToList(setSkippedList, {
      id: item.id,
      label: item.promptLabel,
    });
  }

  function checkAnswer(item, guess) {
    const normalizedGuess = normalize(guess);
    if (!normalizedGuess) return false;

    if (mode === "country-to-capital") {
      return item.country.capitals.some(
        (cap) => normalize(cap) === normalizedGuess
      );
    }

    if (mode === "capital-to-country") {
      const names = [item.country.name, ...item.country.aliases];
      return names.some((name) => normalize(name) === normalizedGuess);
    }

    return false;
  }

  function advanceQueue({ requeueCurrent = false } = {}) {
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const [current, ...rest] = prev;
      if (runConfig?.countMode === "infinite") {
        let nextQueue = [...rest];
        if (requeueCurrent) nextQueue.push(current);
        if (!requeueCurrent) {
          nextQueue.push(poolItems[Math.floor(Math.random() * poolItems.length)]);
        }
        return nextQueue;
      }
      if (requeueCurrent) return [...rest, current];
      return rest;
    });
  }

  function handleSubmit() {
    const current = queue[0];
    if (!current) return;
    if (!inputValue.trim()) return;
    if (checkAnswer(current, inputValue)) {
      setCorrectCount((prev) => prev + 1);
      setInputState("correct");
      setInputValue("");
      setTimeout(() => {
        setInputState("idle");
        advanceQueue();
      }, 500);
    } else {
      setInputState("wrong");
      markWrong(current);
      setTimeout(() => {
        setInputState("idle");
        if (inputRef.current) inputRef.current.select();
      }, 1000);
    }
  }

  function handleSkip() {
    const current = queue[0];
    if (!current) return;
    markSkipped(current);
    setInputValue("");
    advanceQueue({ requeueCurrent: true });
  }

  function handleAbort() {
    if (runConfig?.countMode !== "infinite") {
      queue.forEach((item) => markSkipped(item));
    }
    setScreen("eval");
  }

  useEffect(() => {
    if (screen === "quiz" && queue.length === 0) {
      setScreen("eval");
    }
  }, [queue, screen]);

  function rerunFrom(list) {
    if (!list.length) return;
    const ids = list.map((item) => item.id);
    setCountMode("all");
    startRun({ overrideIds: ids, overrideCount: "all" });
  }

  const currentItem = queue[0];

  const themeFont = FONTS.find((f) => f.id === fontChoice);
  if (loading) {
    return (
      <div className="app-shell" data-theme={theme}>
        <div className="app-loading">Loading data…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-shell" data-theme={theme}>
        <div className="app-loading">Failed to load data.</div>
      </div>
    );
  }

  return (
    <div
      className="app-shell"
      data-theme={theme}
      style={{ "--app-font": themeFont.family }}
    >
      <Container className="app-container">
        <header className="app-title">CAPSLOCK</header>

        {screen === "menu" && (
          <Card className="app-card">
            <Card.Body>
              <Row className="g-4">
                <Col md={4}>
                  <div className="menu-block">
                    <div className="menu-label">How?</div>
                    <ButtonGroup vertical className="w-100">
                      {MODES.map((m) => (
                        <Button
                          key={m.id}
                          variant={mode === m.id ? "primary" : "outline-light"}
                          className="menu-button"
                          onClick={() => {
                            setMode(m.id);
                            if (m.id === "connect" && countMode === "infinite") {
                              setCountMode("all");
                            }
                          }}
                        >
                          {m.label}
                        </Button>
                      ))}
                    </ButtonGroup>
                  </div>
                </Col>

                <Col md={4}>
                  <div className="menu-block">
                    <div className="menu-label">Where?</div>
                    <div className="menu-sub">Entire World</div>
                    <Button
                      variant={scope.type === "world" ? "primary" : "outline-light"}
                      className="menu-button w-100"
                      onClick={() => setScope({ type: "world", value: "world" })}
                    >
                      World
                    </Button>

                    <div className="menu-sub">Continents</div>
                    <div className="menu-scroll">
                      {continents.map((ct) => (
                        <Button
                          key={ct}
                          variant={
                            scope.type === "continent" && scope.value === ct
                              ? "primary"
                              : "outline-light"
                          }
                          className="menu-button w-100"
                          onClick={() => setScope({ type: "continent", value: ct })}
                        >
                          {ct}
                        </Button>
                      ))}
                    </div>

                    <div className="menu-sub">Groups</div>
                    <div className="menu-scroll">
                      {groups.map((group) => (
                        <Button
                          key={group}
                          variant={
                            scope.type === "group" && scope.value === group
                              ? "primary"
                              : "outline-light"
                          }
                          className="menu-button w-100"
                          onClick={() =>
                            setScope({ type: "group", value: group })
                          }
                        >
                          {group}
                        </Button>
                      ))}
                    </div>
                  </div>
                </Col>

                <Col md={4}>
                  <div className="menu-block">
                    <div className="menu-label">How many?</div>
                    <ButtonGroup vertical className="w-100">
                      {countOptions.map((opt) => (
                        <Button
                          key={opt.id}
                          variant={
                            countMode === opt.id ? "primary" : "outline-light"
                          }
                          className="menu-button"
                          disabled={opt.disabled}
                          onClick={() => setCountMode(opt.id)}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </ButtonGroup>
                  </div>
                </Col>
              </Row>

              <div className="menu-start">
                <Button
                  size="lg"
                  className="start-button"
                  disabled={filteredCountries.length === 0}
                  onClick={() => startRun()}
                >
                  Start
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}

        {screen === "quiz" && mode !== "connect" && currentItem && (
          <Card className="app-card quiz-card">
            <Card.Body>
              <Row className="align-items-center g-4">
                <Col md={6}>
                  <div className="prompt-panel">
                    <div className="prompt-label">{runConfig.promptLabel}</div>
                    <div className="prompt-value">{currentItem.promptLabel}</div>
                    {mode === "country-to-capital" && (
                      <img
                        src={currentItem.country.flag.path}
                        alt={`${currentItem.country.name} flag`}
                        className="flag-large"
                      />
                    )}
                  </div>
                </Col>
                <Col md={6}>
                  <Form
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSubmit();
                    }}
                  >
                    <Form.Label className="prompt-label">
                      {runConfig.answerAccept}
                    </Form.Label>
                    <div className="input-row">
                      <Form.Control
                        ref={inputRef}
                        value={inputValue}
                        onChange={(event) => setInputValue(event.target.value)}
                        placeholder="enter your guess"
                        className={`guess-input state-${inputState}`}
                      />
                      <Button
                        type="submit"
                        className="action-button"
                        variant="primary"
                      >
                        Enter
                      </Button>
                      <Button
                        type="button"
                        className="action-button"
                        variant="outline-light"
                        onClick={handleSkip}
                      >
                        Skip
                      </Button>
                    </div>
                  </Form>
                  <div className="status-line">
                    {correctCount} guesses made,{" "}
                    {runConfig?.countMode === "infinite" ? "∞" : queue.length} pending
                  </div>
                </Col>
              </Row>
              <div className="quiz-footer">
                <Button
                  variant="danger"
                  className="abort-button"
                  onClick={handleAbort}
                >
                  Abort
                </Button>
                <div className="timer">{formatTime(elapsed)}</div>
              </div>
            </Card.Body>
          </Card>
        )}

        {screen === "quiz" && mode === "connect" && (
          <Card className={`app-card connect-card state-${inputState}`}>
            <Card.Body>
              <DndContext
                sensors={sensors}
                onDragEnd={({ active, over }) =>
                  handleDrop(active?.id, over?.id)
                }
              >
                <Row className="g-4">
                  <Col md={6}>
                    <div className="prompt-label">Countries</div>
                    <ListGroup className="connect-list">
                      {queue
                        .slice()
                        .sort((a, b) =>
                          a.country.name.localeCompare(b.country.name)
                        )
                        .map((item) => (
                          <ConnectItem
                            key={`country-${item.id}`}
                            id={`country-${item.id}`}
                            className="connect-item"
                          >
                            <img
                              src={item.country.flag.path}
                              alt=""
                              className="flag-inline"
                            />
                            {item.country.name}
                          </ConnectItem>
                        ))}
                    </ListGroup>
                  </Col>
                  <Col md={6}>
                    <div className="prompt-label">Capitals</div>
                    <ListGroup className="connect-list">
                      {queue
                        .slice()
                        .sort((a, b) =>
                          (capitalChoices[a.id] || "").localeCompare(
                            capitalChoices[b.id] || ""
                          )
                        )
                        .map((item) => (
                          <ConnectItem
                            key={`capital-${item.id}`}
                            id={`capital-${item.id}`}
                            className="connect-item"
                          >
                            {capitalChoices[item.id]}
                          </ConnectItem>
                        ))}
                    </ListGroup>
                  </Col>
                </Row>
              </DndContext>
              <div className="quiz-footer">
                <Button
                  variant="danger"
                  className="abort-button"
                  onClick={handleAbort}
                >
                  Abort
                </Button>
                <div className="timer">{formatTime(elapsed)}</div>
              </div>
            </Card.Body>
          </Card>
        )}

        {screen === "eval" && (
          <Card className="app-card eval-card">
            <Card.Body>
              <div className="eval-summary">
                {correctCount} correct, {wrongCount} mistakes, {skippedCount} skipped
              </div>
              <div className="eval-time">Time: {formatTime(elapsed)}</div>

              <div className="eval-actions">
                <Button
                  variant="outline-light"
                  onClick={() => rerunFrom(wrongList)}
                  disabled={!wrongList.length}
                >
                  Rerun mistakes
                </Button>
                <Button
                  variant="outline-light"
                  onClick={() => rerunFrom(skippedList)}
                  disabled={!skippedList.length}
                >
                  Rerun skips
                </Button>
                <Button
                  variant="outline-light"
                  onClick={() =>
                    rerunFrom(
                      Array.from(
                        new Map(
                          [...wrongList, ...skippedList].map((item) => [
                            item.id,
                            item,
                          ])
                        ).values()
                      )
                    )
                  }
                  disabled={!wrongList.length && !skippedList.length}
                >
                  Rerun mistakes & skips
                </Button>
                <Button variant="primary" onClick={() => setScreen("menu")}>
                  To main menu
                </Button>
              </div>

              <Row className="g-4 eval-lists">
                <Col md={6}>
                  <div className="prompt-label">Mistakes</div>
                  <ListGroup>
                    {wrongList.length === 0 && (
                      <ListGroup.Item className="eval-empty">
                        None
                      </ListGroup.Item>
                    )}
                    {wrongList.map((item) => (
                      <ListGroup.Item key={`wrong-${item.id}`}>
                        {item.label}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Col>
                <Col md={6}>
                  <div className="prompt-label">Skipped</div>
                  <ListGroup>
                    {skippedList.length === 0 && (
                      <ListGroup.Item className="eval-empty">
                        None
                      </ListGroup.Item>
                    )}
                    {skippedList.map((item) => (
                      <ListGroup.Item key={`skip-${item.id}`}>
                        {item.label}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        <Button
          className="tool-button"
          variant="outline-light"
          onClick={() => setShowMenu(true)}
        >
          Tools
        </Button>

        <Offcanvas
          show={showMenu}
          onHide={() => setShowMenu(false)}
          placement="start"
          className="side-menu"
        >
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>Side Menu</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            <div className="menu-section">
              <div className="menu-label">Appearance</div>
              <div className="menu-sub">Catppuccin Flavor</div>
              <ButtonGroup vertical className="w-100 mb-3">
                {FLAVORS.map((flavor) => (
                  <Button
                    key={flavor.id}
                    variant={theme === flavor.id ? "primary" : "outline-light"}
                    onClick={() => setTheme(flavor.id)}
                  >
                    {flavor.label}
                  </Button>
                ))}
              </ButtonGroup>

              <div className="menu-sub">Font</div>
              <Form.Select
                value={fontChoice}
                onChange={(event) => setFontChoice(event.target.value)}
                className="font-select"
              >
                {FONTS.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.label}
                  </option>
                ))}
              </Form.Select>
            </div>

            <div className="menu-section">
              <div className="menu-label">Attributions</div>
              <ListGroup>
                {FONTS.filter((f) => f.attributionRequired).length === 0 && (
                  <ListGroup.Item className="eval-empty">
                    None required for fonts
                  </ListGroup.Item>
                )}
                {FONTS.filter((f) => f.attributionRequired).map((font) => (
                  <ListGroup.Item key={font.id}>
                    {font.label} - {font.license} ({font.source})
                  </ListGroup.Item>
                ))}
                <ListGroup.Item>Flags - MIT (country-flag-icons)</ListGroup.Item>
              </ListGroup>
            </div>
          </Offcanvas.Body>
        </Offcanvas>
      </Container>
    </div>
  );

  function handleDrop(activeId, overId) {
    if (!activeId || !overId || activeId === overId) return;
    const [dragType, dragId] = String(activeId).split("-");
    const [dropType, dropId] = String(overId).split("-");
    if (dragType === dropType) return;

    const countryId = dragType === "country" ? dragId : dropId;
    const capitalId = dragType === "capital" ? dragId : dropId;

    if (!countryId || !capitalId) return;

    if (countryId === capitalId) {
      setInputState("correct");
      setCorrectCount((prev) => prev + 1);
      setQueue((prev) => prev.filter((item) => item.id !== countryId));
      setTimeout(() => setInputState("idle"), 300);
    } else {
      const item = queue.find((q) => q.id === countryId);
      if (item) markWrong(item);
      setInputState("wrong");
      setTimeout(() => setInputState("idle"), 400);
    }
  }
}
