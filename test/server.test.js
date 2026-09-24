import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import test from "node:test";

const PORT = 32179;
let child;

test.before(async () => {
  child = spawn(process.execPath, ["server.js"], { cwd: new URL("..", import.meta.url), env: { ...process.env, PORT: String(PORT) }, stdio: ["ignore", "pipe", "pipe"] });
  await Promise.race([
    once(child.stdout, "data"),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Server did not start")), 5000))
  ]);
});

test.after(() => child?.kill());

test("serves the game, shared engine, assets, and health endpoint", async () => {
  const [index, engine, asset, ruleAsset, health] = await Promise.all([
    fetch(`http://localhost:${PORT}/`), fetch(`http://localhost:${PORT}/shared/game.js`),
    fetch(`http://localhost:${PORT}/assets/white/king.png`), fetch(`http://localhost:${PORT}/assets/rule-next-piece-explodes.svg`),
    fetch(`http://localhost:${PORT}/api/health`)
  ]);
  assert.equal(index.status, 200); assert.match(await index.text(), /Offline game/);
  assert.equal(engine.status, 200); assert.match(await engine.text(), /class GameState/);
  assert.equal(asset.status, 200); assert.equal(asset.headers.get("content-type"), "image/png");
  assert.equal(ruleAsset.status, 200); assert.equal(ruleAsset.headers.get("content-type"), "image/svg+xml");
  assert.deepEqual(await health.json(), { ok: true, rooms: 0 });
});

test("rejects traversal while serving shared files on the deployment platform path shape", async () => {
  const [shared, traversal] = await Promise.all([
    fetch(`http://localhost:${PORT}/shared/game.js`),
    fetch(`http://localhost:${PORT}/shared/../server.js`)
  ]);
  assert.equal(shared.status, 200);
  assert.equal(traversal.status, 404);
});

test("two WebSocket sessions receive authoritative moves and reject out-of-turn input", async t => {
  if (typeof WebSocket === "undefined") return t.skip("This Node runtime has no built-in WebSocket client");
  const white = await openClient(); const whiteMessages = queueMessages(white);
  white.send(JSON.stringify({ type: "create" }));
  const created = await whiteMessages.next(message => message.type === "joined");
  const initialWhite = await whiteMessages.next(message => message.type === "state");
  assert.equal(initialWhite.role, "white");

  const black = await openClient(); const blackMessages = queueMessages(black);
  black.send(JSON.stringify({ type: "join", room: created.room }));
  const joined = await blackMessages.next(message => message.type === "joined");
  assert.equal(joined.role, "black");
  await blackMessages.next(message => message.type === "state");
  await whiteMessages.next(message => message.type === "state" && message.connected.black);

  black.send(JSON.stringify({ type: "action", action: "move", from: { x: 0, y: 1 }, to: { x: 0, y: 3 } }));
  const rejected = await blackMessages.next(message => message.type === "error");
  assert.match(rejected.message, /turn/i);

  white.send(JSON.stringify({ type: "action", action: "move", from: { x: 4, y: 6 }, to: { x: 4, y: 4 } }));
  const blackState = await blackMessages.next(message => message.type === "state" && message.state.boards.Normal[4][4]?.type === "Pawn");
  assert.equal(blackState.state.whiteToMove, false);
  assert.equal(blackState.state.boards.Normal[6][4], null);

  black.send(JSON.stringify({ type: "action", action: "move", from: { x: 4, y: 1 }, to: { x: 4, y: 3 } }));
  const whiteState = await whiteMessages.next(message => message.type === "state" && message.state.boards.Normal[3][4]?.type === "Pawn");
  assert.equal(whiteState.state.whiteToMove, true);
  white.close(); black.close();
});

test("multiplayer supports online rule selection, draw agreement, and resignation", async t => {
  if (typeof WebSocket === "undefined") return t.skip("This Node runtime has no built-in WebSocket client");

  const white = await openClient();
  const whiteMessages = queueMessages(white);
  white.send(JSON.stringify({ type: "create" }));
  const created = await whiteMessages.next(message => message.type === "joined");
  await whiteMessages.next(message => message.type === "state");

  const black = await openClient();
  const blackMessages = queueMessages(black);
  black.send(JSON.stringify({ type: "join", room: created.room }));
  await blackMessages.next(message => message.type === "joined");
  await blackMessages.next(message => message.type === "state");
  await whiteMessages.next(message => message.type === "state" && message.connected.black);

  const moves = [
    [white, whiteMessages, { x: 0, y: 6 }, { x: 0, y: 5 }],
    [black, blackMessages, { x: 0, y: 1 }, { x: 0, y: 2 }],
    [white, whiteMessages, { x: 1, y: 6 }, { x: 1, y: 5 }],
    [black, blackMessages, { x: 1, y: 1 }, { x: 1, y: 2 }]
  ];
  for (const [client, messages, from, to] of moves) {
    client.send(JSON.stringify({ type: "action", action: "move", from, to }));
    await messages.next(message => message.type === "state");
  }
  const picker = await whiteMessages.next(message => message.type === "state" && message.state.rulePicker);
  assert.equal(picker.state.boards.Heaven[1][1].type, "Angel");
  assert.equal(picker.state.boards.Heaven[2][5].type, "Atheism");

  white.send(JSON.stringify({ type: "action", action: "rule", rule: "WILD_HORSE" }));
  const ruleState = await blackMessages.next(message => message.type === "state" && message.state.rules.includes("WILD_HORSE"));
  assert.equal(ruleState.state.boards.Normal[3][4].type, "WildHorse");

  white.send(JSON.stringify({ type: "action", action: "offerDraw" }));
  const offer = await blackMessages.next(message => message.type === "state" && message.state.drawOffer === "White");
  assert.equal(offer.state.drawOffer, "White");
  black.send(JSON.stringify({ type: "action", action: "respondDraw", accept: true }));
  const draw = await whiteMessages.next(message => message.type === "state" && message.state.draw);
  assert.equal(draw.state.gameOver, true);

  const resignWhite = await openClient();
  const resignMessages = queueMessages(resignWhite);
  resignWhite.send(JSON.stringify({ type: "create" }));
  await resignMessages.next(message => message.type === "joined");
  await resignMessages.next(message => message.type === "state");
  resignWhite.send(JSON.stringify({ type: "action", action: "resign" }));
  const resigned = await resignMessages.next(message => message.type === "state" && message.state.endReason === "resignation");
  assert.equal(resigned.state.winner, "Black");

  white.close(); black.close(); resignWhite.close();
});

function openClient() {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://localhost:${PORT}/ws`);
    socket.addEventListener("open", () => resolve(socket), { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
}

test("rule ownership alternates independently of turns and cannot be bypassed by purchases", async t => {
  if (typeof WebSocket === "undefined") return t.skip("This Node runtime has no built-in WebSocket client");
  const white = await openClient(), black = await openClient();
  t.after(() => { white.close(); black.close(); });
  const whiteMessages = queueMessages(white), blackMessages = queueMessages(black);
  white.send(JSON.stringify({ type: "create" }));
  const created = await whiteMessages.next(message => message.type === "joined");
  await whiteMessages.next(message => message.type === "state");
  black.send(JSON.stringify({ type: "join", room: created.room }));
  await blackMessages.next(message => message.type === "joined");
  await blackMessages.next(message => message.type === "state");
  await whiteMessages.next(message => message.type === "state" && message.connected.black);

  const move = async (client, messages, from, to) => {
    client.send(JSON.stringify({ type: "action", action: "move", from, to, board: "Normal" }));
    return messages.next(message => message.type === "state" &&
      message.state.history.at(-1)?.type === "move" &&
      message.state.history.at(-1).from.x === from.x && message.state.history.at(-1).from.y === from.y &&
      message.state.history.at(-1).to.x === to.x && message.state.history.at(-1).to.y === to.y);
  };
  await move(white, whiteMessages, { x: 0, y: 6 }, { x: 0, y: 5 });
  await move(black, blackMessages, { x: 0, y: 1 }, { x: 0, y: 2 });
  await move(white, whiteMessages, { x: 1, y: 6 }, { x: 1, y: 5 });
  await move(black, blackMessages, { x: 1, y: 1 }, { x: 1, y: 2 });
  await whiteMessages.next(message => message.type === "state" && message.state.rulePicker);
  black.send(JSON.stringify({ type: "action", action: "rule", rule: "MORE_GOLD" }));
  assert.match((await blackMessages.next(message => message.type === "error")).message, /rule choice/i);
  white.send(JSON.stringify({ type: "action", action: "buy", id: "pawn", x: 3, y: 3 }));
  assert.match((await whiteMessages.next(message => message.type === "error")).message, /choice/i);
  white.send(JSON.stringify({ type: "action", action: "upgrade", id: "unicorn", x: 1, y: 7 }));
  assert.match((await whiteMessages.next(message => message.type === "error")).message, /choice/i);
  white.send(JSON.stringify({ type: "action", action: "rule", rule: "PAWNS_MOVE_FOUR" }));
  await whiteMessages.next(message => message.type === "state" && message.state.rules.includes("PAWNS_MOVE_FOUR"));

  for (let i = 0; i < 3; i++) {
    const forward = i % 2 === 0;
    await move(white, whiteMessages, forward ? { x: 1, y: 7 } : { x: 2, y: 5 }, forward ? { x: 2, y: 5 } : { x: 1, y: 7 });
    await move(black, blackMessages, forward ? { x: 1, y: 0 } : { x: 2, y: 2 }, forward ? { x: 2, y: 2 } : { x: 1, y: 0 });
  }
  const picker = await whiteMessages.next(message => message.type === "state" && message.state.rulePickerColor === "Black");
  assert.equal(picker.state.whiteToMove, true);
  white.send(JSON.stringify({ type: "action", action: "rule", rule: "MORE_GOLD" }));
  assert.match((await whiteMessages.next(message => message.type === "error")).message, /rule choice/i);
  black.send(JSON.stringify({ type: "action", action: "rule", rule: "MORE_GOLD" }));
  const selected = await whiteMessages.next(message => message.type === "state" && message.state.history.at(-1)?.rule === "MORE_GOLD");
  assert.equal(selected.state.whiteToMove, true);
  assert.equal(selected.state.rulePicker, false);
  assert.equal(selected.state.whiteGP, 15);
  assert.equal(selected.state.blackGP, 15);
  white.send(JSON.stringify({ type: "action", action: "buy", id: "pawn", x: 3, y: 3, board: "Hell" }));
  assert.match((await whiteMessages.next(message => message.type === "error")).message, /material board/i);
});

function queueMessages(socket) {
  const messages = []; const waiters = [];
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    const index = waiters.findIndex(waiter => waiter.predicate(message));
    if (index >= 0) waiters.splice(index, 1)[0].resolve(message); else messages.push(message);
  });
  return {
    next(predicate) {
      const index = messages.findIndex(predicate);
      if (index >= 0) return Promise.resolve(messages.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const waiter = { predicate, resolve }; waiters.push(waiter);
        setTimeout(() => { const found = waiters.indexOf(waiter); if (found >= 0) waiters.splice(found, 1); reject(new Error("Timed out waiting for WebSocket message")); }, 4000);
      });
    }
  };
}
