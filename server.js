import { createHash, randomBytes } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, isAbsolute, join, normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { GameState, randomJoinCode } from "./shared/game.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC = join(ROOT, "public");
const PORT = Number(process.env.PORT || 3000);
const rooms = new Map();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon"
};

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (url.pathname === "/api/health") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  let requestPath = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const isShared = requestPath.startsWith("shared/");
  const base = isShared ? join(ROOT, "shared") : PUBLIC;
  if (isShared) requestPath = requestPath.slice("shared/".length);
  const filePath = normalize(join(base, requestPath));
  const pathFromBase = relative(base, filePath);
  const escapesBase = pathFromBase === ".." || pathFromBase.startsWith(`..${sep}`) || isAbsolute(pathFromBase);
  if (escapesBase || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "content-type": MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
    "cache-control": extname(filePath).toLowerCase() === ".png" ? "public, max-age=86400" : "no-cache"
  });
  createReadStream(filePath).pipe(response);
}

function encodeFrame(payload, opcode = 1) {
  const data = Buffer.from(payload);
  let header;
  if (data.length < 126) {
    header = Buffer.from([0x80 | opcode, data.length]);
  } else if (data.length < 65536) {
    header = Buffer.alloc(4); header[0] = 0x80 | opcode; header[1] = 126; header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10); header[0] = 0x80 | opcode; header[1] = 127; header.writeBigUInt64BE(BigInt(data.length), 2);
  }
  return Buffer.concat([header, data]);
}

function createPeer(socket) {
  const peer = { socket, buffer: Buffer.alloc(0), room: null, role: null, token: null, closed: false };
  peer.send = data => { if (!peer.closed && socket.writable) socket.write(encodeFrame(JSON.stringify(data))); };
  peer.close = () => { if (!peer.closed) socket.end(encodeFrame("", 8)); };
  return peer;
}

function decodeFrames(peer, chunk, onMessage) {
  peer.buffer = Buffer.concat([peer.buffer, chunk]);
  while (peer.buffer.length >= 2) {
    const first = peer.buffer[0], second = peer.buffer[1];
    const opcode = first & 0x0f, masked = Boolean(second & 0x80);
    let length = second & 0x7f, offset = 2;
    if (length === 126) { if (peer.buffer.length < 4) return; length = peer.buffer.readUInt16BE(2); offset = 4; }
    else if (length === 127) { if (peer.buffer.length < 10) return; const long = peer.buffer.readBigUInt64BE(2); if (long > BigInt(Number.MAX_SAFE_INTEGER)) return peer.close(); length = Number(long); offset = 10; }
    const maskBytes = masked ? 4 : 0;
    if (peer.buffer.length < offset + maskBytes + length) return;
    const mask = masked ? peer.buffer.subarray(offset, offset + 4) : null;
    offset += maskBytes;
    const payload = Buffer.from(peer.buffer.subarray(offset, offset + length));
    peer.buffer = peer.buffer.subarray(offset + length);
    if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    if (opcode === 8) { peer.close(); return; }
    if (opcode === 9) { socketWrite(peer, encodeFrame(payload, 10)); continue; }
    if (opcode !== 1) continue;
    try { onMessage(JSON.parse(payload.toString("utf8"))); }
    catch { peer.send({ type: "error", message: "Malformed message." }); }
  }
}

function socketWrite(peer, frame) { if (!peer.closed && peer.socket.writable) peer.socket.write(frame); }
function makeToken() { return randomBytes(24).toString("base64url"); }
function colorForRole(role) { return role === "white" ? "White" : role === "black" ? "Black" : null; }

function makeRoom() {
  let code;
  do code = randomJoinCode(); while (rooms.has(code));
  const room = {
    code,
    game: new GameState({ online: true, seed: code, mode: "online" }),
    players: {
      white: { token: makeToken(), peer: null, lastSeen: Date.now() },
      black: null
    },
    spectators: new Set(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  rooms.set(code, room);
  return room;
}

function attach(peer, room, role, token) {
  if (peer.room) detach(peer);
  peer.room = room; peer.role = role; peer.token = token || null;
  if (role === "spectator") room.spectators.add(peer);
  else {
    const slot = room.players[role];
    if (slot.peer && slot.peer !== peer) slot.peer.close();
    slot.peer = peer; slot.lastSeen = Date.now();
  }
}

function detach(peer) {
  const room = peer.room; if (!room) return;
  if (peer.role === "spectator") room.spectators.delete(peer);
  else if (room.players[peer.role]?.peer === peer) { room.players[peer.role].peer = null; room.players[peer.role].lastSeen = Date.now(); }
  peer.room = null;
  broadcast(room);
}

function roomMessage(room, recipient) {
  return {
    type: "state", room: room.code, role: recipient.role,
    connected: { white: Boolean(room.players.white?.peer), black: Boolean(room.players.black?.peer) },
    state: room.game.toSnapshot()
  };
}

function broadcast(room) {
  for (const role of ["white", "black"]) { const peer = room.players[role]?.peer; if (peer) peer.send(roomMessage(room, peer)); }
  for (const peer of room.spectators) peer.send(roomMessage(room, peer));
}

function joinRoom(peer, code, suppliedToken) {
  const room = rooms.get(String(code || "").trim().toLowerCase());
  if (!room) return peer.send({ type: "error", message: "No online game uses that join code." });
  for (const role of ["white", "black"]) {
    const slot = room.players[role];
    if (slot && suppliedToken && slot.token === suppliedToken) {
      attach(peer, room, role, slot.token);
      peer.send({ type: "joined", room: room.code, role, token: slot.token, resumed: true });
      broadcast(room); return;
    }
  }
  if (!room.players.black) {
    room.players.black = { token: makeToken(), peer: null, lastSeen: Date.now() };
    attach(peer, room, "black", room.players.black.token);
    peer.send({ type: "joined", room: room.code, role: "black", token: room.players.black.token, resumed: false });
    broadcast(room); return;
  }
  attach(peer, room, "spectator", null);
  peer.send({ type: "joined", room: room.code, role: "spectator", token: null, resumed: false });
  broadcast(room);
}

function handleAction(peer, message) {
  const room = peer.room;
  if (!room || !["white", "black"].includes(peer.role)) return peer.send({ type: "error", message: "Join as a player before acting." });
  const game = room.game;
  const actorColor = colorForRole(peer.role);
  const waitingDecision = game.pendingDecision;
  const turnIndependent = ["resign", "offerDraw", "respondDraw"].includes(message.action);
  if (message.action === "decision") {
    if (!waitingDecision || waitingDecision.color !== actorColor) return peer.send({ type: "error", message: "That choice belongs to the other player." });
  } else if (!turnIndependent && actorColor !== game.currentColor()) {
    return peer.send({ type: "error", message: "Wait for your turn." });
  }
  let accepted = false;
  const coordinates = values => values.every(value => Number.isInteger(value) && value >= 0 && value < 8);
  switch (message.action) {
    case "move": accepted = coordinates([message.from?.x, message.from?.y, message.to?.x, message.to?.y]) ? game.move(message.from, message.to) : game.reject("Invalid board coordinates."); break;
    case "buy": accepted = coordinates([message.x, message.y]) ? game.buy(String(message.id || ""), message.x, message.y) : game.reject("Invalid board coordinates."); break;
    case "upgrade": accepted = coordinates([message.x, message.y]) ? game.upgrade(String(message.id || ""), message.x, message.y) : game.reject("Invalid board coordinates."); break;
    case "switchBoard": accepted = game.switchBoard(); break;
    case "rule": accepted = game.rulePicker && game.availableRules.includes(message.rule) ? game.addRule(message.rule) : game.reject("No rule may be selected now."); break;
    case "decision": accepted = game.decision(message.choice); break;
    case "resign": accepted = game.resign(actorColor); break;
    case "offerDraw": accepted = game.offerDraw(actorColor); break;
    case "respondDraw": accepted = game.respondDraw(actorColor, message.accept === true); break;
    default: game.reject("Unknown action.");
  }
  if (!accepted) peer.send({ type: "error", message: game.lastEvent?.message || "Action rejected." });
  else { room.updatedAt = Date.now(); broadcast(room); }
}

function handleMessage(peer, message) {
  if (!message || typeof message.type !== "string") return peer.send({ type: "error", message: "Invalid message." });
  if (message.type === "create") {
    const room = makeRoom(); attach(peer, room, "white", room.players.white.token);
    peer.send({ type: "joined", room: room.code, role: "white", token: room.players.white.token, resumed: false });
    broadcast(room); return;
  }
  if (message.type === "join" || message.type === "resume") return joinRoom(peer, message.room, message.token);
  if (message.type === "action") return handleAction(peer, message);
  if (message.type === "ping") return peer.send({ type: "pong", at: Date.now() });
  peer.send({ type: "error", message: "Unknown message type." });
}

const server = createServer(serveStatic);
server.on("upgrade", (request, socket) => {
  if (request.headers.upgrade?.toLowerCase() !== "websocket" || request.url !== "/ws") return socket.destroy();
  const key = request.headers["sec-websocket-key"];
  if (!key) return socket.destroy();
  const accept = createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
  socket.write(["HTTP/1.1 101 Switching Protocols", "Upgrade: websocket", "Connection: Upgrade", `Sec-WebSocket-Accept: ${accept}`, "\r\n"].join("\r\n"));
  const peer = createPeer(socket);
  socket.on("data", chunk => decodeFrames(peer, chunk, message => handleMessage(peer, message)));
  socket.on("close", () => { peer.closed = true; detach(peer); });
  socket.on("error", () => { peer.closed = true; detach(peer); });
});

const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const noConnections = !room.players.white?.peer && !room.players.black?.peer && room.spectators.size === 0;
    if (noConnections && now - room.updatedAt > 24 * 60 * 60 * 1000) rooms.delete(code);
  }
}, 60 * 60 * 1000);
cleanup.unref();

server.listen(PORT, "0.0.0.0", () => console.log(`Jreg Chess is running at http://localhost:${PORT}`));

export { server, rooms };
