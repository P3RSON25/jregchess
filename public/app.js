import {
  GameState, COLORS, LARGE_SIZES, RULE_DESCRIPTIONS, RULE_ICONS, RULE_PICKER, SHOP_ITEMS, UPGRADES, imageKey
} from "/shared/game.js";
import { BOT_TIME_BUDGET_MS } from "/shared/bot.js";
import { planBotTurn } from "/shared/bot.js";
import { loadValueNet, valueNetLoaded } from "/shared/valueNet.js";
import { loadPolicyNet, policyNetLoaded } from "/shared/policyNet.js";

let nnStatus = "handcrafted eval";
// Learned eval is optional: ml/value_v1.json is served at /ml/*.json when
// training has produced weights. Missing file = silent fallback, no error UI.
fetch("/ml/value_v1.json", { cache: "no-store" })
  .then(response => { if (!response.ok) throw new Error("no weights"); return response.json(); })
  .then(json => { loadValueNet(json); nnStatus = "neural eval"; renderStatus(); })
  .catch(() => { nnStatus = "handcrafted eval"; });
// Policy v2 (trained on current-strength play) preferred, v1 as fallback.
fetch("/ml/policy_v2.json", { cache: "no-store" })
  .then(response => { if (!response.ok) throw new Error("no v2"); return response.json(); })
  .then(json => { loadPolicyNet(json); renderStatus(); })
  .catch(() => fetch("/ml/policy_v1.json", { cache: "no-store" })
    .then(response => { if (!response.ok) throw new Error("no policy"); return response.json(); })
    .then(json => { loadPolicyNet(json); renderStatus(); })
    .catch(() => {}));

const $ = selector => document.querySelector(selector);
const menu = $("#menu");
const gameScreen = $("#game");
const boardElement = $("#board");
const modalRoot = $("#modal-root");
const toastRoot = $("#toast-root");
const asset = name => name ? `/assets/${name}` : "";

let game = null;
let localRole = "offline";
let selected = null;
let pendingTool = null;
let socket = null;
let room = null;
let token = null;
let connected = false;
let lastEventId = 0;
let eventTimer = null;
let roomConnections = { white: false, black: false };
let viewBoard = "Normal";
let botGame = false;
let botColor = null;
let botDifficulty = "normal";
let botThinking = false;

function currentColor() { return game?.whiteToMove ? COLORS.WHITE : COLORS.BLACK; }
function playerColor() { return localRole === "white" ? COLORS.WHITE : localRole === "black" ? COLORS.BLACK : null; }
function isBotTurn() {
  if (!botGame || !game || game.gameOver) return false;
  if (game.pendingDecision) return game.pendingDecision.color === botColor;
  if (game.rulePicker) return game.rulePickerColor === botColor;
  return currentColor() === botColor;
}
function canAct() {
  if (botGame) return !isBotTurn() && !botThinking;
  return localRole === "offline" || playerColor() === currentColor();
}
function isOnline() { return localRole === "white" || localRole === "black" || localRole === "spectator"; }
function canPickRule() {
  if (botGame) return !isBotTurn() && !botThinking && game?.rulePickerColor !== botColor;
  return localRole !== "spectator" && (!isOnline() || game?.rulePickerColor === playerColor());
}
function isMirrored() { return localRole === "black" || (botGame && botColor === COLORS.WHITE); }
function displayCoordinate(x, y) { return isMirrored() ? { x: 7 - x, y: 7 - y } : { x, y }; }
function gameCoordinate(x, y) { return displayCoordinate(x, y); }

function showGame() {
  menu.classList.add("hidden"); gameScreen.classList.remove("hidden");
  $("#mode-badge").textContent = isOnline() ? "ONLINE" : botGame ? "BOT" : "OFFLINE";
  $("#multiplayer-card").classList.toggle("hidden", !isOnline());
  render();
  maybeBotMove();
}

function resetBotWorker() {
  try { botWorker?.terminate(); } catch { /* ignore */ }
  botWorker = null;
  invalidateBotQueue();
}

function startOffline() {
  resetBotWorker();
  localRole = "offline"; room = null; token = null; connected = true; viewBoard = "Normal"; botGame = false; botColor = null; botThinking = false; game = new GameState({ mode: "offline" }); selected = null; pendingTool = null; showGame();
}

function startBot() {
  resetBotWorker();
  const difficulty = $("#bot-difficulty")?.value || "normal";
  const humanColor = $("#bot-color")?.value || "White";
  botDifficulty = ["easy", "normal", "hard"].includes(difficulty) ? difficulty : "normal";
  botColor = humanColor === "White" ? COLORS.BLACK : COLORS.WHITE;
  localRole = "offline"; room = null; token = null; connected = true; viewBoard = "Normal";
  botGame = true; botThinking = false;
  game = new GameState({ mode: "offline" }); selected = null; pendingTool = null; showGame();
  maybeBotMove();
}

let botWorker = null;
let botRequestId = 0;
let botWatchdog = null;
let applyingPlan = false;

function invalidateBotQueue() {
  botRequestId++;
  clearTimeout(botWatchdog);
  applyingPlan = false;
}

function getBotWorker() {
  if (botWorker || typeof Worker === "undefined") return botWorker;
  try {
    botWorker = new Worker("/bot-worker.js", { type: "module" });
    botWorker.addEventListener("message", handleBotWorkerMessage);
    botWorker.addEventListener("error", () => { botWorker = null; });
  } catch {
    botWorker = null;
  }
  return botWorker;
}

function maybeBotMove() {
  if (!botGame || !game || game.gameOver || botThinking || applyingPlan) return;
  if (!isBotTurn()) return;
  botThinking = true;
  render();
  const worker = getBotWorker();
  if (worker) {
    // Async path: search runs off the main thread; the board stays alive.
    const id = ++botRequestId;
    const snapshot = game.toSnapshot();
    const watchdogMs = (BOT_TIME_BUDGET_MS?.[botDifficulty] ?? 450) + 8000;
    clearTimeout(botWatchdog);
    botWatchdog = setTimeout(() => {
      // Worker stall: drop it and finish synchronously so play never hangs.
      try { botWorker?.terminate(); } catch { /* ignore */ }
      botWorker = null;
      if (id !== botRequestId) return;
      finishBotTurn(null);
    }, watchdogMs);
    try {
      worker.postMessage({ id, snapshot, difficulty: botDifficulty, opts: {} });
      return;
    } catch {
      clearTimeout(botWatchdog);
      botWorker = null;
      // fall through to synchronous fallback
    }
  }
  // Synchronous fallback (no Worker support, or post failed).
  setTimeout(() => {
    if (!botThinking) return;
    try {
      runBotTurn();
    } finally {
      botThinking = false;
      render();
      if (isBotTurn()) maybeBotMove();
    }
  }, 60);
}

function handleBotWorkerMessage(event) {
  const { id, ok, plan } = event.data || {};
  if (id !== botRequestId) return; // stale (new game started)
  clearTimeout(botWatchdog);
  if (!botThinking) return;
  finishBotTurn(ok ? plan : null);
}

function finishBotTurn(plan) {
  // Applies a worker plan through the same guarded path as sync search.
  // Null plan (worker failure/timeout) falls back to a synchronous think.
  botThinking = false;
  applyingPlan = true;
  try {
    applyBotPlan(plan);
  } finally {
    applyingPlan = false;
  }
  render();
  // Chain: upgrades don't flip turn, decisions/rules may leave bot to move.
  if (isBotTurn()) maybeBotMove();
}

function applyBotPlan(plan) {
  if (!plan) {
    render();
    if (!botGame || !game || game.gameOver) return;
    if (!isBotTurn()) return;
    botThinking = true;
    render();
    setTimeout(() => {
      try {
        runBotTurn();
      } finally {
        botThinking = false;
        render();
        if (isBotTurn()) maybeBotMove();
      }
    }, 60);
    return;
  }
  for (const upgrade of plan.upgrades || []) {
    if (!game || game.gameOver || game.pendingDecision || game.rulePicker) break;
    if (game.currentColor() !== botColor) break;
    applyLocalSilent({ action: "upgrade", id: upgrade.id, x: upgrade.x, y: upgrade.y, board: upgrade.board });
  }
  if (plan.action) applyBotAction(plan.action);
}

function applyLocalSilent(action) {
  // Worker-plan application without re-triggering the bot loop per step;
  // finishBotTurn chains exactly once at the end.
  if (action.action === "upgrade") game.upgrade(action.id, action.x, action.y, action.board || viewBoard);
  else applyLocal(action);
}

function applyBotAction(action) {
  if (!game || game.gameOver) return;
  if (action.action === "decision") {
    if (game.pendingDecision?.color === botColor) applyLocal({ action: "decision", choice: action.choice });
  } else if (action.action === "rule") {
    if (game.rulePicker && game.rulePickerColor === botColor) applyLocal({ action: "rule", rule: action.rule });
  } else if (action.action === "move") {
    if (!game.gameOver && !game.pendingDecision && !game.rulePicker && game.currentColor() === botColor) {
      applyLocal({ action: "move", from: action.from, to: action.to, board: action.board });
    }
  } else if (action.action === "buy") {
    if (!game.gameOver && !game.pendingDecision && !game.rulePicker && game.currentColor() === botColor) {
      applyLocal({ action: "buy", id: action.id, x: action.x, y: action.y, board: action.board });
    }
  }
}

function runBotTurn() {
  if (!game || game.gameOver) return;
  // Bot may need to answer a decision/rule even when it is not the chess turn.
  // planBotTurn handles decision/rule/move+upgrade closure in priority order.
  const plan = planBotTurn(game, botDifficulty);
  if (!plan) return;
  for (const upgrade of plan.upgrades || []) {
    if (game.gameOver || game.pendingDecision || game.rulePicker) break;
    if (game.currentColor() !== botColor) break;
    applyLocal({ action: "upgrade", id: upgrade.id, x: upgrade.x, y: upgrade.y, board: upgrade.board });
  }
  if (!plan.action) return;
  const action = plan.action;
  if (action.action === "decision") {
    if (game.pendingDecision?.color === botColor) applyLocal({ action: "decision", choice: action.choice });
  } else if (action.action === "rule") {
    if (game.rulePicker && game.rulePickerColor === botColor) applyLocal({ action: "rule", rule: action.rule });
  } else if (action.action === "move") {
    if (!game.gameOver && !game.pendingDecision && !game.rulePicker && game.currentColor() === botColor) {
      applyLocal({ action: "move", from: action.from, to: action.to, board: action.board });
    }
  } else if (action.action === "buy") {
    if (!game.gameOver && !game.pendingDecision && !game.rulePicker && game.currentColor() === botColor) {
      applyLocal({ action: "buy", id: action.id, x: action.x, y: action.y, board: action.board });
    }
  }
}

function openSocket(onOpen) {
  if (socket && socket.readyState === WebSocket.OPEN) return onOpen();
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}/ws`);
  socket.addEventListener("open", () => { connected = true; onOpen(); renderStatus(); });
  socket.addEventListener("message", event => handleServerMessage(JSON.parse(event.data)));
  socket.addEventListener("close", () => { connected = false; renderStatus(); toast("Connection lost. Reconnect by refreshing or using the same join code."); });
  socket.addEventListener("error", () => { connected = false; renderStatus(); });
}

function startCreate() {
  resetBotWorker();
  botGame = false; botColor = null; botThinking = false;
  localRole = "white";
  openSocket(() => socket.send(JSON.stringify({ type: "create" })));
}

function startJoin() {
  const code = window.prompt("Enter join code:");
  if (!code) return;
  resetBotWorker();
  botGame = false; botColor = null; botThinking = false;
  localRole = "black";
  openSocket(() => {
    const saved = localStorage.getItem(`jreg-chess:${code.trim().toLowerCase()}`);
    socket.send(JSON.stringify({ type: "join", room: code, token: saved || undefined }));
  });
}

function handleServerMessage(message) {
  if (message.type === "joined") {
    room = message.room; token = message.token; localRole = message.role;
    if (token) localStorage.setItem(`jreg-chess:${room}`, token);
    history.replaceState(null, "", `/?room=${room}`);
    showGame();
    return;
  }
  if (message.type === "state") {
    room = message.room; localRole = message.role || localRole; connected = true; roomConnections = message.connected || roomConnections;
    game = GameState.fromSnapshot(message.state);
    if (!game.board(viewBoard)) viewBoard = game.activeBoardNames()[0] || "Normal";
    if (message.state.lastEvent?.id > lastEventId) { lastEventId = message.state.lastEvent.id; displayEvent(message.state.lastEvent); }
    selected = null;
    render();
    return;
  }
  if (message.type === "error") { toast(message.message || "Action rejected."); renderStatus(); }
}

function sendAction(action) {
  if (!isOnline()) { applyLocal(action); return; }
  if (!socket || socket.readyState !== WebSocket.OPEN) return toast("Not connected to the game server.");
  socket.send(JSON.stringify({ type: "action", ...action }));
}

function applyLocal(action) {
  let accepted = false;
  if (action.action === "move") accepted = game.move(action.from, action.to, action.board || viewBoard);
  if (action.action === "buy") accepted = game.buy(action.id, action.x, action.y, action.board || viewBoard);
  if (action.action === "upgrade") accepted = game.upgrade(action.id, action.x, action.y, action.board || viewBoard);
  if (action.action === "rule") accepted = game.addRule(action.rule);
  if (action.action === "decision") accepted = game.decision(action.choice);
  if (!accepted && game.lastEvent) displayEvent(game.lastEvent);
  else if (game.lastEvent?.id > lastEventId) { lastEventId = game.lastEvent.id; displayEvent(game.lastEvent); }
  render();
  maybeBotMove();
}

function squareClass(boardName, x, y) {
  const parity = (x + y) % 2 === 0 ? "light" : "dark";
  return `${boardName.toLowerCase()}-${parity}`;
}

function fallbackLabel(piece) {
  const names = { SuperKing: "SUPER\nKING", SuicideBomber: "BOMB", KnightQueen: "N-Q", BishopKnight: "B-N", RookKnight: "R-N", BallQueen: "BALL\nQ", SuperBishop: "S-B", AngryRook: "A-ROOK", RookTower: "TOWER", TrojanHorse: "TROJAN", WildHorse: "HORSE", AggroDevil: "DEVIL", AggroAngel: "ANGEL" };
  return names[piece.type] || piece.type;
}

function render() {
  if (!game) return;
  if (!game.board(viewBoard)) viewBoard = game.activeBoardNames()[0] || "Normal";
  const boardName = viewBoard;
  $("#game-title").textContent = game.draw ? "Draw" : game.gameOver ? `${game.winner} wins` : botThinking ? `Bot (${botColor}) is thinking...` : `${game.whiteToMove ? "White" : "Black"} to move`;
  $("#board-name").textContent = boardName;
  $("#side-label").textContent = botGame ? `You play ${botColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE} · Bot ${botDifficulty}` : localRole === "offline" ? `${game.whiteToMove ? "White" : "Black"}'s side` : localRole === "spectator" ? "Spectator" : `${localRole[0].toUpperCase() + localRole.slice(1)}'s side`;
  $("#money-label").innerHTML = `White GP: ${game.whiteGP}<br>Black GP: ${game.blackGP}`;
  $("#room-code").textContent = room || "-----";
  $("#draw-offer-button").disabled = !isOnline() || localRole === "spectator" || game.gameOver || Boolean(game.drawOffer);
  $("#resign-button").disabled = !isOnline() || localRole === "spectator" || game.gameOver;
  renderStatus();
  boardElement.replaceChildren();
  const tilesLayer = document.createElement("div");
  tilesLayer.className = "board-tiles";
  const pieceLayer = document.createElement("div");
  pieceLayer.className = "piece-layer";
  boardElement.append(tilesLayer, pieceLayer);
  const selectedPiece = selected && game.getCell(selected.x, selected.y, boardName);
  const legal = new Set(selectedPiece ? game.legalMoves(selected, boardName).map(position => `${position.x},${position.y}`) : []);
  const shopItem = pendingTool?.kind === "buy" ? SHOP_ITEMS.find(item => item[0] === pendingTool.id) : null;
  const upgradeItem = pendingTool?.kind === "upgrade" ? UPGRADES.find(item => item[0] === pendingTool.id) : null;
  const board = game.board(boardName);
  for (let displayY = 0; displayY < 8; displayY++) for (let displayX = 0; displayX < 8; displayX++) {
    const { x, y } = gameCoordinate(displayX, displayY);
    const piece = board?.[y]?.[x];
    const tile = document.createElement("button");
    tile.className = `tile ${squareClass(boardName, x, y)}`;
    if (selected?.x === x && selected?.y === y) tile.classList.add("selected");
    else if (legal.has(`${x},${y}`)) tile.classList.add("legal");
    if (canAct() && shopItem && game.canBuy(shopItem[0], x, y, boardName)) tile.classList.add("purchase-target");
    if (canAct() && upgradeItem && game.canUpgrade(upgradeItem[0], x, y, boardName)) tile.classList.add("upgrade-target");
    tile.dataset.x = x;
    tile.dataset.y = y;
    tile.setAttribute("role", "gridcell");
    tile.setAttribute("aria-label", `${String.fromCharCode(97 + x)}${8 - y}${board?.[y]?.[x] ? ` ${board[y][x].type}` : " empty"}`);
    tile.addEventListener("click", () => handleTile(displayX, displayY));
    if (piece && !LARGE_SIZES[piece.type]) renderPiece(tile, piece);
    tile.style.gridColumn = `${displayX + 1}`;
    tile.style.gridRow = `${displayY + 1}`;
    tilesLayer.append(tile);
  }
  const renderedGroups = new Set();
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const piece = board?.[y]?.[x];
    if (!piece || !LARGE_SIZES[piece.type] || piece.part !== 0 || renderedGroups.has(piece.group)) continue;
    renderedGroups.add(piece.group);
    renderLargePiece(pieceLayer, piece, board);
  }
  $("#selection-status").textContent = botThinking && isBotTurn() ? `Bot (${botColor}) is thinking...` : game.rulePicker ? (canPickRule() ? "Pick a rule" : `${game.rulePickerColor} picks a rule${botGame && game.rulePickerColor === botColor ? " (bot)" : ""}`) : pendingTool ? `${pendingTool.kind === "buy" ? "Place" : "Upgrade"}: ${pendingTool.id}` : selected ? (canAct() ? "Choose a destination" : "Analyzing position") : canAct() ? "Select a piece" : botGame ? "Waiting for bot..." : "Waiting for opponent";
  renderModalState();
}

function renderPiece(tile, piece) {
  const img = document.createElement("img");
  img.alt = piece.type;
  img.src = asset(imageKey(piece));
  img.addEventListener("error", () => {
    img.remove(); const fallback = document.createElement("span"); fallback.className = `piece-fallback ${piece.color.toLowerCase()}`; fallback.textContent = fallbackLabel(piece); tile.append(fallback);
  }, { once: true });
  tile.append(img);
}

function renderLargePiece(layer, piece, board) {
  const [width, height] = LARGE_SIZES[piece.type];
  const displayOrigin = displayCoordinate(piece.x, piece.y);
  const displayX = isMirrored() ? displayOrigin.x - width + 1 : displayOrigin.x;
  const displayY = isMirrored() ? displayOrigin.y - height + 1 : displayOrigin.y;
  const overlay = document.createElement("div");
  overlay.className = "piece-overlay";
  overlay.style.gridColumn = `${displayX + 1} / span ${width}`;
  overlay.style.gridRow = `${displayY + 1} / span ${height}`;
  if (isMirrored()) overlay.style.transform = "rotate(180deg)";
  const canvas = document.createElement("canvas");
  canvas.className = "piece-composite";
  canvas.width = width * 64;
  canvas.height = height * 64;
  canvas.setAttribute("aria-label", piece.type);
  const context = canvas.getContext("2d");
  // The original assets contain only a full Black Super King, not numbered tiles.
  if (piece.type === "SuperKing" && piece.color === COLORS.BLACK) {
    const img = new Image();
    img.onload = () => context.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = asset("black/super-king.png");
  } else {
    for (let displayYPart = 0; displayYPart < height; displayYPart++) for (let displayXPart = 0; displayXPart < width; displayXPart++) {
      const part = board?.[piece.y + displayYPart]?.[piece.x + displayXPart];
      if (!part) continue;
      const img = new Image();
      img.onload = () => context.drawImage(img, displayXPart * 64, displayYPart * 64, 64, 64);
      img.src = asset(imageKey(part));
    }
  }
  overlay.append(canvas);
  layer.append(overlay);
}

function handleTile(x, y) {
  if (!game || game.pendingDecision || localRole === "spectator") return;
  if (botGame && (botThinking || isBotTurn())) return;
  if (game.rulePicker && canPickRule()) return;
  if (botGame && game.rulePicker && game.rulePickerColor === botColor) return;
  const gamePosition = gameCoordinate(x, y);
  if (!canAct() || game.gameOver || game.rulePicker) {
    const clicked = game.getCell(gamePosition.x, gamePosition.y, viewBoard);
    if (!selected) {
      if (clicked) selected = gamePosition;
    } else if (clicked) {
      selected = gamePosition;
    } else {
      selected = null;
    }
    render();
    return;
  }
  if (pendingTool?.kind === "buy") {
    if (viewBoard !== "Normal") { toast("Shop pieces must be placed on the Normal board."); return; }
    sendAction({ action: "buy", id: pendingTool.id, x: gamePosition.x, y: gamePosition.y, board: viewBoard }); pendingTool = null; render(); return;
  }
  if (pendingTool?.kind === "upgrade") {
    sendAction({ action: "upgrade", id: pendingTool.id, x: gamePosition.x, y: gamePosition.y, board: viewBoard }); pendingTool = null; render(); return;
  }
  const clicked = game.getCell(gamePosition.x, gamePosition.y, viewBoard);
  if (!selected) {
    if (clicked && clicked.color === currentColor()) { selected = gamePosition; render(); }
    return;
  }
  const from = selected; selected = null;
  sendAction({ action: "move", from, to: gamePosition, board: viewBoard });
  render();
}

function cycleViewBoard() {
  if (!game) return;
  const boardNames = ["Normal", "Hell", "Heaven"].filter(name => game.board(name));
  const currentIndex = boardNames.indexOf(viewBoard);
  viewBoard = boardNames[(currentIndex + 1) % boardNames.length] || "Normal";
  selected = null;
  pendingTool = null;
  render();
}

function renderStatus() {
  const status = $("#connection-status");
  if (botGame) status.textContent = `Bot game (${botDifficulty}${valueNetLoaded() ? " + NN" : ""}${policyNetLoaded() ? " + P" : ""})`;
  else if (!isOnline()) status.textContent = `Local hot-seat · ${nnStatus}`;
  else if (!connected) status.textContent = "Disconnected";
  else status.textContent = localRole === "spectator" ? "Spectating" : `Player ${localRole}`;
  if (room && game) {
    const players = $("#players-status");
    const drawState = game.drawOffer ? ` · Draw offered by ${game.drawOffer}` : "";
    players.textContent = `White ${roomConnections.white ? "connected" : "away"} - Black ${roomConnections.black ? "connected" : "away"}${drawState}`;
  }
}

function showWindow(templateId, build) {
  modalRoot.replaceChildren(); modalRoot.classList.remove("hidden");
  modalRoot.dataset.kind = "window";
  const content = document.importNode($(templateId).content, true); modalRoot.append(content);
  modalRoot.querySelector(".close-window").addEventListener("click", closeModal);
  build(modalRoot.querySelector(".window-card"));
}
function closeModal() { modalRoot.replaceChildren(); modalRoot.classList.add("hidden"); delete modalRoot.dataset.kind; delete modalRoot.dataset.decisionId; }

function showShop() {
  showWindow("#shop-template", card => {
    const grid = card.querySelector(".shop-grid");
    for (const [id, cost] of SHOP_ITEMS) {
      const button = document.createElement("button"); button.className = "product"; button.title = id;
      const img = document.createElement("img"); img.src = asset(id === "landmine" || id === "bomb" || id === "portal" ? `${id}.png` : `white/${id}.png`); img.alt = id;
      button.append(img, Object.assign(document.createElement("span"), { textContent: `${cost}GP` }));
      button.addEventListener("click", () => { pendingTool = { kind: "buy", id }; closeModal(); render(); }); grid.append(button);
    }
  });
}

function showSkillTree() {
  showWindow("#skill-template", card => {
    const grid = card.querySelector(".skill-grid");
    for (const [id, from] of UPGRADES) {
      const button = document.createElement("button"); button.className = "upgrade"; button.title = `${id}: ${from.join(" + ")}`;
      const img = document.createElement("img"); img.src = asset(`white/${id}.png`); img.alt = id; button.append(img);
      button.addEventListener("click", () => { pendingTool = { kind: "upgrade", id }; closeModal(); render(); }); grid.append(button);
    }
    for (const label of ["Each", "Costs", "5GP"]) grid.append(Object.assign(document.createElement("div"), { className: "grid-label", textContent: label }));
  });
}

function showRules() {
  showWindow("#rules-template", card => {
    const list = card.querySelector(".rules-list");
    if (!game.rules.length) list.append(Object.assign(document.createElement("p"), { textContent: "No active rules" }));
    for (const rule of game.rules) list.append(Object.assign(document.createElement("p"), { textContent: RULE_DESCRIPTIONS[rule] || "Unknown rule" }));
  });
}

function showRulePicker() {
  modalRoot.replaceChildren(); modalRoot.classList.remove("hidden");
  modalRoot.dataset.kind = "rule-picker";
  const card = document.createElement("section"); card.className = "window-card rule-picker-card"; card.innerHTML = `<div class="window-heading"><h2>Pick a rule</h2></div><div class="rule-picker-grid"></div>`; modalRoot.append(card);
  const grid = card.querySelector(".rule-picker-grid");
  for (const rule of (game.availableRules || RULE_PICKER)) {
    const button = document.createElement("button"); button.className = "rule-option"; button.title = RULE_DESCRIPTIONS[rule] || rule; button.setAttribute("aria-label", RULE_DESCRIPTIONS[rule] || rule);
     const img = document.createElement("img"); img.src = asset(RULE_ICONS[rule] || "placeholder.png"); img.alt = rule; button.append(img);
    button.addEventListener("click", () => { closeModal(); sendAction({ action: "rule", rule }); }); grid.append(button);
  }
}

function decisionChoices(decision) {
  if (decision.type === "angel") return [["yes", "YES"], ["no", "NO"]];
  if (decision.type === "atheism") return [["heaven", "DESTROY HEAVEN"], ["hell", "DESTROY HELL"], ["metaphysical", "DESTROY ALL METAPHYSICAL PIECES ON THE MATERIAL PLANE"]];
  return [["release", "RELEASE ME"], ["remove", "REMOVE ANY RULE"], ["smite", "SMITE ANY PIECE"], ["gold", "YOU GET 10 GOLD. YOUR OPPONENT GETS 5"]];
}

function showDecision(decision) {
  modalRoot.replaceChildren(); modalRoot.classList.remove("hidden");
  modalRoot.dataset.kind = "decision";
  modalRoot.dataset.decisionId = String(decision.id);
  const card = document.createElement("section"); card.className = "window-card decision-card";
  const icon = decision.type === "angel" ? "aggro-angel.png" : decision.type === "atheism" ? "atheism.png" : "devil.png";
  card.innerHTML = `<img src="${asset(icon)}" alt=""><h2>${decision.title}</h2><p>${decision.type === "angel" ? "Free him?" : decision.type === "atheism" ? "Choose a fate for the metaphysical boards." : "The Devil offers a bargain."}</p><div class="decision-actions"></div>`; modalRoot.append(card);
  const actions = card.querySelector(".decision-actions");
  for (const [choice, label] of decisionChoices(decision)) { const button = document.createElement("button"); button.textContent = label; button.addEventListener("click", () => { closeModal(); sendAction({ action: "decision", choice }); }); actions.append(button); }
}

function renderModalState() {
  if (!game || localRole === "spectator") return;
  if (game.gameOver) {
    if (["decision", "rule-picker", "draw"].includes(modalRoot.dataset.kind)) closeModal();
    return;
  }
  if (modalRoot.dataset.kind === "decision" && (!game.pendingDecision || String(game.pendingDecision.id) !== modalRoot.dataset.decisionId)) closeModal();
  if (modalRoot.dataset.kind === "rule-picker" && (!game.rulePicker || !canPickRule())) closeModal();
  if (game.pendingDecision) {
    const ownsDecision = botGame ? game.pendingDecision.color !== botColor : !isOnline() || game.pendingDecision.color === playerColor();
    if (ownsDecision && modalRoot.dataset.kind !== "decision") showDecision(game.pendingDecision);
    return;
  }
  if (game.rulePicker) {
    if (botGame && game.rulePickerColor === botColor) return;
    if (canPickRule() && modalRoot.dataset.kind !== "rule-picker") return showRulePicker();
    return;
  }
  if (game.drawOffer && game.drawOffer !== playerColor() && modalRoot.classList.contains("hidden")) return showDrawOffer();
  if (modalRoot.dataset.kind === "draw" && !game.drawOffer) closeModal();
}

function showDrawOffer() {
  modalRoot.replaceChildren(); modalRoot.classList.remove("hidden"); modalRoot.dataset.kind = "draw";
  const card = document.createElement("section"); card.className = "window-card decision-card";
  card.innerHTML = `<h2>Draw offered</h2><p>${game.drawOffer} offered a draw.</p><div class="decision-actions"></div>`;
  modalRoot.append(card);
  const actions = card.querySelector(".decision-actions");
  for (const [choice, label] of [[true, "Accept draw"], [false, "Decline draw"]]) {
    const button = document.createElement("button"); button.textContent = label; button.addEventListener("click", () => { closeModal(); sendAction({ action: "respondDraw", accept: choice }); }); actions.append(button);
  }
}

function displayEvent(event) {
  if (!event || event.id <= lastEventId - 1) return;
  const toastElement = document.createElement("div"); toastElement.className = "toast";
  if (event.icon) { const img = document.createElement("img"); img.src = asset(event.icon); img.alt = ""; toastElement.append(img); }
  toastElement.append(Object.assign(document.createElement("span"), { textContent: event.message })); toastRoot.replaceChildren(toastElement);
  clearTimeout(eventTimer); eventTimer = setTimeout(() => toastRoot.replaceChildren(), 3200);
}
function toast(message) {
  displayEvent({ id: ++lastEventId, message });
}

$("#offline-button").addEventListener("click", startOffline);
$("#bot-button").addEventListener("click", startBot);
$("#create-button").addEventListener("click", startCreate);
$("#join-button").addEventListener("click", startJoin);
$("#shop-button").addEventListener("click", showShop);
$("#skill-button").addEventListener("click", showSkillTree);
$("#rules-button").addEventListener("click", showRules);
$("#switch-button").addEventListener("click", cycleViewBoard);
$("#copy-code-button").addEventListener("click", async () => { if (room) { await navigator.clipboard?.writeText(room); toast(`Join code copied: ${room}`); } });
$("#draw-offer-button").addEventListener("click", () => { if (isOnline() && localRole !== "spectator") sendAction({ action: "offerDraw" }); });
$("#resign-button").addEventListener("click", () => { if (isOnline() && localRole !== "spectator" && window.confirm("Resign this game?")) sendAction({ action: "resign" }); });

const resumeRoom = new URLSearchParams(location.search).get("room")?.trim().toLowerCase();
if (resumeRoom) {
  localRole = "black";
  openSocket(() => socket.send(JSON.stringify({ type: "resume", room: resumeRoom, token: localStorage.getItem(`jreg-chess:${resumeRoom}`) || undefined })));
}
