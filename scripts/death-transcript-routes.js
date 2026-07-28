const {
  STOP,
  defaultSetup,
  cellarEscapeSetup,
  mirkwoodVulnerableSetup,
  goblinAmbushSetup,
  makeExec,
} = require("./route-transcript-lib");

function answerCurrentGollumRiddle(game, transcript) {
  const { exec } = makeExec(game, transcript);
  const riddle = game.currentGollumRiddle?.();
  if (riddle?.answers?.[0]) exec(`answer ${riddle.answers[0]}`);
}

function advanceGollumToAwaitingAnswer(game, transcript) {
  const { exec } = makeExec(game, transcript);
  if (!game.gollumState?.met) exec("look");
  exec("ask gollum a riddle");
}

function advanceGollumToPlayerRiddle(game, transcript) {
  advanceGollumToAwaitingAnswer(game, transcript);
  answerCurrentGollumRiddle(game, transcript);
}

function advanceGollumToPocketQuestion(game, transcript) {
  advanceGollumToPlayerRiddle(game, transcript);
  answerCurrentGollumRiddle(game, transcript);
  makeExec(game, transcript).exec('say to gollum "what\'s in my pocket"');
}

function mirkwoodSpiderGroveSetup(game, seed) {
  return defaultSetup(game, seed, "jump mirkwood", {
    afterSetup(target) {
      target.debugMovePlayer("mirkwood_spider_grove", { markRoute: true });
    },
  });
}

const DEATH_ROUTES = [
  {
    id: "death-trolls-key",
    title: "DEATH · Trolls at Clearing (large key)",
    kind: "death",
    outcomeCode: "death_troll",
    stepLimit: 20,
    setup(game, seed) {
      return defaultSetup(game, seed, "jump trolls");
    },
    stopWhen: STOP.fatalDeath,
    variants: [
      {
        label: "Morte · take large key con troll vivi",
        skipAutoplay: true,
        drive(game, transcript) {
          const { exec, commands } = makeExec(game, transcript);
          exec("north");
          exec("take large key");
          return commands;
        },
      },
    ],
  },
  {
    id: "death-hulking-goblin",
    title: "DEATH · Hulking Goblin Ambush",
    kind: "death",
    outcomeCode: "death_goblin",
    stepLimit: 20,
    setup(game, seed) {
      return goblinAmbushSetup(game, seed);
    },
    stopWhen: STOP.fatalDeath,
    variants: [
      {
        label: "Morte · wait durante l'imboscata goblin",
        skipAutoplay: true,
        drive(game, transcript) {
          const { exec, commands } = makeExec(game, transcript);
          exec("look");
          exec("wait");
          exec("wait");
          exec("wait");
          return commands;
        },
      },
    ],
  },
  {
    id: "death-gollum-riddles",
    title: "DEATH · Gollum at Deep Dark Lake",
    kind: "death",
    outcomeCode: "death_gollum",
    stepLimit: 30,
    setup(game, seed) {
      return defaultSetup(game, seed, "jump gollum");
    },
    stopWhen: STOP.fatalDeath,
    variants: [
      {
        label: "Morte · answer toaster (due volte)",
        skipAutoplay: true,
        drive(game, transcript) {
          advanceGollumToAwaitingAnswer(game, transcript);
          const { exec, commands } = makeExec(game, transcript);
          exec("answer toaster");
          exec("answer toaster");
          return commands;
        },
      },
      {
        label: "Morte · wait dopo la pocket question",
        skipAutoplay: true,
        drive(game, transcript) {
          advanceGollumToPocketQuestion(game, transcript);
          const { exec, commands } = makeExec(game, transcript);
          exec("wait");
          return commands;
        },
      },
      {
        label: "Morte · anello scade dopo la pocket question",
        skipAutoplay: true,
        drive(game, transcript) {
          advanceGollumToPocketQuestion(game, transcript);
          const { exec, commands } = makeExec(game, transcript);
          exec("wear ring");
          game.player.ringTimer = 1;
          exec("wait");
          return commands;
        },
      },
    ],
  },
  {
    id: "death-mirkwood-spiders",
    title: "DEATH · Mirkwood Spiders",
    kind: "death",
    outcomeCode: "death_spider",
    stepLimit: 30,
    setup(game, seed) {
      return mirkwoodSpiderGroveSetup(game, seed);
    },
    stopWhen: STOP.fatalDeath,
    variants: [
      {
        label: "Morte · wait tra i ragni",
        skipAutoplay: true,
        drive(game, transcript) {
          const { exec, commands } = makeExec(game, transcript);
          for (let i = 0; i < 12 && !game.endgame; i += 1) exec("wait");
          return commands;
        },
      },
    ],
  },
  {
    id: "death-mirkwood-spiders-vulnerable",
    title: "DEATH · Mirkwood Spiders (Vulnerable)",
    kind: "death",
    outcomeCode: "death_spider",
    stepLimit: 30,
    setup(game, seed) {
      return mirkwoodVulnerableSetup(game, seed);
    },
    stopWhen: STOP.fatalDeath,
    variants: [
      {
        label: "Morte · wait (Bilbo stanco e senza lame)",
        skipAutoplay: true,
        drive(game, transcript) {
          const { exec, commands } = makeExec(game, transcript);
          for (let i = 0; i < 12 && !game.endgame; i += 1) exec("wait");
          return commands;
        },
      },
    ],
  },
  {
    id: "death-west-bank-river",
    title: "DEATH · West Bank River Crossing",
    kind: "death",
    outcomeCode: "death_river",
    stepLimit: 100,
    setup(game, seed) {
      return defaultSetup(game, seed, "jump beorn");
    },
    stopWhen: STOP.fatalDeath,
    variants: [
      {
        label: "Morte · swim al West Bank",
        skipAutoplay: true,
        drive(game, transcript) {
          const { autoplayUntil } = require("./route-transcript-lib");
          const prefix = autoplayUntil(
            game,
            (target) => target.currentRoom === "west_bank" && !target.endgame,
            transcript,
            80
          );
          const { exec, commands } = makeExec(game, transcript);
          exec("swim");
          return [...prefix, ...commands];
        },
      },
    ],
  },
  {
    id: "death-cellar-trap-door",
    title: "DEATH · Cellar Trap Door",
    kind: "death",
    outcomeCode: "death_river",
    stepLimit: 20,
    setup(game, seed) {
      return cellarEscapeSetup(game, seed);
    },
    stopWhen: STOP.fatalDeath,
    variants: [
      {
        label: "Morte · jump trap door senza barile",
        skipAutoplay: true,
        drive(game, transcript) {
          const { exec, commands } = makeExec(game, transcript);
          exec("jump trap door");
          return commands;
        },
      },
    ],
  },
  {
    id: "death-smaug-treasure",
    title: "DEATH · Smaug in Lower Halls (treasure)",
    kind: "death",
    outcomeCode: "death_smaug",
    stepLimit: 30,
    setup(game, seed) {
      return defaultSetup(game, seed, "jump smaug");
    },
    stopWhen: STOP.fatalDeath,
    variants: [
      {
        label: "Morte · take treasure con Smaug vivo",
        skipAutoplay: true,
        drive(game, transcript) {
          const { exec, commands } = makeExec(game, transcript);
          exec("wear ring");
          exec("drop majestic sword");
          exec("drop sturdy rope");
          exec("drop brass lantern");
          exec("take treasure");
          for (let i = 0; i < 12 && !game.endgame; i += 1) exec("wait");
          return commands;
        },
      },
    ],
  },
];

module.exports = { DEATH_ROUTES };
