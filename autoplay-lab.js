(() => {
  const game = window.hobbitGame;
  const output = document.getElementById("output");
  const startPresetSelect = document.getElementById("lab-start-preset");
  const targetSelect = document.getElementById("lab-target");
  const outcomeFilterSelect = document.getElementById("lab-outcome-filter");
  const strategySelect = document.getElementById("lab-strategy");
  const seedStartInput = document.getElementById("lab-seed-start");
  const seedCountInput = document.getElementById("lab-seed-count");
  const stepLimitInput = document.getElementById("lab-step-limit");
  const replaySpeedSelect = document.getElementById("lab-replay-speed");
  const analyzeButton = document.getElementById("lab-analyze");
  const solutionSpineButton = document.getElementById("lab-solution-spine-button");
  const continuousStartButton = document.getElementById("lab-continuous-start");
  const continuousStopButton = document.getElementById("lab-continuous-stop");
  const auditButton = document.getElementById("lab-audit-button");
  const deathCatalogButton = document.getElementById("lab-death-catalog-button");
  const resetButton = document.getElementById("lab-reset");
  const statusBox = document.getElementById("lab-status");
  const summaryBox = document.getElementById("lab-summary");
  const memorySummaryBox = document.getElementById("lab-memory-summary");
  const continuousLogSummaryBox = document.getElementById("lab-continuous-log-summary");
  const auditBox = document.getElementById("lab-audit");
  const deathCatalogBox = document.getElementById("lab-death-catalog");
  const overlayBackdrop = document.getElementById("lab-overlay-backdrop");
  const auditPanel = document.getElementById("lab-audit-panel");
  const deathPanel = document.getElementById("lab-death-panel");
  const spinePanel = document.getElementById("lab-spine-panel");
  const auditCloseButton = document.getElementById("lab-audit-close");
  const deathCloseButton = document.getElementById("lab-death-close");
  const spineCloseButton = document.getElementById("lab-spine-close");
  const treeCaption = document.getElementById("lab-tree-caption");
  const treeBox = document.getElementById("lab-tree");
  const detailCaption = document.getElementById("lab-detail-caption");
  const detailBox = document.getElementById("lab-detail");
  const replayCaption = document.getElementById("lab-replay-caption");
  const replayLog = document.getElementById("lab-replay-log");
  const spineBox = document.getElementById("lab-spine");

  if (!game || !output) return;

  const AUTOPLAY_VICTORY_LINE = "Congratulations. You have killed Smaug and found the treasure - a real thief.";
  const LAB_EXPLORE_MEMORY_KEY = "hobbit-lab-explore-memory-v2";
  const LAB_EXPLORE_MEMORY_VERSION = 3;
  const LAB_CONTINUOUS_LOG_KEY = "hobbit-lab-continuous-log-v1";
  const WINNING_PATH_CATALOG_VERSION = 1;
  const WINNING_PATH_MAX_COUNT = 8;
  const WINNING_PATH_WARMUP_DELAY_MS = 260;
  const CONTINUOUS_INTER_RUN_DELAY_MS = 140;
  const CONTINUOUS_ARCHIVE_LIMITS = [
    { sessionLimit: 3, logEntries: 120, logChars: 1400, runCommands: 80 },
    { sessionLimit: 2, logEntries: 72, logChars: 900, runCommands: 48 },
    { sessionLimit: 1, logEntries: 36, logChars: 600, runCommands: 28 },
    { sessionLimit: 1, logEntries: 18, logChars: 360, runCommands: 16 },
  ];

  const state = {
    report: null,
    selectedRunId: "",
    replayToken: 0,
    spineToken: 0,
    activeOverlay: "",
    simulationHistory: null,
    activeExplorationRoute: null,
    spineReport: null,
    spineCatalog: null,
    spineCatalogLoading: false,
    spineLoadingRunId: "",
    spineSelectedWinningRunId: "",
    spineReportsByWinningRunId: {},
    spineWarmupTimer: 0,
    spineSelectedRunId: "",
    spineSelectedStepIndex: -1,
    spineSelectedPreviewRun: null,
    spineReplayToken: 0,
    spineReplayCaption: "Seleziona un ramo o uno step, poi avvia il replay qui dentro.",
    spineReplayLog: "Nessun replay eseguito nella solution spine.",
    exploreMemory: loadExploreMemory(),
    continuousArchive: loadContinuousArchive(),
    continuousToken: 0,
    continuousSession: null,
  };

  function normalize(text = "") {
    return String(text || "")
      .toLowerCase()
      .replace(/[\-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(text = "") {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function makeSeededRandom(seed) {
    let value = (Number(seed) >>> 0) || 1;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 0x100000000;
    };
  }

  function withSeededRandom(seed, fn) {
    const originalRandom = Math.random;
    Math.random = makeSeededRandom(seed);
    try {
      return fn();
    } finally {
      Math.random = originalRandom;
    }
  }

  async function withSeededRandomAsync(seed, fn) {
    const originalRandom = Math.random;
    Math.random = makeSeededRandom(seed);
    try {
      return await fn();
    } finally {
      Math.random = originalRandom;
    }
  }

  function wait(ms = 0) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function captureFinalFlagsSubset() {
    const flags = game.flags || {};
    return {
      trollkeytaken: Boolean(flags.trollkeytaken),
      trollsTransformed: Boolean(game.trollsTransformed),
      mirkwooddrankstream: Boolean(flags.mirkwooddrankstream),
      mirkwoodfolloweddeer: Boolean(flags.mirkwoodfolloweddeer),
      mirkwoodfollowedlights: Boolean(flags.mirkwoodfollowedlights),
      mirkwooddwarvesfreed: Boolean(flags.mirkwooddwarvesfreed),
      barrelthrown: Boolean(flags.barrelthrown),
      bardreadiedarrow: Boolean(flags.bardreadiedarrow),
    };
  }

  function captureVisitedRooms() {
    return [...(game.visitedRooms || [])];
  }

  function createSceneEventTracker() {
    return {
      events: [],
      seen: new Set(),
    };
  }

  function pushSceneEvent(tracker, event = "") {
    const value = String(event || "").trim();
    if (!tracker || !value || tracker.seen.has(value)) return;
    tracker.seen.add(value);
    tracker.events.push(value);
  }

  function inferBeornApproachFromVisitedRooms(visitedRooms = []) {
    const rooms = Array.isArray(visitedRooms) ? visitedRooms : [];
    const beornIndex = rooms.lastIndexOf("beorns_house");
    if (beornIndex <= 0) return "";
    const preceding = rooms.slice(0, beornIndex).reverse();
    for (const roomId of preceding) {
      if (roomId === "great_river") return "approach_great_river";
      if (roomId === "treeless_opening") return "approach_treeless_opening";
      if (roomId === "narrow_dangerous_path") return "approach_narrow_path";
      if (roomId === "outside_goblins_gate") return "approach_outside_gate";
    }
    return "";
  }

  function canonicalWinningCommand(command = "") {
    const normalized = normalize(command);
    if (!normalized || ["look", "exits", "inventory", "wait"].includes(normalized)) return "";
    if (/^answer .+$/.test(normalized)) return "gollum answer";
    if (normalized === 'say to gollum "what have i got in my pocket"' || normalized === "say to gollum \"what have i got in my pocket\"") {
      return "gollum pocket riddle";
    }
    if (normalized === 'say to gollum "what\'s in my pocket"' || normalized === "say to gollum \"what's in my pocket\"") {
      return "gollum pocket riddle";
    }
    if (/^say to bard "get strong arrow from quiver"$/.test(normalized)) return "bard get strong arrow";
    if (/^say to bard "get arrow from quiver"$/.test(normalized)) return "bard get arrow";
    if (/^say to bard "shoot dragon"$/.test(normalized)) return "dragon shoot";
    if (/^say to bard "take shot"$/.test(normalized)) return "dragon take shot";
    if (/^say to bard "loose arrow"$/.test(normalized)) return "dragon loose arrow";
    if (/^ask .* to attack .*goblin$/.test(normalized)) return "goblin helper attack";
    if (/^(kill|attack) .*goblin( with sword)?$/.test(normalized)) return "goblin bilbo attack";
    if (normalized === "take large key") return "troll key";
    if (normalized === "drink stream") return "mirkwood stream";
    if (normalized === "follow deer") return "mirkwood deer";
    if (normalized === "follow lights") return "mirkwood lights";
    if (normalized === "help dwarves") return "mirkwood free dwarves";
    if (normalized === "throw barrel through trap door") return "cellar throw barrel";
    if (normalized === "jump onto barrel") return "cellar jump barrel";
    if (normalized === "climb barrel") return "cellar climb barrel";
    if (normalized === "take woods cloak") return "beorn take cloak";
    if (normalized === "wear woods cloak") return "beorn wear cloak";
    return normalized;
  }

  function recordSceneEvents({ beforeSnapshot = {}, command = "", tracker = null }) {
    if (!tracker) return;
    const normalized = normalize(command);
    if (!normalized) return;

    if (normalized === "take large key") pushSceneEvent(tracker, "trolls:key_taken");
    if (normalized === "south west" && beforeSnapshot.room === "trolls_clearing" && !game.findInInventory?.("large key")) {
      pushSceneEvent(tracker, "trolls:left_without_key");
    }
    if (normalized === "wait" && game.trollsTransformed) pushSceneEvent(tracker, "trolls:waited_for_dawn");

    if (
      normalized === 'say to gollum "what have i got in my pocket"'
      || normalized === "say to gollum \"what have i got in my pocket\""
      || normalized === 'say to gollum "what\'s in my pocket"'
      || normalized === "say to gollum \"what's in my pocket\""
    ) {
      pushSceneEvent(tracker, "gollum:pocket_riddle");
    }

    if (/^ask .* to attack .*goblin$/.test(normalized)) pushSceneEvent(tracker, "goblin:helper_attack");
    if (/^(kill|attack) .*goblin( with sword)?$/.test(normalized)) pushSceneEvent(tracker, "goblin:bilbo_attack");

    if (normalized === "drink stream" && game.flags?.mirkwooddrankstream) pushSceneEvent(tracker, "mirkwood:drink_stream");
    if (normalized === "follow deer" && game.flags?.mirkwoodfolloweddeer) pushSceneEvent(tracker, "mirkwood:follow_deer");
    if (normalized === "follow lights" && game.flags?.mirkwoodfollowedlights) pushSceneEvent(tracker, "mirkwood:follow_lights");
    if (normalized === "help dwarves" && game.flags?.mirkwooddwarvesfreed) pushSceneEvent(tracker, "mirkwood:free_dwarves");

    if (normalized === "take woods cloak") pushSceneEvent(tracker, "beorn:take_cloak");
    if (normalized === "wear woods cloak" && game.wearingMirkwoodCloak?.()) pushSceneEvent(tracker, "beorn:wear_cloak");

    if (normalized === "throw barrel through trap door" && game.flags?.barrelthrown) pushSceneEvent(tracker, "cellar:barrel_throw");
    if (normalized === "jump onto barrel") pushSceneEvent(tracker, "cellar:jump_barrel");
    if (normalized === "climb barrel") pushSceneEvent(tracker, "cellar:climb_barrel");

    if (normalized === 'say to bard "get strong arrow from quiver"' || normalized === "say to bard \"get strong arrow from quiver\"") {
      pushSceneEvent(tracker, "bard:get_strong_arrow");
    }
    if (normalized === 'say to bard "get arrow from quiver"' || normalized === "say to bard \"get arrow from quiver\"") {
      pushSceneEvent(tracker, "bard:get_arrow");
    }
    if (normalized === 'say to bard "shoot dragon"' || normalized === "say to bard \"shoot dragon\"") pushSceneEvent(tracker, "dragon:shoot");
    if (normalized === 'say to bard "take shot"' || normalized === "say to bard \"take shot\"") pushSceneEvent(tracker, "dragon:take_shot");
    if (normalized === 'say to bard "loose arrow"' || normalized === "say to bard \"loose arrow\"") pushSceneEvent(tracker, "dragon:loose_arrow");

    if (game.currentRoom === "beorns_house") {
      const inferred = inferBeornApproachFromVisitedRooms(captureVisitedRooms()) || (
        beforeSnapshot.room === "great_river" ? "approach_great_river"
          : beforeSnapshot.room === "treeless_opening" ? "approach_treeless_opening"
            : beforeSnapshot.room === "narrow_dangerous_path" ? "approach_narrow_path"
              : beforeSnapshot.room === "outside_goblins_gate" ? "approach_outside_gate"
                : ""
      );
      if (inferred) pushSceneEvent(tracker, `beorn:${inferred}`);
    }
  }

  function createExploreMemory() {
    return {
      version: LAB_EXPLORE_MEMORY_VERSION,
      savedAt: "",
      totalRuns: 0,
      totalSteps: 0,
      states: {},
      routes: {},
    };
  }

  function createContinuousArchive() {
    return {
      version: 1,
      savedAt: "",
      sessions: [],
    };
  }

  function loadExploreMemory() {
    try {
      const raw = localStorage.getItem(LAB_EXPLORE_MEMORY_KEY);
      if (!raw) return createExploreMemory();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return createExploreMemory();
      if (Number(parsed.version) !== LAB_EXPLORE_MEMORY_VERSION) return createExploreMemory();
      return {
        version: LAB_EXPLORE_MEMORY_VERSION,
        savedAt: String(parsed.savedAt || ""),
        totalRuns: Number(parsed.totalRuns) || 0,
        totalSteps: Number(parsed.totalSteps) || 0,
        states: parsed.states && typeof parsed.states === "object" ? parsed.states : {},
        routes: parsed.routes && typeof parsed.routes === "object" ? parsed.routes : {},
      };
    } catch (error) {
      return createExploreMemory();
    }
  }

  function loadContinuousArchive() {
    try {
      const raw = localStorage.getItem(LAB_CONTINUOUS_LOG_KEY);
      if (!raw) return createContinuousArchive();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return createContinuousArchive();
      return {
        version: 1,
        savedAt: String(parsed.savedAt || ""),
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      };
    } catch (error) {
      return createContinuousArchive();
    }
  }

  function isQuotaExceededError(error) {
    if (!error) return false;
    const name = String(error.name || "");
    const message = String(error.message || "");
    return name === "QuotaExceededError"
      || name === "NS_ERROR_DOM_QUOTA_REACHED"
      || /quota/i.test(message);
  }

  function archiveLimitConfig(level = 0) {
    return CONTINUOUS_ARCHIVE_LIMITS[Math.max(0, Math.min(level, CONTINUOUS_ARCHIVE_LIMITS.length - 1))];
  }

  function compactText(text = "", maxChars = 900) {
    const value = String(text || "").trim();
    if (!value || value.length <= maxChars) return value;
    const keep = Math.max(40, Math.floor((maxChars - 9) / 2));
    return `${value.slice(0, keep)}\n...\n${value.slice(-keep)}`;
  }

  function compactStringList(entries = [], maxEntries = 60, maxChars = 900) {
    return (Array.isArray(entries) ? entries : [])
      .slice(-maxEntries)
      .map((entry) => compactText(entry, maxChars));
  }

  function compactCommandList(commands = [], maxCommands = 40) {
    return (Array.isArray(commands) ? commands : []).slice(-maxCommands);
  }

  function compactArchivedRun(run = null, limits = archiveLimitConfig()) {
    if (!run) return null;
    return {
      seed: run.seed,
      roomLabel: run.roomLabel,
      commands: compactCommandList(run.commands || [], limits.runCommands),
      outcome: run.outcome || null,
      metrics: run.metrics ? { ...run.metrics } : null,
      comparison: run.comparison ? { ...run.comparison } : null,
    };
  }

  function compactArchivedSession(session = null, limits = archiveLimitConfig()) {
    if (!session) return null;
    return {
      id: session.id,
      running: Boolean(session.running),
      presetId: session.presetId,
      presetLabel: session.presetLabel,
      targetId: session.targetId,
      targetLabel: session.targetLabel,
      seedStart: session.seedStart,
      nextSeed: session.nextSeed,
      stepLimit: session.stepLimit,
      completedRuns: session.completedRuns,
      successCount: session.successCount,
      deathCount: session.deathCount,
      stallCount: session.stallCount,
      totalCommands: session.totalCommands,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt || new Date().toISOString(),
      stoppedAt: session.stoppedAt || "",
      log: compactStringList(session.log || [], limits.logEntries, limits.logChars),
      currentRun: compactArchivedRun(session.currentRun, limits),
      lastCompletedRun: compactArchivedRun(session.lastCompletedRun, limits),
      bestRun: compactArchivedRun(session.bestRun, limits),
    };
  }

  function compactContinuousArchive(level = 0) {
    const limits = archiveLimitConfig(level);
    const sessions = (Array.isArray(state.continuousArchive?.sessions) ? state.continuousArchive.sessions : [])
      .filter(Boolean)
      .slice(0, limits.sessionLimit)
      .map((session) => compactArchivedSession(session, limits));
    state.continuousArchive = {
      version: 1,
      savedAt: state.continuousArchive?.savedAt || "",
      sessions,
    };
    return state.continuousArchive;
  }

  function pruneGameAutosaves(keepCount = 6) {
    const autosaves = game.storage?.autosaveEntries?.();
    if (!Array.isArray(autosaves) || !autosaves.length) return 0;
    let removed = 0;
    for (const stale of autosaves.slice(keepCount)) {
      if (!stale?.storageKey) continue;
      localStorage.removeItem(stale.storageKey);
      removed += 1;
    }
    return removed;
  }

  function reclaimLocalStorageForLab(level = 0) {
    compactContinuousArchive(level);
    localStorage.removeItem(LAB_CONTINUOUS_LOG_KEY);
    try {
      localStorage.setItem(LAB_CONTINUOUS_LOG_KEY, JSON.stringify(state.continuousArchive));
    } catch (error) {
      if (!isQuotaExceededError(error)) throw error;
    }
    if (level >= 1) pruneGameAutosaves(6);
    if (level >= 2) pruneGameAutosaves(3);
    if (level >= 3) pruneGameAutosaves(1);
  }

  function setLocalStorageWithRecovery(storageKey, payloadFactory, onRecoveredMessage = "") {
    const recoveryLevels = CONTINUOUS_ARCHIVE_LIMITS.map((_, index) => index);
    for (let attempt = 0; attempt <= recoveryLevels.length; attempt += 1) {
      try {
        const payload = payloadFactory();
        localStorage.setItem(storageKey, payload);
        if (attempt > 0 && onRecoveredMessage) statusBox.textContent = onRecoveredMessage;
        return true;
      } catch (error) {
        if (!isQuotaExceededError(error)) throw error;
        if (attempt >= recoveryLevels.length) {
          statusBox.textContent = `Memoria locale piena: ${error.message}`;
          return false;
        }
        reclaimLocalStorageForLab(recoveryLevels[attempt]);
      }
    }
    return false;
  }

  function saveExploreMemory() {
    state.exploreMemory.savedAt = new Date().toISOString();
    try {
      setLocalStorageWithRecovery(
        LAB_EXPLORE_MEMORY_KEY,
        () => JSON.stringify(state.exploreMemory),
        "Memoria esplorativa salvata dopo la compattazione automatica del log continuo."
      );
    } catch (error) {
      statusBox.textContent = `Memoria esplorativa non salvata: ${error.message}`;
    }
    renderMemorySummary();
  }

  function saveContinuousArchive() {
    state.continuousArchive.savedAt = new Date().toISOString();
    try {
      compactContinuousArchive(0);
      setLocalStorageWithRecovery(
        LAB_CONTINUOUS_LOG_KEY,
        () => JSON.stringify(state.continuousArchive),
        "Log continuo compattato automaticamente per restare entro lo spazio disponibile."
      );
    } catch (error) {
      statusBox.textContent = `Log continuo non salvato: ${error.message}`;
    }
    renderContinuousArchiveSummary();
  }

  function memoryStateCount() {
    return Object.keys(state.exploreMemory?.states || {}).length;
  }

  function memoryCommandCount() {
    return Object.values(state.exploreMemory?.states || {}).reduce((total, entry) => (
      total + Object.keys(entry?.commands || {}).length
    ), 0);
  }

  function renderMemorySummary() {
    if (!memorySummaryBox) return;
    const savedAt = state.exploreMemory?.savedAt
      ? new Date(state.exploreMemory.savedAt).toLocaleString("it-IT")
      : "";
    const runText = state.exploreMemory?.totalRuns || 0;
    const stepText = state.exploreMemory?.totalSteps || 0;
    const stateCount = memoryStateCount();
    const commandCount = memoryCommandCount();
    memorySummaryBox.innerHTML = [
      `<div>Sessioni apprese: <strong>${runText}</strong></div>`,
      `<div>Step memorizzati: <strong>${stepText}</strong></div>`,
      `<div>Stati noti: <strong>${stateCount}</strong> · Comandi noti: <strong>${commandCount}</strong></div>`,
      `<div>${savedAt ? `Ultimo salvataggio: <strong>${escapeHtml(savedAt)}</strong>` : "La memoria verra` salvata automaticamente in locale."}</div>`,
    ].join("");
  }

  function latestArchivedContinuousSession() {
    return state.continuousArchive?.sessions?.[0] || null;
  }

  function renderContinuousArchiveSummary() {
    if (!continuousLogSummaryBox) return;
    const latest = latestArchivedContinuousSession();
    if (!latest) {
      continuousLogSummaryBox.innerHTML = "Nessun log continuo salvato.";
      return;
    }
    const updatedAt = latest.updatedAt
      ? new Date(latest.updatedAt).toLocaleString("it-IT")
      : "";
    continuousLogSummaryBox.innerHTML = [
      `<div>Ultima sessione: <strong>${escapeHtml(latest.presetLabel || latest.presetId || "unknown")}</strong> -> <strong>${escapeHtml(latest.targetLabel || latest.targetId || "unknown")}</strong></div>`,
      `<div>Run: <strong>${Number(latest.completedRuns) || 0}</strong> · Step: <strong>${Number(latest.totalCommands) || 0}</strong></div>`,
      `<div>Successi: <strong>${Number(latest.successCount) || 0}</strong> · Morti: <strong>${Number(latest.deathCount) || 0}</strong> · Stalli: <strong>${Number(latest.stallCount) || 0}</strong></div>`,
      `<div>${updatedAt ? `Ultimo aggiornamento: <strong>${escapeHtml(updatedAt)}</strong>` : "Il log viene salvato automaticamente."}</div>`,
    ].join("");
  }

  function continuousSessionSnapshot(session = null) {
    if (!session) return null;
    return compactArchivedSession({
      id: session.id,
      running: Boolean(session.running),
      presetId: session.presetId,
      presetLabel: session.presetLabel,
      targetId: session.targetId,
      targetLabel: session.targetLabel,
      seedStart: session.seedStart,
      nextSeed: session.nextSeed,
      stepLimit: session.stepLimit,
      completedRuns: session.completedRuns,
      successCount: session.successCount,
      deathCount: session.deathCount,
      stallCount: session.stallCount,
      totalCommands: session.totalCommands,
      startedAt: session.startedAt,
      updatedAt: new Date().toISOString(),
      stoppedAt: session.running ? "" : new Date().toISOString(),
      log: [...(session.log || [])],
      currentRun: session.currentRun
        ? {
          seed: session.currentRun.seed,
          roomLabel: session.currentRun.roomLabel,
          commands: [...(session.currentRun.commands || [])],
          outcome: session.currentRun.outcome || null,
          metrics: session.currentRun.metrics ? { ...session.currentRun.metrics } : null,
          comparison: session.currentRun.comparison ? { ...session.currentRun.comparison } : null,
        }
        : null,
      lastCompletedRun: session.lastCompletedRun
        ? {
          seed: session.lastCompletedRun.seed,
          roomLabel: session.lastCompletedRun.roomLabel,
          commands: [...(session.lastCompletedRun.commands || [])],
          outcome: session.lastCompletedRun.outcome || null,
          metrics: session.lastCompletedRun.metrics ? { ...session.lastCompletedRun.metrics } : null,
          comparison: session.lastCompletedRun.comparison ? { ...session.lastCompletedRun.comparison } : null,
        }
        : null,
      bestRun: session.bestRun
        ? {
          seed: session.bestRun.seed,
          roomLabel: session.bestRun.roomLabel,
          commands: [...(session.bestRun.commands || [])],
          outcome: session.bestRun.outcome || null,
          metrics: session.bestRun.metrics ? { ...session.bestRun.metrics } : null,
          comparison: session.bestRun.comparison ? { ...session.bestRun.comparison } : null,
        }
        : null,
    }, archiveLimitConfig(0));
  }

  function persistContinuousSession(session = null) {
    const snapshot = continuousSessionSnapshot(session);
    if (!snapshot) return;
    const sessions = Array.isArray(state.continuousArchive.sessions) ? [...state.continuousArchive.sessions] : [];
    const existingIndex = sessions.findIndex((entry) => entry?.id === snapshot.id);
    if (existingIndex >= 0) sessions.splice(existingIndex, 1);
    sessions.unshift(snapshot);
    state.continuousArchive.sessions = sessions.slice(0, archiveLimitConfig(0).sessionLimit);
    saveContinuousArchive();
  }

  function renderLatestArchivedContinuousLog() {
    const latest = latestArchivedContinuousSession();
    if (!latest) return false;
    summaryBox.innerHTML = [
      `<div>Ultimo continuous trial salvato: <strong>${escapeHtml(latest.presetLabel || latest.presetId || "unknown")}</strong> -> <strong>${escapeHtml(latest.targetLabel || latest.targetId || "unknown")}</strong></div>`,
      `<div>Run completate: <strong>${Number(latest.completedRuns) || 0}</strong> · Step: <strong>${Number(latest.totalCommands) || 0}</strong></div>`,
      `<div>Seed iniziale: <strong>${Number(latest.seedStart) || 0}</strong> · Prossimo seed: <strong>${Number(latest.nextSeed) || 0}</strong></div>`,
      latest.bestRun?.metrics
        ? `<div>Miglior seed salvato: <strong>${Number(latest.bestRun.seed) || 0}</strong> · progress <strong>${Number(latest.bestRun.metrics.progressScoreMax) || 0}</strong> · nuove stanze <strong>${Number(latest.bestRun.metrics.roomDiscoveries) || 0}</strong></div>`
        : "",
    ].join("");
    treeCaption.textContent = "Ultima sessione continua salvata.";
    treeBox.innerHTML = `<div class="lab-empty">${
      latest.currentRun
        ? `Ultimo seed visto ${latest.currentRun.seed} · stanza ${escapeHtml(latest.currentRun.roomLabel || "unknown")}.`
        : "Nessuna run continua recente da mostrare."
    }</div>`;
    detailCaption.textContent = "Ultima sessione continua salvata.";
    detailBox.innerHTML = latest.currentRun?.commands?.length
      ? `<div class="lab-detail__card"><div class="lab-detail__section"><strong>Ultimi comandi</strong><ol class="lab-detail__list">${latest.currentRun.commands.map((command, index) => `<li>${index + 1}. ${escapeHtml(command)}</li>`).join("")}</ol></div>${renderRunMetricsHtml(latest.currentRun, latest.lastCompletedRun || null)}</div>`
      : '<div class="lab-empty">Nessun dettaglio continuo salvato.</div>';
    replayCaption.textContent = "Log dell'ultima sessione continua salvata in locale.";
    replayLog.textContent = latest.log?.length ? latest.log.join("\n\n") : "Nessun log continuo salvato.";
    return true;
  }

  function getOutputLines() {
    return Array.from(output.children || [])
      .map((node) => String(node.textContent || "").trim())
      .filter(Boolean);
  }

  function outputDelta(beforeLength = 0) {
    return getOutputLines().slice(beforeLength);
  }

  function roomLabel(roomId = "") {
    const room = game.rooms?.[roomId];
    return room?.name || roomId || "Unknown room";
  }

  function formatDelta(value = 0) {
    const number = Number(value) || 0;
    if (!number) return "0";
    return number > 0 ? `+${number}` : `${number}`;
  }

  function currentRunMetricSnapshot(targetId = "", history = null) {
    return {
      visitedRooms: Number(game.visitedRooms?.size || 0),
      importantItems: importantInventoryNames().length,
      openDoors: Object.values(game.doors || {}).filter((door) => door?.open).length,
      progressScore: Number(exploratoryMilestoneScore(targetId, scenarioContext()) || 0),
      commandCount: 0,
      effectiveNpcInteractions: 0,
      successfulSetupActions: 0,
      recoverySteps: 0,
      uniqueRoomsSeen: Number(history?.roomVisits?.size || 0),
    };
  }

  function createRunMetricsBaseline(targetId = "", history = null) {
    const snapshot = currentRunMetricSnapshot(targetId, history);
    return {
      startVisitedRooms: snapshot.visitedRooms,
      startImportantItems: snapshot.importantItems,
      startOpenDoors: snapshot.openDoors,
      roomDiscoveries: 0,
      itemDiscoveries: 0,
      openDoorDiscoveries: 0,
      uniqueRoomsSeen: snapshot.uniqueRoomsSeen,
      effectiveNpcInteractions: 0,
      successfulSetupActions: 0,
      recoverySteps: 0,
      progressScoreMax: snapshot.progressScore,
      lastProgressScore: snapshot.progressScore,
      commandCount: 0,
    };
  }

  function isNpcInteractionCommand(command = "") {
    const normalized = normalize(command);
    return normalized.startsWith("talk to ")
      || normalized.startsWith("ask ")
      || normalized.startsWith("say to ")
      || normalized.startsWith("answer ")
      || normalized === "pick up bard";
  }

  function updateContinuousRunMetrics(run, {
    targetId = "",
    history = null,
    command = "",
    decisionKind = "",
    reward = 0,
    unlockReward = 0,
    beforeSnapshot = null,
    afterSnapshot = null,
  } = {}) {
    if (!run?.metrics) return;
    const metrics = run.metrics;
    const current = currentRunMetricSnapshot(targetId, history);
    metrics.commandCount = (metrics.commandCount || 0) + 1;
    metrics.roomDiscoveries = Math.max(metrics.roomDiscoveries || 0, current.visitedRooms - (metrics.startVisitedRooms || 0));
    metrics.itemDiscoveries = Math.max(metrics.itemDiscoveries || 0, current.importantItems - (metrics.startImportantItems || 0));
    metrics.openDoorDiscoveries = Math.max(metrics.openDoorDiscoveries || 0, current.openDoors - (metrics.startOpenDoors || 0));
    metrics.uniqueRoomsSeen = Math.max(metrics.uniqueRoomsSeen || 0, Number(history?.roomVisits?.size || 0));
    metrics.progressScoreMax = Math.max(metrics.progressScoreMax || 0, Number(afterSnapshot?.progress || current.progressScore || 0));
    metrics.lastProgressScore = Number(afterSnapshot?.progress || current.progressScore || 0);

    const structuralProgress = exploratoryStructuralProgress(beforeSnapshot, afterSnapshot);
    if (isNpcInteractionCommand(command) && (structuralProgress || reward >= 8)) {
      metrics.effectiveNpcInteractions += 1;
    }
    if (exploratoryIsSetupCommand(command) && (structuralProgress || unlockReward > 0 || reward >= 8)) {
      metrics.successfulSetupActions += 1;
    }
    if (String(decisionKind || "").startsWith("exploratory_recovery_")) {
      metrics.recoverySteps += 1;
    }
  }

  function compareRunMetrics(currentMetrics = null, previousMetrics = null) {
    if (!currentMetrics || !previousMetrics) return null;
    return {
      roomDiscoveries: (currentMetrics.roomDiscoveries || 0) - (previousMetrics.roomDiscoveries || 0),
      itemDiscoveries: (currentMetrics.itemDiscoveries || 0) - (previousMetrics.itemDiscoveries || 0),
      openDoorDiscoveries: (currentMetrics.openDoorDiscoveries || 0) - (previousMetrics.openDoorDiscoveries || 0),
      uniqueRoomsSeen: (currentMetrics.uniqueRoomsSeen || 0) - (previousMetrics.uniqueRoomsSeen || 0),
      effectiveNpcInteractions: (currentMetrics.effectiveNpcInteractions || 0) - (previousMetrics.effectiveNpcInteractions || 0),
      successfulSetupActions: (currentMetrics.successfulSetupActions || 0) - (previousMetrics.successfulSetupActions || 0),
      progressScoreMax: (currentMetrics.progressScoreMax || 0) - (previousMetrics.progressScoreMax || 0),
      commandCount: (currentMetrics.commandCount || 0) - (previousMetrics.commandCount || 0),
    };
  }

  function runPerformanceScore(run = null) {
    const metrics = run?.metrics;
    if (!metrics) return -Infinity;
    return (metrics.progressScoreMax || 0) * 10
      + (metrics.roomDiscoveries || 0) * 40
      + (metrics.itemDiscoveries || 0) * 36
      + (metrics.openDoorDiscoveries || 0) * 28
      + (metrics.effectiveNpcInteractions || 0) * 16
      + (metrics.successfulSetupActions || 0) * 18
      + (run?.matched ? 5000 : 0)
      - (metrics.recoverySteps || 0) * 3;
  }

  function renderRunMetricsHtml(run = null, previousRun = null) {
    if (!run?.metrics) return "";
    const metrics = run.metrics;
    const comparison = run.comparison || compareRunMetrics(metrics, previousRun?.metrics || null);
    const deltaText = comparison
      ? `<div class="lab-detail__text">Vs seed precedente: stanze ${formatDelta(comparison.roomDiscoveries)}, oggetti ${formatDelta(comparison.itemDiscoveries)}, porte ${formatDelta(comparison.openDoorDiscoveries)}, NPC ${formatDelta(comparison.effectiveNpcInteractions)}, setup ${formatDelta(comparison.successfulSetupActions)}, progress ${formatDelta(comparison.progressScoreMax)}</div>`
      : '<div class="lab-detail__text">Nessun seed precedente per il confronto.</div>';
    return `<div class="lab-detail__section">
      <strong>Performance</strong>
      <div class="lab-detail__text">Nuove stanze: <strong>${metrics.roomDiscoveries}</strong> · Oggetti utili: <strong>${metrics.itemDiscoveries}</strong> · Porte aperte: <strong>${metrics.openDoorDiscoveries}</strong> · Stanze viste: <strong>${metrics.uniqueRoomsSeen}</strong></div>
      <div class="lab-detail__text">Interazioni NPC efficaci: <strong>${metrics.effectiveNpcInteractions}</strong> · Setup riusciti: <strong>${metrics.successfulSetupActions}</strong> · Recovery step: <strong>${metrics.recoverySteps}</strong></div>
      <div class="lab-detail__text">Progress score max: <strong>${metrics.progressScoreMax}</strong> · Step: <strong>${metrics.commandCount}</strong></div>
      ${deltaText}
    </div>`;
  }

  function movePlayerTo(roomId = "") {
    if (!roomId || !game.rooms?.[roomId]) return false;
    game.currentRoom = roomId;
    game.player.position = roomId;
    game.visitedRooms.add(roomId);
    return true;
  }

  function removePlayerItem(itemName = "") {
    const item = game.findInInventory?.(itemName);
    if (!item) return false;
    game.detachItem?.(item.id);
    item.visible = false;
    item.worn = false;
    item.location = null;
    return true;
  }

  function bardWithPlayer() {
    const bard = Object.values(game.characters || {}).find((character) => normalize(character.name) === "bard");
    if (!bard) return false;
    return bard.carriedBy === game.player.id
      || (bard.position === game.currentRoom && bard.visible && bard.movementMode === "follow");
  }

  function targetNeedsMirkwoodTraversal(targetId = "") {
    return new Set([
      "mirkwood_cleared",
      "long_lake_alive",
      "bard_joined",
      "dragon_defeated",
      "victory",
    ]).has(targetId);
  }

  function targetNeedsBeornArrival(targetId = "") {
    return targetId === "beorn_fed" || targetNeedsMirkwoodTraversal(targetId);
  }

  function ringTargetSatisfied() {
    if (!game.bilboHasRecoveredRing?.()) return false;
    if (
      game.currentRoom === "deep_dark_lake"
      && game.gollumState?.met
      && !game.gollumState?.pocketQuestionAsked
      && !game.gollumState?.escaped
    ) {
      return false;
    }
    return true;
  }

  function runSignature(run) {
    return [run.presetId, run.targetId, run.strategyId, run.seed, run.outcome.code, run.commands.join("->")].join("::");
  }

  function strategyPriority(strategyId = "") {
    if (strategyId === "optimal") return 0;
    if (strategyId === "alternative") return 1;
    if (strategyId === "failure") return 2;
    if (strategyId === "exploratory") return 3;
    return 9;
  }

  function compareCanonicalRuns(left, right) {
    return (left.commands.length - right.commands.length)
      || (strategyPriority(left.strategyId) - strategyPriority(right.strategyId))
      || (left.seed - right.seed)
      || left.commands.join("->").localeCompare(right.commands.join("->"), "it");
  }

  const strategyProfiles = [
    {
      id: "optimal",
      label: "Optimal autoplay",
      description: "Segue la logica reale dell'autoplay senza deviazioni deliberate.",
    },
    {
      id: "alternative",
      label: "Alternative success",
      description: "Prova varianti ancora vincenti quando lo scenario offre piu di una mossa sensata.",
    },
    {
      id: "failure",
      label: "Failure probes",
      description: "Forza scelte rischiose o sbagliate nei punti critici per far emergere morti reali.",
    },
    {
      id: "exploratory",
      label: "Trial and error",
      description: "Prova mosse plausibili, le valuta con mini-simulazioni e avanza come farebbe un giocatore prudente per tentativi.",
    },
  ];

  const scenarioPresets = [
    {
      id: "beginning",
      label: "Beginning",
      description: "Bilbo all'inizio, prima che la quest prenda davvero il via.",
      apply() {},
    },
    {
      id: "before_trolls",
      label: "Before Trolls",
      description: "Un passo prima del confronto con i troll.",
      apply() {
        game.execute("jump trolls");
      },
    },
    {
      id: "after_trolls_cave",
      label: "After Trolls Cave",
      description: "Compagnia già oltre i troll, con il bottino della caverna impostato.",
      apply() {
        game.execute("jump after_trolls_cave");
      },
    },
    {
      id: "rivendell_ready",
      label: "Rivendell Ready",
      description: "Checkpoint a Rivendell, nel cuore della preparazione per la fase successiva.",
      apply() {
        game.execute("jump rivendell");
      },
    },
    {
      id: "before_gollum",
      label: "Before Gollum",
      description: "Deep Dark Lake, subito prima del gioco di indovinelli.",
      apply() {
        game.execute("jump gollum");
      },
    },
    {
      id: "at_beorn",
      label: "At Beorn",
      description: "Arrivo alla casa di Beorn, con il viaggio precedente già consolidato.",
      apply() {
        game.execute("jump beorn");
      },
    },
    {
      id: "mirkwood_midgame",
      label: "In Mirkwood",
      description: "Checkpoint nella traversata di Mirkwood.",
      apply() {
        game.execute("jump mirkwood");
      },
    },
    {
      id: "mirkwood_vulnerable",
      label: "Mirkwood Vulnerable",
      description: "Ingresso in Mirkwood con Bilbo stanco e senza lame forti, pensato per evidenziare i rami di morte.",
      apply() {
        game.execute("jump mirkwood");
        movePlayerTo("mirkwood_spider_grove");
        removePlayerItem("majestic sword");
        removePlayerItem("short strong dagger");
        if (typeof game.setMirkwoodEnergy === "function") game.setMirkwoodEnergy(2);
        game.player.strength = Math.min(Number(game.player?.strength || 0), 3);
      },
    },
    {
      id: "cellar_escape",
      label: "Cellar Escape",
      description: "Bilbo nella cantina degli Elfi, pronto a testare la fuga nei barili.",
      apply() {
        game.execute("jump laketown");
        movePlayerTo("cellar");
      },
    },
    {
      id: "laketown",
      label: "At Lake-town",
      description: "Rendez-vous con Bard e il fronte Erebor ancora aperto.",
      apply() {
        game.execute("jump laketown");
      },
    },
    {
      id: "front_gate",
      label: "Front Gate",
      description: "Approccio alla montagna prima dell'ingresso finale.",
      apply() {
        game.execute("jump front_gate");
      },
    },
    {
      id: "smaug_alive",
      label: "Smaug Alive",
      description: "Checkpoint nel cuore di Erebor con Smaug ancora vivo.",
      apply() {
        game.execute("jump smaug");
      },
    },
  ];

  const targets = [
    {
      id: "have_ring",
      label: "Have Ring",
      description: "Bilbo ha recuperato l'anello.",
      matches() {
        return ringTargetSatisfied();
      },
    },
    {
      id: "rivendell_complete",
      label: "Rivendell Complete",
      description: "Le preparazioni di Rivendell sono concluse.",
      matches() {
        return Boolean(game.rivendellPreparationsComplete?.());
      },
    },
    {
      id: "beorn_fed",
      label: "Beorn Meal Taken",
      description: "Bilbo ha recuperato forza sufficiente presso Beorn.",
      matches() {
        return game.currentRoom === "beorns_house" && Number(game.player?.strength || 0) >= 6;
      },
    },
    {
      id: "mirkwood_cleared",
      label: "Mirkwood Cleared",
      description: "L'autoplay è uscito da Mirkwood vivo.",
      matches() {
        return Boolean(
          game.flags?.mirkwoodjourneycomplete
          || game.currentRoom === "elvish_clearing"
          || game.visitedRooms?.has("elvish_clearing")
        );
      },
    },
    {
      id: "long_lake_alive",
      label: "Long Lake Alive",
      description: "Bilbo arriva vivo a Long Lake dal percorso dei barili.",
      matches() {
        return game.currentRoom === "long_lake" && !game.endgame;
      },
    },
    {
      id: "bard_joined",
      label: "Bard Joined",
      description: "Bard è entrato a far parte della corsa finale.",
      matches() {
        return bardWithPlayer() || Boolean(game.flags?.bardreadiedarrow);
      },
    },
    {
      id: "dragon_defeated",
      label: "Dragon Defeated",
      description: "Smaug è stato sconfitto.",
      matches() {
        return Boolean(game.flags?.dragondefeated);
      },
    },
    {
      id: "victory",
      label: "Victory",
      description: "Bilbo riporta il tesoro a casa e chiude l'avventura.",
      matches(context = {}) {
        const allOutput = context.allOutput || [];
        return allOutput.some((line) => line.includes(AUTOPLAY_VICTORY_LINE));
      },
    },
    {
      id: "death_any",
      label: "Any Death",
      description: "Qualsiasi morte di Bilbo.",
      matches() {
        return Boolean(game.endgame && game.pendingEndgameChoice === "death");
      },
    },
    {
      id: "death_gollum",
      label: "Death by Gollum",
      description: "Bilbo soccombe nel ramo di Gollum.",
      matches(context = {}) {
        const tail = (context.tailOutput || []).join(" ");
        return Boolean(
          game.endgame
          && game.pendingEndgameChoice === "death"
          && (game.currentRoom === "deep_dark_lake" || /gollum/i.test(tail))
        );
      },
    },
    {
      id: "death_goblin",
      label: "Death by Hulking Goblin",
      description: "Bilbo e la compagnia soccombono all'imboscata nel tunnel dei goblin.",
      matches(context = {}) {
        const tail = (context.tailOutput || []).join(" ");
        return Boolean(
          game.endgame
          && game.pendingEndgameChoice === "death"
          && /hulking goblin|tunnels close over the whole company/i.test(tail)
        );
      },
    },
    {
      id: "death_goblin_fight",
      label: "Death by Goblins",
      description: "Bilbo viene sopraffatto in un combattimento contro goblin ostili.",
      matches(context = {}) {
        const tail = (context.tailOutput || []).join(" ");
        return Boolean(
          game.endgame
          && game.pendingEndgameChoice === "death"
          && (
            /goblin/i.test(tail)
            || (game.currentRoom && /goblin|passage|cavern/.test(game.currentRoom))
          )
        );
      },
    },
    {
      id: "death_spider",
      label: "Death by Spiders",
      description: "Bilbo soccombe ai ragni o al loro veleno.",
      matches(context = {}) {
        const tail = (context.tailOutput || []).join(" ");
        return Boolean(
          game.endgame
          && game.pendingEndgameChoice === "death"
          && /spider|venomous|venom|web-spinner|great spider/i.test(tail)
        );
      },
    },
    {
      id: "death_troll",
      label: "Death by Trolls",
      description: "Bilbo soccombe nel confronto con i troll.",
      matches(context = {}) {
        const tail = (context.tailOutput || []).join(" ");
        return Boolean(
          game.endgame
          && game.pendingEndgameChoice === "death"
          && (game.currentRoom === "trolls_clearing" || /troll/i.test(tail))
        );
      },
    },
    {
      id: "death_river",
      label: "Death by River",
      description: "Bilbo muore nelle acque nere del percorso dei barili o del fiume.",
      matches(context = {}) {
        const tail = (context.tailOutput || []).join(" ");
        return Boolean(
          game.endgame
          && game.pendingEndgameChoice === "death"
          && /river|black water|under the halls|gives you back no more/i.test(tail)
        );
      },
    },
    {
      id: "death_smaug",
      label: "Death by Smaug",
      description: "Bilbo muore nella fase Erebor/Smaug.",
      matches() {
        return Boolean(
          game.endgame
          && game.pendingEndgameChoice === "death"
          && !game.flags?.dragondefeated
          && ["lower_halls", "front_gate", "lonely_mountain"].includes(game.currentRoom)
        );
      },
    },
  ];

  const presetById = Object.fromEntries(scenarioPresets.map((preset) => [preset.id, preset]));
  const targetById = Object.fromEntries(targets.map((target) => [target.id, target]));
  const strategyById = Object.fromEntries(strategyProfiles.map((profile) => [profile.id, profile]));
  const auditRoutes = [
    { presetId: "before_trolls", targetId: "rivendell_complete" },
    { presetId: "after_trolls_cave", targetId: "rivendell_complete" },
    { presetId: "rivendell_ready", targetId: "have_ring" },
    { presetId: "before_gollum", targetId: "have_ring" },
    { presetId: "at_beorn", targetId: "mirkwood_cleared" },
    { presetId: "mirkwood_vulnerable", targetId: "mirkwood_cleared" },
    { presetId: "mirkwood_midgame", targetId: "mirkwood_cleared" },
    { presetId: "cellar_escape", targetId: "long_lake_alive" },
    { presetId: "laketown", targetId: "bard_joined" },
    { presetId: "front_gate", targetId: "dragon_defeated" },
    { presetId: "smaug_alive", targetId: "dragon_defeated" },
  ];
  const auditRouteNotes = {
    "after_trolls_cave:rivendell_complete": "Il preset parte dopo il rischio troll e arriva a Rivendell prima di altri trigger letali noti.",
    "at_beorn:mirkwood_cleared": "Con il loadout normale questo corridoio tende a restare vivo; i rami fatali dei ragni sono esposti dal preset Mirkwood Vulnerable.",
    "laketown:bard_joined": "Questo traguardo è quasi immediato; i rami fatali di Erebor emergono dai preset Front Gate e Smaug Alive.",
  };
  const deathCatalogEntries = [
    {
      id: "trolls_key",
      label: "Trolls at Clearing",
      presetId: "before_trolls",
      targetId: "rivendell_complete",
      outcomeCode: "death_troll",
      description: "Segue il ramo fino ai troll vivi e provoca il passo che fa crollare la situazione.",
      trigger: "Trigger fatale: prendere la large key o perdere altro tempo nella radura con i troll ancora vivi.",
    },
    {
      id: "hulking_goblin",
      label: "Hulking Goblin Ambush",
      presetId: "rivendell_ready",
      targetId: "have_ring",
      outcomeCode: "death_goblin",
      description: "Raggiunge l'imboscata nei tunnel e lascia che il tempo scada invece di salvare il compagno preso dal goblin.",
      trigger: "Trigger fatale: wait durante l'ambush del hulking goblin.",
    },
    {
      id: "gollum_riddles",
      label: "Gollum at Deep Dark Lake",
      presetId: "before_gollum",
      targetId: "have_ring",
      outcomeCode: "death_gollum",
      description: "Arriva al gioco di indovinelli e sceglie apposta la risposta sbagliata o la mossa che espone Bilbo.",
      trigger: "Trigger fatale: answer toaster, dire \"a pocket\", o aspettare dopo la pocket question.",
    },
    {
      id: "mirkwood_spiders",
      label: "Mirkwood Spiders",
      presetId: "mirkwood_midgame",
      targetId: "mirkwood_cleared",
      outcomeCode: "death_spider",
      description: "Porta Bilbo tra i ragni e smette di reagire quando il pericolo e` gia` visibile.",
      trigger: "Trigger fatale: wait nelle stanze con ragni ostili o con spider-eyes attive.",
    },
    {
      id: "mirkwood_spiders_vulnerable",
      label: "Mirkwood Spiders Vulnerable",
      presetId: "mirkwood_vulnerable",
      targetId: "mirkwood_cleared",
      outcomeCode: "death_spider",
      description: "Versione piu` severa dello scenario ragni, con Bilbo stanco e senza lame forti.",
      trigger: "Trigger fatale: stesso errore dei ragni, ma con preset pensato per esporre piu` facilmente il ramo mortale.",
    },
    {
      id: "cellar_river",
      label: "Cellar Trap Door",
      presetId: "cellar_escape",
      targetId: "long_lake_alive",
      outcomeCode: "death_river",
      description: "Raggiunge la fuga dalla cantina e fa compiere a Bilbo la scelta che lo manda nelle acque nere.",
      trigger: "Trigger fatale: jump trap door senza la sequenza sicura del barile.",
    },
    {
      id: "smaug_treasure",
      label: "Smaug in Lower Halls",
      presetId: "smaug_alive",
      targetId: "dragon_defeated",
      outcomeCode: "death_smaug",
      description: "Segue la corsa di Erebor fino al momento in cui toccare il tesoro fa precipitare il ramo fatale.",
      trigger: "Trigger fatale: take treasure mentre Smaug e` ancora vivo nelle lower halls.",
    },
  ];

  function populateSelect(select, entries) {
    select.innerHTML = entries
      .map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.label)}</option>`)
      .join("");
  }

  function scenarioContext() {
    const lines = getOutputLines();
    return {
      allOutput: lines,
      tailOutput: lines.slice(-8),
    };
  }

  function resetToPreset(preset) {
    game.restartGame();
    if (typeof preset?.apply === "function") preset.apply();
    if (typeof game.checkSpecialSituations === "function") {
      game.checkSpecialSituations();
    }
    return {
      setupOutput: getOutputLines(),
    };
  }

  function classifyFailure(commandCount, stepLimit) {
    const context = scenarioContext();
    if (targetById.death_smaug.matches(context)) {
      return { code: "death_smaug", label: "Death by Smaug", tone: "danger" };
    }
    if (targetById.death_gollum.matches(context)) {
      return { code: "death_gollum", label: "Death by Gollum", tone: "danger" };
    }
    if (targetById.death_goblin.matches(context)) {
      return { code: "death_goblin", label: "Death by Hulking Goblin", tone: "danger" };
    }
    if (targetById.death_goblin_fight.matches(context)) {
      return { code: "death_goblin_fight", label: "Death by Goblins", tone: "danger" };
    }
    if (targetById.death_spider.matches(context)) {
      return { code: "death_spider", label: "Death by Spiders", tone: "danger" };
    }
    if (targetById.death_troll.matches(context)) {
      return { code: "death_troll", label: "Death by Trolls", tone: "danger" };
    }
    if (targetById.death_river.matches(context)) {
      return { code: "death_river", label: "Death by River", tone: "danger" };
    }
    if (targetById.death_any.matches(context)) {
      return { code: "death_other", label: "Other death", tone: "danger" };
    }
    if (commandCount >= stepLimit) {
      return { code: "step_limit", label: "Step limit", tone: "warning" };
    }
    return { code: "no_route", label: "No route", tone: "warning" };
  }

  function randomEntry(entries = []) {
    if (!entries.length) return null;
    const index = Math.floor(Math.random() * entries.length);
    return entries[index] || null;
  }

  function trimOutputTo(length = 0) {
    while ((output.children?.length || 0) > length) {
      output.lastChild?.remove();
    }
  }

  function uniqueCandidates(candidates = []) {
    const seen = new Set();
    return candidates.filter((entry) => {
      const command = String(entry?.command || "").trim();
      if (!command || seen.has(command)) return false;
      seen.add(command);
      entry.command = command;
      return true;
    });
  }

  function importantInventoryNames() {
    return [
      "majestic sword",
      "sturdy rope",
      "golden ring",
      "brass lantern",
      "meal",
      "large key",
      "sturdy key",
      "small key",
      "woods cloak",
      "treasure",
      "firestone",
    ].filter((name) => game.findInInventory?.(name));
  }

  function exploratoryClosedDoorTokens() {
    const tokens = [];
    for (const connection of game.roomConnections?.() || []) {
      const door = connection.door && game.doors?.[connection.door];
      if (!door || door.open || door.broken) continue;
      tokens.push(`${normalize(door.name)}:${door.locked ? "locked" : "closed"}`);
    }
    return [...new Set(tokens)].sort();
  }

  function exploratoryWebTokens() {
    const tokens = [];
    for (const connection of game.roomConnections?.() || []) {
      const web = game.blockingWebFor?.(connection);
      if (web && !web.broken) tokens.push(normalize(web.name || "web"));
    }
    return [...new Set(tokens)].sort();
  }

  function exploratoryHostileTokens() {
    return (game.peopleInRoom?.() || [])
      .filter((character) => character?.visible && character.friendly === false)
      .map((character) => normalize(character.name))
      .sort();
  }

  function exploratoryBagEndProgress() {
    const party = game.unexpectedParty?.state;
    if (!party || game.flags?.seenpony) return null;
    return {
      arrivalIndex: Number(party.arrivalIndex || 0),
      arrivedCount: Array.isArray(party.arrived) ? party.arrived.length : 0,
      currentArrivalStage: Number(party.currentArrival?.stage || 0),
      currentArrivalId: String(party.currentArrival?.dwarfId || ""),
      thorinStage: Number(party.thorinStage || 0),
      thorinArrived: Boolean(party.thorinArrived),
      questBriefingDone: Boolean(party.questBriefingDone),
    };
  }

  function exploratoryBagEndProgressScore(targetId = "") {
    const progress = exploratoryBagEndProgress();
    if (!progress) return 0;
    const multiplier = targetId === "rivendell_complete" ? 1.45 : 1;
    let score = 0;
    score += progress.arrivedCount * 14;
    score += progress.arrivalIndex * 8;
    score += progress.currentArrivalStage * 9;
    score += progress.thorinStage * 16;
    if (progress.thorinArrived) score += 30;
    if (progress.questBriefingDone) score += 110;
    return Math.round(score * multiplier);
  }

  function exploratoryStateKey(targetId = "") {
    const tokens = [game.currentRoom || "unknown", targetId || "free"];
    if (game.roomIsDark?.()) tokens.push("dark");
    if (game.gollumState?.awaitingAnswer) tokens.push("gollum_answer");
    if (game.gollumState?.awaitingPlayerRiddle) tokens.push("gollum_player_riddle");
    if (game.gollumState?.pocketQuestionAsked) tokens.push("gollum_pocket");
    if (game.spiderEyesState?.active && game.currentRoom === game.spiderEyesState.room) tokens.push("spider_eyes");
    if (game.flags?.barrelthrown) tokens.push("barrel_ready");
    if (game.flags?.bardreadiedarrow) tokens.push("bard_ready");
    const inventory = importantInventoryNames();
    if (inventory.length) tokens.push(`inv:${inventory.join(",")}`);
    const doors = exploratoryClosedDoorTokens();
    if (doors.length) tokens.push(`doors:${doors.join(",")}`);
    const webs = exploratoryWebTokens();
    if (webs.length) tokens.push(`webs:${webs.join(",")}`);
    const hostiles = exploratoryHostileTokens();
    if (hostiles.length) tokens.push(`hostiles:${hostiles.join(",")}`);
    const bagEnd = exploratoryBagEndProgress();
    if (bagEnd) {
      tokens.push(
        `bagend:${bagEnd.arrivalIndex}:${bagEnd.arrivedCount}:${bagEnd.currentArrivalId || "none"}:${bagEnd.currentArrivalStage}:${bagEnd.thorinStage}:${bagEnd.thorinArrived ? 1 : 0}:${bagEnd.questBriefingDone ? 1 : 0}`
      );
    }
    return tokens.join("|");
  }

  function exploratoryCanTraverseConnection(connection) {
    if (!connection) return false;
    const web = game.blockingWebFor?.(connection);
    if (web && !web.broken) return false;
    const door = connection.door && game.doors?.[connection.door];
    if (door && !door.open && !door.broken) return false;
    return true;
  }

  function explorationFrontierSnapshot(targetId = "") {
    const connections = game.roomConnections?.() || [];
    const traversableExitCount = connections.filter((connection) => exploratoryCanTraverseConnection(connection)).length;
    const blockedExitCount = connections.length - traversableExitCount;
    const unopenedContainers = visibleRoomItems().filter((item) => item.container && !item.open).length;
    const portableItems = visibleRoomItems().filter((item) => item.portable).length;
    const visibleFriendlies = visibleFriendlyPeople().length;
    const visibleHostiles = exploratoryHostileTokens().length;
    const specialCandidateCount = uniqueCandidates(exploratorySpecialCandidates(targetId)).length;
    return {
      traversableExitCount,
      blockedExitCount,
      unopenedContainers,
      portableItems,
      visibleFriendlies,
      visibleHostiles,
      specialCandidateCount,
    };
  }

  function exploratoryUnlockDelta(before = {}, after = {}) {
    let score = 0;
    score += ((after.traversableExitCount || 0) - (before.traversableExitCount || 0)) * 20;
    score += ((before.blockedExitCount || 0) - (after.blockedExitCount || 0)) * 14;
    score += ((after.specialCandidateCount || 0) - (before.specialCandidateCount || 0)) * 8;
    score += ((after.portableItems || 0) - (before.portableItems || 0)) * 6;
    score += ((after.visibleFriendlies || 0) - (before.visibleFriendlies || 0)) * 6;
    return score;
  }

  function exploratoryIsLowSignalCommand(command = "") {
    const normalized = normalize(command);
    return normalized === "look"
      || normalized === "exits"
      || normalized === "inventory"
      || normalized === "wait"
      || normalized.startsWith("talk to ")
      || normalized.startsWith("hello")
      || normalized.startsWith("greet");
  }

  function exploratoryStructuralProgress(before = {}, after = {}) {
    return (after.room || "") !== (before.room || "")
      || (after.inventoryCount || 0) > (before.inventoryCount || 0)
      || (after.openDoorCount || 0) > (before.openDoorCount || 0)
      || (after.flagsCount || 0) > (before.flagsCount || 0)
      || exploratoryUnlockDelta(before, after) > 0
      || (after.progress || 0) > (before.progress || 0);
  }

  function exploratoryIsSetupCommand(command = "") {
    const normalized = normalize(command);
    return normalized.startsWith("open ")
      || normalized.startsWith("unlock ")
      || normalized.startsWith("take ")
      || normalized.startsWith("wear ")
      || normalized.startsWith("light ")
      || normalized.startsWith("examine ")
      || normalized.startsWith("look across ")
      || normalized.startsWith("throw ")
      || normalized.startsWith("pull ")
      || normalized.startsWith("climb ")
      || normalized.startsWith("ask ")
      || normalized.startsWith("say to ");
  }

  function exploratoryVisibleActionBias(command = "") {
    const normalized = normalize(command);
    let bias = 0;

    for (const item of visibleRoomItems()) {
      const itemName = normalize(item?.name);
      if (!itemName) continue;
      if (normalized === `open ${itemName}` && item.container && !item.open) bias += 12;
      if (normalized === `take ${itemName}` && item.portable) bias += 10;
      if (normalized === `examine ${itemName}`) bias += item.container && !item.open ? 7 : 3;
    }

    for (const itemId of game.player?.inventory || []) {
      const item = game.items?.[itemId];
      const itemName = normalize(item?.name);
      if (!itemName) continue;
      if (normalized === `open ${itemName}` && item.container && !item.open) bias += 10;
      if (normalized === `examine ${itemName}`) bias += item.container && !item.open ? 5 : 2;
    }

    return bias;
  }

  function exploratoryRoomSweepPressure(command = "") {
    const normalized = normalize(command);
    const roomItems = visibleRoomItems();
    const unopenedContainers = roomItems.filter((item) => item.container && !item.open);
    const portableItems = roomItems.filter((item) => item.portable);
    const actionableCount = unopenedContainers.length + portableItems.length;
    if (!actionableCount) return 0;

    if (normalized.startsWith("talk to ") || normalized === "look" || normalized === "exits") {
      return -16 - actionableCount * 4;
    }

    if (game.isDirection?.(normalized) || normalized.startsWith("go ")) {
      return -8 - actionableCount * 2;
    }

    return 0;
  }

  function exploratoryEarlyRivendellRouteCandidates() {
    const candidates = [];
    const beforeRoadPhase = !game.flags?.seenpony;
    if (!beforeRoadPhase) return candidates;

    if (!game.findInInventory?.("firestone")) {
      if (game.currentRoom !== "bag_end_guest_room") {
        const route = game.autoplayRouteCommandTo?.("bag_end_guest_room");
        if (route) candidates.push({ command: route, kind: "exploratory" });
      } else {
        const guestTrunk = game.items?.guest_room_trunk;
        const ornateBox = game.items?.ornate_box;
        if (guestTrunk && !guestTrunk.open) candidates.push({ command: "open guest trunk", kind: "exploratory" });
        candidates.push({ command: "examine guest trunk", kind: "exploratory" });
        if (ornateBox && !game.player?.inventory?.includes?.(ornateBox.id)) candidates.push({ command: "take ornate box", kind: "exploratory" });
        if (ornateBox && !ornateBox.open) candidates.push({ command: "open ornate box", kind: "exploratory" });
        candidates.push({ command: "examine ornate box", kind: "exploratory" });
        candidates.push({ command: "take firestone", kind: "exploratory" });
      }
    }

    if (!game.findInInventory?.("sturdy key")) {
      if (game.currentRoom !== "hobbit_hole") {
        const route = game.autoplayRouteCommandTo?.("hobbit_hole");
        if (route) candidates.push({ command: route, kind: "exploratory" });
      } else {
        candidates.push({ command: "open discreet little drawer", kind: "exploratory" });
        candidates.push({ command: "examine discreet little drawer", kind: "exploratory" });
        candidates.push({ command: "take sturdy key", kind: "exploratory" });
      }
    }

    if (!game.findInInventory?.("brass lantern")) {
      if (game.currentRoom !== "bilbos_garden") {
        const route = game.autoplayRouteCommandTo?.("bilbos_garden");
        if (route) candidates.push({ command: route, kind: "exploratory" });
      } else {
        candidates.push({ command: "unlock garden shed", kind: "exploratory" });
        candidates.push({ command: "open garden shed", kind: "exploratory" });
        candidates.push({ command: "examine garden shed", kind: "exploratory" });
        candidates.push({ command: "take lantern", kind: "exploratory" });
      }
    }

    if (game.currentRoom === "green_dragon_inn" && game.flags?.lanternon !== true) {
      candidates.push({ command: "light lantern", kind: "exploratory" });
    }

    return candidates;
  }

  function exploratoryCommandContextBias(command = "", targetId = "") {
    const normalized = normalize(command);
    let bias = exploratoryVisibleActionBias(command);
    bias += exploratoryRoomSweepPressure(command);

    if (normalized === "wait") {
      const bagEnd = exploratoryBagEndProgress();
      if (bagEnd && !bagEnd.questBriefingDone) {
        bias += bagEnd.thorinArrived ? 20 : 30;
      }
      if (
        game.visitedTrollsClearing
        && game.findInInventory?.("large key")
        && !game.trollsTransformed
        && game.currentRoom !== "trolls_clearing"
      ) {
        bias += 18;
      }
    }

    if (game.currentRoom === "hidden_valley_path" && game.findInInventory?.("sturdy rope") && !game.flags?.rivendellropesecured) {
      if (/^(tie|fasten|attach|secure) rope to (roots|root|pine roots|iron spike|spike)$/.test(normalized)) bias += 30;
      if (/^(brace|steady|hold) rope$/.test(normalized)) bias += 24;
    }

    if (game.currentRoom === "rivendell" && !game.flags?.mapread) {
      if (normalized === "talk to elrond") bias += 20;
      if (normalized === "ask elrond about journey") bias += game.flags?.rivendell_progress_talk ? 30 : 10;
    }

    if (targetId === "rivendell_complete" && game.currentRoom === "green_dragon_inn") {
      if (normalized === "say to thorin \"look through window\"") bias += 22;
    }

    return bias;
  }

  function exploratoryImportantProgress(before = {}, after = {}) {
    return (after.room || "") !== (before.room || "")
      || (after.inventoryCount || 0) > (before.inventoryCount || 0)
      || (after.openDoorCount || 0) > (before.openDoorCount || 0)
      || (after.flagsCount || 0) > (before.flagsCount || 0)
      || exploratoryUnlockDelta(before, after) >= 12;
  }

  function ensureMemoryStateEntry(stateKey = "") {
    if (!stateKey) return null;
    if (!state.exploreMemory.states[stateKey]) {
      state.exploreMemory.states[stateKey] = {
        seen: 0,
        commands: {},
      };
    }
    return state.exploreMemory.states[stateKey];
  }

  function currentExplorationRouteKey() {
    const presetId = String(state.activeExplorationRoute?.presetId || "").trim();
    const targetId = String(state.activeExplorationRoute?.targetId || "").trim();
    if (!presetId || !targetId) return "";
    return `${presetId}::${targetId}`;
  }

  function ensureRouteMemoryEntry(routeKey = "") {
    if (!routeKey) return null;
    if (!state.exploreMemory.routes[routeKey]) {
      state.exploreMemory.routes[routeKey] = {
        seen: 0,
        commands: {},
      };
    }
    return state.exploreMemory.routes[routeKey];
  }

  function ensureRouteCommandEntry(routeKey = "", command = "") {
    const routeEntry = ensureRouteMemoryEntry(routeKey);
    if (!routeEntry) return null;
    const commandKey = normalize(command);
    if (!routeEntry.commands[commandKey]) {
      routeEntry.commands[commandKey] = {
        tries: 0,
        successes: 0,
        unlocks: 0,
        failures: 0,
        noops: 0,
        totalReward: 0,
        lastReward: 0,
      };
    }
    return routeEntry.commands[commandKey];
  }

  function ensureMemoryCommandEntry(stateKey = "", command = "") {
    const stateEntry = ensureMemoryStateEntry(stateKey);
    if (!stateEntry) return null;
    const commandKey = normalize(command);
    if (!stateEntry.commands[commandKey]) {
      stateEntry.commands[commandKey] = {
        tries: 0,
        successes: 0,
        assists: 0,
        unlocks: 0,
        roomsOpened: 0,
        failures: 0,
        noops: 0,
        deaths: 0,
        totalReward: 0,
        lastReward: 0,
      };
    }
    return stateEntry.commands[commandKey];
  }

  function exploratoryMemoryBias(stateKey = "", command = "") {
    const entry = state.exploreMemory?.states?.[stateKey]?.commands?.[normalize(command)];
    if (!entry) return exploratoryIsLowSignalCommand(command) ? -4 : exploratoryIsSetupCommand(command) ? 10 : 6;
    let bias = 0;
    bias += Math.min(40, Number(entry.unlocks || 0) * 6);
    bias += Math.min(24, Number(entry.roomsOpened || 0) * 4);
    bias += Math.min(22, Number(entry.assists || 0) * 4);
    bias += Math.min(18, Number(entry.successes || 0) * 3);
    bias -= Math.min(90, Number(entry.failures || 0) * 7);
    bias -= Math.min(54, Number(entry.noops || 0) * 6);
    bias -= Math.min(180, Number(entry.deaths || 0) * 70);
    if (exploratoryIsSetupCommand(command)) bias += 4;
    return bias;
  }

  function exploratoryRouteBias(command = "") {
    const routeKey = currentExplorationRouteKey();
    if (!routeKey) return 0;
    const entry = state.exploreMemory?.routes?.[routeKey]?.commands?.[normalize(command)];
    if (!entry) return exploratoryIsLowSignalCommand(command) ? -2 : exploratoryIsSetupCommand(command) ? 8 : 3;
    let bias = 0;
    bias += Math.min(60, Number(entry.successes || 0) * 5);
    bias += Math.min(44, Number(entry.unlocks || 0) * 7);
    bias += Math.min(40, Math.max(0, Number(entry.totalReward || 0)) * 0.18);
    bias -= Math.min(70, Number(entry.failures || 0) * 6);
    bias -= Math.min(48, Number(entry.noops || 0) * 4);
    if (exploratoryIsSetupCommand(command)) bias += 6;
    return bias;
  }

  function rememberExploratoryOutcome({ before, after, command, reward = 0, unlockReward = 0, lines = [] }) {
    const stateKey = before?.stateKey || exploratoryStateKey();
    const stateEntry = ensureMemoryStateEntry(stateKey);
    const commandEntry = ensureMemoryCommandEntry(stateKey, command);
    const routeKey = currentExplorationRouteKey();
    const routeEntry = ensureRouteMemoryEntry(routeKey);
    const routeCommandEntry = ensureRouteCommandEntry(routeKey, command);
    if (!stateEntry || !commandEntry) return;

    stateEntry.seen = (stateEntry.seen || 0) + 1;
    commandEntry.tries += 1;
    commandEntry.totalReward += reward;
    commandEntry.lastReward = reward;
    if (routeEntry && routeCommandEntry) {
      routeEntry.seen = (routeEntry.seen || 0) + 1;
      routeCommandEntry.tries += 1;
      routeCommandEntry.totalReward += reward;
      routeCommandEntry.lastReward = reward;
    }

    const text = lines.join(" ");
    const structuralProgress = exploratoryStructuralProgress(before, after);
    if ((reward > 0 || unlockReward > 0) && structuralProgress) {
      commandEntry.successes += 1;
      if (routeCommandEntry) routeCommandEntry.successes += 1;
    }
    if (unlockReward > 0) {
      commandEntry.unlocks += 1;
      if (routeCommandEntry) routeCommandEntry.unlocks += 1;
    }
    if ((after?.room || "") !== (before?.room || "")) commandEntry.roomsOpened += 1;
    if (after?.dead) commandEntry.deaths += 1;
    else if (reward <= -10 || /cannot|don't see|no exit|not recognized|too dark|is closed|is locked/i.test(text)) {
      commandEntry.failures += 1;
      if (routeCommandEntry) routeCommandEntry.failures += 1;
    } else if (!structuralProgress && exploratoryIsLowSignalCommand(command)) {
      commandEntry.noops += 1;
      if (routeCommandEntry) routeCommandEntry.noops += 1;
    } else if (Math.abs(reward) < 2 && (after?.room || "") === (before?.room || "")) {
      commandEntry.noops += 1;
      if (routeCommandEntry) routeCommandEntry.noops += 1;
    }

    state.exploreMemory.totalSteps = (state.exploreMemory.totalSteps || 0) + 1;
    saveExploreMemory();
  }

  function rewardSetupAssist(history, before = {}, after = {}, reward = 0, unlockReward = 0) {
    if (!history?.recentTransitions?.length) return;
    if (!exploratoryImportantProgress(before, after) && reward < 18 && unlockReward < 10) return;
    const candidates = history.recentTransitions
      .slice(-3)
      .filter((entry) => entry?.stateKey && exploratoryIsSetupCommand(entry.command))
      ;
    if (!candidates.length) return;

    let remaining = Math.max(8, Math.min(24, Math.round((Math.max(reward, 0) + Math.max(unlockReward, 0)) * 0.35)));
    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      const entry = candidates[index];
      const memoryEntry = ensureMemoryCommandEntry(entry.stateKey, entry.command);
      if (!memoryEntry) continue;
      const assist = Math.max(4, Math.round(remaining / (index + 2)));
      memoryEntry.assists += 1;
      memoryEntry.totalReward += assist;
      memoryEntry.lastReward = assist;
      remaining -= Math.max(1, Math.round(assist / 2));
    }
  }

  function goblinAmbushBilboCommand() {
    const goblin = game.encounters?.goblinTunnelGoblin?.();
    if (!goblin) return "";
    return game.findInInventory?.("majestic sword")
      ? `kill ${goblin.name} with sword`
      : `kill ${goblin.name}`;
  }

  function goblinAmbushHelperCommand() {
    const goblin = game.encounters?.goblinTunnelGoblin?.();
    const helper = game.encounters?.bestGoblinTunnelHelper?.();
    if (!goblin || !helper) return "";
    return `ask ${normalize(helper.name)} to attack ${goblin.name}`;
  }

  function visibleHostileSpider() {
    return game.peopleInRoom?.().find((character) => (
      character.visible
      && character.friendly === false
      && /spider/.test(normalize(character.name))
    )) || null;
  }

  function visibleHostileThreat() {
    return game.peopleInRoom?.().find((character) => (
      character.visible
      && character.friendly === false
      && !/gollum/.test(normalize(character.name))
    )) || null;
  }

  function visibleHostileNonSpiderThreat() {
    return game.peopleInRoom?.().find((character) => (
      character.visible
      && character.friendly === false
      && !/gollum/.test(normalize(character.name))
      && !/spider/.test(normalize(character.name))
    )) || null;
  }

  function createHistoryTracker() {
    return {
      roomVisits: new Map(),
      commandCounts: new Map(),
      roomCommandCounts: new Map(),
      stateCommandCounts: new Map(),
      recentCommands: [],
      recentTransitions: [],
    };
  }

  function bumpMapCount(map, key) {
    if (!map || !key) return 0;
    const nextValue = (map.get(key) || 0) + 1;
    map.set(key, nextValue);
    return nextValue;
  }

  function recordHistoryStep(history, command = "", fromRoom = "", toRoom = "", stateKey = "") {
    if (!history) return;
    const normalizedCommand = normalize(command);
    bumpMapCount(history.commandCounts, normalizedCommand);
    bumpMapCount(history.roomVisits, toRoom || fromRoom || game.currentRoom);
    bumpMapCount(history.roomCommandCounts, `${fromRoom || game.currentRoom}::${normalizedCommand}`);
    if (stateKey) bumpMapCount(history.stateCommandCounts, `${stateKey}::${normalizedCommand}`);
    history.recentCommands.push(normalizedCommand);
    if (history.recentCommands.length > 8) history.recentCommands.shift();
  }

  function recordTransitionSample(history, transition = null) {
    if (!history || !transition) return;
    history.recentTransitions.push(transition);
    if (history.recentTransitions.length > 6) history.recentTransitions.shift();
  }

  function carriedItemIds() {
    return [...(game.player?.inventory || []), ...(game.player?.worn || [])];
  }

  function visibleRoomItems() {
    return (game.itemsInRoom?.() || []).filter((item) => item && item.visible !== false);
  }

  function visibleFriendlyPeople() {
    return (game.peopleInRoom?.() || []).filter((character) => (
      character
      && character.id !== game.player?.id
      && character.visible
      && character.friendly !== false
    ));
  }

  function exploratoryMilestoneScore(targetId = "", context = {}) {
    const weights = {
      seenpony: 8,
      trollkeytaken: 12,
      mapread: 30,
      rivendell_progress_talk: 12,
      rivendell_progress_quest: 18,
      mirkwoodjourneyactive: 8,
      mirkwooddrankstream: 8,
      mirkwoodfolloweddeer: 8,
      mirkwoodfollowedlights: 18,
      mirkwooddwarvesfreed: 30,
      seenboat: 10,
      ropeinboat: 14,
      boatiswest: 16,
      barrelthrown: 16,
      bardreadiedarrow: 28,
      dragondefeated: 90,
      treasuretaken: 24,
      secretdoorsun: 28,
    };
    let score = 0;
    for (const [flag, weight] of Object.entries(weights)) {
      if (game.flags?.[flag]) score += weight;
    }

    const itemWeights = {
      "firestone": 14,
      "sturdy key": 14,
      "brass lantern": 14,
      "large key": 12,
      "majestic sword": 18,
      "sturdy rope": 16,
      "golden ring": 42,
      "woods cloak": 10,
      "meal": 8,
      "treasure": 36,
      "small key": 8,
    };
    for (const itemId of carriedItemIds()) {
      const name = normalize(game.items?.[itemId]?.name || itemId);
      if (itemWeights[name]) score += itemWeights[name];
    }

    score += (game.visitedRooms?.size || 0) * 1.6;
    score += Number(game.player?.strength || 0) * 2.5;
    if (typeof game.mirkwoodEnergy === "function") score += Math.max(0, game.mirkwoodEnergy() || 0) * 2.5;
    if (game.hasActiveLantern?.()) score += 4;
    if (bardWithPlayer()) score += 20;
    if (game.bilboHasRecoveredRing?.()) score += 40;
    score += exploratoryBagEndProgressScore(targetId);

    if (targetId === "have_ring") {
      if (game.currentRoom === "deep_dark_lake") score += 6;
      if (game.gollumState?.met) score += 10;
      if (game.gollumState?.awaitingPlayerRiddle) score += 12;
      if (game.gollumState?.pocketQuestionAsked) score += 20;
      if (game.player.noticeable === false) score += 18;
      if (ringTargetSatisfied()) score += 220;
    }

    if (targetId === "rivendell_complete") {
      if (game.currentRoom === "rivendell") score += 10;
      if (game.rivendellPreparationsComplete?.()) score += 220;
    }

    if (targetId === "beorn_fed") {
      if (game.currentRoom === "beorns_house") score += 12;
      if (game.findInInventory?.("meal")) score += 10;
      if (game.wearingMirkwoodCloak?.()) score += 6;
      if (game.currentRoom === "beorns_house" && Number(game.player?.strength || 0) >= 6) score += 220;
    }

    if (targetNeedsMirkwoodTraversal(targetId) || targetId === "mirkwood_cleared") {
      if (/mirkwood|west_bank|east_bank|elvish_clearing|elvenkings_halls/.test(game.currentRoom || "")) score += 8;
      if (game.flags?.mirkwoodjourneycomplete || game.currentRoom === "elvish_clearing") score += 220;
    }

    if (targetId === "long_lake_alive") {
      if (game.currentRoom === "cellar") score += 10;
      if (game.doors?.porta_cellar_long_lake?.open) score += 12;
      if (game.currentRoom === "long_lake" && !game.endgame) score += 220;
    }

    if (targetId === "bard_joined") {
      const bard = Object.values(game.characters || {}).find((character) => normalize(character.name) === "bard" && character.visible);
      if (bard?.position === game.currentRoom) score += 10;
      if (bardWithPlayer() || game.flags?.bardreadiedarrow) score += 220;
    }

    if (targetId === "dragon_defeated") {
      if (["front_gate", "lower_halls", "erebor_hidden_door"].includes(game.currentRoom)) score += 12;
      if (game.flags?.dragondefeated) score += 220;
    }

    if (targetId === "victory") {
      if (game.findInInventory?.("treasure")) score += 60;
      if (game.currentRoom === "hobbit_hole") score += 12;
      if (targetById[targetId]?.matches(context)) score += 260;
    }

    return score;
  }

  function exploratoryStateSnapshot(targetId = "") {
    const context = scenarioContext();
    const frontier = explorationFrontierSnapshot(targetId);
    return {
      context,
      stateKey: exploratoryStateKey(targetId),
      room: game.currentRoom,
      progress: exploratoryMilestoneScore(targetId, context),
      matched: Boolean(targetById[targetId]?.matches(context)),
      dead: Boolean(game.endgame && game.pendingEndgameChoice === "death"),
      inventoryCount: carriedItemIds().length,
      visibleItems: visibleRoomItems().length,
      openDoorCount: Object.values(game.doors || {}).filter((door) => door?.open).length,
      flagsCount: Object.values(game.flags || {}).filter(Boolean).length,
      ...frontier,
    };
  }

  function exploratoryRewardForTransition(before = {}, after = {}, lines = [], history = null, command = "") {
    const commandKey = normalize(command);
    let reward = 0;
    reward += ((after.progress || 0) - (before.progress || 0)) * 3.5;
    reward += exploratoryOutputPenalty(lines);
    if (after.matched) reward += 600;
    if (after.dead) reward -= 900;
    if ((after.room || "") !== (before.room || "")) {
      const roomVisits = history?.roomVisits?.get(after.room) || 0;
      reward += roomVisits ? Math.max(1, 5 - roomVisits) : 14;
    }
    reward += exploratoryUnlockDelta(before, after);
    if ((after.inventoryCount || 0) > (before.inventoryCount || 0)) reward += 18;
    if ((after.openDoorCount || 0) > (before.openDoorCount || 0)) reward += 10;
    if ((after.flagsCount || 0) > (before.flagsCount || 0)) reward += 10;
    if ((after.visibleItems || 0) > (before.visibleItems || 0)) reward += 4;
    if (history?.recentCommands?.includes(commandKey)) reward -= 4;
    if (exploratoryIsLowSignalCommand(command) && !exploratoryStructuralProgress(before, after)) reward -= 14;
    return reward;
  }

  function exploratoryOutputPenalty(lines = []) {
    const text = lines.join(" ");
    if (!text.trim()) return -4;
    if (/(you see no exit|that direction is not recognized|cannot|don't see|is closed|is locked|too dark|better |need to choose|would be unwise)/i.test(text)) {
      return -16;
    }
    if (/(you take|you open|you unlock|you break|you wear|you eat|you drink|arrive|enters|free|recover|shoot|killed|slips|boat|trap door|riddle)/i.test(text)) {
      return 6;
    }
    return 1;
  }

  function exploratorySpecialCandidates() {
    const candidates = [...exploratoryEarlyRivendellRouteCandidates()];

    if (!game.hasActiveLantern?.() && game.findInInventory?.("brass lantern") && game.roomIsDark?.()) {
      candidates.push({ command: "light lantern", kind: "exploratory" });
    }

    if (!game.flags?.seenpony && typeof game.bagEndQuestHasBegun === "function" && !game.bagEndQuestHasBegun()) {
      candidates.push({ command: "wait", kind: "exploratory" });
    }

    if (game.spiderEyesState?.active && game.currentRoom === game.spiderEyesState.room) {
      for (const direction of game.spiderEyesState.safeDirections || []) {
        candidates.push({ command: direction, kind: "exploratory" });
      }
      candidates.push({ command: "wait", kind: "exploratory" });
    }

    if (game.encounters?.isGoblinTunnelEncounterActive?.()) {
      const helperCommand = goblinAmbushHelperCommand();
      const bilboCommand = goblinAmbushBilboCommand();
      if (helperCommand) candidates.push({ command: helperCommand, kind: "exploratory" });
      if (bilboCommand) candidates.push({ command: bilboCommand, kind: "exploratory" });
    }

    const threat = visibleHostileThreat();
    if (threat) {
      candidates.push({
        command: game.findInInventory?.("majestic sword") ? `kill ${threat.name} with sword` : `kill ${threat.name}`,
        kind: "exploratory",
      });
    }

    if (game.currentRoom === "deep_dark_lake") {
      if (!game.gollumState?.met) candidates.push({ command: "look", kind: "exploratory" });
      if (game.gollumState?.awaitingAnswer) {
        for (const answer of game.currentGollumRiddle?.()?.answers || []) {
          if (String(answer || "").trim()) candidates.push({ command: `answer ${answer}`, kind: "exploratory" });
        }
      } else if (game.gollumState?.awaitingPlayerRiddle) {
        candidates.push({ command: "say to gollum \"what have i got in my pocket\"", kind: "exploratory" });
        candidates.push({ command: "say to gollum \"what's in my pocket\"", kind: "exploratory" });
      } else {
        candidates.push({ command: "ask gollum a riddle", kind: "exploratory" });
      }
      if (game.gollumState?.pocketQuestionAsked && game.player.noticeable !== false) {
        candidates.push({ command: "wear ring", kind: "exploratory" });
      }
      if (game.gollumState?.pocketQuestionAsked && game.player.noticeable === false) {
        candidates.push({ command: "north", kind: "exploratory" });
      }
    }

    if (
      !game.flags?.mirkwooddwarvesfreed
      && ["mirkwood_spider_grove", "place_of_black_spiders"].includes(game.currentRoom)
    ) {
      candidates.push({ command: "help dwarves", kind: "exploratory" });
    }

    if (game.currentRoom === "mirkwood_enchanted_stream" && !game.flags?.mirkwooddrankstream) {
      candidates.push({ command: "drink stream", kind: "exploratory" });
    }
    if (game.currentRoom === "mirkwood_deer_trail" && !game.flags?.mirkwoodfolloweddeer) {
      candidates.push({ command: "follow deer", kind: "exploratory" });
    }
    if (game.currentRoom === "mirkwood_ruined_clearing" && !game.flags?.mirkwoodfollowedlights) {
      candidates.push({ command: "follow lights", kind: "exploratory" });
    }

    if (game.currentRoom === "west_bank") {
      if (!game.flags?.seenboat) candidates.push({ command: "look across river", kind: "exploratory" });
      if (!game.flags?.ropeinboat) candidates.push({ command: "throw rope across river", kind: "exploratory" });
      if (!game.flags?.boatiswest) candidates.push({ command: "pull rope", kind: "exploratory" });
      candidates.push({ command: "climb into boat", kind: "exploratory" });
    }

    if (game.currentRoom === "cellar") {
      if (!game.doors?.porta_cellar_long_lake?.open) candidates.push({ command: "open trap door", kind: "exploratory" });
      if (!game.flags?.barrelthrown) candidates.push({ command: "throw barrel through trap door", kind: "exploratory" });
      candidates.push({ command: "jump onto barrel", kind: "exploratory" });
      candidates.push({ command: "climb barrel", kind: "exploratory" });
    }

    if (game.currentRoom === "hidden_valley_path" && game.findInInventory?.("sturdy rope") && !game.flags?.rivendellropesecured) {
      candidates.push({ command: "tie rope to roots", kind: "exploratory" });
      candidates.push({ command: "fasten rope to iron spike", kind: "exploratory" });
      candidates.push({ command: "brace rope", kind: "exploratory" });
      candidates.push({ command: "hold rope", kind: "exploratory" });
    }

    if (!game.flags?.dragondefeated && bardWithPlayer() && !game.flags?.bardreadiedarrow) {
      candidates.push({ command: "say to bard \"get strong arrow from quiver\"", kind: "exploratory" });
      candidates.push({ command: "say to bard \"get arrow from quiver\"", kind: "exploratory" });
    }

    if (game.currentRoom === "lower_halls" && game.liveDragon?.()) {
      candidates.push({ command: "say to bard \"shoot dragon\"", kind: "exploratory" });
      candidates.push({ command: "say to bard \"take shot\"", kind: "exploratory" });
      candidates.push({ command: "say to bard \"loose arrow\"", kind: "exploratory" });
    }

    return candidates;
  }

  function exploratoryRepeatLimits(command = "", relaxationLevel = 0) {
    const lowSignal = exploratoryIsLowSignalCommand(command);
    const baseLimit = lowSignal ? 1 : 3;
    if (relaxationLevel <= 0) {
      return { room: baseLimit, state: baseLimit };
    }
    if (relaxationLevel === 1) {
      return {
        room: lowSignal ? 2 : 5,
        state: lowSignal ? 2 : 5,
      };
    }
    if (relaxationLevel === 2) {
      return {
        room: lowSignal ? 3 : 7,
        state: lowSignal ? 3 : 7,
      };
    }
    return {
      room: lowSignal ? 4 : 9,
      state: lowSignal ? 99 : 99,
    };
  }

  function exploratoryCandidates(targetId = "", history = null, options = {}) {
    const relaxationLevel = Math.max(0, Number(options.relaxationLevel) || 0);
    const candidates = [...exploratorySpecialCandidates(targetId)];

    for (const connection of game.roomConnections?.() || []) {
      const web = game.blockingWebFor?.(connection);
      if (web && !web.broken) {
        candidates.push({
          command: game.findInInventory?.("majestic sword") ? "break web with sword" : "smash web",
          kind: "exploratory",
        });
        continue;
      }
      const door = connection.door && game.doors?.[connection.door];
      if (door && !door.open && !door.broken) {
        if (door.locked && typeof game.keyFor === "function" && game.keyFor(door)) {
          candidates.push({ command: `unlock ${door.name}`, kind: "exploratory" });
        }
        if (door.locked && game.findInInventory?.("majestic sword")) {
          candidates.push({ command: `break ${door.name} with sword`, kind: "exploratory" });
        }
        if (!door.locked) candidates.push({ command: `open ${door.name}`, kind: "exploratory" });
        continue;
      }
      candidates.push({ command: connection.direction, kind: "exploratory" });
    }

    for (const item of visibleRoomItems()) {
      if (item.portable) candidates.push({ command: `take ${item.name}`, kind: "exploratory" });
      if (item.container && !item.open) candidates.push({ command: `open ${item.name}`, kind: "exploratory" });
      candidates.push({ command: `examine ${item.name}`, kind: "exploratory" });
    }

    for (const itemId of game.player?.inventory || []) {
      const item = game.items?.[itemId];
      if (!item) continue;
      if (item.wearable && !(game.player?.worn || []).includes(item.id)) candidates.push({ command: `wear ${item.name}`, kind: "exploratory" });
      if (item.container && !item.open) candidates.push({ command: `open ${item.name}`, kind: "exploratory" });
      if (["meal"].includes(normalize(item.name))) candidates.push({ command: `eat ${item.name}`, kind: "exploratory" });
      if (["waterskin"].includes(normalize(item.name))) candidates.push({ command: `drink ${item.name}`, kind: "exploratory" });
    }

    for (const person of visibleFriendlyPeople()) {
      candidates.push({ command: `talk to ${normalize(person.name)}`, kind: "exploratory" });
      if (normalize(person.name) === "bard" && !bardWithPlayer()) {
        candidates.push({ command: "pick up bard", kind: "exploratory" });
      }
    }

    if (game.currentRoom === "rivendell") {
      candidates.push({ command: "talk to elrond", kind: "exploratory" });
      candidates.push({ command: "ask elrond about journey", kind: "exploratory" });
    }

    if (game.currentRoom === "green_dragon_inn") {
      candidates.push({ command: "say to thorin \"look through window\"", kind: "exploratory" });
    }
    if (game.currentRoom === "green_dragon_inn_outside" && !game.items?.low_branch?.visible) {
      candidates.push({ command: "examine oak tree", kind: "exploratory" });
    }
    if (game.items?.low_branch?.visible && game.currentRoom === "green_dragon_inn_outside") {
      candidates.push({ command: "climb branch", kind: "exploratory" });
    }

    candidates.push({ command: "look", kind: "exploratory" });
    candidates.push({ command: "exits", kind: "exploratory" });

    const deduped = uniqueCandidates(candidates);
    if (!history) return deduped;
    const stateKey = exploratoryStateKey(targetId);
    return deduped.filter((entry) => {
      const commandKey = normalize(entry.command);
      const roomCount = history.roomCommandCounts.get(`${game.currentRoom}::${commandKey}`) || 0;
      const stateCount = history.stateCommandCounts.get(`${stateKey}::${commandKey}`) || 0;
      const limits = exploratoryRepeatLimits(entry.command, relaxationLevel);
      return roomCount < limits.room && stateCount < limits.state;
    });
  }

  function evaluateExploratoryCandidate(entry, targetId = "", history = null) {
    const snapshot = game.createSnapshot?.();
    const outputLength = output.children?.length || 0;
    const before = exploratoryStateSnapshot(targetId);
    const commandKey = normalize(entry.command);
    const repeatPenalty = history?.roomCommandCounts?.get(`${game.currentRoom}::${commandKey}`) || 0;
    let score = -repeatPenalty * 8;
    score += exploratoryMemoryBias(before.stateKey, entry.command);
    score += exploratoryRouteBias(entry.command);
    score += exploratoryCommandContextBias(entry.command, targetId);

    try {
      game.execute(entry.command);
      const delta = outputDelta(outputLength);
      const after = exploratoryStateSnapshot(targetId);
      score += exploratoryRewardForTransition(before, after, delta, history, entry.command);
      return { ...entry, kind: "exploratory", score };
    } finally {
      trimOutputTo(outputLength);
      if (snapshot) game.restoreSnapshot?.(snapshot);
    }
  }

  function exploratoryDecision(targetId = "", history = null, options = {}) {
    const relaxationLevel = Math.max(0, Number(options.relaxationLevel) || 0);
    const candidates = exploratoryCandidates(targetId, history, { relaxationLevel });
    if (!candidates.length) return null;
    const scored = candidates
      .map((entry) => evaluateExploratoryCandidate(entry, targetId, history))
      .sort((left, right) => right.score - left.score || left.command.localeCompare(right.command, "it"));
    const bestScore = scored[0]?.score ?? -Infinity;
    const shortlist = scored.filter((entry) => entry.score >= bestScore - 6).slice(0, 6);
    const pick = randomEntry(shortlist) || scored[0] || null;
    if (!pick) return null;
    if (relaxationLevel > 0) {
      return {
        ...pick,
        kind: `exploratory_recovery_${relaxationLevel}`,
      };
    }
    return pick;
  }

  function alternativeGollumAnswer() {
    const answers = game.currentGollumRiddle?.()?.answers || [];
    return answers.find((answer, index) => index > 0 && String(answer || "").trim()) || "";
  }

  function trollDawnWaitAvailable() {
    return Boolean(
      game.visitedTrollsClearing
      && !game.trollsTransformed
      && !game.flags?.trollkeytaken
      && !game.findInInventory?.("large key")
      && game.currentRoom !== "trolls_clearing"
    );
  }

  function trollNoKeyExitAvailable() {
    return Boolean(
      game.currentRoom === "trolls_clearing"
      && !game.trollsTransformed
      && !game.flags?.trollkeytaken
      && !game.findInInventory?.("large key")
    );
  }

  function dryCaveCrackPryingToolName() {
    const carriedIds = [
      ...(game.player?.inventory || []),
      ...(game.player?.worn || []),
    ];
    const carriedItems = carriedIds
      .map((itemId) => game.items?.[itemId])
      .filter(Boolean);
    const tool = carriedItems.find((item) => game.isDryCaveCrackPryingTool?.(item) && item.weapon)
      || carriedItems.find((item) => game.isDryCaveCrackPryingTool?.(item))
      || null;
    return tool?.name || "";
  }

  function dryCaveCrackAlternativeDecision(targetId = "") {
    if (!targetNeedsBeornArrival(targetId)) return null;

    if (game.currentRoom === "dark_stuffy_passage_13") {
      return { command: "north west", kind: "alternative_trigger" };
    }

    if (game.currentRoom === "dark_stuffy_passage_14") {
      return { command: "down", kind: "alternative_trigger" };
    }

    if (game.currentRoom === "dark_stuffy_passage_6") {
      return { command: "north", kind: "alternative_trigger" };
    }

    if (game.currentRoom === "dark_stuffy_passage_5" && game.dryCaveCrackEscapeActive?.()) {
      if (!game.flags?.drycavecrackairnoticed) return { command: "listen", kind: "alternative_trigger" };
      if (!game.flags?.drycavecrackseamfound) return { command: "search wall", kind: "alternative_trigger" };
      if (!game.flags?.drycavecrackloosened) {
        const toolName = dryCaveCrackPryingToolName();
        if (toolName) return { command: `use ${toolName} on crack`, kind: "alternative_trigger" };
        return { command: "search wall", kind: "alternative_trigger" };
      }
      if (!game.flags?.drycavecrackopened) return { command: "push stone", kind: "alternative_trigger" };
      return { command: "squeeze through crack", kind: "alternative_trigger" };
    }

    if (game.currentRoom === "large_dry_cave") {
      return { command: "south", kind: "alternative_trigger" };
    }

    if (["narrow_place", "narrow_dangerous_path"].includes(game.currentRoom)) {
      const advance = game.preferredBeornMountainAdvance?.();
      if (advance?.direction) return { command: advance.direction, kind: "alternative_trigger" };
    }

    return null;
  }

  function alternativeSuccessDecision(targetId = "") {
    const candidates = [];

    const dryCaveAlternative = dryCaveCrackAlternativeDecision(targetId);
    if (dryCaveAlternative) candidates.push(dryCaveAlternative);

    if (targetNeedsMirkwoodTraversal(targetId) && !game.flags?.mirkwoodjourneyactive) {
      if (game.currentRoom === "beorns_house") {
        if (!game.wearingMirkwoodCloak?.() && !game.findInInventory?.("woods cloak")) {
          candidates.push({ command: "east", kind: "alternative_trigger" });
        }
      }
      if (game.currentRoom === "beorn_great_hall" && !game.wearingMirkwoodCloak?.() && !game.findInInventory?.("woods cloak")) {
        candidates.push({ command: "south", kind: "alternative_trigger" });
      }
      if (game.currentRoom === "beorn_stable") {
        if (!game.findInInventory?.("woods cloak") && !game.wearingMirkwoodCloak?.()) {
          candidates.push({ command: "take woods cloak", kind: "alternative_trigger" });
        }
        if (game.findInInventory?.("woods cloak") && !game.wearingMirkwoodCloak?.()) {
          candidates.push({ command: "wear woods cloak", kind: "alternative_trigger" });
        }
      }
    }

    if (game.encounters?.isGoblinTunnelEncounterActive?.()) {
      const helperCommand = goblinAmbushHelperCommand();
      const bilboCommand = goblinAmbushBilboCommand();
      if (helperCommand) candidates.push({ command: helperCommand, kind: "alternative_trigger" });
      if (bilboCommand) candidates.push({ command: bilboCommand, kind: "alternative_trigger" });
    }

    if (game.currentRoom === "deep_dark_lake") {
      if (game.gollumState?.awaitingAnswer) {
        const alternateAnswer = alternativeGollumAnswer();
        if (alternateAnswer) candidates.push({ command: `answer ${alternateAnswer}`, kind: "alternative_trigger" });
      }
      if (game.gollumState?.awaitingPlayerRiddle) {
        candidates.push({ command: "say to gollum \"what's in my pocket\"", kind: "alternative_trigger" });
      }
    }

    if (trollNoKeyExitAvailable()) {
      candidates.push({ command: "south west", kind: "alternative_trigger" });
    }

    if (trollDawnWaitAvailable()) {
      candidates.push({ command: "wait", kind: "alternative_trigger" });
    }

    if (
      game.currentRoom === "mirkwood_enchanted_stream"
      && !game.flags?.mirkwooddrankstream
      && Number(game.player?.strength || 0) >= 5
      && (typeof game.mirkwoodEnergy !== "function" || game.mirkwoodEnergy() >= 3)
    ) {
      candidates.push({ command: "drink stream", kind: "alternative_trigger" });
    }

    if (
      game.currentRoom === "mirkwood_deer_trail"
      && !game.flags?.mirkwoodfolloweddeer
      && Number(game.player?.strength || 0) >= 5
      && (typeof game.mirkwoodEnergy !== "function" || game.mirkwoodEnergy() >= 3)
    ) {
      candidates.push({ command: "follow deer", kind: "alternative_trigger" });
    }

    if (
      game.currentRoom === "mirkwood_ruined_clearing"
      && !game.flags?.mirkwoodfollowedlights
      && Number(game.player?.strength || 0) >= 5
      && (typeof game.mirkwoodEnergy !== "function" || game.mirkwoodEnergy() >= 2)
    ) {
      candidates.push({ command: "follow lights", kind: "alternative_trigger" });
    }

    if (
      targetNeedsMirkwoodTraversal(targetId)
      && game.currentRoom === "mirkwood_ruined_clearing"
      && !game.flags?.mirkwoodfollowedlights
      && game.findInInventory?.("meal")
      && !visibleHostileSpider()
    ) {
      candidates.push({ command: "eat meal", kind: "alternative_trigger" });
    }

    if (
      game.currentRoom === "cellar"
      && game.doors?.porta_cellar_long_lake?.open
      && game.flags?.barrelthrown
    ) {
      candidates.push({ command: "climb barrel", kind: "alternative_trigger" });
    }

    if (!game.flags?.dragondefeated && bardWithPlayer() && !game.flags?.bardreadiedarrow) {
      candidates.push({ command: "say to bard \"get arrow from quiver\"", kind: "alternative_trigger" });
    }

    if (
      game.currentRoom === "lower_halls"
      && game.liveDragon?.()
      && game.flags?.bardreadiedarrow
    ) {
      candidates.push({ command: "say to bard \"take shot\"", kind: "alternative_trigger" });
      candidates.push({ command: "say to bard \"loose arrow\"", kind: "alternative_trigger" });
    }

    return randomEntry(uniqueCandidates(candidates));
  }

  function fatalTriggerDecision() {
    if (game.encounters?.isGoblinTunnelEncounterActive?.()) {
      return { command: "wait", kind: "fatal_trigger" };
    }

    if (game.currentRoom === "deep_dark_lake") {
      if (game.gollumState?.awaitingAnswer) return { command: "answer toaster", kind: "fatal_trigger" };
      if (game.gollumState?.awaitingPlayerRiddle) return { command: "say to gollum \"a pocket\"", kind: "fatal_trigger" };
      if (game.gollumState?.pocketQuestionAsked && game.player.noticeable !== false) return { command: "wait", kind: "fatal_trigger" };
    }

    if (game.currentRoom === "trolls_clearing" && !game.trollsTransformed) {
      if (!game.findInInventory?.("large key")) return { command: "take large key", kind: "fatal_trigger" };
      return { command: "wait", kind: "fatal_trigger" };
    }

    if (game.currentRoom === "cellar") {
      return { command: "jump trap door", kind: "fatal_trigger" };
    }

    if (game.currentRoom === "lower_halls" && game.liveDragon?.() && !game.flags?.dragondefeated) {
      if (!game.flags?.treasuretaken) return { command: "take treasure", kind: "fatal_trigger" };
      return { command: "wait", kind: "fatal_trigger" };
    }

    if (game.spiderEyesState?.active && game.currentRoom === game.spiderEyesState.room) {
      return { command: "wait", kind: "fatal_trigger" };
    }

    if (visibleHostileSpider()) {
      return { command: "wait", kind: "fatal_trigger" };
    }

    return null;
  }

  function strategyCandidates(strategyId = "optimal") {
    const autoplayCommand = game.nextAutoplayCommand();
    const candidates = [];
    if (autoplayCommand) candidates.push({ command: autoplayCommand, kind: "optimal" });

    if (game.encounters?.isGoblinTunnelEncounterActive?.()) {
      const helperCommand = goblinAmbushHelperCommand();
      const bilboCommand = goblinAmbushBilboCommand();
      if (helperCommand) candidates.push({ command: helperCommand, kind: "alternative" });
      if (bilboCommand) candidates.push({ command: bilboCommand, kind: "alternative" });
      candidates.push({ command: "wait", kind: "failure" });
      candidates.push({ command: "look", kind: "failure" });
    }

    if (game.currentRoom === "deep_dark_lake") {
      if (game.gollumState?.awaitingAnswer) {
        const alternateAnswer = alternativeGollumAnswer();
        if (alternateAnswer) candidates.push({ command: `answer ${alternateAnswer}`, kind: "alternative" });
        candidates.push({ command: "answer toaster", kind: "failure" });
      }
      if (game.gollumState?.awaitingPlayerRiddle) {
        candidates.push({ command: "say to gollum \"what's in my pocket\"", kind: "alternative" });
        candidates.push({ command: "say to gollum \"a pocket\"", kind: "failure" });
      }
      if (game.gollumState?.pocketQuestionAsked && game.player.noticeable !== false) {
        candidates.push({ command: "wait", kind: "failure" });
      }
    }

    if (trollNoKeyExitAvailable()) {
      candidates.push({ command: "south west", kind: "alternative" });
    }

    if (trollDawnWaitAvailable()) {
      candidates.push({ command: "wait", kind: "alternative" });
    }

    const spider = visibleHostileSpider();
    if (spider) {
      candidates.push({ command: "wait", kind: "failure" });
      candidates.push({ command: "look", kind: "failure" });
      candidates.push({ command: `talk to ${normalize(spider.name)}`, kind: "failure" });
    }

    const hostileThreat = visibleHostileNonSpiderThreat();
    if (
      hostileThreat
      && game.findInInventory?.("majestic sword")
      && /goblin|wolf|warg/.test(normalize(hostileThreat.name))
    ) {
      candidates.push({ command: `kill ${hostileThreat.name}`, kind: "failure" });
      candidates.push({ command: `attack ${hostileThreat.name}`, kind: "failure" });
    }

    if (game.currentRoom === "mirkwood_enchanted_stream" && !game.flags?.mirkwooddrankstream) {
      candidates.push({ command: "drink stream", kind: "failure" });
    }

    if (game.currentRoom === "mirkwood_deer_trail" && !game.flags?.mirkwoodfolloweddeer) {
      candidates.push({ command: "follow deer", kind: "failure" });
    }

    if (game.currentRoom === "mirkwood_ruined_clearing" && !game.flags?.mirkwoodfollowedlights) {
      candidates.push({ command: "follow lights", kind: "failure" });
    }

    if (game.currentRoom === "cellar" && !game.findInInventory?.("barrel")) {
      candidates.push({ command: "down", kind: "failure" });
    }

    const deduped = uniqueCandidates(candidates);
    if (strategyId === "failure") {
      return deduped.filter((entry) => entry.kind === "failure").length
        ? deduped
        : deduped.filter((entry) => entry.kind !== "failure");
    }
    if (strategyId === "alternative") {
      return deduped.filter((entry) => entry.kind !== "failure");
    }
    return deduped.filter((entry) => entry.kind === "optimal" || entry.kind === "alternative");
  }

  function selectCommand(strategyId = "optimal", targetId = "") {
    if (strategyId === "exploratory") {
      const exploratory = exploratoryDecision(targetId, state.simulationHistory, { relaxationLevel: 0 });
      if (exploratory) return exploratory;

      for (let relaxationLevel = 1; relaxationLevel <= 3; relaxationLevel += 1) {
        const recovered = exploratoryDecision(targetId, state.simulationHistory, { relaxationLevel });
        if (recovered) return recovered;
      }

      const fallback = randomEntry(exploratoryCandidates(targetId, state.simulationHistory, { relaxationLevel: 3 }));
      return fallback ? { ...fallback, kind: "exploratory_recovery_fallback" } : null;
    }
    if (strategyId === "alternative") {
      const alternativeDecision = alternativeSuccessDecision(targetId);
      if (alternativeDecision) return alternativeDecision;
    }
    if (strategyId === "failure") {
      const fatalDecision = fatalTriggerDecision();
      if (fatalDecision) return fatalDecision;
      const autopilot = game.nextAutoplayCommand();
      if (autopilot) return { command: autopilot, kind: "optimal" };
    }
    const candidates = strategyCandidates(strategyId);
    if (!candidates.length) return null;

    if (strategyId === "failure") {
      const failures = candidates.filter((entry) => entry.kind === "failure");
      if (failures.length) return randomEntry(failures);
      const alternatives = candidates.filter((entry) => entry.kind === "alternative");
      if (alternatives.length) return randomEntry(alternatives);
      return candidates.find((entry) => entry.kind === "optimal") || candidates[0];
    }

    if (strategyId === "alternative") {
      const alternatives = candidates.filter((entry) => entry.kind === "alternative");
      if (alternatives.length) return randomEntry(alternatives);
      return candidates.find((entry) => entry.kind === "optimal") || candidates[0];
    }

    return candidates.find((entry) => entry.kind === "optimal") || candidates[0];
  }

  function simulateRun({ presetId, targetId, strategyId, seed, stepLimit }) {
    const preset = presetById[presetId];
    const target = targetById[targetId];
    const strategy = strategyById[strategyId] || strategyById.optimal;
    return withSeededRandom(seed, () => {
      state.activeExplorationRoute = { presetId, targetId };
      try {
        const { setupOutput } = resetToPreset(preset);
        state.simulationHistory = createHistoryTracker();
        const sceneTracker = createSceneEventTracker();
        bumpMapCount(state.simulationHistory.roomVisits, game.currentRoom);
        const commands = [];
        const transcript = [];
        let matched = target.matches(scenarioContext());
        if (!matched) {
          for (let step = 0; step < stepLimit; step += 1) {
            if (game.endgame) break;
            const previousRoom = game.currentRoom;
            const decision = selectCommand(strategy.id, target.id);
            const command = decision?.command || "";
            if (!command) break;
            const beforeLength = getOutputLines().length;
            const beforeSnapshot = exploratoryStateSnapshot(target.id);
            commands.push(command);
            game.execute(command);
            const lines = outputDelta(beforeLength);
            const afterSnapshot = exploratoryStateSnapshot(target.id);
            const reward = exploratoryRewardForTransition(beforeSnapshot, afterSnapshot, lines, state.simulationHistory, command);
            const unlockReward = exploratoryUnlockDelta(beforeSnapshot, afterSnapshot);
            rewardSetupAssist(state.simulationHistory, beforeSnapshot, afterSnapshot, reward, unlockReward);
            rememberExploratoryOutcome({
              before: beforeSnapshot,
              after: afterSnapshot,
              command,
              reward,
              unlockReward,
              lines,
            });
            recordSceneEvents({
              beforeSnapshot,
              command,
              tracker: sceneTracker,
            });
            transcript.push({
              command,
              lines,
              decisionKind: decision?.kind || "optimal",
              beforeRoom: beforeSnapshot.room,
              afterRoom: afterSnapshot.room,
              beforeStateKey: beforeSnapshot.stateKey,
              afterStateKey: afterSnapshot.stateKey,
            });
            recordHistoryStep(state.simulationHistory, command, previousRoom, game.currentRoom, beforeSnapshot.stateKey);
            recordTransitionSample(state.simulationHistory, { stateKey: beforeSnapshot.stateKey, command, reward, unlockReward });
            matched = target.matches(scenarioContext());
            if (matched) break;
          }
        }
        state.simulationHistory = null;

        const finalLines = getOutputLines();
        const outcome = matched
          ? { code: target.id, label: target.label, tone: target.id.startsWith("death") ? "danger" : "success" }
          : classifyFailure(commands.length, stepLimit);

        return {
          id: "",
          presetId,
          presetLabel: preset.label,
          presetDescription: preset.description,
          targetId,
          targetLabel: target.label,
          strategyId: strategy.id,
          strategyLabel: strategy.label,
          seed,
          commands,
          transcript,
          setupOutput,
          finalOutput: finalLines,
          room: game.currentRoom,
          roomLabel: roomLabel(game.currentRoom),
          endgame: Boolean(game.endgame),
          dragonDefeated: Boolean(game.flags?.dragondefeated),
          ringRecovered: Boolean(game.bilboHasRecoveredRing?.()),
          strength: Number(game.player?.strength || 0),
          outcome,
          finalFlagsSubset: captureFinalFlagsSubset(),
          visitedRooms: captureVisitedRooms(),
          sceneEvents: [...sceneTracker.events],
          inventory: [...(game.player?.inventory || []), ...(game.player?.worn || [])]
            .map((itemId) => game.items?.[itemId]?.name || itemId),
        };
      } finally {
        state.simulationHistory = null;
        state.activeExplorationRoute = null;
      }
    });
  }

  async function collectRunsForSeeds({
    presetId,
    targetId,
    strategyId,
    seedStart,
    seedCount,
    stepLimit,
  }) {
    const runs = [];
    for (let offset = 0; offset < seedCount; offset += 1) {
      const seed = seedStart + offset;
      runs.push(simulateRun({ presetId, targetId, strategyId, seed, stepLimit }));
      if ((offset + 1) % 4 === 0) await wait(0);
    }
    runs.forEach((run) => {
      run.id = runSignature(run);
    });
    return runs;
  }

  function chooseCanonicalSuccessRun(runs = []) {
    const successRuns = runs.filter((run) => run.outcome?.tone === "success");
    if (!successRuns.length) return null;
    return [...successRuns].sort(compareCanonicalRuns)[0];
  }

  function failureBranchCandidates(baselineCommand = "") {
    const commands = [];
    const fatalDecision = fatalTriggerDecision();
    if (fatalDecision?.command) commands.push(fatalDecision.command);
    for (const entry of strategyCandidates("failure")) {
      if (entry?.kind === "failure" && entry.command) commands.push(entry.command);
    }
    return [...new Set(commands.map((command) => String(command || "").trim()).filter((command) => command && command !== baselineCommand))];
  }

  function replayPrefix(prefixCommands = [], targetId = "", transcript = [], commands = []) {
    for (const command of prefixCommands) {
      if (game.endgame) return false;
      const beforeLength = getOutputLines().length;
      commands.push(command);
      game.execute(command);
      const lines = outputDelta(beforeLength);
      transcript.push({ command, lines, decisionKind: "spine_prefix" });
    }
    return true;
  }

  function spineDivergenceStateKey(spineRun = null, divergenceStepIndex = 0) {
    const entry = spineRun?.transcript?.[divergenceStepIndex];
    return String(entry?.beforeStateKey || "").trim();
  }

  function spineDivergenceRoom(spineRun = null, divergenceStepIndex = 0) {
    const entry = spineRun?.transcript?.[divergenceStepIndex];
    return String(entry?.beforeRoom || "").trim();
  }

  function spineDivergenceContextMatches(spineRun = null, divergenceStepIndex = 0, targetId = "") {
    if (!spineRun) return false;
    const expectedStateKey = spineDivergenceStateKey(spineRun, divergenceStepIndex);
    if (expectedStateKey) {
      return exploratoryStateKey(targetId) === expectedStateKey;
    }
    const expectedRoom = spineDivergenceRoom(spineRun, divergenceStepIndex);
    return expectedRoom ? game.currentRoom === expectedRoom : true;
  }

  function simulateSpineOffshootRun({
    presetId,
    targetId,
    seed,
    stepLimit,
    spineRun,
    divergenceStepIndex,
    branchCommand,
  }) {
    const preset = presetById[presetId];
    const target = targetById[targetId];
    const prefixCommands = spineRun.commands.slice(0, divergenceStepIndex);
    const totalStepLimit = Math.max(stepLimit, prefixCommands.length + 12);
    return withSeededRandom(seed, () => {
      const { setupOutput } = resetToPreset(preset);
      const commands = [];
      const transcript = [];
      const sceneTracker = createSceneEventTracker();

      if (!replayPrefix(prefixCommands, targetId, transcript, commands)) return null;
      if (game.endgame) return null;
      if (!spineDivergenceContextMatches(spineRun, divergenceStepIndex, targetId)) return null;

      const beforeBranchLength = getOutputLines().length;
      const beforeBranchSnapshot = { room: game.currentRoom };
      commands.push(branchCommand);
      game.execute(branchCommand);
      recordSceneEvents({
        beforeSnapshot: beforeBranchSnapshot,
        command: branchCommand,
        tracker: sceneTracker,
      });
      transcript.push({
        command: branchCommand,
        lines: outputDelta(beforeBranchLength),
        decisionKind: "fatal_branch_start",
      });

      let matched = target.matches(scenarioContext());
      while (!matched && !game.endgame && commands.length < totalStepLimit) {
        const decision = selectCommand("failure", target.id);
        const nextCommand = decision?.command || "";
        if (!nextCommand) break;
        const beforeLength = getOutputLines().length;
        commands.push(nextCommand);
        const beforeSnapshot = { room: game.currentRoom };
        game.execute(nextCommand);
        recordSceneEvents({
          beforeSnapshot,
          command: nextCommand,
          tracker: sceneTracker,
        });
        transcript.push({
          command: nextCommand,
          lines: outputDelta(beforeLength),
          decisionKind: decision?.kind || "failure_followup",
        });
        matched = target.matches(scenarioContext());
      }

      const outcome = matched
        ? { code: target.id, label: target.label, tone: target.id.startsWith("death") ? "danger" : "success" }
        : classifyFailure(commands.length, totalStepLimit);

      if (outcome.tone !== "danger") return null;

      const run = {
        id: "",
        presetId,
        presetLabel: preset.label,
        presetDescription: preset.description,
        targetId,
        targetLabel: target.label,
        strategyId: "spine_offshoot",
        strategyLabel: "Solution spine offshoot",
        seed,
        commands,
        transcript,
        setupOutput,
        finalOutput: getOutputLines(),
        room: game.currentRoom,
        roomLabel: roomLabel(game.currentRoom),
        endgame: Boolean(game.endgame),
        dragonDefeated: Boolean(game.flags?.dragondefeated),
        ringRecovered: Boolean(game.bilboHasRecoveredRing?.()),
        strength: Number(game.player?.strength || 0),
        outcome,
        finalFlagsSubset: captureFinalFlagsSubset(),
        visitedRooms: captureVisitedRooms(),
        sceneEvents: [...sceneTracker.events],
        inventory: [...(game.player?.inventory || []), ...(game.player?.worn || [])]
          .map((itemId) => game.items?.[itemId]?.name || itemId),
        divergenceStepIndex,
        divergenceStepNumber: divergenceStepIndex + 1,
        baselineCommand: spineRun.commands[divergenceStepIndex] || "",
        branchCommand,
        prefixLength: prefixCommands.length,
        stepsFromDivergence: Math.max(1, commands.length - prefixCommands.length),
        previewTail: commands.slice(Math.max(prefixCommands.length, commands.length - 3)),
      };
      run.id = [
        runSignature({
          presetId: run.presetId,
          targetId: run.targetId,
          strategyId: run.strategyId,
          seed: run.seed,
          outcome: run.outcome,
          commands: run.commands,
        }),
        `step-${run.divergenceStepNumber}`,
        run.branchCommand,
      ].join("::");
      return run;
    });
  }

  async function collectFatalBranchesFromSpine({
    presetId,
    targetId,
    stepLimit,
    spineRun,
  }) {
    const branches = [];
    const seen = new Set();

    for (let divergenceStepIndex = 0; divergenceStepIndex < spineRun.commands.length; divergenceStepIndex += 1) {
      const candidates = withSeededRandom(spineRun.seed, () => {
        resetToPreset(presetById[presetId]);
        const prefixCommands = spineRun.commands.slice(0, divergenceStepIndex);
        if (!replayPrefix(prefixCommands, targetId, [], [])) return [];
        if (game.endgame) return [];
        if (!spineDivergenceContextMatches(spineRun, divergenceStepIndex, targetId)) return [];
        return failureBranchCandidates(spineRun.commands[divergenceStepIndex]);
      });

      for (const branchCommand of candidates) {
        const branch = simulateSpineOffshootRun({
          presetId,
          targetId,
          seed: spineRun.seed,
          stepLimit,
          spineRun,
          divergenceStepIndex,
          branchCommand,
        });
        if (!branch) continue;
        const signature = `${branch.divergenceStepIndex}::${branch.branchCommand}::${branch.outcome.code}::${branch.commands.join("->")}`;
        if (seen.has(signature)) continue;
        seen.add(signature);
        branches.push(branch);
      }

      if ((divergenceStepIndex + 1) % 3 === 0) await wait(0);
    }

    return branches;
  }

  function buildSolutionSpineSteps(spineRun, branches = []) {
    return spineRun.commands.map((command, index) => ({
      id: `spine-step-${index + 1}`,
      stepIndex: index,
      stepNumber: index + 1,
      command,
      branches: branches
        .filter((branch) => branch.divergenceStepIndex === index)
        .sort((left, right) => (left.stepsFromDivergence - right.stepsFromDivergence) || left.outcome.label.localeCompare(right.outcome.label, "it")),
    }));
  }

  async function generateSolutionSpineReport({
    presetId,
    targetId,
    seedStart,
    seedCount,
    stepLimit,
  }) {
    const preset = presetById[presetId];
    const target = targetById[targetId];
    let canonicalRuns = [];
    let sourceStrategyId = "optimal";

    const optimalRuns = await collectRunsForSeeds({
      presetId,
      targetId,
      strategyId: "optimal",
      seedStart,
      seedCount,
      stepLimit,
    });
    canonicalRuns = optimalRuns;

    let spineRun = chooseCanonicalSuccessRun(optimalRuns);
    if (!spineRun) {
      sourceStrategyId = "alternative";
      const alternativeRuns = await collectRunsForSeeds({
        presetId,
        targetId,
        strategyId: "alternative",
        seedStart,
        seedCount,
        stepLimit,
      });
      canonicalRuns = alternativeRuns;
      spineRun = chooseCanonicalSuccessRun(alternativeRuns);
    }

    if (!spineRun) {
      return {
        presetId,
        presetLabel: preset.label,
        targetId,
        targetLabel: target.label,
        seedStart,
        seedCount,
        stepLimit,
        sourceStrategyId,
        sourceStrategyLabel: strategyById[sourceStrategyId]?.label || sourceStrategyId,
        spineRun: null,
        steps: [],
        branchRuns: [],
        sourceRuns: canonicalRuns,
      };
    }

    const branchRuns = await collectFatalBranchesFromSpine({
      presetId,
      targetId,
      stepLimit,
      spineRun,
    });

    return {
      presetId,
      presetLabel: preset.label,
      targetId,
      targetLabel: target.label,
      seedStart,
      seedCount,
      stepLimit,
      sourceStrategyId: spineRun.strategyId,
      sourceStrategyLabel: spineRun.strategyLabel,
      spineRun,
      steps: buildSolutionSpineSteps(spineRun, branchRuns),
      branchRuns,
      sourceRuns: canonicalRuns,
    };
  }

  function winningPathMarkers(run = null) {
    if (!run) return [];
    const markers = [];
    const pushMarker = (value) => {
      const marker = String(value || "").trim();
      if (!marker || markers.includes(marker)) return;
      markers.push(marker);
    };

    for (const event of run.sceneEvents || []) pushMarker(event);

    const flags = run.finalFlagsSubset || {};
    if (flags.trollkeytaken) pushMarker("trolls:key_taken");
    if (flags.mirkwooddrankstream) pushMarker("mirkwood:drink_stream");
    if (flags.mirkwoodfolloweddeer) pushMarker("mirkwood:follow_deer");
    if (flags.mirkwoodfollowedlights) pushMarker("mirkwood:follow_lights");
    if (flags.mirkwooddwarvesfreed) pushMarker("mirkwood:free_dwarves");
    if (flags.barrelthrown) pushMarker("cellar:barrel_throw");
    if (flags.bardreadiedarrow) pushMarker("bard:arrow_ready");

    const beornApproach = inferBeornApproachFromVisitedRooms(run.visitedRooms || []);
    if (beornApproach) pushMarker(`beorn:${beornApproach}`);

    return markers;
  }

  function winningPathKey(run = null) {
    if (!run) return "";
    const markers = [...winningPathMarkers(run)].sort();
    const compactCommands = (run.commands || [])
      .map((command) => canonicalWinningCommand(command))
      .filter(Boolean);
    return [
      `v${WINNING_PATH_CATALOG_VERSION}`,
      run.presetId,
      run.targetId,
      markers.join("|"),
      compactCommands.join("->"),
    ].join("::");
  }

  function winningPathCoverageScore(group = null) {
    if (!group) return 0;
    return (group.runs?.length || 0) * 1000 - (group.representativeRun?.commands?.length || 0);
  }

  function chooseRepresentativeWinningRun(runs = []) {
    if (!runs.length) return null;
    return [...runs].sort(compareCanonicalRuns)[0];
  }

  function buildWinningPathLabel(group = null) {
    const markers = group?.markers || [];
    const parts = [];
    if (markers.includes("trolls:waited_for_dawn")) parts.push("Dawn trolls");
    if (markers.includes("goblin:helper_attack")) parts.push("Helper ambush");
    else if (markers.includes("goblin:bilbo_attack")) parts.push("Bilbo ambush");
    if (markers.includes("gollum:pocket_riddle")) parts.push("Pocket riddle");
    if (markers.includes("beorn:approach_great_river")) parts.push("Great River");
    else if (markers.includes("beorn:approach_treeless_opening")) parts.push("Treeless opening");
    else if (markers.includes("beorn:approach_narrow_path")) parts.push("Narrow path");
    if (markers.includes("mirkwood:follow_deer")) parts.push("Deer Mirkwood");
    else if (markers.includes("mirkwood:follow_lights")) parts.push("Lights Mirkwood");
    else if (markers.includes("mirkwood:drink_stream")) parts.push("Stream Mirkwood");
    if (markers.includes("cellar:jump_barrel")) parts.push("Barrel jump");
    else if (markers.includes("cellar:climb_barrel")) parts.push("Barrel climb");
    if (markers.includes("dragon:take_shot")) parts.push("Take shot");
    else if (markers.includes("dragon:loose_arrow")) parts.push("Loose arrow");
    else if (markers.includes("dragon:shoot")) parts.push("Shoot dragon");
    return parts.slice(0, 4).join(" / ") || `Winning path ${group?.representativeRun?.seed || ""}`.trim();
  }

  function groupWinningRuns(runs = []) {
    const grouped = new Map();
    for (const run of runs) {
      const key = winningPathKey(run);
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: `winning-path-${grouped.size + 1}`,
          key,
          runs: [],
          representativeRun: null,
          markers: [],
          label: "",
          sampleSeeds: [],
        });
      }
      grouped.get(key).runs.push(run);
    }

    const groups = [...grouped.values()].map((group) => {
      const representativeRun = chooseRepresentativeWinningRun(group.runs);
      const sampleSeeds = [...new Set(group.runs.map((run) => run.seed))].slice(0, 4);
      const markers = winningPathMarkers(representativeRun);
      return {
        ...group,
        representativeRun,
        markers,
        label: buildWinningPathLabel({ ...group, representativeRun, markers }),
        sampleSeeds,
      };
    });

    return groups.sort((left, right) => (
      winningPathCoverageScore(right) - winningPathCoverageScore(left)
      || compareCanonicalRuns(left.representativeRun, right.representativeRun)
    ));
  }

  function selectWinningGroups(groups = [], maxCount = WINNING_PATH_MAX_COUNT) {
    return groups.slice(0, Math.max(1, maxCount));
  }

  async function generateWinningPathCatalog({
    presetId,
    targetId,
    seedStart,
    seedCount,
    stepLimit,
  }) {
    const preset = presetById[presetId];
    const target = targetById[targetId];
    const strategyIds = ["optimal", "alternative"];
    const allRuns = [];

    for (const strategyId of strategyIds) {
      const runs = await collectRunsForSeeds({
        presetId,
        targetId,
        strategyId,
        seedStart,
        seedCount,
        stepLimit,
      });
      allRuns.push(...runs);
      await wait(0);
    }

    const successRuns = allRuns.filter((run) => run.outcome?.tone === "success");
    const allGroups = groupWinningRuns(successRuns);
    const groups = selectWinningGroups(allGroups);
    const winningRuns = groups.map((group) => group.representativeRun).filter(Boolean);

    return {
      version: WINNING_PATH_CATALOG_VERSION,
      presetId,
      presetLabel: preset.label,
      targetId,
      targetLabel: target.label,
      seedStart,
      seedCount,
      stepLimit,
      strategyIds,
      generatedAt: new Date().toISOString(),
      successRuns,
      totalSuccessCount: successRuns.length,
      totalGroupCount: allGroups.length,
      groups,
      winningRuns,
    };
  }

  async function generateSolutionSpineReportFromRun({
    catalog,
    spineRun,
  }) {
    if (!catalog || !spineRun) return null;
    const branchRuns = await collectFatalBranchesFromSpine({
      presetId: spineRun.presetId,
      targetId: spineRun.targetId,
      stepLimit: catalog.stepLimit,
      spineRun,
    });

    return {
      presetId: catalog.presetId,
      presetLabel: catalog.presetLabel,
      targetId: catalog.targetId,
      targetLabel: catalog.targetLabel,
      seedStart: catalog.seedStart,
      seedCount: catalog.seedCount,
      stepLimit: catalog.stepLimit,
      sourceStrategyId: spineRun.strategyId,
      sourceStrategyLabel: spineRun.strategyLabel,
      spineRun,
      steps: buildSolutionSpineSteps(spineRun, branchRuns),
      branchRuns,
      sourceRuns: catalog.successRuns,
      winningPathCount: catalog.winningRuns.length,
    };
  }

  function shouldIncludeRun(run, filter = "all") {
    if (filter === "success") return run.outcome.tone === "success";
    if (filter === "death") return run.outcome.code.startsWith("death");
    return true;
  }

  function addOutcomeCount(map, outcome) {
    map.set(outcome.code, {
      label: outcome.label,
      tone: outcome.tone,
      count: (map.get(outcome.code)?.count || 0) + 1,
    });
  }

  function buildBranchTree(runs = []) {
    const root = {
      command: "(start)",
      depth: 0,
      count: 0,
      outcomes: new Map(),
      children: new Map(),
      runs: [],
    };

    for (const run of runs) {
      root.count += 1;
      addOutcomeCount(root.outcomes, run.outcome);
      let cursor = root;
      for (const command of run.commands) {
        if (!cursor.children.has(command)) {
          cursor.children.set(command, {
            command,
            depth: cursor.depth + 1,
            count: 0,
            outcomes: new Map(),
            children: new Map(),
            runs: [],
          });
        }
        cursor = cursor.children.get(command);
        cursor.count += 1;
        addOutcomeCount(cursor.outcomes, run.outcome);
      }
      cursor.runs.push(run);
    }

    return root;
  }

  function outcomeBadges(outcomes = new Map()) {
    return [...outcomes.values()]
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "it"))
      .map((entry) => `<span class="lab-badge lab-badge--${entry.tone === "success" ? "success" : entry.tone === "danger" ? "danger" : "warning"}">${escapeHtml(entry.label)} ${entry.count}</span>`)
      .join("");
  }

  function renderTreeNode(node) {
    const children = [...node.children.values()].sort((left, right) => right.count - left.count || left.command.localeCompare(right.command, "it"));
    const childMarkup = children.map((child) => `<li>${renderTreeBranch(child)}</li>`).join("");
    const runMarkup = node.runs.map((run) => renderTreeLeaf(run)).join("");
    return `${childMarkup}${runMarkup}`;
  }

  function renderTreeBranch(node) {
    return `<details ${node.depth <= 1 ? "open" : ""}>
      <summary>
        <div class="lab-branch">
          <div class="lab-branch__head">
            <span class="lab-branch__title">${escapeHtml(node.command)}</span>
            <span class="lab-branch__meta">${node.count} run${node.count === 1 ? "" : "s"}</span>
          </div>
          <div class="lab-branch__badges">${outcomeBadges(node.outcomes)}</div>
        </div>
      </summary>
      <ul class="lab-tree-list">${renderTreeNode(node)}</ul>
    </details>`;
  }

  function renderTreeLeaf(run) {
    const preview = run.commands.length
      ? run.commands.slice(Math.max(0, run.commands.length - 3)).join(" -> ")
      : "Target già soddisfatto al punto di partenza.";
    const selectedClass = state.selectedRunId === run.id ? " is-selected" : "";
    return `<li>
      <div class="lab-leaf${selectedClass}">
        <div class="lab-leaf__top">
          <button class="lab-leaf__button" type="button" data-run-id="${escapeHtml(run.id)}">${escapeHtml(run.outcome.label)}</button>
          <span class="lab-leaf__seed">Seed ${run.seed}</span>
        </div>
        <div class="lab-branch__badges">
          <span class="lab-badge lab-badge--${run.outcome.tone === "success" ? "success" : run.outcome.tone === "danger" ? "danger" : "warning"}">${escapeHtml(run.outcome.label)}</span>
          <span class="lab-badge lab-badge--muted">${escapeHtml(run.strategyLabel)}</span>
          <span class="lab-badge lab-badge--muted">${run.commands.length} step${run.commands.length === 1 ? "" : "s"}</span>
          <span class="lab-badge lab-badge--muted">${escapeHtml(run.roomLabel)}</span>
        </div>
        <div class="lab-leaf__preview">${escapeHtml(preview)}</div>
        <button class="lab-branch__replay" type="button" data-replay-run-id="${escapeHtml(run.id)}">Replay this branch</button>
      </div>
    </li>`;
  }

  function renderTree(report) {
    if (!report?.filteredRuns?.length) {
      treeCaption.textContent = "Nessun ramo compatibile con il filtro selezionato.";
      treeBox.innerHTML = '<div class="lab-empty">Nessun ramo da mostrare.</div>';
      return;
    }
    treeCaption.textContent = `${report.filteredRuns.length} run visualizzate da ${report.runs.length} seed analizzati.`;
    treeBox.innerHTML = `<ul class="lab-tree-root">${renderTreeNode(report.tree)}</ul>`;
  }

  function findRun(runId = "") {
    return state.report?.runs?.find((run) => run.id === runId) || null;
  }

  function finalStateSummary(run) {
    return [
      `Preset: ${run.presetLabel}`,
      `Target: ${run.targetLabel}`,
      `Strategy: ${run.strategyLabel}`,
      `Final room: ${run.roomLabel}`,
      `Strength: ${run.strength}`,
      `Dragon defeated: ${run.dragonDefeated ? "yes" : "no"}`,
      `Ring recovered: ${run.ringRecovered ? "yes" : "no"}`,
      `Endgame: ${run.endgame ? "yes" : "no"}`,
      `Inventory: ${run.inventory.length ? run.inventory.join(", ") : "nothing"}`,
    ].join("\n");
  }

  function renderDetail(run) {
    if (!run) {
      detailCaption.textContent = "Seleziona un ramo foglia per vederne comandi, output e replay.";
      detailBox.innerHTML = '<div class="lab-empty">Nessun ramo selezionato.</div>';
      return;
    }
    detailCaption.textContent = `Seed ${run.seed}, ${run.commands.length} step, esito ${run.outcome.label}.`;
    const outputItems = run.transcript.length
      ? run.transcript
        .map((entry, index) => `<li><strong>${index + 1}. ${escapeHtml(entry.command)}</strong>\n${escapeHtml(entry.lines.join("\n") || "(no output)")}</li>`)
        .join("")
      : "<li>Nessun comando eseguito.</li>";
    const divergenceSection = Number.isInteger(run.divergenceStepIndex)
      ? `<div class="lab-detail__section">
        <strong>Divergence</strong>
        <div class="lab-detail__text">Lo spine segue la soluzione fino allo step <strong>${run.divergenceStepNumber}</strong>. Invece di <strong>${escapeHtml(run.baselineCommand || "(end)")}</strong>, qui il ramo esegue <strong>${escapeHtml(run.branchCommand || "")}</strong>.</div>
      </div>`
      : "";
    detailBox.innerHTML = `<div class="lab-detail__card">
      <div class="lab-detail__top">
        <strong>Seed ${run.seed}</strong>
        <div class="lab-detail__badges">
          <span class="lab-badge lab-badge--${run.outcome.tone === "success" ? "success" : run.outcome.tone === "danger" ? "danger" : "warning"}">${escapeHtml(run.outcome.label)}</span>
          <span class="lab-badge lab-badge--muted">${escapeHtml(run.strategyLabel)}</span>
          <span class="lab-badge lab-badge--muted">${run.commands.length} step${run.commands.length === 1 ? "" : "s"}</span>
        </div>
      </div>
      <div class="lab-detail__section">
        <strong>Scenario</strong>
        <div class="lab-detail__text">${escapeHtml(run.presetDescription)}</div>
      </div>
      <div class="lab-detail__section">
        <strong>Final State</strong>
        <pre class="lab-detail__text">${escapeHtml(finalStateSummary(run))}</pre>
      </div>
      ${divergenceSection}
      <div class="lab-detail__section">
        <strong>Commands</strong>
        <ol class="lab-detail__list">${commandItems}</ol>
      </div>
      <div class="lab-detail__section">
        <strong>Command Output</strong>
        <ol class="lab-detail__log">${outputItems}</ol>
      </div>
      <button class="lab-detail__replay" type="button" data-replay-run-id="${escapeHtml(run.id)}">Replay this branch</button>
    </div>`;
  }

  function renderSummary(report) {
    if (!report) {
      summaryBox.textContent = "Nessuna analisi eseguita.";
      return;
    }
    const counts = new Map();
    for (const run of report.runs) {
      counts.set(run.outcome.label, (counts.get(run.outcome.label) || 0) + 1);
    }
    summaryBox.innerHTML = [
      `<div><strong>${report.runs.length}</strong> seed analizzati da <strong>${report.seedStart}</strong> a <strong>${report.seedStart + report.seedCount - 1}</strong>.</div>`,
      `<div>Preset: <strong>${escapeHtml(report.presetLabel)}</strong></div>`,
      `<div>Target: <strong>${escapeHtml(report.targetLabel)}</strong></div>`,
      `<div>Strategy: <strong>${escapeHtml(report.strategyLabel)}</strong></div>`,
      `<div>Step limit: <strong>${report.stepLimit}</strong></div>`,
      `<div>${[...counts.entries()].map(([label, count]) => `${escapeHtml(label)}: <strong>${count}</strong>`).join(" · ")}</div>`,
    ].join("");
  }

  function renderAuditRows(rows = []) {
    if (!rows.length) {
      auditBox.textContent = "Nessun audit eseguito.";
      return;
    }
    auditBox.innerHTML = `<div><strong>Audit fatal coverage</strong></div>
      <div class="lab-audit__list">${rows.map((row) => `<div class="lab-audit__row">
        <div class="lab-audit__route">${escapeHtml(row.routeLabel)}</div>
        <div class="lab-audit__meta">${escapeHtml(row.summary)}</div>
      </div>`).join("")}</div>`;
  }

  function setOverlayVisibility(overlay, visible) {
    if (!overlay) return;
    overlay.hidden = !visible;
    overlay.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  function syncOverlayBackdrop() {
    const anyOpen = state.activeOverlay === "audit" || state.activeOverlay === "death" || state.activeOverlay === "spine";
    if (overlayBackdrop) overlayBackdrop.hidden = !anyOpen;
  }

  function openOverlay(kind = "") {
    state.activeOverlay = kind;
    setOverlayVisibility(auditPanel, kind === "audit");
    setOverlayVisibility(deathPanel, kind === "death");
    setOverlayVisibility(spinePanel, kind === "spine");
    syncOverlayBackdrop();
  }

  function closeOverlay() {
    state.activeOverlay = "";
    setOverlayVisibility(auditPanel, false);
    setOverlayVisibility(deathPanel, false);
    setOverlayVisibility(spinePanel, false);
    syncOverlayBackdrop();
  }

  function findCatalogEntry(entryId = "") {
    return deathCatalogEntries.find((entry) => entry.id === entryId) || null;
  }

  function renderDeathCatalog() {
    if (!deathCatalogBox) return;
    deathCatalogBox.innerHTML = deathCatalogEntries.map((entry) => {
      const preset = presetById[entry.presetId];
      const target = targetById[entry.targetId];
      return `<div class="lab-death-card">
        <div class="lab-death-card__top">
          <span class="lab-death-card__title">${escapeHtml(entry.label)}</span>
          <span class="lab-badge lab-badge--danger">${escapeHtml(targetById[entry.outcomeCode]?.label || "Death")}</span>
        </div>
        <div class="lab-death-card__copy">${escapeHtml(entry.description)}</div>
        <div class="lab-death-card__trigger">${escapeHtml(entry.trigger)}</div>
        <div class="lab-death-card__meta">Route: ${escapeHtml(preset?.label || entry.presetId)} -> ${escapeHtml(target?.label || entry.targetId)} | Strategia: Failure probes</div>
        <button class="lab-death-card__button" type="button" data-death-catalog-id="${escapeHtml(entry.id)}">Replay death branch</button>
      </div>`;
    }).join("");
  }

  function findSpineRun(runId = "") {
    if (!runId) return null;
    if (state.spineReport?.spineRun?.id === runId) return state.spineReport.spineRun;
    return state.spineReport?.branchRuns?.find((run) => run.id === runId) || null;
  }

  function buildSpineStepPreview(stepIndex = 0) {
    const report = state.spineReport;
    const spineRun = report?.spineRun;
    if (!report || !spineRun) return null;
    const clampedStepIndex = Math.max(0, Math.min(Number(stepIndex) || 0, spineRun.commands.length));

    if (clampedStepIndex >= spineRun.commands.length) {
      return {
        ...spineRun,
        commands: [...spineRun.commands],
        transcript: [...spineRun.transcript],
      };
    }

    return withSeededRandom(spineRun.seed, () => {
      resetToPreset(presetById[spineRun.presetId]);
      const commands = [];
      const transcript = [];
      for (let index = 0; index <= clampedStepIndex; index += 1) {
        const command = spineRun.commands[index];
        if (!command || game.endgame) break;
        const beforeLength = getOutputLines().length;
        commands.push(command);
        game.execute(command);
        transcript.push({
          command,
          lines: outputDelta(beforeLength),
          decisionKind: spineRun.transcript[index]?.decisionKind || "spine_preview",
        });
      }

      return {
        ...spineRun,
        id: `${spineRun.id}::preview-step-${clampedStepIndex + 1}`,
        commands,
        transcript,
        finalOutput: getOutputLines(),
        room: game.currentRoom,
        roomLabel: roomLabel(game.currentRoom),
        endgame: Boolean(game.endgame),
        dragonDefeated: Boolean(game.flags?.dragondefeated),
        ringRecovered: Boolean(game.bilboHasRecoveredRing?.()),
        strength: Number(game.player?.strength || 0),
        outcome: {
          code: `spine_step_${clampedStepIndex + 1}`,
          label: `Winning path step ${clampedStepIndex + 1}`,
          tone: "success",
        },
      };
    });
  }

  function setSpineReplayState(caption = "", log = "") {
    state.spineReplayCaption = caption || "Seleziona un ramo o uno step, poi avvia il replay qui dentro.";
    state.spineReplayLog = log || "Nessun replay eseguito nella solution spine.";
  }

  function updateSpineReplayDom() {
    const caption = spineBox?.querySelector?.("#lab-spine-replay-caption");
    const log = spineBox?.querySelector?.("#lab-spine-replay-log");
    if (caption) caption.textContent = state.spineReplayCaption;
    if (log) log.textContent = state.spineReplayLog;
  }

  function spineDetailHtml() {
    const run = state.spineSelectedPreviewRun;
    if (!run) {
      return `<div class="lab-spine__panel">
        <div class="lab-spine__panel-head">
          <strong>Selection Detail</strong>
        </div>
        <div class="lab-empty">Seleziona un nodo del tronco o un ramo rosso.</div>
      </div>`;
    }

    const outputItems = run.transcript.length
      ? run.transcript
        .map((entry, index) => `<li><strong>${index + 1}. ${escapeHtml(entry.command)}</strong>\n${escapeHtml(entry.lines.join("\n") || "(no output)")}</li>`)
        .join("")
      : "<li>Nessun comando eseguito.</li>";
    return `<div class="lab-spine__panel lab-spine__panel--detail">
      <div class="lab-spine__panel-head">
        <strong>Selection Detail</strong>
        <span class="lab-badge lab-badge--${run.outcome.tone === "success" ? "success" : run.outcome.tone === "danger" ? "danger" : "warning"}">${escapeHtml(run.outcome.label)}</span>
      </div>
      <div class="lab-detail__card">
        <div class="lab-detail__top">
          <div class="lab-detail__badges">
            <span class="lab-badge lab-badge--muted">${escapeHtml(run.strategyLabel)}</span>
            <span class="lab-badge lab-badge--muted">${run.commands.length} step${run.commands.length === 1 ? "" : "s"}</span>
          </div>
        </div>
        <details class="lab-detail__section lab-detail__disclosure">
          <summary class="lab-detail__summary">
            <span class="lab-detail__toggle" aria-hidden="true">+</span>
            <strong>Final State</strong>
          </summary>
          <pre class="lab-detail__text">${escapeHtml(finalStateSummary(run))}</pre>
        </details>
        <div class="lab-detail__section">
          <strong>Command Output</strong>
          <ol class="lab-detail__log">${outputItems}</ol>
        </div>
      </div>
    </div>`;
  }

  function spineSelectionSummaryHtml() {
    const selected = state.spineSelectedPreviewRun;
    const report = state.spineReport;
    if (!report?.spineRun || !selected) {
      return '<div class="lab-spine__selection">Seleziona un nodo del tronco o un ramo rosso per vedere qui il punto corrente.</div>';
    }

    if (Number.isInteger(selected.divergenceStepIndex)) {
      return `<div class="lab-spine__selection">
        <div><strong>Selected death branch</strong> · ${escapeHtml(selected.outcome.label)}</div>
        <div>Step di divergenza: <strong>${selected.divergenceStepNumber}</strong> · Invece di <strong>${escapeHtml(selected.baselineCommand || "(end)")}</strong>, il ramo esegue <strong>${escapeHtml(selected.branchCommand || "")}</strong>.</div>
        <div>Morte dopo <strong>${selected.stepsFromDivergence}</strong> step · Stanza finale <strong>${escapeHtml(selected.roomLabel)}</strong>.</div>
      </div>`;
    }

    const selectedStep = Number.isInteger(state.spineSelectedStepIndex) && state.spineSelectedStepIndex >= 0
      ? state.spineSelectedStepIndex
      : Math.max(0, (selected.commands?.length || 1) - 1);
    const reachedTarget = selectedStep >= report.spineRun.commands.length;
    return `<div class="lab-spine__selection">
      <div><strong>Selected trunk step</strong> · ${reachedTarget ? escapeHtml(report.targetLabel) : `Step ${selectedStep + 1}`}</div>
      <div>${reachedTarget ? "La traiettoria vincente e` completa." : `Comando: <strong>${escapeHtml(report.spineRun.commands[selectedStep] || "")}</strong>`}</div>
      <div>Preview fino a <strong>${selected.commands.length}</strong> step · Stanza corrente <strong>${escapeHtml(selected.roomLabel)}</strong>.</div>
    </div>`;
  }

  function winningCatalogPanelHtml() {
    const catalog = state.spineCatalog;
    const refreshButton = `<button class="lab-spine__button" type="button" data-spine-refresh="1">Refresh paths</button>`;

    if (!catalog) {
      return `<div class="lab-spine__panel">
        <div class="lab-spine__panel-head">
          <strong>Winning Paths</strong>
          ${refreshButton}
        </div>
        <div class="lab-spine__panel-copy">${state.spineCatalogLoading ? "Scansione automatica in corso dei percorsi vincenti." : "Apri la solution spine per cercare automaticamente piu traiettorie vincenti."}</div>
      </div>`;
    }

    const activeGroup = currentWinningGroup();
    const cardsHtml = catalog.groups.length
      ? catalog.groups.map((group) => {
        const run = group.representativeRun;
        const selectedClass = state.spineSelectedWinningRunId === run?.id ? " is-selected" : "";
        const loadingBadge = state.spineLoadingRunId === run?.id
          ? '<span class="lab-badge lab-badge--warning">Loading spine</span>'
          : "";
        const markerBadges = group.markers.slice(0, 4)
          .map((marker) => `<span class="lab-badge lab-badge--muted">${escapeHtml(marker.replace(/^[^:]+:/, ""))}</span>`)
          .join("");
        return `<div class="lab-winning-card${selectedClass}">
          <div class="lab-winning-card__top">
            <button class="lab-winning-card__button" type="button" data-spine-winning-run-id="${escapeHtml(run?.id || "")}">${escapeHtml(group.label)}</button>
            <span class="lab-winning-card__count">${group.runs.length} run${group.runs.length === 1 ? "" : "s"}</span>
          </div>
          <div class="lab-winning-card__meta">Seed ${run?.seed} · ${run?.commands?.length || 0} step · sample ${escapeHtml(group.sampleSeeds.join(", "))}</div>
          <div class="lab-winning-card__badges">${loadingBadge}${markerBadges}</div>
        </div>`;
      }).join("")
      : '<div class="lab-empty">Nessun winning path trovato per la selezione corrente.</div>';

    return `<div class="lab-spine__panel">
      <div class="lab-spine__panel-head">
        <strong>Winning Paths</strong>
        <div class="lab-spine__actions">${refreshButton}</div>
      </div>
      <div class="lab-spine__panel-copy">Trovati <strong>${catalog.winningRuns.length}</strong> winning path rappresentativi su <strong>${catalog.totalSuccessCount}</strong> successi. ${activeGroup ? `Spine attiva: <strong>${escapeHtml(activeGroup.label)}</strong>.` : ""}</div>
      <div class="lab-winning-catalog">${cardsHtml}</div>
    </div>`;
  }

  function renderSolutionSpine(report = null) {
    if (!spineBox) return;
    if (!state.spineCatalog && !state.spineCatalogLoading) {
      spineBox.innerHTML = `<div class="lab-spine-shell">${winningCatalogPanelHtml()}<div class="lab-empty">Nessuna solution spine generata.</div></div>`;
      return;
    }
    if (!report) {
      const body = state.spineCatalogLoading
        ? '<div class="lab-empty">Sto cercando i percorsi vincenti e preparando la solution spine...</div>'
        : state.spineLoadingRunId
          ? '<div class="lab-empty">Sto costruendo la solution spine del winning path selezionato...</div>'
        : state.spineCatalog?.winningRuns?.length
          ? '<div class="lab-empty">Seleziona un winning path per vederne qui la solution spine.</div>'
          : `<div class="lab-empty">Nessuna run vincente trovata per ${escapeHtml(state.spineCatalog?.presetLabel || "")}${state.spineCatalog ? ` -> ${escapeHtml(state.spineCatalog.targetLabel)}` : ""} nell'intervallo di seed corrente.</div>`;
      spineBox.innerHTML = `<div class="lab-spine-shell">${winningCatalogPanelHtml()}${body}</div>`;
      return;
    }
    if (!report.spineRun) {
      spineBox.innerHTML = `<div class="lab-spine-shell">${winningCatalogPanelHtml()}<div class="lab-empty">Nessuna solution spine disponibile per il winning path selezionato.</div></div>`;
      return;
    }

    const branchedSteps = report.steps.filter((step) => step.branches.length).length;
    const summaryHtml = `<div class="lab-spine__summary">
      <div class="lab-spine__summary-top">
        <div><strong>Winning path</strong> · ${escapeHtml(report.presetLabel)} -> ${escapeHtml(report.targetLabel)}</div>
        <div class="lab-spine__meta">Seed <strong>${report.spineRun.seed}</strong> · Strategia <strong>${escapeHtml(report.sourceStrategyLabel)}</strong> · Step <strong>${report.spineRun.commands.length}</strong> · Diramazioni fatali <strong>${report.branchRuns.length}</strong> su <strong>${branchedSteps}</strong> step.</div>
      </div>
      <div class="lab-spine__actions">
        <button class="lab-spine__button" type="button" data-spine-open-run-id="${escapeHtml(report.spineRun.id)}">View winning detail</button>
      </div>
    </div>`;

    const stepsHtml = report.steps.length
      ? report.steps.map((step) => {
        const branchDivergenceIndex = Number.isInteger(state.spineSelectedPreviewRun?.divergenceStepIndex)
          ? state.spineSelectedPreviewRun.divergenceStepIndex
          : null;
        const isSharedPath = branchDivergenceIndex !== null && step.stepIndex < branchDivergenceIndex;
        const isDivergencePoint = branchDivergenceIndex !== null && step.stepIndex === branchDivergenceIndex;
        const stepSelected = state.spineSelectedRunId === report.spineRun.id && state.spineSelectedStepIndex === step.stepIndex
          ? " is-selected"
          : "";
        const pathStateClass = isDivergencePoint
          ? " is-divergence"
          : isSharedPath
            ? " is-shared-path"
            : "";
        const branchesHtml = step.branches.length
          ? `<div class="lab-spine-node__branches">${step.branches.map((branch) => {
            const selected = state.spineSelectedRunId === branch.id ? " is-selected" : "";
            return `<div class="lab-spine-branch${selected}">
              <div class="lab-spine-branch__head">
                <button class="lab-spine-branch__label" type="button" data-spine-open-run-id="${escapeHtml(branch.id)}">${escapeHtml(branch.outcome.label)}</button>
                <span class="lab-badge lab-badge--danger">+${branch.stepsFromDivergence}</span>
              </div>
              <div class="lab-spine-branch__meta">instead of <strong>${escapeHtml(branch.baselineCommand || "(end)")}</strong>: <strong>${escapeHtml(branch.branchCommand)}</strong></div>
            </div>`;
          }).join("")}</div>`
          : "";
        const nodeClass = step.branches.length ? "lab-spine-node has-branches" : "lab-spine-node";

        return `<div class="${nodeClass}${pathStateClass}">
          <div class="lab-spine-node__main${pathStateClass}">
            <button class="lab-spine-node__button${stepSelected}${pathStateClass}" type="button" aria-label="Open winning path detail" data-spine-step-index="${step.stepIndex}"></button>
            <button class="lab-spine-node__command${pathStateClass}" type="button" data-spine-step-index="${step.stepIndex}">${escapeHtml(step.command)}</button>
            <span class="lab-spine-node__index">${step.stepNumber}</span>
          </div>
          ${branchesHtml}
        </div>`;
      }).join("")
      : '<div class="lab-spine-empty">La run vincente era gia soddisfatta al preset iniziale.</div>';

    const terminalHtml = report.spineRun.commands.length
      ? (() => {
        const terminalSelected = state.spineSelectedRunId === report.spineRun.id
          && state.spineSelectedStepIndex === report.spineRun.commands.length
          ? " is-selected"
          : "";
        return `<div class="lab-spine-terminal">
          <div class="lab-spine-terminal__main">
            <button class="lab-spine-terminal__button${terminalSelected}" type="button" aria-label="Open winning path detail" data-spine-step-index="${report.spineRun.commands.length}"></button>
            <button class="lab-spine-terminal__label" type="button" data-spine-step-index="${report.spineRun.commands.length}">${escapeHtml(report.targetLabel)}</button>
            <span class="lab-badge lab-badge--success">Reached</span>
          </div>
        </div>`;
      })()
      : "";

    spineBox.innerHTML = `<div class="lab-spine-shell">
      ${winningCatalogPanelHtml()}
      <div class="lab-spine-workbench">
        <div class="lab-spine-pane">
          ${summaryHtml}
          <div class="lab-spine-tree">${stepsHtml}${terminalHtml}</div>
        </div>
        <div class="lab-spine-inspector">
          ${spineSelectionSummaryHtml()}
        </div>
      </div>
      <div class="lab-spine-detail-row">
        ${spineDetailHtml()}
      </div>
    </div>`;
  }

  async function generateReport({
    presetId,
    targetId,
    strategyId,
    outcomeFilter,
    seedStart,
    seedCount,
    stepLimit,
  }) {
    const preset = presetById[presetId];
    const target = targetById[targetId];
    const strategy = strategyById[strategyId] || strategyById.optimal;
    const runs = await collectRunsForSeeds({
      presetId,
      targetId,
      strategyId: strategy.id,
      seedStart,
      seedCount,
      stepLimit,
    });
    const filteredRuns = runs.filter((run) => shouldIncludeRun(run, outcomeFilter));
    return {
      presetId,
      presetLabel: preset.label,
      targetId,
      targetLabel: target.label,
      strategyId: strategy.id,
      strategyLabel: strategy.label,
      outcomeFilter,
      seedStart,
      seedCount,
      stepLimit,
      runs,
      filteredRuns,
      tree: buildBranchTree(filteredRuns),
    };
  }

  function applyReport(report) {
    state.report = report;
    state.selectedRunId = report.filteredRuns[0]?.id || "";
    renderSummary(state.report);
    renderTree(state.report);
    renderDetail(findRun(state.selectedRunId));
  }

  function currentWinningCatalogInputs() {
    const { seedStart, seedCount, stepLimit } = currentAnalysisInputs();
    return {
      presetId: startPresetSelect.value,
      targetId: targetSelect.value,
      seedStart,
      seedCount,
      stepLimit,
    };
  }

  function winningCatalogMatchesSelection(catalog = null) {
    if (!catalog) return false;
    const current = currentWinningCatalogInputs();
    return catalog.presetId === current.presetId
      && catalog.targetId === current.targetId
      && catalog.seedStart === current.seedStart
      && catalog.seedCount === current.seedCount
      && catalog.stepLimit === current.stepLimit;
  }

  function findWinningRun(runId = "") {
    if (!runId) return null;
    return state.spineCatalog?.winningRuns?.find((run) => run.id === runId) || null;
  }

  function currentWinningGroup() {
    const selectedId = state.spineSelectedWinningRunId;
    if (!selectedId) return null;
    return state.spineCatalog?.groups?.find((group) => group.representativeRun?.id === selectedId) || null;
  }

  async function ensureSolutionSpineForWinningRun(runId = "", token = state.spineToken) {
    const winningRun = findWinningRun(runId);
    if (!winningRun || token !== state.spineToken) return null;

    state.spineSelectedWinningRunId = runId;
    const cached = state.spineReportsByWinningRunId[runId];
    if (cached) {
      state.spineLoadingRunId = "";
      state.spineReport = cached;
      state.spineSelectedRunId = cached.spineRun?.id || "";
      state.spineSelectedStepIndex = cached.spineRun?.commands?.length ? 0 : -1;
      state.spineSelectedPreviewRun = cached.spineRun ? (buildSpineStepPreview(0) || cached.spineRun) : null;
      setSpineReplayState();
      renderSolutionSpine(cached);
      return cached;
    }

    state.spineLoadingRunId = runId;
    state.spineReport = null;
    state.spineSelectedRunId = "";
    state.spineSelectedStepIndex = -1;
    state.spineSelectedPreviewRun = null;
    setSpineReplayState("Costruisco la solution spine del winning path selezionato...", "Preparing replay...");
    renderSolutionSpine(null);

    const report = await generateSolutionSpineReportFromRun({
      catalog: state.spineCatalog,
      spineRun: winningRun,
    });
    if (token !== state.spineToken || !report) return null;

    state.spineReportsByWinningRunId[runId] = report;
    state.spineLoadingRunId = "";
    state.spineReport = report;
    state.spineSelectedRunId = report.spineRun?.id || "";
    state.spineSelectedStepIndex = report.spineRun?.commands?.length ? 0 : -1;
    state.spineSelectedPreviewRun = report.spineRun ? (buildSpineStepPreview(0) || report.spineRun) : null;
    setSpineReplayState();
    renderSolutionSpine(report);
    return report;
  }

  async function refreshWinningPathCatalog({
    silent = false,
    openPanel = false,
  } = {}) {
    if (silent && !state.spineCatalogLoading && winningCatalogMatchesSelection(state.spineCatalog)) {
      return state.spineCatalog;
    }
    const inputs = currentWinningCatalogInputs();
    const preset = presetById[inputs.presetId];
    const target = targetById[inputs.targetId];

    state.spineToken += 1;
    const token = state.spineToken;
    state.spineCatalogLoading = true;
    state.spineLoadingRunId = "";
    state.spineCatalog = null;
    state.spineReportsByWinningRunId = {};
    state.spineReport = null;
    state.spineSelectedWinningRunId = "";
    state.spineSelectedRunId = "";
    state.spineSelectedStepIndex = -1;
    state.spineSelectedPreviewRun = null;
    setSpineReplayState();
    if (openPanel) openOverlay("spine");
    renderSolutionSpine(null);
    if (!silent) {
      statusBox.textContent = `Cerco winning paths da "${preset.label}" a "${target.label}" sui seed ${inputs.seedStart}-${inputs.seedStart + inputs.seedCount - 1}...`;
    }
    try {
      const catalog = await generateWinningPathCatalog(inputs);
      if (token !== state.spineToken) return null;

      state.spineCatalogLoading = false;
      state.spineCatalog = catalog;
      state.spineSelectedWinningRunId = catalog.winningRuns[0]?.id || "";
      renderSolutionSpine(null);

      if (!catalog.winningRuns.length) {
        if (!silent) statusBox.textContent = `Nessun winning path trovato per "${preset.label}" -> "${target.label}" nell'intervallo di seed corrente.`;
        return catalog;
      }

      const report = await ensureSolutionSpineForWinningRun(state.spineSelectedWinningRunId, token);
      if (token !== state.spineToken) return null;

      const activeGroup = currentWinningGroup();
      if (!silent && report?.spineRun) {
        statusBox.textContent = activeGroup
          ? `Winning paths pronti: ${catalog.winningRuns.length} candidati distinti trovati. Spine attiva: "${activeGroup.label}".`
          : `Winning paths pronti: ${catalog.winningRuns.length} candidati distinti trovati.`;
      }
      return catalog;
    } catch (error) {
      if (token === state.spineToken) {
        state.spineCatalogLoading = false;
        state.spineLoadingRunId = "";
        renderSolutionSpine(null);
      }
      throw error;
    }
  }

  function scheduleWinningPathWarmup() {
    if (state.continuousSession?.running) return;
    if (state.spineWarmupTimer) window.clearTimeout(state.spineWarmupTimer);
    state.spineWarmupTimer = window.setTimeout(() => {
      refreshWinningPathCatalog({ silent: true, openPanel: false }).catch(() => {});
    }, WINNING_PATH_WARMUP_DELAY_MS);
  }

  function syncContinuousButtons() {
    const running = Boolean(state.continuousSession?.running);
    if (continuousStartButton) continuousStartButton.disabled = running;
    if (continuousStopButton) continuousStopButton.disabled = !running;
    if (analyzeButton) analyzeButton.disabled = running;
    if (solutionSpineButton) solutionSpineButton.disabled = running;
    if (auditButton) auditButton.disabled = running;
  }

  function continuousStepDelayMs() {
    const speed = replaySpeedSelect.value;
    if (speed === "slow") return 900;
    if (speed === "fast") return 180;
    return 0;
  }

  function continuousCurrentRun() {
    return state.continuousSession?.currentRun || null;
  }

  function renderContinuousPanels() {
    const session = state.continuousSession;
    if (!session) return;
    const currentRun = continuousCurrentRun();
    const counts = [
      `Run completate: <strong>${session.completedRuns}</strong>`,
      `Successi: <strong>${session.successCount}</strong>`,
      `Morti: <strong>${session.deathCount}</strong>`,
      `Stalli: <strong>${session.stallCount}</strong>`,
      `Step live: <strong>${session.totalCommands}</strong>`,
    ].join(" · ");
    summaryBox.innerHTML = [
      `<div>Modalita' continua sul preset <strong>${escapeHtml(session.presetLabel)}</strong> verso <strong>${escapeHtml(session.targetLabel)}</strong>.</div>`,
      `<div>Seed iniziale: <strong>${session.seedStart}</strong> · Prossimo seed: <strong>${session.nextSeed}</strong></div>`,
      `<div>${counts}</div>`,
      session.bestRun?.metrics
        ? `<div>Miglior seed: <strong>${session.bestRun.seed}</strong> · progress <strong>${session.bestRun.metrics.progressScoreMax}</strong> · nuove stanze <strong>${session.bestRun.metrics.roomDiscoveries}</strong> · oggetti <strong>${session.bestRun.metrics.itemDiscoveries}</strong></div>`
        : "",
      currentRun?.comparison
        ? `<div>Vs seed precedente: stanze <strong>${formatDelta(currentRun.comparison.roomDiscoveries)}</strong> · oggetti <strong>${formatDelta(currentRun.comparison.itemDiscoveries)}</strong> · porte <strong>${formatDelta(currentRun.comparison.openDoorDiscoveries)}</strong> · progress <strong>${formatDelta(currentRun.comparison.progressScoreMax)}</strong></div>`
        : "",
    ].join("");

    treeCaption.textContent = session.running
      ? `Sessione continua attiva. Seed corrente ${currentRun?.seed ?? session.nextSeed}.`
      : "Sessione continua fermata.";
    treeBox.innerHTML = `<div class="lab-empty">${
      currentRun
        ? `Seed ${currentRun.seed} · ${currentRun.commands.length} step · stanza ${escapeHtml(currentRun.roomLabel || roomLabel(game.currentRoom))}.`
        : "Nessuna run continua avviata."
    }</div>`;

    detailCaption.textContent = currentRun
      ? `Run live seed ${currentRun.seed}, ${currentRun.commands.length} step.`
      : "Nessuna run continua attiva.";

    if (currentRun) {
      const commandItems = currentRun.commands.length
        ? currentRun.transcript.map((entry, index) => `<li>${index + 1}. ${escapeHtml(entry.command)} <span class="lab-inline-note">[${escapeHtml(entry.decisionKind || "exploratory")}]</span></li>`).join("")
        : "<li>Il preset e` gia` in stato finale utile.</li>";
      detailBox.innerHTML = `<div class="lab-detail__card">
        <div class="lab-detail__top">
          <strong>Seed ${currentRun.seed}</strong>
          <div class="lab-detail__badges">
            <span class="lab-badge lab-badge--muted">Continuous trial</span>
            <span class="lab-badge lab-badge--muted">${currentRun.commands.length} step${currentRun.commands.length === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div class="lab-detail__section">
          <strong>Scenario</strong>
          <div class="lab-detail__text">${escapeHtml(session.presetDescription)}</div>
        </div>
        <div class="lab-detail__section">
          <strong>Commands</strong>
          <ol class="lab-detail__list">${commandItems}</ol>
        </div>
        ${renderRunMetricsHtml(currentRun, session.lastCompletedRun || null)}
      </div>`;
    } else {
      detailBox.innerHTML = '<div class="lab-empty">Nessuna run continua attiva.</div>';
    }

    replayCaption.textContent = session.running
      ? "Log live della sessione continua. Premi Esc o il pulsante stop per interrompere."
      : "Log finale della sessione continua.";
    replayLog.textContent = session.log.length ? session.log.join("\n\n") : "Nessuna run continua registrata.";
    renderContinuousArchiveSummary();
  }

  function startContinuousRunRecord(seed = 1, targetId = "", history = null) {
    return {
      seed,
      commands: [],
      transcript: [],
      roomLabel: roomLabel(game.currentRoom),
      matched: false,
      outcome: null,
      metrics: createRunMetricsBaseline(targetId, history),
      comparison: null,
    };
  }

  function finalizeContinuousOutcome(targetId = "", commandCount = 0, stepLimit = 1) {
    const target = targetById[targetId];
    const matched = Boolean(target?.matches(scenarioContext()));
    if (matched) {
      return { code: target.id, label: target.label, tone: target.id.startsWith("death") ? "danger" : "success" };
    }
    return classifyFailure(commandCount, stepLimit);
  }

  async function runContinuousSeed(seed, token) {
    const session = state.continuousSession;
    if (!session || token !== state.continuousToken) return null;
    const target = targetById[session.targetId];
    return withSeededRandomAsync(seed, async () => {
      state.activeExplorationRoute = { presetId: session.presetId, targetId: session.targetId };
      try {
        resetToPreset(presetById[session.presetId]);
        state.simulationHistory = createHistoryTracker();
        bumpMapCount(state.simulationHistory.roomVisits, game.currentRoom);
        session.currentRun = startContinuousRunRecord(seed, session.targetId, state.simulationHistory);
        session.currentRun.comparison = compareRunMetrics(session.currentRun.metrics, session.lastCompletedRun?.metrics || null);
        persistContinuousSession(session);
        renderContinuousPanels();

        let matched = target.matches(scenarioContext());
        if (!matched) {
          for (let step = 0; step < session.stepLimit; step += 1) {
            if (!state.continuousSession?.running || token !== state.continuousToken) break;
            if (game.endgame) break;
            const previousRoom = game.currentRoom;
            const decision = selectCommand("exploratory", session.targetId);
            const command = decision?.command || "";
            if (!command) break;
            const beforeLength = getOutputLines().length;
            const beforeSnapshot = exploratoryStateSnapshot(session.targetId);
            session.currentRun.commands.push(command);
            game.execute(command);
            const lines = outputDelta(beforeLength);
            const afterSnapshot = exploratoryStateSnapshot(session.targetId);
            const reward = exploratoryRewardForTransition(beforeSnapshot, afterSnapshot, lines, state.simulationHistory, command);
            const unlockReward = exploratoryUnlockDelta(beforeSnapshot, afterSnapshot);
            rewardSetupAssist(state.simulationHistory, beforeSnapshot, afterSnapshot, reward, unlockReward);
            session.currentRun.transcript.push({ command, lines, decisionKind: decision?.kind || "exploratory", reward });
            session.currentRun.roomLabel = roomLabel(game.currentRoom);
            session.totalCommands += 1;
            recordHistoryStep(state.simulationHistory, command, previousRoom, game.currentRoom, beforeSnapshot.stateKey);
            recordTransitionSample(state.simulationHistory, { stateKey: beforeSnapshot.stateKey, command, reward, unlockReward });
            updateContinuousRunMetrics(session.currentRun, {
              targetId: session.targetId,
              history: state.simulationHistory,
              command,
              decisionKind: decision?.kind || "exploratory",
              reward,
              unlockReward,
              beforeSnapshot,
              afterSnapshot,
            });
            rememberExploratoryOutcome({
              before: beforeSnapshot,
              after: afterSnapshot,
              command,
              reward,
              unlockReward,
              lines,
            });
            const outputText = lines.join("\n") || "(no output)";
            session.log.push(`Seed ${seed} · step ${session.currentRun.commands.length}\n> ${command}\n${outputText}`);
            if (session.log.length > 160) session.log.splice(0, session.log.length - 160);
            matched = target.matches(scenarioContext());
            session.currentRun.matched = matched;
            persistContinuousSession(session);
            renderContinuousPanels();
            statusBox.textContent = `Trial continuo attivo: seed ${seed}, step ${session.currentRun.commands.length}, stanza ${roomLabel(game.currentRoom)}.`;
            const delay = continuousStepDelayMs();
            await wait(delay || 0);
            if (matched) break;
          }
        }

        state.simulationHistory = null;
        session.currentRun.outcome = finalizeContinuousOutcome(session.targetId, session.currentRun.commands.length, session.stepLimit);
        session.currentRun.comparison = compareRunMetrics(session.currentRun.metrics, session.lastCompletedRun?.metrics || null);
        session.completedRuns += 1;
        state.exploreMemory.totalRuns = (state.exploreMemory.totalRuns || 0) + 1;
        if (session.currentRun.outcome.tone === "success") session.successCount += 1;
        else if (session.currentRun.outcome.tone === "danger") session.deathCount += 1;
        else session.stallCount += 1;
        session.log.push(
          `[seed ${seed} finished] ${session.currentRun.outcome.label} in ${session.currentRun.commands.length} step · rooms ${session.currentRun.metrics.roomDiscoveries} · items ${session.currentRun.metrics.itemDiscoveries} · doors ${session.currentRun.metrics.openDoorDiscoveries} · npc ${session.currentRun.metrics.effectiveNpcInteractions} · setup ${session.currentRun.metrics.successfulSetupActions} · progress ${session.currentRun.metrics.progressScoreMax}`
        );
        if (session.currentRun.comparison) {
          session.log.push(
            `[seed ${seed} vs previous] rooms ${formatDelta(session.currentRun.comparison.roomDiscoveries)} · items ${formatDelta(session.currentRun.comparison.itemDiscoveries)} · doors ${formatDelta(session.currentRun.comparison.openDoorDiscoveries)} · npc ${formatDelta(session.currentRun.comparison.effectiveNpcInteractions)} · setup ${formatDelta(session.currentRun.comparison.successfulSetupActions)} · progress ${formatDelta(session.currentRun.comparison.progressScoreMax)}`
          );
        }
        if (session.log.length > 160) session.log.splice(0, session.log.length - 160);
        session.lastCompletedRun = {
          ...session.currentRun,
          commands: [...(session.currentRun.commands || [])],
          transcript: [...(session.currentRun.transcript || [])],
          metrics: session.currentRun.metrics ? { ...session.currentRun.metrics } : null,
          comparison: session.currentRun.comparison ? { ...session.currentRun.comparison } : null,
        };
        if (!session.bestRun || runPerformanceScore(session.currentRun) >= runPerformanceScore(session.bestRun)) {
          session.bestRun = {
            ...session.currentRun,
            commands: [...(session.currentRun.commands || [])],
            transcript: [...(session.currentRun.transcript || [])],
            metrics: session.currentRun.metrics ? { ...session.currentRun.metrics } : null,
            comparison: session.currentRun.comparison ? { ...session.currentRun.comparison } : null,
          };
        }
        persistContinuousSession(session);
        saveExploreMemory();
        renderContinuousPanels();
        return session.currentRun.outcome;
      } finally {
        state.simulationHistory = null;
        state.activeExplorationRoute = null;
      }
    });
  }

  async function startContinuousExploration() {
    if (state.continuousSession?.running) return;
    const presetId = startPresetSelect.value;
    const targetId = targetSelect.value;
    const preset = presetById[presetId];
    const target = targetById[targetId];
    const { seedStart, stepLimit } = currentAnalysisInputs();
    state.continuousToken += 1;
    state.continuousSession = {
      id: `continuous-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      running: true,
      token: state.continuousToken,
      presetId,
      presetLabel: preset.label,
      presetDescription: preset.description,
      targetId,
      targetLabel: target.label,
      seedStart,
      nextSeed: seedStart,
      stepLimit,
      completedRuns: 0,
      successCount: 0,
      deathCount: 0,
      stallCount: 0,
      totalCommands: 0,
      log: [],
      currentRun: null,
      lastCompletedRun: null,
      bestRun: null,
      startedAt: new Date().toISOString(),
    };
    strategySelect.value = "exploratory";
    state.report = null;
    state.selectedRunId = "";
    syncContinuousButtons();
    persistContinuousSession(state.continuousSession);
    renderContinuousPanels();
    statusBox.textContent = `Trial continuo avviato da "${preset.label}" verso "${target.label}" a partire dal seed ${seedStart}.`;

    const token = state.continuousToken;
    try {
      while (state.continuousSession?.running && token === state.continuousToken) {
        const seed = state.continuousSession.nextSeed;
        state.continuousSession.nextSeed += 1;
        await runContinuousSeed(seed, token);
        if (!state.continuousSession?.running || token !== state.continuousToken) break;
        if (CONTINUOUS_INTER_RUN_DELAY_MS) await wait(CONTINUOUS_INTER_RUN_DELAY_MS);
      }
    } finally {
      if (token === state.continuousToken && state.continuousSession) {
        state.continuousSession.running = false;
        persistContinuousSession(state.continuousSession);
      }
      syncContinuousButtons();
      renderContinuousPanels();
    }
  }

  function stopContinuousExploration(message = "Trial continuo fermato.") {
    if (!state.continuousSession?.running) return;
    state.continuousSession.running = false;
    state.continuousToken += 1;
    persistContinuousSession(state.continuousSession);
    syncContinuousButtons();
    renderContinuousPanels();
    statusBox.textContent = message;
  }

  function currentAnalysisInputs() {
    return {
      seedStart: Math.max(1, Number.parseInt(seedStartInput.value, 10) || 1),
      seedCount: Math.max(1, Number.parseInt(seedCountInput.value, 10) || 1),
      stepLimit: Math.max(1, Number.parseInt(stepLimitInput.value, 10) || 220),
    };
  }

  function setScenarioControls({
    presetId,
    targetId,
    strategyId,
    outcomeFilter,
  }) {
    if (presetId) startPresetSelect.value = presetId;
    if (targetId) targetSelect.value = targetId;
    if (strategyId) strategySelect.value = strategyId;
    if (outcomeFilter) outcomeFilterSelect.value = outcomeFilter;
  }

  async function replayCatalogEntry(entry) {
    if (!entry) return;
    openOverlay("death");
    const { seedStart, seedCount, stepLimit } = currentAnalysisInputs();
    const effectiveSeedCount = Math.max(seedCount, 12);
    setScenarioControls({
      presetId: entry.presetId,
      targetId: entry.targetId,
      strategyId: "failure",
      outcomeFilter: "death",
    });
    statusBox.textContent = `Cerco un ramo mortale per "${entry.label}" sui seed ${seedStart}-${seedStart + effectiveSeedCount - 1}...`;
    const report = await generateReport({
      presetId: entry.presetId,
      targetId: entry.targetId,
      strategyId: "failure",
      outcomeFilter: "death",
      seedStart,
      seedCount: effectiveSeedCount,
      stepLimit,
    });
    applyReport(report);
    const matchingRun = report.filteredRuns.find((run) => run.outcome.code === entry.outcomeCode) || null;
    if (!matchingRun) {
      statusBox.textContent = `Nessun replay mortale trovato per "${entry.label}" nell'intervallo di seed corrente.`;
      return;
    }
    state.selectedRunId = matchingRun.id;
    renderTree(state.report);
    renderDetail(matchingRun);
    await replayRun(matchingRun);
    statusBox.textContent = `Replay mortale pronto per "${entry.label}" con seed ${matchingRun.seed}.`;
  }

  function auditRouteNote(route) {
    if (!route?.presetId || !route?.targetId) return "";
    return auditRouteNotes[`${route.presetId}:${route.targetId}`] || "";
  }

  async function auditFatalCoverage() {
    openOverlay("audit");
    const seedStart = Math.max(1, Number.parseInt(seedStartInput.value, 10) || 1);
    const seedCount = Math.max(1, Number.parseInt(seedCountInput.value, 10) || 1);
    const stepLimit = Math.max(1, Number.parseInt(stepLimitInput.value, 10) || 220);
    statusBox.textContent = `Audit fatal coverage in corso sulle tratte principali, seed ${seedStart}-${seedStart + seedCount - 1}...`;
    const rows = [];
    for (let index = 0; index < auditRoutes.length; index += 1) {
      const route = auditRoutes[index];
      const preset = presetById[route.presetId];
      const target = targetById[route.targetId];
      const runs = [];
      for (let offset = 0; offset < seedCount; offset += 1) {
        runs.push(simulateRun({
          presetId: route.presetId,
          targetId: route.targetId,
          strategyId: "failure",
          seed: seedStart + offset,
          stepLimit,
        }));
      }
      const deaths = runs.filter((run) => run.outcome.code.startsWith("death"));
      const grouped = new Map();
      for (const run of deaths) grouped.set(run.outcome.label, (grouped.get(run.outcome.label) || 0) + 1);
      const deathSummary = deaths.length
        ? [...grouped.entries()].map(([label, count]) => `${label}: ${count}`).join(" · ")
        : "No fatal branch found by current probes";
      const note = auditRouteNote(route);
      rows.push({
        routeLabel: `${preset.label} -> ${target.label}`,
        summary: `${deathSummary} | Successi: ${runs.filter((run) => run.outcome.tone === "success").length}/${runs.length}${note ? ` | Nota: ${note}` : ""}`,
      });
      if ((index + 1) % 2 === 0) await wait(0);
    }
    renderAuditRows(rows);
    statusBox.textContent = "Audit fatal coverage completato sulle tratte principali.";
  }

  async function replayRun(run) {
    if (!run) return;
    state.replayToken += 1;
    const token = state.replayToken;
    replayCaption.textContent = `Replay in corso per seed ${run.seed} dal preset ${run.presetLabel}.`;
    replayLog.textContent = "Preparing replay...";
    const speed = replaySpeedSelect.value;
    const delayMs = speed === "slow" ? 900 : speed === "fast" ? 160 : 0;

    await withSeededRandomAsync(run.seed, async () => {
      resetToPreset(presetById[run.presetId]);
      const lines = [];
      const setupLines = getOutputLines();
      if (setupLines.length) lines.push(`[setup]\n${setupLines.join("\n")}`);
      for (const command of run.commands) {
        if (token !== state.replayToken) return;
        const beforeLength = getOutputLines().length;
        game.execute(command);
        const delta = outputDelta(beforeLength);
        lines.push(`> ${command}\n${delta.join("\n") || "(no output)"}`);
        replayLog.textContent = lines.join("\n\n");
        if (delayMs) await wait(delayMs);
      }
      if (token !== state.replayToken) return;
      lines.push(`[final]\n${finalStateSummary(run)}`);
      replayLog.textContent = lines.join("\n\n");
    });
    if (token === state.replayToken) {
      replayCaption.textContent = `Replay completato per seed ${run.seed}.`;
    }
  }

  async function replayRunInSpine(run) {
    if (!run) return;
    state.spineReplayToken += 1;
    const token = state.spineReplayToken;
    setSpineReplayState(`Replay in corso per seed ${run.seed} dal preset ${run.presetLabel}.`, "Preparing replay...");
    updateSpineReplayDom();
    const speed = replaySpeedSelect.value;
    const delayMs = speed === "slow" ? 900 : speed === "fast" ? 160 : 0;

    await withSeededRandomAsync(run.seed, async () => {
      resetToPreset(presetById[run.presetId]);
      const lines = [];
      const setupLines = getOutputLines();
      if (setupLines.length) lines.push(`[setup]\n${setupLines.join("\n")}`);
      for (const command of run.commands) {
        if (token !== state.spineReplayToken) return;
        const beforeLength = getOutputLines().length;
        game.execute(command);
        const delta = outputDelta(beforeLength);
        lines.push(`> ${command}\n${delta.join("\n") || "(no output)"}`);
        state.spineReplayLog = lines.join("\n\n");
        updateSpineReplayDom();
        if (delayMs) await wait(delayMs);
      }
      if (token !== state.spineReplayToken) return;
      lines.push(`[final]\n${finalStateSummary(run)}`);
      state.spineReplayLog = lines.join("\n\n");
      updateSpineReplayDom();
    });

    if (token === state.spineReplayToken) {
      state.spineReplayCaption = `Replay completato per seed ${run.seed}.`;
      updateSpineReplayDom();
    }
  }

  async function analyze() {
    const presetId = startPresetSelect.value;
    const targetId = targetSelect.value;
    const preset = presetById[presetId];
    const target = targetById[targetId];
    const strategyId = strategySelect.value;
    const strategy = strategyById[strategyId] || strategyById.optimal;
    const outcomeFilter = outcomeFilterSelect.value;
    const { seedStart, seedCount, stepLimit } = currentAnalysisInputs();

    statusBox.textContent = `Analisi in corso da "${preset.label}" a "${target.label}" con strategia "${strategy.label}" sui seed ${seedStart}-${seedStart + seedCount - 1}...`;
    const report = await generateReport({
      presetId,
      targetId,
      strategyId: strategy.id,
      outcomeFilter,
      seedStart,
      seedCount,
      stepLimit,
    });
    applyReport(report);

    statusBox.textContent = report.filteredRuns.length
      ? `Analisi completata: ${report.filteredRuns.length} run visibili nell'albero, ${report.runs.length} run totali simulate.`
      : `Analisi completata, ma il filtro attuale non lascia rami visibili per la strategia "${strategy.label}".`;
  }

  async function analyzeSolutionSpine() {
    const presetId = startPresetSelect.value;
    const targetId = targetSelect.value;
    const preset = presetById[presetId];
    const target = targetById[targetId];
    openOverlay("spine");
    if (spineBox) spineBox.innerHTML = '<div class="lab-empty">Sto cercando i winning path e preparo la prima solution spine...</div>';
    await refreshWinningPathCatalog({ silent: false, openPanel: true });
    if (!state.spineCatalog?.winningRuns?.length) {
      statusBox.textContent = `Nessuna run vincente trovata per "${preset.label}" -> "${target.label}" nell'intervallo di seed corrente.`;
      return;
    }
    if (state.spineReport?.spineRun) {
      statusBox.textContent = state.spineReport.branchRuns.length
        ? `Solution spine pronta: seed ${state.spineReport.spineRun.seed}, ${state.spineReport.branchRuns.length} diramazioni fatali trovate.`
        : `Solution spine pronta: seed ${state.spineReport.spineRun.seed}, nessuna diramazione fatale trovata con le probe correnti.`;
    }
  }

  function resetView() {
    stopContinuousExploration("Trial continuo fermato dal reset della vista.");
    state.report = null;
    state.spineReport = null;
    state.spineCatalog = null;
    state.spineCatalogLoading = false;
    state.spineLoadingRunId = "";
    state.spineSelectedWinningRunId = "";
    state.spineReportsByWinningRunId = {};
    state.selectedRunId = "";
    state.spineSelectedRunId = "";
    state.spineSelectedStepIndex = -1;
    state.spineSelectedPreviewRun = null;
    state.spineReplayToken += 1;
    setSpineReplayState();
    state.replayToken += 1;
    state.spineToken += 1;
    state.simulationHistory = null;
    summaryBox.textContent = "Nessuna analisi eseguita.";
    auditBox.textContent = "Nessun audit eseguito.";
    closeOverlay();
    renderSolutionSpine(null);
    treeCaption.textContent = "I rami appariranno qui dopo la simulazione.";
    treeBox.innerHTML = '<div class="lab-empty">Nessun ramo da mostrare.</div>';
    detailCaption.textContent = "Seleziona un ramo foglia per vederne comandi, output e replay.";
    detailBox.innerHTML = '<div class="lab-empty">Nessun ramo selezionato.</div>';
    replayCaption.textContent = "Il replay usa il motore reale del gioco in un sandbox nascosto.";
    replayLog.textContent = "Nessun replay eseguito.";
    statusBox.textContent = "Scegli un preset e un target, poi avvia l'analisi per costruire l'albero dei rami dell'autoplay.";
    if (!renderLatestArchivedContinuousLog()) {
      replayCaption.textContent = "Il replay usa il motore reale del gioco in un sandbox nascosto.";
      replayLog.textContent = "Nessun replay eseguito.";
    }
  }

  function handleTreeClick(event) {
    const runId = event.target?.getAttribute?.("data-run-id");
    if (runId) {
      state.selectedRunId = runId;
      renderTree(state.report);
      renderDetail(findRun(runId));
      return;
    }
    const replayRunId = event.target?.getAttribute?.("data-replay-run-id");
    if (replayRunId) {
      replayRun(findRun(replayRunId));
    }
  }

  function handleDeathCatalogClick(event) {
    const catalogId = event.target?.getAttribute?.("data-death-catalog-id");
    if (!catalogId) return;
    replayCatalogEntry(findCatalogEntry(catalogId)).catch((error) => {
      statusBox.textContent = `Errore durante il replay del catalogo morti: ${error.message}`;
    });
  }

  async function handleSpineClick(event) {
    const refreshCatalog = event.target?.getAttribute?.("data-spine-refresh");
    if (refreshCatalog) {
      await refreshWinningPathCatalog({ silent: false, openPanel: true });
      return;
    }

    const winningRunId = event.target?.getAttribute?.("data-spine-winning-run-id");
    if (winningRunId) {
      if (winningRunId !== state.spineSelectedWinningRunId || !state.spineReport) {
        await ensureSolutionSpineForWinningRun(winningRunId, state.spineToken);
      }
      return;
    }

    const stepIndexRaw = event.target?.getAttribute?.("data-spine-step-index");
    if (stepIndexRaw !== null && stepIndexRaw !== undefined) {
      const stepIndex = Number.parseInt(stepIndexRaw, 10);
      if (Number.isInteger(stepIndex) && state.spineReport?.spineRun) {
        state.spineSelectedRunId = state.spineReport.spineRun.id;
        state.spineSelectedStepIndex = stepIndex;
        state.spineSelectedPreviewRun = buildSpineStepPreview(stepIndex) || state.spineReport.spineRun;
        setSpineReplayState();
        renderSolutionSpine(state.spineReport);
      }
      return;
    }

    const runId = event.target?.getAttribute?.("data-spine-open-run-id");
    if (runId) {
      const run = findSpineRun(runId);
      if (!run) return;
      state.spineSelectedRunId = runId;
      state.spineSelectedStepIndex = runId === state.spineReport?.spineRun?.id
        ? state.spineReport?.spineRun?.commands?.length || -1
        : -1;
      state.spineSelectedPreviewRun = run;
      setSpineReplayState();
      renderSolutionSpine(state.spineReport);
      return;
    }

    const replayRunId = event.target?.getAttribute?.("data-spine-replay-run-id");
    if (!replayRunId) return;
    replayRunInSpine(findSpineRun(replayRunId));
  }

  function handleOverlayDismiss(event) {
    if (event) event.preventDefault();
    closeOverlay();
  }

  function handleGlobalKeydown(event) {
    if (event.key === "Escape" && state.continuousSession?.running) {
      event.preventDefault();
      stopContinuousExploration("Trial continuo fermato con Esc.");
      return;
    }
    if (event.key === "Escape" && state.activeOverlay) {
      closeOverlay();
    }
  }

  populateSelect(startPresetSelect, scenarioPresets);
  populateSelect(targetSelect, targets);
  populateSelect(strategySelect, strategyProfiles);
  renderMemorySummary();
  renderContinuousArchiveSummary();
  syncContinuousButtons();
  renderDeathCatalog();
  renderSolutionSpine();
  startPresetSelect.value = "before_gollum";
  targetSelect.value = "have_ring";
  strategySelect.value = "optimal";
  renderLatestArchivedContinuousLog();
  scheduleWinningPathWarmup();

  analyzeButton.addEventListener("click", () => {
    analyze().catch((error) => {
      statusBox.textContent = `Errore durante l'analisi: ${error.message}`;
    });
  });
  solutionSpineButton?.addEventListener("click", () => {
    analyzeSolutionSpine().catch((error) => {
      statusBox.textContent = `Errore durante la solution spine: ${error.message}`;
    });
  });
  continuousStartButton?.addEventListener("click", () => {
    startContinuousExploration().catch((error) => {
      stopContinuousExploration("Trial continuo interrotto per errore.");
      statusBox.textContent = `Errore durante il trial continuo: ${error.message}`;
    });
  });
  continuousStopButton?.addEventListener("click", () => {
    stopContinuousExploration("Trial continuo fermato dal pulsante stop.");
  });
  auditButton.addEventListener("click", () => {
    auditFatalCoverage().catch((error) => {
      statusBox.textContent = `Errore durante l'audit: ${error.message}`;
    });
  });
  deathCatalogButton?.addEventListener("click", () => {
    openOverlay("death");
  });
  resetButton.addEventListener("click", resetView);
  treeBox.addEventListener("click", handleTreeClick);
  detailBox.addEventListener("click", handleTreeClick);
  deathCatalogBox?.addEventListener("click", handleDeathCatalogClick);
  spineBox?.addEventListener("click", (event) => {
    handleSpineClick(event).catch((error) => {
      statusBox.textContent = `Errore nella solution spine: ${error.message}`;
    });
  });
  overlayBackdrop?.addEventListener("click", handleOverlayDismiss);
  auditCloseButton?.addEventListener("click", handleOverlayDismiss);
  deathCloseButton?.addEventListener("click", handleOverlayDismiss);
  spineCloseButton?.addEventListener("click", handleOverlayDismiss);
  startPresetSelect.addEventListener("change", scheduleWinningPathWarmup);
  targetSelect.addEventListener("change", scheduleWinningPathWarmup);
  seedStartInput.addEventListener("change", scheduleWinningPathWarmup);
  seedCountInput.addEventListener("change", scheduleWinningPathWarmup);
  stepLimitInput.addEventListener("change", scheduleWinningPathWarmup);
  document.addEventListener("keydown", handleGlobalKeydown);
})();
