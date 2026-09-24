const BOARD_NAMES = ["Normal", "Heaven", "Hell"];
const COLORS = { WHITE: "White", BLACK: "Black", NPC: "NPC" };

export const RULES = [
  "CENTAUR_MAKING", "KING_DIES_IN_HELL", "SUICIDE_BOMBER_HEAVEN", "NEXT_PIECE_EXPLODES",
  "PAWNS_MOVE_FOUR", "BISHOPS_GAIN_NECROMANCY", "ZOMBIE_APOCALYPSE", "GUN",
  "WILD_LIFE", "WILD_HORSE", "TREADMILL_BOARD", "MEGA_CASTLE", "WHIRLPOOL",
  "LANDMINES", "VOID", "PITTRAPS", "EVERYONE_UPGRADES", "GOLD_RUSH",
  "METEOR_SHOWER", "UNICORNS", "PORTALS_OPEN", "PAWN_UPGRADE", "MORE_GOLD",
  "TREASURE", "POTIONS"
];

export const RULE_DESCRIPTIONS = {
  CENTAUR_MAKING: "You can move pawns onto horses to make centaurs",
  KING_DIES_IN_HELL: "King must die in hell",
  SUICIDE_BOMBER_HEAVEN: "Suicide bombers go to heaven",
  NEXT_PIECE_EXPLODES: "NEXT PIECE TAKEN EXPLODES",
  PAWNS_MOVE_FOUR: "PAWNS CAN MOVE UP TO FOUR SPACES ON THEIR FIRST TURN",
  BISHOPS_GAIN_NECROMANCY: "BISHOPS GAIN NECROMANCY",
  ZOMBIE_APOCALYPSE: "ZOMBIE APOCALYPSE",
  GUN: "GUN SPAWNS",
  WILD_LIFE: "SPAWN WILD LIFE",
  WILD_HORSE: "SPAWN WILD HORSE",
  TREADMILL_BOARD: "TREADMILL BOARD",
  MEGA_CASTLE: "KINGS CAN CASTLE WITH ANY PIECE",
  WHIRLPOOL: "WHIRLPOOLS APPEAR",
  LANDMINES: "LANDMINES SPAWN",
  VOID: "VOIDVOIDVOIDVOID",
  PITTRAPS: "PITTRAPS SPAWN",
  EVERYONE_UPGRADES: "EVERYONE UPGRADES A PIECE",
  GOLD_RUSH: "GOLD RUSH",
  METEOR_SHOWER: "METEOR SHOWER",
  UNICORNS: "KNIGHTS BECOME UNICORNS",
  PORTALS_OPEN: "PORTALS APPEAR",
  PAWN_UPGRADE: "PAWNS UPGRADE",
  MORE_GOLD: "EVERYONE GETS GOLD",
  TREASURE: "TREASURE APPEARS",
  POTIONS: "POTION SELLER ARRIVES"
};

export const RULE_ICONS = {
  NEXT_PIECE_EXPLODES: "rule-next-piece-explodes.svg", PAWNS_MOVE_FOUR: "white/pawn.png",
  BISHOPS_GAIN_NECROMANCY: "white/necromancer.png", ZOMBIE_APOCALYPSE: "zombie.png",
  GUN: "gun.png", WILD_LIFE: "wildlife.png", WILD_HORSE: "wild-horse.png",
  MEGA_CASTLE: "white/king.png", WHIRLPOOL: "whirlpool.png", LANDMINES: "landmine.png",
  VOID: "void.png", PITTRAPS: "pittrap.png", GOLD_RUSH: "coin.png", MORE_GOLD: "coin.png",
  EVERYONE_UPGRADES: "upgrade-icon.png", METEOR_SHOWER: "meteor.png", UNICORNS: "white/unicorn.png",
  PORTALS_OPEN: "portal.png", PAWN_UPGRADE: "black/pawn.png", TREASURE: "treasure.png",
  POTIONS: "potion-seller.png"
};

export const SHOP_ITEMS = [
  ["pawn", 2], ["rook", 7], ["knight", 5], ["bishop", 6], ["king", 9], ["queen", 12],
  ["zebra", 7], ["rook-knight", 9], ["bishop-knight", 6], ["knight-queen", 15], ["giraffe", 6],
  ["landmine", 4], ["bomb", 15], ["jester", 8], ["angry-rook", 9], ["unicorn", 6], ["portal", 4]
];

export const UPGRADES = [
  ["suicide-bomber", ["Pawn"]], ["centaur", ["Pawn", "Knight"]], ["unicorn", ["Knight"]],
  ["trojan-horse", ["Knight"]], ["rook-knight", ["Knight", "Rook"]], ["bishop-knight", ["Bishop", "Knight"]],
  ["necromancer", ["Bishop"]], ["super-bishop", ["Bishop"]], ["super-king", ["King"]],
  ["ball-queen", ["Queen"]], ["knight-queen", ["Queen", "Knight"]], ["angry-rook", ["Rook"]],
  ["rook-tower", ["Rook"]]
];

export const RULE_PICKER = [
  "EVERYONE_UPGRADES", "PAWNS_MOVE_FOUR", "BISHOPS_GAIN_NECROMANCY", "GOLD_RUSH",
  "METEOR_SHOWER", "ZOMBIE_APOCALYPSE", "WILD_LIFE", "WILD_HORSE", "NEXT_PIECE_EXPLODES",
  "UNICORNS", "PORTALS_OPEN", "PAWN_UPGRADE", "WHIRLPOOL", "LANDMINES", "MORE_GOLD",
  "VOID", "PITTRAPS", "TREASURE"
];

const EVENT_RULES = new Set(["MORE_GOLD", "EVERYONE_UPGRADES", "POTIONS", "BISHOPS_GAIN_NECROMANCY", "CENTAUR_MAKING"]);
const LARGE_SIZES = {
  SuperKing: [2, 2], Angel: [3, 3], Atheism: [2, 2], Church: [2, 3], Devil: [2, 2],
  AggroDevil: [2, 2], AggroAngel: [2, 2], Void: [2, 2]
};
const LARGE_TYPES = new Set(Object.keys(LARGE_SIZES));
const NPC_TYPES = new Set([
  "Coin", "Portal", "Church", "Atheism", "Angel", "Devil", "AggroAngel", "AggroDevil",
  "Wildlife", "WildHorse", "Zombie", "Meteor", "Treasure", "Landmine", "Bomb", "Pittrap",
  "Whirlpool", "Void", "Placeholder"
]);
const CONTROLLED_TYPES = new Set(["Zombie", "WildHorse", "Wildlife"]);
const EXPLOSIVE_TYPES = new Set(["Landmine", "Bomb", "SuicideBomber", "Jester"]);
const HEAVEN_DEATH_TYPES = new Set(["SuicideBomber", "Jester"]);
const AUTOMOVING_TYPES = new Set(["Zombie", "WildHorse", "Wildlife", "Meteor", "AggroAngel", "AggroDevil"]);
const DECISION_CHOICES = {
  angel: ["yes", "no"], atheism: ["heaven", "hell", "metaphysical"],
  devil: ["release", "remove", "smite", "gold"]
};
const PAWN_TYPES = new Set(["Pawn", "SuicideBomber", "Centaur"]);
const KNIGHT_TYPES = new Set(["Knight", "Unicorn"]);
const BISHOP_TYPES = new Set(["Bishop", "BishopKnight", "Necromancer", "SuperBishop", "Jester"]);

class JavaRandom {
  constructor(seed) {
    this.seed = (BigInt(seed) ^ 0x5DEECE66Dn) & ((1n << 48n) - 1n);
  }
  next(bits) {
    this.seed = (this.seed * 0x5DEECE66Dn + 0xBn) & ((1n << 48n) - 1n);
    return Number(this.seed >> BigInt(48 - bits));
  }
  nextInt(bound) {
    if (bound <= 0) throw new Error("bound must be positive");
    if ((bound & (bound - 1)) === 0) return Math.floor(bound * this.next(31) / 0x80000000);
    let bits, value;
    do {
      bits = this.next(31);
      value = bits % bound;
    } while (bits - value + (bound - 1) > 0x7fffffff);
    return value;
  }
  inclusive(min, max) { return min + this.nextInt(max - min + 1); }
}

function hashSeed(seed) {
  let value = 0n;
  for (const char of seed) value = BigInt.asIntN(64, 31n * value + BigInt(char.charCodeAt(0)));
  return value;
}

function blankBoard() { return Array.from({ length: 8 }, () => Array(8).fill(null)); }
function inBounds(x, y) { return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < 8 && y >= 0 && y < 8; }
function samePiece(a, b) { return Boolean(a && b && (a.uid === b.uid || (a.group && a.group === b.group))); }
function pieceType(id) { return id.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(""); }
function locationOf(piece) { return { board: piece.board, x: piece.x, y: piece.y }; }
function deathKey(piece, location) { return `${piece.uid}:${location.board}:${location.x},${location.y}`; }

export function randomJoinCode() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < 5; i++) result += alphabet[Math.floor(Math.random() * alphabet.length)];
  return result;
}

export class GameState {
  constructor({ online = false, seed = "offline", mode = "offline" } = {}) {
    this.online = online;
    this.mode = mode;
    this.seed = seed;
    this.random = new JavaRandom(hashSeed(seed));
    this.boards = { Normal: blankBoard(), Heaven: blankBoard(), Hell: blankBoard() };
    this.currentBoard = "Normal";
    this.whiteToMove = true;
    this.whiteGP = 5;
    this.blackGP = 5;
    this.rules = ["KING_DIES_IN_HELL", "SUICIDE_BOMBER_HEAVEN"];
    this.availableRules = [...RULE_PICKER];
    this.automovingPieces = [];
    this.nextUid = 1;
    this.nextGroup = 1;
    this.turnsSinceNewRule = 0;
    this.rulePicker = false;
    this.rulePickerColor = null;
    this.nextRulePickerColor = COLORS.WHITE;
    this.pendingDecision = null;
    this.winner = null;
    this.gameOver = false;
    this.draw = false;
    this.drawOffer = null;
    this.endReason = null;
    this.lastEvent = null;
    this.eventId = 0;
    this.history = [];
    this._resolutionDepth = 0;
    this._resolution = null;
    this._blast = null;
    this._decisionQueue = [];
    this._nextDecisionId = 1;
    this._turnPending = false;
    this._automoveQueue = null;
    this.initializing = true;
    this.setup();
    this.initializing = false;
  }

  setup() {
    for (let x = 0; x < 8; x++) {
      this.placeNew("Pawn", COLORS.WHITE, x, 6, "Normal");
      this.placeNew("Pawn", COLORS.BLACK, x, 1, "Normal");
    }
    for (const [type, color, x, y] of [
      ["King", COLORS.WHITE, 4, 7], ["King", COLORS.BLACK, 4, 0], ["Queen", COLORS.WHITE, 3, 7], ["Queen", COLORS.BLACK, 3, 0],
      ["Knight", COLORS.WHITE, 1, 7], ["Knight", COLORS.BLACK, 1, 0], ["Knight", COLORS.WHITE, 6, 7], ["Knight", COLORS.BLACK, 6, 0],
      ["Rook", COLORS.WHITE, 0, 7], ["Rook", COLORS.BLACK, 0, 0], ["Rook", COLORS.WHITE, 7, 7], ["Rook", COLORS.BLACK, 7, 0],
      ["Bishop", COLORS.WHITE, 2, 7], ["Bishop", COLORS.BLACK, 2, 0], ["Bishop", COLORS.WHITE, 5, 7], ["Bishop", COLORS.BLACK, 5, 0]
    ]) this.placeNew(type, color, x, y, "Normal");
    this.placeNew("Coin", COLORS.NPC, 0, 3, "Normal");
    this.placeNew("Coin", COLORS.NPC, 7, 4, "Normal");

    for (const [x, y] of [[0, 7], [5, 7], [1, 2], [3, 0], [7, 0]]) this.placeNew("Coin", COLORS.NPC, x, y, "Hell");
    this.placeNew("Portal", COLORS.NPC, 2, 5, "Hell");
    this.placeNew("Coin", COLORS.NPC, 7, 0, "Heaven");
    this.placeNew("Portal", COLORS.NPC, 0, 7, "Heaven");
    this.placeNew("Angel", COLORS.NPC, 1, 1, "Heaven");
    this.placeNew("Atheism", COLORS.NPC, 5, 2, "Heaven");
    this.placeNew("Church", COLORS.NPC, 6, 5, "Heaven");
  }

  board(name = this.currentBoard) { return name && this.boards[name] ? this.boards[name] : null; }
  getCell(x, y, board = this.currentBoard) { const b = this.board(board); return b && inBounds(x, y) ? b[y][x] : null; }
  pieceAt(x, y, board = this.currentBoard) { return this.getCell(x, y, board); }
  groupCells(groupId, boardName) {
    const b = this.board(boardName);
    if (!b) return [];
    const cells = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (b[y][x]?.group === groupId) cells.push({ x, y, piece: b[y][x] });
    return cells;
  }
  leader(piece) {
    if (!piece) return null;
    if (!piece.group) return piece;
    if (piece.part === 0) return piece;
    const cells = this.groupCells(piece.group, piece.board);
    return cells.find(cell => cell.piece.part === 0)?.piece || piece;
  }
  removeGroup(piece, boardName = piece?.board) {
    if (!piece || piece.board !== boardName) return;
    return this.resolve(() => this.removePiece(piece));
  }
  removeAt(x, y, board = this.currentBoard) {
    this.removeGroup(this.getCell(x, y, board), board);
  }

  // A whole move (including deaths, arrivals and chained blasts) is one transaction.
  // Victory is evaluated only after the last in-flight piece has been resolved.
  resolve(operation) {
    this.beginResolution();
    try { return operation(); } finally { this.endResolution(); }
  }
  beginResolution() {
    if (this._resolutionDepth === 0) this._resolution = { removed: new Set(), deaths: new Set() };
    this._resolutionDepth++;
  }
  endResolution() {
    this._resolutionDepth--;
    if (this._resolutionDepth === 0) {
      this.automovingPieces = [...new Map(this.automovingPieces.filter(piece =>
        piece && !piece.controlledBy && this.findByUid(piece.uid)).map(piece => [piece.uid, piece])).values()];
      const decisions = [this.pendingDecision, ...this._decisionQueue].filter(choice => choice &&
        (choice.type !== "angel" || this.findByUid(choice.targetUid)?.type === "Angel"));
      this.pendingDecision = decisions.shift() || null;
      this._decisionQueue = decisions;
      this._resolution = null;
      this.checkVictory();
    }
  }

  isNpcPiece(piece) {
    return Boolean(piece && NPC_TYPES.has(piece.type) && !piece.controlledBy);
  }

  activeBoardNames() {
    return BOARD_NAMES.filter(name => Boolean(this.boards[name]));
  }

  setGroupHealth(piece, health) {
    const root = this.leader(piece);
    if (!root) return;
    root.health = health;
    for (const part of root.related || []) part.health = health;
    if (root.group) for (const cell of this.groupCells(root.group, root.board)) cell.piece.health = health;
  }

  setGroupColor(piece, color) {
    const root = this.leader(piece);
    root.color = color;
    if (root.controlledBy) root.controlledBy = color;
    for (const part of root.related || []) {
      part.color = color;
      part.controlledBy = root.controlledBy;
    }
  }

  copyPieceState(from, to) {
    for (const property of ["moved", "movingRight", "controlledBy", "wildCounterpart", "portalTo"]) to[property] = from[property];
    if (from.health !== undefined) to.health = from.health;
  }

  detachPiece(piece) {
    if (!piece) return;
    const root = this.leader(piece);
    const group = root.group;
    for (const boardName of BOARD_NAMES) {
      const board = this.board(boardName);
      if (!board) continue;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const cell = board[y][x];
        if (cell && (group ? cell.group === group : cell.uid === root.uid)) board[y][x] = null;
      }
    }
  }

  removePiece(piece) {
    const root = this.leader(piece);
    if (!root) return;
    this.detachPiece(root);
    this._resolution?.removed.add(root.uid);
    this.automovingPieces = this.automovingPieces.filter(item => item && item.uid !== root.uid);
  }

  footprint(type, x, y) {
    const [width, height] = LARGE_SIZES[type] || [1, 1];
    if (!inBounds(x, y) || !inBounds(x + width - 1, y + height - 1)) return [];
    const cells = [];
    for (let dy = 0; dy < height; dy++) for (let dx = 0; dx < width; dx++) cells.push({ x: x + dx, y: y + dy });
    return cells;
  }

  footprintClear(type, x, y, boardName, ignored = null) {
    const cells = this.footprint(type, x, y);
    return Boolean(this.board(boardName) && cells.length && cells.every(cell => {
      const occupant = this.getCell(cell.x, cell.y, boardName);
      return !occupant || samePiece(occupant, ignored);
    }));
  }

  portalAt(x, y, boardName) {
    const piece = this.getCell(x, y, boardName);
    return piece?.type === "Portal" ? this.leader(piece) : null;
  }

  portalDestination(portal, boardName) {
    if (portal.portalTo && this.board(portal.portalTo)) return portal.portalTo;
    const candidates = (boardName === "Heaven" ? ["Hell", "Normal"] : ["Heaven", "Hell", "Normal"])
      .filter(name => name !== boardName && this.board(name));
    // When an explicit destination is gone, try its surviving corresponding chain.
    if (portal.portalTo) {
      const corresponding = candidates.find(name => this.portalAt(portal.x, portal.y, name));
      if (corresponding) return corresponding;
    }
    return candidates[0] || null;
  }

  evaluatePortalChain(x, y) {
    const active = this.activeBoardNames();
    if (active.length < 2 || !active.every(name => this.portalAt(x, y, name))) return false;
    return this.resolve(() => {
      for (const boardName of active) this.removePiece(this.portalAt(x, y, boardName));
      this.emit("The portal chain collapses.", "portal.png");
      return true;
    });
  }

  kingColorsAlive() {
    const colors = new Set();
    const seen = new Set();
    for (const boardName of this.activeBoardNames()) {
      const board = this.board(boardName);
      for (const row of board) for (const piece of row) {
        if (!piece || !["King", "SuperKing"].includes(piece.type)) continue;
        const root = this.leader(piece);
        const identity = root.group || root.uid;
        if (seen.has(identity)) continue;
        seen.add(identity);
        colors.add(root.color);
      }
    }
    return colors;
  }

  checkVictory() {
    if (this.gameOver || this.initializing || this._resolutionDepth > 0) return;
    const alive = this.kingColorsAlive();
    if (!alive.has(COLORS.WHITE) && !alive.has(COLORS.BLACK)) this.drawGame("Both sides have no kings remaining. Game drawn.");
    else if (!alive.has(COLORS.WHITE)) this.finishWinner(COLORS.BLACK);
    else if (!alive.has(COLORS.BLACK)) this.finishWinner(COLORS.WHITE);
  }

  destroyDimension(boardName, message = null) {
    if (!BOARD_NAMES.includes(boardName) || !this.board(boardName)) return false;
    return this.resolve(() => {
      const pieces = new Set(this.board(boardName).flat().filter(Boolean).map(piece => this.leader(piece)));
      for (const piece of pieces) this.removePiece(piece);
      this.boards[boardName] = null;
      if (this.currentBoard === boardName) this.currentBoard = this.activeBoardNames()[0] || "Normal";
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) this.evaluatePortalChain(x, y);
      if (message) this.emit(message);
      return true;
    });
  }

  finishWinner(color) {
    this.finishGame(color, "king-death", `${color} wins!`);
  }

  makePiece(type, color, part = 0, group = null) {
    return {
      uid: this.nextUid++, type, color, part, group, board: "Normal", x: 0, y: 0,
      moved: false, movingRight: undefined, portalTo: undefined, controlledBy: undefined,
      wildCounterpart: CONTROLLED_TYPES.has(type) ? type : undefined,
      health: ["SuperKing", "Angel"].includes(type) ? 2 : type === "AggroDevil" ? 6 : undefined
    };
  }
  placeNew(type, color, x, y, board = "Normal", state = {}) {
    if (!this.board(board) || !this.footprint(type, x, y).length || (["Landmine", "Pittrap"].includes(type) && board !== "Normal")) return null;
    const root = this.makePiece(type, color, 0, null);
    for (const property of ["portalTo", "movingRight", "controlledBy", "wildCounterpart", "health", "moved"]) {
      if (state[property] !== undefined) root[property] = state[property];
    }
    return this.placeGroup(root, x, y, board) === true ? root : null;
  }
  placeGroup(root, x, y, boardName = this.currentBoard) {
    return this.transportPiece(root, x, y, boardName);
  }
  installGroup(root, x, y, boardName) {
    const board = this.board(boardName);
    if (!this.footprintClear(root.type, x, y, boardName, root)) return false;
    const size = LARGE_SIZES[root.type];
    this.detachPiece(root);
    if (!size) {
      root.group = null; root.part = 0; root.board = boardName; root.x = x; root.y = y;
      board[y][x] = root;
      this.promoteIfNeeded(root);
      if (root.type === "Portal" && this.evaluatePortalChain(x, y)) return "lost";
      if (root.type === "Bomb") this.resolveHit(root, null, { cause: "placement" });
      return true;
    }
    const group = root.group || `g${this.nextGroup++}`;
    root.group = group; root.part = 0; root.board = boardName; root.x = x; root.y = y;
    const parts = [root];
    for (let py = 0; py < size[1]; py++) for (let px = 0; px < size[0]; px++) {
      const part = py * size[0] + px;
      if (part === 0) continue;
      const component = root.related?.[part] || this.makePiece(root.type, root.color, part, group);
      component.type = root.type;
      component.color = root.color;
      component.part = part;
      component.group = group;
      component.board = boardName; component.x = x + px; component.y = y + py;
      this.copyPieceState(root, component);
      parts[part] = component;
    }
    for (let py = 0; py < size[1]; py++) for (let px = 0; px < size[0]; px++) {
      board[y + py][x + px] = parts[py * size[0] + px];
    }
    root.related = parts;
    return true;
  }

  transportPiece(piece, x, y, boardName, visited = new Set()) {
    return this.resolve(() => {
      const choicesBefore = this.decisionCount();
      const result = this.resolveArrival(this.leader(piece), x, y, boardName, visited);
      return result !== true && this.decisionCount() > choicesBefore ? "decision" : result;
    });
  }

  resolveArrival(root, x, y, boardName, visited = new Set()) {
    if (!root || this._resolution.removed.has(root.uid)) return "lost";
    const cells = this.footprint(root.type, x, y);
    const location = `${boardName}:${x},${y}`;
    if (!this.board(boardName) || !cells.length || visited.has(location) ||
        (["Landmine", "Pittrap"].includes(root.type) && boardName !== "Normal")) {
      this.removePiece(root);
      return "lost";
    }
    visited.add(location);

    // A cross-dimension arrival is already in that dimension when it meets an
    // occupant. A local mover stays at its origin until the capture succeeds.
    if (!this.findByUid(root.uid) || root.board !== boardName) {
      this.detachPiece(root);
      root.board = boardName; root.x = x; root.y = y;
    }
    const origin = locationOf(root);
    const encountered = new Set();
    while (true) {
      const cell = cells.find(position => {
        const target = this.getCell(position.x, position.y, boardName);
        return target && !samePiece(root, target);
      });
      if (!cell) break;
      const target = this.leader(this.getCell(cell.x, cell.y, boardName));
      if (encountered.has(target.uid)) { this.removePiece(root); return "lost"; }
      encountered.add(target.uid);
      if (target.type === "Portal") {
        if (root.type === "Portal") {
          this.evaluatePortalChain(cell.x, cell.y);
          return false;
        }
        if (this.evaluatePortalChain(cell.x, cell.y)) { this.removePiece(root); return "lost"; }
        const destination = this.portalDestination(target, boardName);
        if (!destination) { this.removePiece(root); return "lost"; }
        return this.resolveArrival(root, x, y, destination, visited);
      }
      if (!this.resolveCapture(target, root, { visited })) return false;
      if (this._resolution.removed.has(root.uid) || this._resolution.deaths.has(deathKey(root, origin)) ||
          root.board !== origin.board || root.x !== origin.x || root.y !== origin.y) return "lost";
    }
    return this.installGroup(root, x, y, boardName);
  }
  moveGroup(root, toX, toY, boardName = root.board) {
    root = this.leader(root);
    return this.transportPiece(root, toX, toY, boardName);
  }

  handleHeavenArrival(target, incoming) {
    this.removePiece(incoming);
    if (target.type === "Church") this.emit("The Church rejects the invading piece.", "church0.png");
    else if (target.type === "Atheism") this.queueDecision("atheism", target);
    else {
      this.resolveHit(target, target.type === "Angel" ? incoming : null);
      if (target.type === "Devil") this.queueDecision("devil", target);
    }
    return false;
  }
  promoteIfNeeded(piece) {
    if (!piece || !PAWN_TYPES.has(piece.type)) return;
    if ((piece.color === COLORS.WHITE && piece.y === 0) || (piece.color === COLORS.BLACK && piece.y === 7)) {
      this.replacePiece(piece, "Queen");
    }
  }

  moveCoordinates(from, to, boardName) {
    const selected = this.getCell(from.x, from.y, boardName);
    const piece = this.leader(selected);
    return {
      piece, from: { x: piece.x, y: piece.y },
      to: { x: to.x - (selected.x - piece.x), y: to.y - (selected.y - piece.y) }
    };
  }

  validMove(from, to, boardName = this.currentBoard) {
    if (!this.board(boardName) || !inBounds(from?.x, from?.y) || !inBounds(to?.x, to?.y) ||
        (from.x === to.x && from.y === to.y) || !this.getCell(from.x, from.y, boardName)) return false;
    const normalized = this.moveCoordinates(from, to, boardName);
    const piece = normalized.piece;
    const cells = this.footprint(piece.type, normalized.to.x, normalized.to.y);
    if (!cells.length) return false;
    for (const cell of cells) {
      const target = this.getCell(cell.x, cell.y, boardName);
      if (target && !samePiece(target, piece) && target.color === piece.color && target.type !== "Portal") return false;
    }
    return this.basicValid(piece, normalized.to, boardName);
  }
  basicValid(piece, to, boardName) {
    const from = { x: piece.x, y: piece.y }; const d = { x: from.x - to.x, y: from.y - to.y };
    const ad = { x: Math.abs(d.x), y: Math.abs(d.y) }; const target = this.getCell(to.x, to.y, boardName);
    const pathClear = (dx, dy) => {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      for (let i = 1; i < distance; i++) if (this.getCell(from.x + Math.sign(dx) * i, from.y + Math.sign(dy) * i, boardName)) return false;
      return true;
    };
    if (piece.controlledBy && CONTROLLED_TYPES.has(piece.type)) return ad.x <= 1 && ad.y <= 1 && (ad.x + ad.y > 0);
    switch (piece.type) {
      case "Pawn": case "SuicideBomber": case "Centaur": {
        const forward = piece.color === COLORS.BLACK ? 1 : -1;
        const dy = (to.y - from.y) * forward;
        if (!target) {
          if (d.x !== 0 || dy <= 0 || dy > (this.rules.includes("PAWNS_MOVE_FOUR") ? 4 : 2) || (dy > 1 && piece.moved)) return false;
          if (dy > 1) for (let i = 1; i < dy; i++) if (this.getCell(from.x, from.y + forward * i, boardName)) return false;
          return true;
        }
        return dy === 1 && ad.x === 1;
      }
      case "Knight": case "Unicorn": case "Zebra": return (ad.x === 2 && ad.y === 1) || (ad.x === 1 && ad.y === 2) || (piece.type === "Unicorn" && ((ad.x === 2 && ad.y === 0) || (ad.x === 0 && ad.y === 2)));
      case "Bishop": case "BishopKnight": case "Necromancer": case "SuperBishop": case "Jester": {
        const bishop = ad.x === ad.y && ad.x !== 0 && pathClear(to.x - from.x, to.y - from.y);
        if (piece.type === "BishopKnight") return bishop || ((ad.x === 2 && ad.y === 1) || (ad.x === 1 && ad.y === 2));
        if (piece.type === "SuperBishop") return bishop || (ad.x <= 1 && ad.y <= 1 && (ad.x !== 0 || ad.y !== 0));
        return bishop;
      }
      case "Rook": case "RookKnight": case "AngryRook": {
        const line = (ad.x === 0) !== (ad.y === 0);
        if (!line) return piece.type === "RookKnight" && ((ad.x === 2 && ad.y === 1) || (ad.x === 1 && ad.y === 2));
        if (piece.type === "RookKnight") return pathClear(to.x - from.x, to.y - from.y) || ((ad.x === 2 && ad.y === 1) || (ad.x === 1 && ad.y === 2));
        if (piece.type === "AngryRook") {
          let count = 0; const distance = Math.max(ad.x, ad.y);
          for (let i = 1; i < distance; i++) if (this.getCell(from.x + Math.sign(to.x - from.x) * i, from.y + Math.sign(to.y - from.y) * i, boardName)) count++;
          return count <= 1;
        }
        return pathClear(to.x - from.x, to.y - from.y);
      }
      case "Queen": case "KnightQueen": case "BallQueen": {
        const line = (ad.x === ad.y && ad.x !== 0) || ((ad.x === 0) !== (ad.y === 0));
        if (line && pathClear(to.x - from.x, to.y - from.y)) return true;
        if (piece.type === "KnightQueen" && ((ad.x === 2 && ad.y === 1) || (ad.x === 1 && ad.y === 2))) return true;
        return piece.type === "BallQueen" && ((ad.y === 3 && ad.x <= 1) || (ad.x === 3 && ad.y <= 1) || (ad.x === 2 && ad.y === 2));
      }
      case "King": return ad.x <= 1 && ad.y <= 1;
      case "SuperKing": return ad.x <= 1 && ad.y <= 1 && (ad.x !== 0 || ad.y !== 0);
      case "TrojanHorse": return d.x === 0 && ((piece.color === COLORS.BLACK ? -d.y : d.y) === 1);
      case "Giraffe": return (ad.x === 3 && ad.y === 1) || (ad.x === 1 && ad.y === 3);
      case "Meteor": case "WildHorse": case "Zombie": return true;
      case "Wildlife": return !target;
      default: return false;
    }
  }
  legalMoves(from, boardName = this.currentBoard) {
    const result = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const target = this.getCell(x, y, boardName);
      if (this.validMove(from, { x, y }, boardName) || (target && this.validAttack(from, { x, y }, boardName))) result.push({ x, y });
    }
    return result;
  }

  validAttack(from, to, boardName = this.currentBoard) {
    if (!inBounds(from?.x, from?.y) || !inBounds(to?.x, to?.y)) return false;
    const piece = this.getCell(from.x, from.y, boardName);
    const target = this.getCell(to.x, to.y, boardName);
    if (!piece || !target || piece.type !== "SuperKing" || target.color === piece.color) return false;
    const leader = piece.group && piece.part !== 0 ? this.leader(piece) : piece;
    const dx = Math.abs(leader.x - to.x);
    const dy = Math.abs(leader.y - to.y);
    return Math.max(dx, dy) === 2;
  }

  currentColor() { return this.whiteToMove ? COLORS.WHITE : COLORS.BLACK; }
  funds() { return this.whiteToMove ? this.whiteGP : this.blackGP; }
  giveGold(amount, color = this.currentColor()) { if (color === COLORS.WHITE) this.whiteGP += amount; else if (color === COLORS.BLACK) this.blackGP += amount; }
  withdraw(amount) { this.giveGold(-amount); }
  emit(message, icon = null) { this.lastEvent = { id: ++this.eventId, message, icon }; }

  actionBlocked() { return this.gameOver || this.rulePicker || Boolean(this.pendingDecision); }

  canBuy(id, x, y, boardName = "Normal") {
    const item = SHOP_ITEMS.find(entry => entry[0] === id);
    return Boolean(!this.actionBlocked() && item && boardName === "Normal" && this.funds() >= item[1] &&
      this.footprintClear(pieceType(id), x, y, boardName));
  }

  buy(id, x, y, boardName = "Normal") {
    if (this.gameOver) return this.reject("The game is over.");
    if (this.rulePicker || this.pendingDecision) return this.reject("Resolve the open choice first.");
    const item = SHOP_ITEMS.find(entry => entry[0] === id);
    if (!item) return this.reject("Unknown shop item");
    if (boardName !== "Normal" || !this.board("Normal")) return this.reject("Shop pieces can only be placed on the material board.");
    if (this.funds() < item[1]) return this.reject("Not enough GP.");
    if (!this.canBuy(id, x, y, boardName)) return this.reject("Choose an empty square.");
    this.resolve(() => {
      this.withdraw(item[1]);
      const type = pieceType(id);
      this.placeNew(type, NPC_TYPES.has(type) ? COLORS.NPC : this.currentColor(), x, y, "Normal");
      this.history.push({ type: "buy", id, x, y, board: "Normal" });
    });
    this.completeTurn();
    return true;
  }

  canUpgrade(toId, x, y, boardName = this.currentBoard) {
    const upgrade = UPGRADES.find(entry => entry[0] === toId);
    const piece = this.getCell(x, y, boardName);
    return Boolean(!this.actionBlocked() && upgrade && piece && (!piece.group || piece.part === 0) &&
      piece.color === this.currentColor() && this.funds() >= 5 && upgrade[1].includes(piece.type) &&
      this.footprintClear(pieceType(toId), x, y, boardName, piece));
  }

  upgrade(toId, x, y, boardName = this.currentBoard) {
    if (this.gameOver) return this.reject("The game is over.");
    if (this.rulePicker || this.pendingDecision) return this.reject("Resolve the open choice first.");
    if (!this.canUpgrade(toId, x, y, boardName)) return this.reject("That piece cannot be upgraded here.");
    this.resolve(() => {
      this.withdraw(5);
      this.replacePiece(this.getCell(x, y, boardName), pieceType(toId));
      this.history.push({ type: "upgrade", to: toId, x, y, board: boardName });
    });
    return true;
  }

  replacePiece(piece, type) {
    return this.resolve(() => {
      const root = this.leader(piece);
      if (!root || !this.footprint(type, root.x, root.y).length) return null;
      const location = locationOf(root);
      const replacement = this.makePiece(type, root.color);
      this.copyPieceState(root, replacement);
      this.removePiece(root);
      return this.resolveArrival(replacement, location.x, location.y, location.board) === true ? replacement : null;
    });
  }
  switchBoard() {
    if (this.gameOver) return this.reject("The game is over.");
    if (this.currentBoard === "Normal") this.currentBoard = this.boards.Hell ? "Hell" : this.boards.Heaven ? "Heaven" : "Normal";
    else if (this.currentBoard === "Hell") this.currentBoard = this.boards.Heaven ? "Heaven" : "Normal";
    else this.currentBoard = "Normal";
    return true;
  }
  reject(message) { this.emit(message); return false; }

  move(from, to, boardName = this.currentBoard) {
    if (this.gameOver) return this.reject(this.draw ? "The game ended in a draw." : `${this.winner} has already won.`);
    if (this.rulePicker || this.pendingDecision) return this.reject("Resolve the open choice first.");
    const piece = this.leader(this.getCell(from?.x, from?.y, boardName));
    if (!piece) return this.reject("Illegal move.");
    if (piece.color !== this.currentColor()) return this.reject("It is not that piece's turn.");
    const moving = this.validMove(from, to, boardName);
    if (!moving && !this.validAttack(from, to, boardName)) return this.reject("Illegal move.");
    this.resolve(() => {
      if (moving) {
        const normalized = this.moveCoordinates(from, to, boardName);
        const target = this.leader(this.getCell(normalized.to.x, normalized.to.y, boardName));
        const captured = samePiece(piece, target) ? null : target;
        if (PAWN_TYPES.has(piece.type)) piece.moved = true;
        const result = this.resolveArrival(piece, normalized.to.x, normalized.to.y, boardName);
        if (result === true) this.afterCapture(piece, captured, normalized.to, normalized.from, boardName);
      } else {
        this.resolveCapture(this.leader(this.getCell(to.x, to.y, boardName)), piece);
      }
      this.history.push({ type: moving ? "move" : "attack", from: { ...from }, to: { ...to }, board: boardName });
    });
    this.completeTurn();
    return true;
  }
  afterCapture(piece, captured, to, from, boardName) {
    if (this.findByUid(piece.uid)?.board !== boardName || piece.x !== to.x || piece.y !== to.y) return;
    if (piece.type === "AngryRook") {
      const dx = Math.sign(to.x - from.x), dy = Math.sign(to.y - from.y);
      for (let i = 1; i < Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)); i++) {
        if (this.findByUid(piece.uid)?.board !== boardName || piece.x !== to.x || piece.y !== to.y) break;
        this.resolveCapture(this.leader(this.getCell(from.x + dx * i, from.y + dy * i, boardName)), piece);
      }
    } else if (piece.type === "Necromancer") {
      if (!captured) return;
      const dx = Math.sign(from.x - to.x), dy = Math.sign(from.y - to.y); const rx = to.x + dx, ry = to.y + dy;
      const resurrected = captured;
      this.removePiece(resurrected);
      this._resolution.removed.delete(resurrected.uid);
      if (CONTROLLED_TYPES.has(resurrected.type)) {
        resurrected.controlledBy = piece.color;
        resurrected.wildCounterpart ||= resurrected.type;
        resurrected.movingRight = undefined;
      }
      this.setGroupColor(resurrected, piece.color);
      this.resolveArrival(resurrected, rx, ry, boardName);
    } else if (piece.type === "Zebra") {
      const dx = Math.abs(to.x - from.x) > Math.abs(to.y - from.y) ? Math.sign(to.x - from.x) : 0;
      const dy = dx === 0 ? Math.sign(to.y - from.y) : 0;
      for (let i = 1; i <= 2; i++) {
        if (this.findByUid(piece.uid)?.board !== boardName || piece.x !== to.x || piece.y !== to.y) break;
        this.resolveCapture(this.leader(this.getCell(from.x + dx * i, from.y + dy * i, boardName)), piece);
      }
    } else if (piece.type === "Zombie" && !piece.controlledBy) {
      if (!captured) return;
      const zombie = this.placeNew("Zombie", COLORS.NPC, from.x, from.y, boardName);
      if (zombie) {
        zombie.movingRight = piece.movingRight;
        this.registerAutomover(zombie);
      }
    } else if (piece.type === "Meteor" && captured) {
      this.explode(to.x, to.y, piece, boardName);
    }
  }

  takeAt(x, y, taker, boardName = this.currentBoard) {
    return this.resolve(() => {
      const choicesBefore = this.decisionCount();
      const result = this.resolveCapture(this.leader(this.getCell(x, y, boardName)), this.leader(taker));
      return !result && this.decisionCount() > choicesBefore ? "decision" : result;
    });
  }

  resolveCapture(target, attacker, { visited = new Set() } = {}) {
    if (!target || samePiece(target, attacker)) return true;
    if (target.type === "Portal" && attacker) {
      this.portalKill(target, attacker, target.board, visited);
      return false;
    }
    if (target.board === "Heaven" && attacker && this.isNpcPiece(target)) return this.handleHeavenArrival(target, attacker);
    switch (target.type) {
      case "Atheism": this.queueDecision("atheism", target); return false;
      case "Church":
        if (attacker && target.board !== "Normal") this.resolveArrival(attacker, target.x, target.y, "Normal", visited);
        return false;
      case "Whirlpool":
        if (attacker) this.resolveHit(attacker, null);
        return false;
      case "Pittrap":
        this.resolveDeath(target, null);
        if (attacker) this.resolveHit(attacker, null);
        return false;
      case "Void":
        if (attacker) {
          this.detachPiece(attacker);
          const empty = this.findEmpty("Normal", attacker.type);
          if (empty) this.resolveArrival(attacker, empty.x, empty.y, "Normal", visited);
          else this.removePiece(attacker);
        }
        return false;
      default: {
        const result = this.resolveHit(target, attacker);
        if (target.type === "Devil") this.queueDecision("devil", target);
        return result;
      }
    }
  }

  resolveHit(piece, attacker, { cause = "capture", location = locationOf(piece) } = {}) {
    const root = this.leader(piece);
    if (this._resolution.removed.has(root.uid) || this._resolution.deaths.has(deathKey(root, location))) return true;
    if (samePiece(root, attacker)) return false;
    if (["SuperKing", "Angel", "AggroDevil"].includes(root.type) && (root.health ?? 1) > 1) {
      this.setGroupHealth(root, root.health - 1);
      if (attacker) this.removePiece(attacker);
      if (root.type === "Angel" && attacker && cause !== "explosion") this.queueDecision("angel", root);
      return false;
    }
    if (root.type === "AggroDevil" && attacker) this.resolveHit(attacker, null);
    return this.resolveDeath(root, attacker, location);
  }

  resolveDeath(piece, attacker, location = locationOf(piece)) {
    const identity = deathKey(piece, location);
    if (this._resolution.removed.has(piece.uid) || this._resolution.deaths.has(identity)) return true;
    this._resolution.deaths.add(identity);
    const { board, x, y } = location;
    const type = piece.type;
    const nextExplodes = this.rules.includes("NEXT_PIECE_EXPLODES");
    if (nextExplodes) this.rules = this.rules.filter(rule => rule !== "NEXT_PIECE_EXPLODES");
    const attackerLocation = attacker && locationOf(attacker);

    if (type === "RookTower") {
      const flipped = new Set();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const near = this.leader(this.getCell(x + dx, y + dy, board));
        if (!near || flipped.has(near.uid) || near.color === COLORS.NPC) continue;
        flipped.add(near.uid);
        this.setGroupColor(near, near.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE);
      }
    } else if (type === "TrojanHorse") {
      let spawned = 0;
      for (let dy = -1; dy <= 1 && spawned < 3; dy++) for (let dx = -1; dx <= 1 && spawned < 3; dx++) {
        if (inBounds(x + dx, y + dy) && !this.getCell(x + dx, y + dy, board)) {
          this.placeNew("Pawn", piece.color, x + dx, y + dy, board);
          spawned++;
        }
      }
    }

    this.baseKill(piece, location);
    const stopsAttacker = ["Landmine", "SuicideBomber", "Jester"].includes(type);
    if (EXPLOSIVE_TYPES.has(type) || nextExplodes) {
      const forceHit = attacker && (stopsAttacker || !this.findByUid(attacker.uid));
      const extraTargets = forceHit ? [{ piece: attacker, location: attackerLocation, force: true }] : [];
      this.explode(x, y, piece, board, extraTargets);
    }
    return !stopsAttacker && !nextExplodes;
  }

  baseKill(piece, location) {
    const ordinary = !this.isNpcPiece(piece);
    if (piece.type === "Coin") this.giveGold(4);
    else if (piece.type === "Treasure") this.giveGold(15);
    else if (ordinary && location.board === "Normal") this.giveGold(1);

    this.detachPiece(piece);
    const destination = HEAVEN_DEATH_TYPES.has(piece.type) ? "Heaven" : "Hell";
    if (ordinary && location.board === "Normal" && this.board(destination)) {
      // A defeated two-life unit enters its afterlife on its final life.
      if (piece.health !== undefined) this.setGroupHealth(piece, Math.max(1, piece.health));
      this.resolveArrival(piece, location.x, location.y, destination);
    } else this.removePiece(piece);
  }

  portalKill(portal, taker, boardName, visited = new Set()) {
    return this.resolve(() => {
      if (!taker) { this.removePiece(portal); return true; }
      if (this.evaluatePortalChain(portal.x, portal.y)) { this.removePiece(taker); return false; }
      const destination = this.portalDestination(portal, boardName);
      visited.add(`${boardName}:${portal.x},${portal.y}`);
      if (destination) this.resolveArrival(taker, portal.x, portal.y, destination, visited);
      else this.removePiece(taker);
      return false;
    });
  }

  explode(x, y, taker, boardName = this.currentBoard, extraTargets = []) {
    if (!this.board(boardName) || !inBounds(x, y)) return;
    return this.resolve(() => {
      const outermost = !this._blast;
      const blast = this._blast ||= { queue: [], centers: new Set(), hits: new Set() };
      const center = `${boardName}:${x},${y}`;
      const targets = [];
      if (!blast.centers.has(center)) {
        blast.centers.add(center);
        const seen = new Set();
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const piece = this.leader(this.getCell(x + dx, y + dy, boardName));
          if (piece && !seen.has(piece.uid)) {
            seen.add(piece.uid);
            targets.push({ piece, location: locationOf(piece) });
          }
        }
        this.emit("Explosion", "explosion.png");
      }
      blast.queue.push(...targets, ...extraTargets);
      if (!outermost) return;
      try {
        // Breadth-first blasts share a hit set, so a large piece or overlapping
        // blast is resolved once, and a new explosive still propagates its radius.
        for (let index = 0; index < blast.queue.length; index++) {
          const { piece, location, force } = blast.queue[index];
          const hit = `${location.board}:${piece.uid}`;
          const current = this.findByUid(piece.uid);
          if (blast.hits.has(hit) || this._resolution.removed.has(piece.uid) ||
              this._resolution.deaths.has(deathKey(piece, location)) ||
              (current && current.board !== location.board) || (!current && !force)) continue;
          blast.hits.add(hit);
          this.resolveHit(piece, null, { cause: "explosion", location });
        }
      } finally {
        this._blast = null;
      }
    });
  }
  findEmpty(boardName = "Normal", type = "Pawn") {
    const spots = [];
    if (!this.board(boardName)) return null;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (this.footprintClear(type, x, y, boardName)) spots.push({ x, y });
    return spots.length ? spots[this.random.nextInt(spots.length)] : null;
  }

  drawGame(message = "Game drawn.") {
    this.finishGame(null, "draw", message);
  }

  finishGame(winner, reason, message) {
    this.winner = winner;
    this.gameOver = true;
    this.draw = winner === null;
    this.drawOffer = null;
    this.rulePicker = false;
    this.rulePickerColor = null;
    this.pendingDecision = null;
    this._decisionQueue = [];
    this._turnPending = false;
    this._automoveQueue = null;
    this.endReason = reason;
    this.emit(message);
  }

  destroyHell() {
    return this.destroyDimension("Hell", "Hell was destroyed.");
  }

  resign(color) {
    if (!this.online || this.gameOver || ![COLORS.WHITE, COLORS.BLACK].includes(color)) return this.reject("The game cannot be resigned.");
    const winner = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    this.finishGame(winner, "resignation", `${color} resigns. ${winner} wins!`);
    return true;
  }

  offerDraw(color) {
    if (!this.online || this.gameOver) return this.reject("The game cannot accept a draw offer.");
    if (this.drawOffer) return this.reject("A draw offer is already pending.");
    this.drawOffer = color;
    this.emit(`${color} offered a draw.`);
    return true;
  }

  respondDraw(color, accept) {
    if (!this.online || this.gameOver || !this.drawOffer || this.drawOffer === color) return this.reject("There is no draw offer for this player.");
    const offeredBy = this.drawOffer;
    this.drawOffer = null;
    if (accept) {
      this.finishGame(null, "agreement", "Game drawn by agreement.");
    } else {
      this.emit(`${color} declined the draw offer from ${offeredBy}.`);
    }
    return true;
  }

  decisionCount() { return (this.pendingDecision ? 1 : 0) + this._decisionQueue.length; }

  queueDecision(type, target) {
    const existing = [this.pendingDecision, ...this._decisionQueue].filter(Boolean);
    if (existing.some(choice => choice.type === type && choice.targetUid === target.uid)) return;
    const titles = { angel: "Free him?", atheism: "God Of Atheism", devil: "The Devil" };
    const decision = {
      id: this._nextDecisionId++, type, title: titles[type], color: this.currentColor(),
      targetUid: target.uid, angelUid: type === "angel" ? target.uid : undefined
    };
    if (this.pendingDecision) this._decisionQueue.push(decision);
    else this.pendingDecision = decision;
    this.emit(titles[type], type === "angel" ? "aggro-angel.png" : `${type}.png`);
  }

  decision(choice) {
    const decision = this.pendingDecision;
    if (this.gameOver || !decision) return this.reject("No decision is pending.");
    if (!DECISION_CHOICES[decision.type]?.includes(choice)) return this.reject("That choice is not available.");
    const releaseType = decision.type === "angel" && choice === "yes" ? "AggroAngel"
      : decision.type === "devil" && choice === "release" ? "AggroDevil" : null;
    let spot = null;
    if (releaseType) {
      spot = this.footprintClear(releaseType, 3, 3, "Normal") ? { x: 3, y: 3 } : this.findEmpty("Normal", releaseType);
      if (!spot) return this.reject("There is no empty space on Normal to release this piece.");
    }
    this.resolve(() => {
      this.pendingDecision = this._decisionQueue.shift() || null;
      if (decision.type === "atheism") {
        if (choice === "heaven") this.destroyDimension("Heaven", "Heaven was destroyed.");
        else if (choice === "hell") this.destroyHell();
        else {
          for (const piece of new Set((this.board("Normal") || []).flat().filter(Boolean).map(piece => this.leader(piece)))) {
            if (["Angel", "Devil"].includes(piece.type)) this.removePiece(piece);
          }
        }
      } else if (releaseType) {
        this.removePiece(this.findByUid(decision.targetUid));
        const active = this.placeNew(releaseType, COLORS.NPC, spot.x, spot.y, "Normal");
        this.registerAutomover(active);
      } else if (decision.type === "devil" && choice === "gold") {
        this.giveGold(10, decision.color);
        this.giveGold(5, decision.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE);
      }
      // Java's Devil "remove" and "smite" buttons have no gameplay handlers.
      this.history.push({ type: "decision", decision: decision.type, choice });
    });
    if (!this.gameOver && !this.pendingDecision) {
      if (this._turnPending) { this._turnPending = false; this.nextTurn(); }
      else if (this._automoveQueue) this.finishTurnAutomovers();
    }
    return true;
  }
  findByUid(uid) {
    for (const boardName of BOARD_NAMES) { const board = this.board(boardName); if (!board) continue; for (const row of board) for (const piece of row) if (piece?.uid === uid) return this.leader(piece); }
    return null;
  }

  addRule(rule) {
    if (this.gameOver) return this.reject("The game is over.");
    if (this.pendingDecision) return this.reject("Resolve the open choice first.");
    if (!RULES.includes(rule)) return this.reject("Unknown rule.");
    return this.resolve(() => this.applyRule(rule));
  }

  applyRule(rule) {
    this.rulePicker = false; this.rulePickerColor = null; this.turnsSinceNewRule = 0;
    switch (rule) {
      case "MORE_GOLD": this.whiteGP += 10; this.blackGP += 10; this.emit("EVERYONE GETS +10GP!"); break;
      case "GOLD_RUSH": {
        const spawned = this.spawnRandomEmpty("Coin", 5, "Normal");
        this.emit(`GOLD RUSH: ${spawned} coin${spawned === 1 ? "" : "s"} spawned.`, "coin.png");
        break;
      }
      case "UNICORNS": this.replaceMatching(KNIGHT_TYPES, "Unicorn"); break;
      case "BISHOPS_GAIN_NECROMANCY": this.replaceMatching(BISHOP_TYPES, "Necromancer"); break;
      case "PORTALS_OPEN": {
        this.placeNew("Portal", COLORS.NPC, 0, 4, "Normal", { portalTo: "Heaven" });
        this.placeNew("Portal", COLORS.NPC, 7, 3, "Normal", { portalTo: "Hell" });
        break;
      }
      case "PAWN_UPGRADE": {
        const upgraded = new Set();
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          const piece = this.getCell(x, y, "Normal");
          if (piece && PAWN_TYPES.has(piece.type) && !upgraded.has(piece.color)) {
            this.replacePiece(piece, "Centaur");
            upgraded.add(piece.color);
          }
        }
        break;
      }
      case "TREASURE": {
        const spots = [];
        if (this.board("Normal")) for (let x = 0; x < 8; x++) for (const y of [3, 4]) if (!this.getCell(x, y, "Normal")) spots.push({ x, y });
        if (spots.length) {
          const spot = spots[this.random.nextInt(spots.length)];
          this.placeNew("Treasure", COLORS.NPC, spot.x, spot.y, "Normal");
          this.emit("Treasure appeared.", "treasure.png");
        } else {
          this.emit("No empty square was available for Treasure.", "treasure.png");
        }
        break;
      }
      case "LANDMINES": case "PITTRAPS": {
        const type = rule === "LANDMINES" ? "Landmine" : "Pittrap";
        const spawned = this.spawnRandomEmpty(type, 3, "Normal");
        this.emit(`${spawned} ${rule === "LANDMINES" ? "landmines" : "pittraps"} spawned.`);
        break;
      }
      case "WILD_LIFE":
        for (const [x, y, movingRight] of [[0, 3, true], [7, 4, false]]) this.registerAutomover(this.placeNew("Wildlife", COLORS.NPC, x, y, "Normal", { movingRight }));
        break;
      case "WILD_HORSE": this.registerAutomover(this.placeNew("WildHorse", COLORS.NPC, 4, 3, "Normal")); break;
      case "ZOMBIE_APOCALYPSE":
        for (const [x, y, movingRight] of [[0, 3, true], [0, 4, true], [7, 3, false], [7, 4, false]]) this.registerAutomover(this.placeNew("Zombie", COLORS.NPC, x, y, "Normal", { movingRight }));
        break;
      case "EVERYONE_UPGRADES":
        for (let i = 0; i < 8; i++) {
          const piece = this.leader(this.getCell(this.random.inclusive(0, 7), this.random.inclusive(0, 7), "Normal"));
          if (!piece || piece.color === COLORS.NPC) continue;
          const map = { Pawn: "SuicideBomber", Knight: "TrojanHorse", Rook: "RookTower", Queen: "BallQueen", King: "King", Bishop: "Necromancer" };
          this.replacePiece(piece, map[piece.type] || "Jester");
        }
        break;
      case "WHIRLPOOL": this.placeNew("Whirlpool", COLORS.NPC, 3 + this.random.inclusive(0, 1), 3 + this.random.inclusive(0, 1), "Normal"); break;
      case "VOID": this.placeNew("Void", COLORS.NPC, 3, 3, "Normal"); break;
      case "METEOR_SHOWER": this.registerAutomover(this.placeNew("Meteor", COLORS.NPC, 0, 2, "Normal")); break;
    }
    if (!EVENT_RULES.has(rule) && !this.rules.includes(rule)) this.rules.push(rule);
    this.availableRules = this.availableRules.filter(item => item !== rule);
    this.history.push({ type: "rule", rule });
    return true;
  }
  replaceMatching(types, replacement) {
    this.resolve(() => {
      const pieces = new Set((this.board("Normal") || []).flat().filter(Boolean).map(piece => this.leader(piece)));
      for (const piece of pieces) if (types.has(piece.type)) this.replacePiece(piece, replacement);
    });
  }
  spawnRandomEmpty(type, count, boardName = "Normal") {
    const board = this.board(boardName);
    if (!board) return 0;
    const empty = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (!board[y][x]) empty.push({ x, y });
    let spawned = 0;
    while (spawned < count && empty.length) {
      const index = this.random.nextInt(empty.length);
      const spot = empty.splice(index, 1)[0];
      if (this.placeNew(type, COLORS.NPC, spot.x, spot.y, boardName)) spawned++;
    }
    return spawned;
  }

  completeTurn() {
    if (this.gameOver) return;
    if (this.pendingDecision) this._turnPending = true;
    else this.nextTurn();
  }

  nextTurn() {
    if (this.actionBlocked()) return;
    this.whiteToMove = !this.whiteToMove;
    this.turnsSinceNewRule++;
    this._automoveQueue = this.automovingPieces.filter(Boolean).map(piece => piece.uid);
    this.finishTurnAutomovers();
  }

  finishTurnAutomovers() {
    while (this._automoveQueue?.length && !this.gameOver && !this.pendingDecision) {
      const piece = this.findByUid(this._automoveQueue.shift());
      if (piece) this.automove(piece);
    }
    if (this.gameOver || this.pendingDecision) return;
    this._automoveQueue = null;
    if (this.turnsSinceNewRule >= this.rules.length * 2 && this.availableRules.length) {
      this.rulePicker = true;
      this.rulePickerColor = this.nextRulePickerColor;
      this.nextRulePickerColor = this.nextRulePickerColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
      this.turnsSinceNewRule = 0;
    }
  }
  registerAutomover(piece) {
    if (piece && AUTOMOVING_TYPES.has(piece.type) && !piece.controlledBy && this.findByUid(piece.uid) &&
        !this.automovingPieces.some(item => item.uid === piece.uid)) this.automovingPieces.push(piece);
  }

  automove(piece) {
    const current = piece && this.findByUid(piece.uid);
    if (!current || current.controlledBy || current.board !== "Normal" || this.gameOver || this.pendingDecision) return;
    return this.resolve(() => this.resolveAutomove(current));
  }

  resolveAutomove(current) {
    const from = { x: current.x, y: current.y }; let to = null;
    if (current.type === "Wildlife") to = { x: current.x + (current.movingRight ? 1 : -1), y: current.y };
    else if (current.type === "Zombie") { to = { x: current.x + (current.movingRight ? 1 : -1), y: current.y }; if (this.getCell(to.x, to.y, "Normal")?.type === "Zombie") { current.movingRight = !current.movingRight; to = { x: current.x + (current.movingRight ? 1 : -1), y: current.y }; } }
    else if (current.type === "Meteor") to = { x: current.x + 1, y: current.y + 1 };
    else if (current.type === "WildHorse") { const sx = this.random.inclusive(0, 1) ? 1 : -1, sy = this.random.inclusive(0, 1) ? 1 : -1; to = this.random.inclusive(0, 1) ? { x: current.x + 2 * sx, y: current.y + sy } : { x: current.x + sx, y: current.y + 2 * sy }; }
    else if (current.type === "AggroAngel") {
      this.emit("The winds shift.", "winds.png");
      const direction = this.random.inclusive(1, 4);
      const dx = direction === 1 ? 1 : direction === 2 ? -1 : 0;
      const dy = direction === 3 ? 1 : direction === 4 ? -1 : 0;
      const shift = (x, y) => {
        const source = this.getCell(x, y, "Normal");
        if (source && !LARGE_TYPES.has(source.type) && !this.getCell(x + dx, y + dy, "Normal")) {
          this.resolveArrival(source, x + dx, y + dy, "Normal");
        }
      };
      if (direction === 1) for (let y = 0; y < 8; y++) for (let x = 6; x >= 0; x--) shift(x, y);
      if (direction === 2) for (let y = 0; y < 8; y++) for (let x = 1; x < 8; x++) shift(x, y);
      if (direction === 3) for (let y = 6; y >= 0; y--) for (let x = 0; x < 8; x++) shift(x, y);
      if (direction === 4) for (let y = 1; y < 8; y++) for (let x = 0; x < 8; x++) shift(x, y);
      return;
    }
    if (!to || !inBounds(to.x, to.y)) {
      if (["Wildlife", "Zombie"].includes(current.type) && (current.x === 0 || current.x === 7)) current.movingRight = current.x === 0;
      return;
    }
    if (this.validMove(from, to, "Normal")) {
      const oldTarget = this.getCell(to.x, to.y, "Normal");
      const captured = oldTarget ? this.leader(oldTarget) : null;
      const result = this.resolveArrival(current, to.x, to.y, "Normal");
      if (result === true) this.afterCapture(current, captured, to, from, "Normal");
      if (["Wildlife", "Zombie"].includes(current.type) && (current.x === 0 || current.x === 7)) current.movingRight = current.x === 0;
    }
  }

  toSnapshot() {
    const serialize = boardName => {
      const board = this.board(boardName); if (!board) return null;
      return board.map(row => row.map(piece => piece ? { uid: piece.uid, type: piece.type, color: piece.color, part: piece.part, group: piece.group, x: piece.x, y: piece.y, health: piece.health, moved: piece.moved, movingRight: piece.movingRight, portalTo: piece.portalTo, controlledBy: piece.controlledBy, wildCounterpart: piece.wildCounterpart, board: piece.board } : null));
    };
    return {
      online: this.online, mode: this.mode, seed: this.seed, randomState: this.random.seed.toString(),
      nextUid: this.nextUid, nextGroup: this.nextGroup, currentBoard: this.currentBoard,
      whiteToMove: this.whiteToMove, whiteGP: this.whiteGP, blackGP: this.blackGP,
      rules: [...this.rules], availableRules: [...this.availableRules], turnsSinceNewRule: this.turnsSinceNewRule,
      rulePicker: this.rulePicker, rulePickerColor: this.rulePickerColor, nextRulePickerColor: this.nextRulePickerColor,
      pendingDecision: structuredClone(this.pendingDecision), decisionQueue: structuredClone(this._decisionQueue),
      nextDecisionId: this._nextDecisionId, turnPending: this._turnPending, automoveQueue: this._automoveQueue && [...this._automoveQueue],
      winner: this.winner, gameOver: this.gameOver, draw: this.draw, drawOffer: this.drawOffer,
      endReason: this.endReason, lastEvent: this.lastEvent && { ...this.lastEvent },
      automovingUids: this.automovingPieces.filter(piece => !piece.controlledBy && this.findByUid(piece.uid)).map(piece => piece.uid),
      boards: { Normal: serialize("Normal"), Heaven: serialize("Heaven"), Hell: serialize("Hell") },
      history: structuredClone(this.history.slice(-100))
    };
  }

  static fromSnapshot(snapshot) {
    const game = Object.create(GameState.prototype);
    Object.assign(game, {
      online: snapshot.online, mode: snapshot.mode, seed: snapshot.seed || "snapshot",
      currentBoard: snapshot.currentBoard, whiteToMove: snapshot.whiteToMove, whiteGP: snapshot.whiteGP, blackGP: snapshot.blackGP,
      rules: [...snapshot.rules], availableRules: [...(snapshot.availableRules || RULE_PICKER)],
      rulePicker: snapshot.rulePicker, rulePickerColor: snapshot.rulePickerColor || null,
      nextRulePickerColor: snapshot.nextRulePickerColor || COLORS.WHITE, turnsSinceNewRule: snapshot.turnsSinceNewRule || 0,
      pendingDecision: structuredClone(snapshot.pendingDecision || null), _decisionQueue: structuredClone(snapshot.decisionQueue || []),
      _nextDecisionId: snapshot.nextDecisionId || 1, _turnPending: Boolean(snapshot.turnPending),
      _automoveQueue: snapshot.automoveQueue ? [...snapshot.automoveQueue] : null,
      winner: snapshot.winner, gameOver: Boolean(snapshot.gameOver), draw: Boolean(snapshot.draw),
      drawOffer: snapshot.drawOffer || null, endReason: snapshot.endReason || null,
      lastEvent: snapshot.lastEvent && { ...snapshot.lastEvent }, eventId: snapshot.lastEvent?.id || 0,
      history: structuredClone(snapshot.history || []), automovingPieces: [],
      nextUid: snapshot.nextUid || 1, nextGroup: snapshot.nextGroup || 1,
      _resolutionDepth: 0, _resolution: null, _blast: null, initializing: false,
      boards: { Normal: blankBoard(), Heaven: blankBoard(), Hell: blankBoard() },
      random: new JavaRandom(hashSeed(snapshot.seed || "snapshot"))
    });
    if (snapshot.randomState !== undefined) game.random.seed = BigInt(snapshot.randomState);
    for (const boardName of BOARD_NAMES) {
      const rows = snapshot.boards[boardName]; if (!rows) { game.boards[boardName] = null; continue; }
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const piece = rows[y][x]; if (piece) { game.boards[boardName][y][x] = { ...piece }; game.nextUid = Math.max(game.nextUid, piece.uid + 1); game.nextGroup = Math.max(game.nextGroup, Number(String(piece.group || "g0").slice(1)) + 1); } }
    }
    for (const boardName of BOARD_NAMES) {
      const board = game.board(boardName); if (!board) continue;
      const groups = new Map();
      for (const row of board) for (const piece of row) if (piece?.group) { if (!groups.has(piece.group)) groups.set(piece.group, []); groups.get(piece.group)[piece.part] = piece; }
      for (const parts of groups.values()) if (parts[0]) {
        parts[0].related = parts;
        for (const part of parts) {
          part.color = parts[0].color;
          game.copyPieceState(parts[0], part);
        }
      }
    }
    for (const uid of snapshot.automovingUids || []) game.registerAutomover(game.findByUid(uid));
    return game;
  }
}

export function imageKey(piece) {
  if (!piece) return null;
  const large = LARGE_TYPES.has(piece.type);
  const rootName = piece.type === "SuicideBomber" ? "suicide-bomber" : piece.type === "KnightQueen" ? "knight-queen" : piece.type === "BishopKnight" ? "bishop-knight" : piece.type === "RookKnight" ? "rook-knight" : piece.type === "AngryRook" ? "angry-rook" : piece.type === "SuperKing" ? "super-king" : piece.type === "SuperBishop" ? "super-bishop" : piece.type === "BallQueen" ? "ball-queen" : piece.type === "RookTower" ? "rook-tower" : piece.type === "TrojanHorse" ? "trojan-horse" : piece.type.toLowerCase();
  if (large) {
    if (piece.type === "SuperKing" && piece.color === COLORS.BLACK) return "black/super-king.png";
    const base = piece.type === "SuperKing" ? (piece.color === COLORS.WHITE ? "white/super-king" : "black/super-king") : piece.type === "AggroAngel" ? "aggro-angel" : piece.type === "AggroDevil" ? "devil" : piece.type.toLowerCase();
    return `${base}${piece.part}.png`;
  }
  if (piece.type === "WildHorse") return "wild-horse.png";
  if (NPC_TYPES.has(piece.type)) return `${rootName}.png`;
  if (piece.color === COLORS.WHITE || piece.color === COLORS.BLACK) return `${piece.color.toLowerCase()}/${rootName}.png`;
  return `${rootName}.png`;
}

export { COLORS, BOARD_NAMES, LARGE_SIZES, LARGE_TYPES, NPC_TYPES };
