const fs = require("fs");
const path = require("path");
const { bootGame } = require("./headless-boot");
const {
  FOREST_TO_CLEARING,
  STOP,
  defaultSetup,
  runRoute,
  writeTranscripts,
  printSummary,
} = require("./route-transcript-lib");
const { DEATH_ROUTES } = require("./death-transcript-routes");

const WIN_ROUTES = [
  {
    id: "before-trolls-to-rivendell",
    title: "BEFORE TROLLS -> RIVENDELL",
    stepLimit: 120,
    setup(game, seed) {
      return defaultSetup(game, seed, "jump trolls");
    },
    stopWhen: STOP.rivendell,
    meta(game) {
      return {
        "Large key": Boolean(game.flags?.trollkeytaken || game.findInInventory?.("large key")) ? "yes" : "no",
        "Trolls transformed": game.trollsTransformed ? "yes" : "no",
      };
    },
    variants: [
      {
        label: "1 · Rubare la chiave e uscire subito",
        drive(game, transcript) {
          const { execStep } = require("./headless-boot");
          const cmds = [];
          const exec = (command) => {
            cmds.push(command);
            execStep(game, command, transcript);
          };
          exec("north");
          exec("take large key carefully");
          exec("south west");
          return cmds;
        },
      },
      {
        label: "2 · Uscire senza chiave, aspettare l'alba",
        drive(game, transcript) {
          const { execStep } = require("./headless-boot");
          const cmds = [];
          const exec = (command) => {
            cmds.push(command);
            execStep(game, command, transcript);
          };
          exec("north");
          exec("south west");
          for (let i = 0; i < 8 && !game.trollsTransformed; i += 1) exec("wait");
          return cmds;
        },
      },
    ],
  },
  {
    id: "after-trolls-cave-to-rivendell",
    title: "AFTER TROLLS CAVE -> RIVENDELL",
    stepLimit: 150,
    setup(game, seed) {
      return defaultSetup(game, seed, "jump cave");
    },
    stopWhen: STOP.rivendell,
    variants: [{ label: "1 · Autoplay ottimale" }],
  },
  {
    id: "rivendell-ready-to-have-ring",
    title: "RIVENDELL READY -> AFTER GOLLUM (RING)",
    stepLimit: 400,
    setup(game, seed) {
      return defaultSetup(game, seed, "jump rivendell");
    },
    stopWhen: STOP.haveRing,
    variants: [{ label: "1 · Autoplay ottimale" }],
  },
  {
    id: "before-gollum-to-have-ring",
    title: "BEFORE GOLLUM -> AFTER GOLLUM (RING)",
    stepLimit: 180,
    setup(game, seed) {
      return defaultSetup(game, seed, "jump gollum");
    },
    stopWhen: STOP.haveRing,
    variants: [{ label: "1 · Autoplay ottimale" }],
  },
  {
    id: "before-gollum-to-beorn",
    title: "BEFORE GOLLUM -> BEORN'S HOUSE",
    stepLimit: 400,
    setup(game, seed) {
      return defaultSetup(game, seed, "jump gollum");
    },
    stopWhen: STOP.beornHouse,
    variants: [{ label: "1 · Autoplay ottimale" }],
  },
  {
    id: "at-beorn-to-mirkwood-cleared",
    title: "AT BEORN -> OUT OF MIRKWOOD",
    stepLimit: 220,
    setup(game, seed) {
      return defaultSetup(game, seed, "jump beorn");
    },
    stopWhen: STOP.mirkwoodCleared,
    meta(game) {
      return {
        "Forest path visited": game.visitedRooms?.has("mirkwood_forest_path") ? "yes" : "no",
        "West bank visited": game.visitedRooms?.has("west_bank") ? "yes" : "no",
      };
    },
    variants: [
      {
        label: "1 · Sentiero forestale (forest road)",
        drive(game, transcript) {
          const { execStep } = require("./headless-boot");
          const cmds = [];
          for (const command of FOREST_TO_CLEARING) {
            if (game.endgame) break;
            cmds.push(command);
            execStep(game, command, transcript);
          }
          if (game.currentRoom === "elvish_clearing" && !game.endgame) {
            cmds.push("north east");
            execStep(game, "north east", transcript);
          }
          return cmds;
        },
      },
      { label: "2 · Autoplay ottimale (fiume / west bank)" },
    ],
  },
  {
    id: "at-beorn-to-laketown",
    title: "AT BEORN -> LAKE-TOWN",
    stepLimit: 220,
    setup(game, seed) {
      return defaultSetup(game, seed, "jump beorn");
    },
    stopWhen: STOP.woodenTown,
    meta(game) {
      return {
        "Forest path visited": game.visitedRooms?.has("mirkwood_forest_path") ? "yes" : "no",
        "West bank visited": game.visitedRooms?.has("west_bank") ? "yes" : "no",
        "Long lake visited": game.visitedRooms?.has("long_lake") ? "yes" : "no",
      };
    },
    variants: [
      {
        label: "1 · Sentiero forestale (forest road)",
        drive(game, transcript) {
          const { execStep } = require("./headless-boot");
          const cmds = [];
          for (const command of FOREST_TO_CLEARING) {
            if (game.endgame) break;
            cmds.push(command);
            execStep(game, command, transcript);
          }
          if (game.currentRoom === "elvish_clearing" && !game.endgame) {
            cmds.push("north east");
            execStep(game, "north east", transcript);
          }
          return cmds;
        },
      },
      { label: "2 · Autoplay ottimale (fiume / west bank)" },
    ],
  },
  {
    id: "in-mirkwood-to-mirkwood-cleared",
    title: "IN MIRKWOOD -> OUT OF MIRKWOOD",
    stepLimit: 200,
    setup(game, seed) {
      return defaultSetup(game, seed, "jump mirkwood");
    },
    stopWhen: STOP.mirkwoodCleared,
    variants: [{ label: "1 · Autoplay ottimale" }],
  },
  {
    id: "cellar-escape-to-long-lake",
    title: "CELLAR ESCAPE -> LONG LAKE",
    stepLimit: 120,
    setup(game, seed) {
      const { cellarEscapeSetup } = require("./route-transcript-lib");
      return cellarEscapeSetup(game, seed);
    },
    stopWhen: STOP.longLake,
    variants: [{ label: "1 · Autoplay ottimale" }],
  },
  {
    id: "at-laketown-to-front-gate",
    title: "AT LAKE-TOWN -> FRONT GATE",
    stepLimit: 250,
    setup(game, seed) {
      return defaultSetup(game, seed, "jump laketown");
    },
    stopWhen: STOP.frontGate,
    variants: [{ label: "1 · Autoplay ottimale" }],
  },
];

const ROUTES = [...WIN_ROUTES, ...DEATH_ROUTES];
const ROUTE_BY_ID = Object.fromEntries(ROUTES.map((route) => [route.id, route]));
const WIN_ROUTE_BY_ID = Object.fromEntries(WIN_ROUTES.map((route) => [route.id, route]));
const DEATH_ROUTE_BY_ID = Object.fromEntries(DEATH_ROUTES.map((route) => [route.id, route]));

function parseCliOptions(argv = []) {
  const options = {
    fullTranscript: false,
    seed: 1,
    routeId: null,
    all: false,
    list: false,
    deaths: false,
    wins: false,
    everything: false,
    outRoot: path.join(__dirname, "transcripts"),
  };

  for (const arg of argv) {
    if (arg === "--full-transcript") {
      options.fullTranscript = true;
      continue;
    }
    if (arg === "--all") {
      options.all = true;
      continue;
    }
    if (arg === "--list") {
      options.list = true;
      continue;
    }
    if (arg === "--deaths") {
      options.deaths = true;
      continue;
    }
    if (arg === "--wins") {
      options.wins = true;
      continue;
    }
    if (arg === "--everything") {
      options.everything = true;
      continue;
    }
    if (arg.startsWith("--seed=")) {
      options.seed = Number.parseInt(arg.split("=")[1], 10) || options.seed;
      continue;
    }
    if (arg.startsWith("--route=")) {
      options.routeId = arg.split("=")[1];
      continue;
    }
    if (arg.startsWith("--out-root=")) {
      options.outRoot = path.resolve(arg.split("=")[1]);
    }
  }

  return options;
}

function listRoutes() {
  console.log("\nWinning routes:\n");
  for (const route of WIN_ROUTES) {
    console.log(`  ${route.id}`);
    console.log(`    ${route.title}`);
    console.log(`    variants: ${route.variants.length}`);
    console.log("");
  }
  console.log("Death routes:\n");
  for (const route of DEATH_ROUTES) {
    console.log(`  ${route.id}`);
    console.log(`    ${route.title}`);
    console.log(`    variants: ${route.variants.length}`);
    console.log("");
  }
}

function resolveSelectedRoutes(cli) {
  if (cli.routeId) {
    const route = ROUTE_BY_ID[cli.routeId];
    return route ? [route] : [];
  }

  if (cli.everything) return [...WIN_ROUTES, ...DEATH_ROUTES];

  const wantDeaths = cli.deaths || (cli.all && cli.deaths);
  const wantWins = cli.wins || (cli.all && !cli.deaths) || (cli.all && cli.wins);

  if (cli.all && cli.deaths && !cli.wins) return DEATH_ROUTES;
  if (cli.all && cli.deaths && cli.wins) return [...WIN_ROUTES, ...DEATH_ROUTES];
  if (cli.all) return WIN_ROUTES;
  if (cli.deaths) return DEATH_ROUTES;
  if (cli.wins) return WIN_ROUTES;

  return [];
}

function main() {
  const cli = parseCliOptions(process.argv.slice(2));

  if (cli.list) {
    listRoutes();
    process.exit(0);
  }

  const selectedRoutes = resolveSelectedRoutes(cli);

  if (!selectedRoutes.length) {
    console.error("Specify --route=<id>, --all, --deaths, --wins, --everything, or --list");
    console.error("Examples:");
    console.error("  node scripts/generate-route-transcripts.js --all --full-transcript");
    console.error("  node scripts/generate-route-transcripts.js --deaths --all --full-transcript");
    console.error("  node scripts/generate-route-transcripts.js --everything --full-transcript");
    process.exit(1);
  }

  const startedAt = Date.now();
  const game = bootGame();
  const allWritten = [];
  const allResults = [];
  let failures = 0;

  for (const route of selectedRoutes) {
    const results = runRoute(game, cli.seed, route);
    allResults.push(...results);
    printSummary(route.id, results);

    for (const result of results) {
      if (!result.success) failures += 1;
    }

    if (cli.fullTranscript) {
      const outDir = path.join(cli.outRoot, route.id);
      const written = writeTranscripts(results, outDir);
      allWritten.push(...written);
    }
  }

  const wins = allResults.filter((result) => result.kind !== "death");
  const deaths = allResults.filter((result) => result.kind === "death");
  console.log(`\nSummary: ${allResults.length} variant(s), ${failures} unexpected outcome(s)`);
  if (wins.length) console.log(`  wins: ${wins.filter((r) => r.success).length}/${wins.length} succeeded`);
  if (deaths.length) console.log(`  deaths: ${deaths.filter((r) => r.success).length}/${deaths.length} reached fatal endgame`);

  if (cli.fullTranscript && allWritten.length) {
    console.log(`\nFull transcripts written (${allWritten.length}):`);
    for (const filePath of allWritten) console.log(`  ${filePath}`);
  }

  console.log(`\nCompleted in ${Date.now() - startedAt} ms.`);
  process.exit(failures ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { WIN_ROUTES, DEATH_ROUTES, ROUTES, ROUTE_BY_ID, WIN_ROUTE_BY_ID, DEATH_ROUTE_BY_ID };
