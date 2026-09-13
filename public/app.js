import {
  GameState, COLORS, LARGE_SIZES, RULE_DESCRIPTIONS, RULE_ICONS, RULE_PICKER, SHOP_ITEMS, UPGRADES, imageKey
} from "/shared/game.js";

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

function currentColor() { return game?.whiteToMove ? COLORS.WHITE : COLORS.BLACK; }
function playerColor() { return localRole === "white" ? COLORS.WHITE : localRole === "black" ? COLORS.BLACK : null; }
function canAct() { return localRole === "offline" || playerColor() === currentColor(); }
function isOnline() { return localRole === "white" || localRole === "black" || localRole === "spectator"; }

function showGame() {
  menu.classList.add("hidden"); gameScreen.classList.remove("hidden");
  $("#mode-badge").textContent = isOnline() ? "ONLINE" : "OFFLINE";
  $("#multiplayer-card").classList.toggle("hidden", !isOnline());
  render();
}

function startOffline() {
  localRole = "offline"; room = null; token = null; connected = true; viewBoard = "Normal"; game = new GameState({ mode: "offline" }); selected = null; pendingTool = null; showGame();
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
  localRole = "white";
  openSocket(() => socket.send(JSON.stringify({ type: "create" })));
}

function startJoin() {
  const code = window.prompt("Enter join code:");
  if (!code) return;
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
    if (!game.board(viewBoard)) viewBoard = "Normal";
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
  if (action.action === "buy") accepted = game.buy(action.id, action.x, action.y);
  if (action.action === "upgrade") accepted = game.upgrade(action.id, action.x, action.y, action.board || viewBoard);
  if (action.action === "rule") accepted = game.addRule(action.rule);
  if (action.action === "decision") accepted = game.decision(action.choice);
  if (!accepted && game.lastEvent) displayEvent(game.lastEvent);
  else if (game.lastEvent?.id > lastEventId) { lastEventId = game.lastEvent.id; displayEvent(game.lastEvent); }
  render();
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
  if (!game.board(viewBoard)) viewBoard = "Normal";
  const boardName = viewBoard;
  $("#game-title").textContent = game.draw ? "Draw" : game.gameOver ? `${game.winner} wins` : `${game.whiteToMove ? "White" : "Black"} to move`;
  $("#board-name").textContent = boardName;
  $("#side-label").textContent = localRole === "offline" ? `${game.whiteToMove ? "White" : "Black"}'s side` : localRole === "spectator" ? "Spectator" : `${localRole[0].toUpperCase() + localRole.slice(1)}'s side`;
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
  const board = game.board(boardName);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const tile = document.createElement("button");
    tile.className = `tile ${squareClass(boardName, x, y)}`;
    if (selected?.x === x && selected?.y === y) tile.classList.add("selected");
    else if (legal.has(`${x},${y}`)) tile.classList.add("legal");
    tile.setAttribute("role", "gridcell");
    tile.setAttribute("aria-label", `${String.fromCharCode(97 + x)}${8 - y}${board?.[y]?.[x] ? ` ${board[y][x].type}` : " empty"}`);
    tile.addEventListener("click", () => handleTile(x, y));
    const piece = board?.[y]?.[x];
    if (piece && !LARGE_SIZES[piece.type]) renderPiece(tile, piece);
    tilesLayer.append(tile);
  }
  const renderedGroups = new Set();
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const piece = board?.[y]?.[x];
    if (!piece || !LARGE_SIZES[piece.type] || piece.part !== 0 || renderedGroups.has(piece.group)) continue;
    renderedGroups.add(piece.group);
    renderLargePiece(pieceLayer, piece, board);
  }
  $("#selection-status").textContent = pendingTool ? `${pendingTool.kind === "buy" ? "Place" : "Upgrade"}: ${pendingTool.id}` : selected ? (canAct() ? "Choose a destination" : "Analyzing position") : canAct() ? "Select a piece" : "Waiting for opponent";
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
  const overlay = document.createElement("div");
  overlay.className = "piece-overlay";
  overlay.style.gridColumn = `${piece.x + 1} / span ${width}`;
  overlay.style.gridRow = `${piece.y + 1} / span ${height}`;
  const canvas = document.createElement("canvas");
  canvas.className = "piece-composite";
  canvas.width = width * 64;
  canvas.height = height * 64;
  canvas.setAttribute("aria-label", piece.type);
  const context = canvas.getContext("2d");
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const part = board?.[piece.y + y]?.[piece.x + x];
    if (!part) continue;
    const img = new Image();
    img.onload = () => context.drawImage(img, x * 64, y * 64, 64, 64);
    img.src = asset(imageKey(part));
  }
  overlay.append(canvas);
  layer.append(overlay);
}

function handleTile(x, y) {
  if (!game || game.pendingDecision || localRole === "spectator") return;
  if (game.rulePicker && canAct()) return;
  if (!canAct()) {
    const clicked = game.getCell(x, y, viewBoard);
    if (!selected) {
      if (clicked) selected = { x, y };
    } else if (clicked) {
      selected = { x, y };
    } else {
      selected = null;
    }
    render();
    return;
  }
  if (pendingTool?.kind === "buy") {
    if (viewBoard !== "Normal") { toast("Shop pieces must be placed on the Normal board."); return; }
    sendAction({ action: "buy", id: pendingTool.id, x, y }); pendingTool = null; render(); return;
  }
  if (pendingTool?.kind === "upgrade") {
    sendAction({ action: "upgrade", id: pendingTool.id, x, y, board: viewBoard }); pendingTool = null; render(); return;
  }
  const clicked = game.getCell(x, y, viewBoard);
  if (!selected) {
    if (clicked && clicked.color === currentColor()) { selected = { x, y }; render(); }
    return;
  }
  const from = selected; selected = null;
  sendAction({ action: "move", from, to: { x, y }, board: viewBoard });
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
  if (!isOnline()) status.textContent = "Local hot-seat";
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
function closeModal() { modalRoot.replaceChildren(); modalRoot.classList.add("hidden"); delete modalRoot.dataset.kind; }

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
  const card = document.createElement("section"); card.className = "window-card decision-card";
  const icon = decision.type === "angel" ? "aggro-angel.png" : decision.type === "atheism" ? "atheism.png" : "devil.png";
  card.innerHTML = `<img src="${asset(icon)}" alt=""><h2>${decision.title}</h2><p>${decision.type === "angel" ? "Free him?" : decision.type === "atheism" ? "Choose a fate for the metaphysical boards." : "The Devil offers a bargain."}</p><div class="decision-actions"></div>`; modalRoot.append(card);
  const actions = card.querySelector(".decision-actions");
  for (const [choice, label] of decisionChoices(decision)) { const button = document.createElement("button"); button.textContent = label; button.addEventListener("click", () => { closeModal(); sendAction({ action: "decision", choice }); }); actions.append(button); }
}

function renderModalState() {
  if (!game || localRole === "spectator") return;
  if (game.rulePicker && modalRoot.classList.contains("hidden")) {
    if (!isOnline() || canAct()) return showRulePicker();
    return;
  }
  if (game.pendingDecision) {
    if (modalRoot.classList.contains("hidden")) {
      if (!isOnline() || game.pendingDecision.color === playerColor()) showDecision(game.pendingDecision);
    }
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
