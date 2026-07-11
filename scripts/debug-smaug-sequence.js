const { bootGame, outputLines } = require("./headless-boot");

function snap(label, game) {
  console.log(`\n=== ${label} ===`);
  console.log(`room=${game.currentRoom} smaugstate=${game.flags.smaugstate || "-"} turn=${game.turnCount}`);
  console.log(`weakspot=${game.flags.smaug_weakspot_known} shared=${game.flags.smaug_weakspot_shared_with_bard}`);
  console.log(`sighted=${game.flags.smaug_sighted_from_ravenhill} thrush=${game.flags.thrush_message_sent}`);
  console.log(`autoplay=${game.nextAutoplayCommand?.()}`);
  console.log(`image=${game.temporaryImage?.file || "-"}`);
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
snap("arrived lower_halls", g);
outputLines.length = 0;
g.execute("look");
console.log(outputLines.join("\n").slice(0, 800));
outputLines.length = 0;
g.execute("wear ring");
g.execute("ask smaug about treasure");
snap("after weak spot", g);
while (g.currentRoom !== "stoe_of_ravenhill" && !g.endgame && guard++ < 40) {
  const c = g.nextAutoplayCommand();
  if (!c) break;
  g.execute(c);
}
snap("arrived ravenhill", g);
outputLines.length = 0;
g.execute('say to bard "shoot dragon"');
console.log(outputLines.join("\n").slice(0, 1200));
snap("after shoot 1", g);
outputLines.length = 0;
g.execute('say to bard "shoot dragon"');
console.log(outputLines.join("\n").slice(0, 1200));
snap("after shoot 2", g);
process.exit(0);
