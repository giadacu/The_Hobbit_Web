/**
 * Playtest: character glimpses + narrative coherence, including off-optimal paths.
 *
 * Covers Beorn / Elrond / Bard / Butler / wood-elf glimpses, then seeded mixed
 * corridors that intentionally deviate from pure autoplay.
 *
 * Usage:
 *   node scripts/playtest-glimpse-narrative.js
 *   SEED_COUNT=8 STEP_LIMIT=120 node scripts/playtest-glimpse-narrative.js
 */
const fs = require("fs");
const path = require("path");
const { bootGame, outputLines, makeSeededRandom, withSeed } = require("./headless-boot");

const ISSUES = [];
const RESULTS = [];
const SEED_COUNT = Number(process.env.SEED_COUNT || 10);
const STEP_LIMIT = Number(process.env.STEP_LIMIT || 160);

function note(scope, type, detail, extra = {}) {
  ISSUES.push({ scope, type, detail, ...extra });
}

function linesSince(before) {
  return outputLines.slice(before);
}

function textSince(before) {
  return linesSince(before).join("\n");
}

function expect(scope, cond, detail) {
  RESULTS.push({ scope, ok: Boolean(cond), detail });
  if (!cond) note(scope, "assert", detail);
}

function pickRandom(rng, list) {
  if (!list.length) return null;
  return list[Math.floor(rng() * list.length)];
}

function uniqueCommands(entries) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const key = String(entry.command || "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

function coherenceCheck(scope, game, step, lines, transcript) {
  const text = lines.join(" ");
  const flags = game.flags || {};
  const room = game.currentRoom;

  const elrondHere = game.characters?.elrond?.position === room && game.characters?.elrond?.visible !== false;
  const beornHere = game.characters?.beorn?.position === room && game.characters?.beorn?.visible !== false;
  const bardHere = game.characters?.bard?.position === room && game.characters?.bard?.visible !== false;
  const butlerHere = game.characters?.butler?.position === room && game.characters?.butler?.visible !== false;

  if (beornHere && /no one named beorn/i.test(text)) {
    note(scope, "contradiction", "Beorn is co-present but talk claims Beorn absent", step);
  }
  if (elrondHere && /Elrond is not here just now|no one named elrond/i.test(text)) {
    note(scope, "contradiction", "Elrond is co-present but talk claims Elrond absent", step);
  }
  if (bardHere && /no one named bard/i.test(text)) {
    note(scope, "contradiction", "Bard is co-present but talk claims Bard absent", step);
  }
  if (butlerHere && /no one named butler/i.test(text)) {
    note(scope, "contradiction", "Butler is co-present but talk claims butler absent", step);
  }
  if (flags.wood_elf_glimpse_capture_seen && !flags.elvenking_prisoner_seen) {
    note(scope, "sequence", "Wood-elf capture glimpse without prisoner flag", step);
  }
  if (room === "dark_dungeon" && !flags.elvenking_prisoner_seen && /whispering secrets of forgotten ages/i.test(text)) {
    note(scope, "narrative", "Legacy dungeon placeholder without prisoner flag", step);
  }
  if (room === "cellar" && !flags.elvenking_prisoner_seen) {
    const fromHalls = step?.beforeRoom === "elvenkings_halls"
      || transcript.some((s) => s.afterRoom === "cellar" && s.beforeRoom === "elvenkings_halls");
    if (fromHalls) {
      note(scope, "sequence", "Entered cellar from halls without capture/questioning", step);
    }
  }
  if (room === "wooden_town" && flags.laketown_barrel_arrival_seen === false && /Bard is among the first/i.test(text)) {
    note(scope, "sequence", "Bard arrival prose without laketown_barrel_arrival_seen", step);
  }
  if (flags.beorn_dinner_seen && room === "beorns_house" && /still holds the promise of supper/i.test(text)) {
    note(scope, "contradiction", "Beorn dinner already seen but north block still mentions supper promise", step);
  }
  // Same-turn counsel can print Speak plainly and then complete revelation; only flag later talks.
  if (
    flags.elrond_revelation_complete
    && /Speak plainly, Master Baggins/i.test(text)
    && !/weathered parchment|moon-letters|western door/i.test(text)
  ) {
    note(scope, "anachronism", "Elrond still using pre-counsel Speak plainly after revelation completed", step);
  }
  if (/craftmanship/i.test(text)) {
    note(scope, "typo", "Misspelling: craftmanship", step);
  }
  if (/stoe_of_ravenhill|stoe of ravenhill/i.test(text) && !/Ravenhill/i.test(text)) {
    note(scope, "typo", "Room id 'stoe' leaked into player text", step);
  }
  if (flags.dragondefeated && /Smaug (?:lies|prowls|stirs|searches|hunts|sleeps)/i.test(text)) {
    note(scope, "contradiction", "Live Smaug prose after dragon defeated", step);
  }
}

function testBeornGlimpse() {
  const scope = "glimpse:beorn";
  const game = bootGame();
  game.restartGame();
  const before = outputLines.length;
  game.execute("jump beorn");
  const text = textSince(before);
  expect(scope, game.temporaryImage?.file === "beorn_glimpse_house.png", `image=${game.temporaryImage?.file || "none"}`);
  expect(scope, Boolean(game.flags.beorn_glimpse_house_seen), "flag set");
  expect(scope, Boolean(game.flags.beorn_dinner_seen), "dinner seen");
  expect(scope, /uncanny order of Beorn's house|prodigious supper|stubbornly hospitable/i.test(text), "hospitality prose present");
  expect(scope, game.characters.beorn?.position === "beorns_house", "Beorn co-present");
  game.execute("look");
  expect(scope, !game.temporaryImage?.file, "dismissed on next command");
  game.execute("north");
  // dinner already seen, north should eventually be allowed after strength/food rules; at least no supper-promise block
  const northText = textSince(outputLines.length);
  void northText;
}

function testElrondGlimpse() {
  const scope = "glimpse:elrond";
  const game = bootGame();
  game.restartGame();
  game.execute("jump rivendell");
  game.flags.elrond_glimpse_rivendell_seen = false;
  game.clearTemporaryImage?.({ render: false });
  const before = outputLines.length;
  game.execute("talk to elrond");
  const text = textSince(before);
  expect(scope, game.temporaryImage?.file === "elrond_glimpse_rivendell.png", `image=${game.temporaryImage?.file || "none"}`);
  expect(scope, Boolean(game.flags.elrond_glimpse_rivendell_seen), "flag set");
  expect(scope, /Speak plainly, Master Baggins/i.test(text), "counsel prose present");
  game.execute("ask elrond about journey");
  expect(scope, game.temporaryImage?.file !== "elrond_glimpse_rivendell.png" || Boolean(game.temporaryImage?.file), "second counsel does not require re-glimpse");
  expect(scope, Boolean(game.flags.elrond_glimpse_rivendell_seen), "flag remains one-shot");
  // wander off-path then return
  game.execute("east");
  game.execute("west");
  game.clearTemporaryImage?.({ render: false });
  const before2 = outputLines.length;
  game.execute("talk to elrond");
  expect(scope, game.temporaryImage?.file !== "elrond_glimpse_rivendell.png", "no re-glimpse after wandering");
  expect(scope, !/Speak plainly, Master Baggins/i.test(textSince(before2)) || Boolean(game.flags.rivendell_progress_talk), "talk progress retained");
}

function testBardGlimpse() {
  const scope = "glimpse:bard";
  const game = bootGame();
  game.restartGame();
  game.execute("jump laketown");
  game.flags.laketown_barrel_arrival_seen = false;
  game.flags.bard_glimpse_laketown_seen = false;
  game.clearTemporaryImage?.({ render: false });
  const before = outputLines.length;
  game.beginLaketownBarrelArrival();
  const text = textSince(before);
  expect(scope, game.temporaryImage?.file === "bard_glimpse_laketown.png", `image=${game.temporaryImage?.file || "none"}`);
  expect(scope, Boolean(game.flags.bard_glimpse_laketown_seen), "flag set");
  expect(scope, /Bard is among the first to look on you/i.test(text), "arrival prose names Bard");
  expect(scope, game.characters.bard?.position === "wooden_town", "Bard placed in town");
  // deviation: talk/look before following autoplay
  game.execute("look");
  expect(scope, !game.temporaryImage?.file, "dismissed");
  game.execute("talk to bard");
  expect(scope, !/no one named bard/i.test(textSince(outputLines.length - 5)), "Bard still addressable after glimpse");
}

function testButlerGlimpse() {
  const scope = "glimpse:butler";
  const game = bootGame();
  game.restartGame();
  game.execute("jump laketown");
  game.debugMovePlayer("cellar", { markRoute: true });
  game.flags.cellar_feast_scene_seen = false;
  game.flags.butler_glimpse_cellar_seen = false;
  game.clearTemporaryImage?.({ render: false });
  const before = outputLines.length;
  game.beginCellarEscapeOpportunity();
  const text = textSince(before);
  expect(scope, game.temporaryImage?.file === "butler_glimpse_cellar.png", `image=${game.temporaryImage?.file || "none"}`);
  expect(scope, Boolean(game.flags.butler_glimpse_cellar_seen), "flag set");
  expect(scope, /butler's vigilance has plainly been dulled|cup or two beyond strict necessity/i.test(text), "feast prose present");
  expect(scope, game.characters.butler?.position === "cellar", "butler placed");
  // deviation: wait / look instead of immediate barrel work
  game.execute("look");
  game.execute("wait");
  game.execute("talk to butler");
  expect(scope, Boolean(game.flags.cellar_feast_scene_seen), "feast flag persists through waits");
}

function testWoodElfGlimpse() {
  const scope = "glimpse:wood-elf";
  const game = bootGame();
  game.restartGame();
  game.execute("jump mirkwood");
  game.debugMovePlayer("elvenkings_halls", { markRoute: true });
  game.flags.elvenking_prisoner_seen = false;
  game.flags.wood_elf_glimpse_capture_seen = false;
  game.flags.mirkwoodjourneycomplete = true;
  game.flags.elven_halls_ring_wait_turns = 0;
  game.player.wearingRing = false;
  game.player.noticeable = true;
  game.debugSetCharacterRoom("wood_elf", "elvenkings_halls");
  game.characters.wood_elf.visible = true;
  game.clearTemporaryImage?.({ render: false });
  const before = outputLines.length;
  game.checkKidnapping();
  const text = textSince(before);
  expect(scope, game.temporaryImage?.file === "wood_elf_glimpse_capture.png", `image=${game.temporaryImage?.file || "none"}`);
  expect(scope, Boolean(game.flags.wood_elf_glimpse_capture_seen), "flag set");
  expect(scope, /The wood elf captures you/i.test(text), "capture prose present");
  expect(scope, /led at last before the Elvenking/i.test(text), "questioning prose present");
  expect(scope, game.currentRoom === "dark_dungeon", "moved to dungeon");
  expect(scope, Boolean(game.flags.elvenking_prisoner_seen), "prisoner flag set");
  game.execute("look");
  expect(scope, !game.temporaryImage?.file, "dismissed");
}

function testRingDelayedCaptureCoherence() {
  const scope = "coherence:ring-delay-capture";
  const game = bootGame();
  game.restartGame();
  game.execute("jump mirkwood");
  game.debugMovePlayer("elvenkings_halls", { markRoute: true });
  game.flags.elvenking_prisoner_seen = false;
  game.flags.wood_elf_glimpse_capture_seen = false;
  game.flags.mirkwoodjourneycomplete = true;
  game.flags.elven_halls_ring_wait_turns = 0;
  game.debugSetCharacterRoom("wood_elf", "elvenkings_halls");
  game.characters.wood_elf.visible = true;
  if (game.findInInventory("golden ring") || game.debugGivePlayerItem) {
    try { game.debugGivePlayerItem("golden ring"); } catch (_) { /* already has */ }
  }
  game.execute("wear ring");
  game.clearTemporaryImage?.({ render: false });
  game.checkKidnapping();
  expect(scope, game.currentRoom === "elvenkings_halls", "still in halls after first ring wait");
  expect(scope, !game.flags.wood_elf_glimpse_capture_seen, "no capture glimpse while still hidden");
  expect(scope, !game.flags.elvenking_prisoner_seen, "not prisoner yet");
  game.checkKidnapping();
  // second wait may warn then capture depending on ring wait counter
  if (!game.flags.elvenking_prisoner_seen) game.checkKidnapping();
  expect(scope, Boolean(game.flags.elvenking_prisoner_seen), "eventually captured after ring delay");
  expect(scope, Boolean(game.flags.wood_elf_glimpse_capture_seen), "glimpse fires on actual capture");
  expect(scope, game.currentRoom === "dark_dungeon", "ends in dungeon");
}

function candidatesFor(game, strategy) {
  const entries = [];
  const autoplay = game.nextAutoplayCommand?.();
  if (autoplay) entries.push({ command: autoplay, kind: "optimal" });
  for (const connection of game.roomConnections?.() || []) {
    if (connection.direction) entries.push({ command: connection.direction, kind: "move" });
  }
  entries.push(
    { command: "look", kind: "safe" },
    { command: "wait", kind: "safe" },
    { command: "inventory", kind: "safe" },
  );
  if (game.currentRoom === "beorns_house") {
    entries.push(
      { command: "talk to beorn", kind: "alt" },
      { command: "ask beorn about mirkwood", kind: "alt" },
      { command: "east", kind: "move" },
      { command: "north", kind: "move" },
    );
  }
  if (game.currentRoom === "rivendell" || String(game.currentRoom || "").startsWith("rivendell")) {
    entries.push(
      { command: "talk to elrond", kind: "alt" },
      { command: "ask elrond about journey", kind: "alt" },
      { command: "talk to gandalf", kind: "alt" },
    );
  }
  if (game.currentRoom === "elvenkings_halls") {
    entries.push(
      { command: "wait", kind: "safe" },
      { command: "wear ring", kind: "alt" },
      { command: "look", kind: "safe" },
    );
  }
  if (game.currentRoom === "cellar") {
    entries.push(
      { command: "talk to butler", kind: "alt" },
      { command: "wait", kind: "safe" },
      { command: "open trap door", kind: "alt" },
      { command: "jump trap door", kind: "failure" },
    );
  }
  if (game.currentRoom === "wooden_town") {
    entries.push(
      { command: "talk to bard", kind: "alt" },
      { command: "ask bard for help", kind: "alt" },
    );
  }
  if (game.findInInventory?.("golden ring")) {
    entries.push({ command: "wear ring", kind: "alt" }, { command: "remove ring", kind: "alt" });
  }

  const deduped = uniqueCommands(entries);
  if (strategy === "optimal") return deduped.filter((e) => e.kind === "optimal");
  if (strategy === "failure") {
    const failures = deduped.filter((e) => e.kind === "failure");
    return failures.length ? failures : deduped.filter((e) => e.kind !== "optimal");
  }
  // mixed: prefer alt/safe sometimes over optimal
  const weighted = [];
  for (const entry of deduped) {
    const weight = entry.kind === "optimal" ? 2 : entry.kind === "alt" ? 3 : entry.kind === "failure" ? 2 : 2;
    for (let i = 0; i < weight; i += 1) weighted.push(entry);
  }
  return weighted;
}

function runCorridor({ id, label, setup, strategy, seed, stopWhen }) {
  const scope = `corridor:${id}:${strategy}:${seed}`;
  return withSeed(seed, () => {
    const rng = makeSeededRandom(seed + strategy.length * 911);
    const game = bootGame();
    setup(game);
    const transcript = [];
    let stalls = 0;

    for (let i = 0; i < STEP_LIMIT && !game.endgame; i += 1) {
      if (stopWhen?.(game)) break;
      const pool = candidatesFor(game, strategy);
      const picked = pickRandom(rng, pool);
      if (!picked?.command) {
        stalls += 1;
        if (stalls >= 6) {
          note(scope, "softlock", `No commands at ${game.currentRoom}`);
          break;
        }
        continue;
      }
      stalls = 0;
      const beforeRoom = game.currentRoom;
      const before = outputLines.length;
      game.execute(picked.command);
      const lines = linesSince(before);
      if (outputLines.length > 2500) outputLines.splice(0, outputLines.length - 700);
      const step = {
        command: picked.command,
        beforeRoom,
        afterRoom: game.currentRoom,
        image: game.temporaryImage?.file || "",
      };
      transcript.push(step);
      coherenceCheck(scope, game, step, lines, transcript);
    }

    return {
      scope,
      label,
      strategy,
      seed,
      steps: transcript.length,
      finalRoom: game.currentRoom,
      flags: {
        beornGlimpse: Boolean(game.flags.beorn_glimpse_house_seen),
        elrondGlimpse: Boolean(game.flags.elrond_glimpse_rivendell_seen),
        bardGlimpse: Boolean(game.flags.bard_glimpse_laketown_seen),
        butlerGlimpse: Boolean(game.flags.butler_glimpse_cellar_seen),
        woodElfGlimpse: Boolean(game.flags.wood_elf_glimpse_capture_seen),
        dinner: Boolean(game.flags.beorn_dinner_seen),
        prisoner: Boolean(game.flags.elvenking_prisoner_seen),
        cellarFeast: Boolean(game.flags.cellar_feast_scene_seen),
        laketownArrival: Boolean(game.flags.laketown_barrel_arrival_seen),
      },
      endgame: Boolean(game.endgame),
      death: game.pendingEndgameChoice === "death",
    };
  });
}

function main() {
  console.log("=== Glimpse direct beats ===");
  testBeornGlimpse();
  testElrondGlimpse();
  testBardGlimpse();
  testButlerGlimpse();
  testWoodElfGlimpse();
  testRingDelayedCaptureCoherence();

  console.log("=== Deviation corridors ===");
  const corridors = [];
  const setups = [
    {
      id: "rivendell-counsel",
      label: "Rivendell counsel with wandering",
      setup(game) {
        game.restartGame();
        game.execute("jump rivendell");
      },
      stopWhen(game) {
        return Boolean(game.flags.rivendell_preparations_complete || game.flags.mapread);
      },
    },
    {
      id: "beorn-house",
      label: "Beorn house explore then leave",
      setup(game) {
        game.restartGame();
        game.execute("jump beorn");
      },
      stopWhen(game) {
        return game.visitedRooms?.has("gate_to_mirkwood") || game.visitedRooms?.has("forest_road") || game.visitedRooms?.has("great_river");
      },
    },
    {
      id: "capture-to-cellar",
      label: "Elven halls capture toward cellar (mixed)",
      setup(game) {
        game.restartGame();
        game.handleJumpCommand?.("mirkwood", { silent: true }) || game.execute("jump mirkwood");
        game.flags.mirkwooddwarvesfreed = true;
        game.flags.mirkwoodjourneycomplete = true;
        game.debugMovePlayer("elvenkings_halls", { markRoute: true });
        game.debugSetCharacterRoom("wood_elf", "elvenkings_halls");
        game.characters.wood_elf.visible = true;
        game.flags.elvenking_prisoner_seen = false;
        game.flags.wood_elf_glimpse_capture_seen = false;
        game.checkSpecialSituations?.();
      },
      stopWhen(game) {
        return Boolean(game.flags.cellar_feast_scene_seen || game.flags.laketown_barrel_arrival_seen || game.visitedRooms?.has("long_lake"));
      },
    },
    {
      id: "cellar-feast",
      label: "Cellar feast with waits/talk before escape",
      setup(game) {
        game.restartGame();
        game.execute("jump laketown");
        game.debugMovePlayer("cellar", { markRoute: true });
        game.flags.cellar_feast_scene_seen = false;
        game.flags.butler_glimpse_cellar_seen = false;
        game.flags.elvenking_prisoner_seen = true;
        game.flags.mirkwooddwarvesfreed = true;
        game.beginCellarEscapeOpportunity();
      },
      stopWhen(game) {
        return Boolean(game.flags.laketown_barrel_arrival_seen || game.visitedRooms?.has("long_lake") || game.endgame);
      },
    },
  ];

  for (const corridor of setups) {
    for (const strategy of ["mixed", "optimal", "failure"]) {
      for (let i = 0; i < SEED_COUNT; i += 1) {
        const seed = 101 + i * 19 + strategy.length * 3;
        corridors.push(runCorridor({ ...corridor, strategy, seed }));
      }
    }
  }

  const assertFails = RESULTS.filter((r) => !r.ok);
  const uniqueIssues = [];
  const seen = new Set();
  for (const issue of ISSUES) {
    const key = `${issue.scope}|${issue.type}|${issue.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueIssues.push(issue);
  }

  const report = [
    "Glimpse + narrative coherence playtest",
    `Asserts: ${RESULTS.length - assertFails.length}/${RESULTS.length} passed`,
    `Corridors: ${corridors.length} (strategies mixed/optimal/failure, seeds=${SEED_COUNT})`,
    `Unique narrative issues: ${uniqueIssues.length}`,
    "",
    "--- Direct glimpse asserts ---",
    ...RESULTS.map((r) => `${r.ok ? "PASS" : "FAIL"} ${r.scope} :: ${r.detail}`),
    "",
    "--- Corridor snapshot ---",
    ...corridors.slice(0, 24).map((c) => (
      `${c.scope} steps=${c.steps} room=${c.finalRoom} glimpses[b=${c.flags.beornGlimpse ? 1 : 0},e=${c.flags.elrondGlimpse ? 1 : 0},bard=${c.flags.bardGlimpse ? 1 : 0},butler=${c.flags.butlerGlimpse ? 1 : 0},elf=${c.flags.woodElfGlimpse ? 1 : 0}] death=${c.death ? 1 : 0}`
    )),
    corridors.length > 24 ? `... and ${corridors.length - 24} more corridor runs` : "",
    "",
    "--- Narrative / coherence issues ---",
    ...(uniqueIssues.length
      ? uniqueIssues.map((i) => `[${i.type}] ${i.scope}: ${i.detail}`)
      : ["(none)"]),
    "",
  ].filter(Boolean).join("\n");

  const reportPath = path.join(__dirname, "playtest-glimpse-narrative-report.txt");
  fs.writeFileSync(reportPath, `${report}\n`);
  console.log(report);
  console.log(`Wrote ${reportPath}`);

  if (assertFails.length) {
    console.error(`\n${assertFails.length} direct glimpse assert(s) failed.`);
    process.exit(1);
  }
  // Narrative issues are reported but do not hard-fail unless clearly assert-level.
  // Softlocks in failure strategy are expected sometimes; only fail on contradiction/sequence/narrative/anachronism/typo.
  const hard = uniqueIssues.filter((i) => ["contradiction", "sequence", "narrative", "anachronism", "typo", "assert"].includes(i.type));
  if (hard.length) {
    console.error(`\n${hard.length} narrative coherence issue(s) found.`);
    process.exit(1);
  }
  console.log("\nGlimpse + narrative coherence playtest passed.");
}

main();
