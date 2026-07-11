const { bootGame, outputLines } = require("./headless-boot");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const g = bootGame();
g.execute("jump front_gate");
g.execute("ask bard to follow me");
g.execute('say to bard "get black arrow from quiver"');
g.execute("read map");
g.execute("north east");
for (let i = 0; i < 5; i += 1) g.execute("wait");
g.execute("unlock secret door with curious key");
g.execute("open secret door");
g.execute("east");
let guard = 0;
while (g.currentRoom !== "lower_halls" && !g.endgame && guard++ < 40) {
  const c = g.nextAutoplayCommand();
  if (!c) break;
  g.execute(c);
}

if (g.flags.smaugstate !== "sleeping") {
  fail(`Expected sleeping Smaug on first lower_halls arrival, got ${g.flags.smaugstate}`);
}

outputLines.length = 0;
g.execute("look");
const look = outputLines.join(" ");
if (/begins to search the hall in deadly earnest/i.test(look)) {
  fail("First lower_halls look mentions Smaug searching");
}
if (!/lies upon the gold/i.test(look)) {
  fail("First lower_halls look does not describe sleeping Smaug");
}

g.execute("wear ring");
g.execute("ask smaug about treasure");
if (!g.flags.smaug_weakspot_known) fail("Weak spot not discovered");

const shareCmd = g.nextAutoplayCommand();
if (shareCmd !== "ask bard about the weak spot") {
  fail(`Expected weak-spot sharing autoplay, got ${shareCmd}`);
}
g.execute(shareCmd);

while (g.currentRoom !== "stoe_of_ravenhill" && !g.endgame && guard++ < 40) {
  const c = g.nextAutoplayCommand();
  if (!c) break;
  g.execute(c);
}

const waitCmd = g.nextAutoplayCommand();
if (waitCmd !== "wait") fail(`Expected wait at Ravenhill before sighting, got ${waitCmd}`);

g.execute("wait");
if (!g.flags.thrush_message_sent && !g.flags.bard_ready_at_ravenhill) fail("Ravenhill staging did not begin");
g.execute("wait");
if (!g.flags.smaug_sighted_from_ravenhill) fail("Smaug not sighted after Ravenhill waits");

const thrushSeen = g.temporaryImage?.file === "thrush_warning_ravenhill.png"
  || g.temporaryImage?.file === "ravenhill_dragon_sighting.png";
if (!thrushSeen && !g.flags.thrush_message_sent) fail("Thrush beat missing");

g.execute('say to bard "shoot dragon"');
if (!g.flags.dragondefeated) fail("Dragon not defeated after sighting and shot");

console.log("PASS: front_gate Smaug/Ravenhill sequence");
process.exit(0);
