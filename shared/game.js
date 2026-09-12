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
  NEXT_PIECE_EXPLODES: "white/suicide-bomber.png", PAWNS_MOVE_FOUR: "white/pawn.png",
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
    if ((bound & (bound - 1)) === 0) return (bound * this.next(31)) >> 31;
    let bits, value;
    do {
      bits = this.next(31);
      value = bits % bound;
    } while (bits - value + (bound - 1) < 0);
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
function inBounds(x, y) { return x >= 0 && x < 8 && y >= 0 && y < 8; }
function key(x, y) { return `${x},${y}`; }
function absDiff(a, b) { return { x: Math.abs(a.x - b.x), y: Math.abs(a.y - b.y) }; }

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
    this.pendingDecision = null;
    this.winner = null;
    this.lastEvent = null;
    this.eventId = 0;
    this.history = [];
    this._exploding = false;
    this.setup();
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
    if (!this.online) {
      this.placeNew("Angel", COLORS.NPC, 1, 1, "Heaven");
      this.placeNew("Atheism", COLORS.NPC, 5, 2, "Heaven");
    }
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
    const cells = this.groupCells(piece.group, piece.board);
    return cells.find(cell => cell.piece.part === 0)?.piece || piece;
  }
  removeGroup(piece, boardName = piece?.board) {
    if (!piece) return;
    const b = this.board(boardName);
    if (!b) return;
    const group = piece.group;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      if (b[y][x] && (!group ? b[y][x].uid === piece.uid : b[y][x].group === group)) b[y][x] = null;
    }
  }
  removeAt(x, y, board = this.currentBoard) { this.removeGroup(this.getCell(x, y, board), board); }

  makePiece(type, color, part = 0, group = null) {
    return { uid: this.nextUid++, type, color, part, group, board: "Normal", x: 0, y: 0, moved: false, movingRight: undefined, portalTo: undefined, health: type === "SuperKing" ? 2 : type === "AggroDevil" ? 6 : undefined };
  }
  placeNew(type, color, x, y, board = "Normal") {
    const root = this.makePiece(type, color, 0, null);
    return this.placeGroup(root, x, y, board, true) ? root : null;
  }
  placeGroup(root, x, y, boardName = this.currentBoard, isNew = false) {
    const board = this.board(boardName);
    if (!board || !root || !inBounds(x, y)) return false;
    const size = LARGE_SIZES[root.type];
    if (!size) {
      const existing = this.getCell(x, y, boardName);
      if (existing && existing.uid !== root.uid && this.takeAt(x, y, root, boardName) !== true) return false;
      this.removeGroup(root, root.board);
      root.group = null; root.part = 0; root.board = boardName; root.x = x; root.y = y;
      board[y][x] = root;
      if (root.type === "Pawn" || root.type === "SuicideBomber" || root.type === "Centaur") this.promoteIfNeeded(root);
      return true;
    }

    if (root.part !== 0 && root.group) root = this.leader(root);
    if (y === 9 - size[0]) y -= size[0] - 1;
    if (y === 9 - size[1]) y -= size[1] - 1;
    if (!inBounds(x + size[0] - 1, y + size[1] - 1)) return false;
    const origin = this.getCell(x, y, boardName);
    if (origin && origin.group !== root.group && this.takeAt(x, y, root, boardName) !== true) return false;
    this.removeGroup(root, root.board);
    const group = root.group || `g${this.nextGroup++}`;
    root.group = group; root.part = 0; root.board = boardName; root.x = x; root.y = y;
    const parts = [root];
    for (let py = 0; py < size[1]; py++) for (let px = 0; px < size[0]; px++) {
      const part = py * size[0] + px;
      if (part === 0) continue;
      const component = this.makePiece(root.type, root.color, part, group);
      component.board = boardName; component.x = x + px; component.y = y + py;
      component.health = root.health;
      parts[part] = component;
    }
    for (let py = 0; py < size[1]; py++) for (let px = 0; px < size[0]; px++) {
      const cell = this.getCell(x + px, y + py, boardName);
      if (cell && cell.group !== group) this.takeAt(x + px, y + py, root, boardName);
      board[y + py][x + px] = parts[py * size[0] + px];
    }
    root.related = parts;
    return true;
  }
  moveGroup(root, toX, toY, boardName = root.board) {
    root = this.leader(root);
    const size = LARGE_SIZES[root.type];
    if (!size) {
      this.removeGroup(root, boardName);
      root.board = boardName; root.x = toX; root.y = toY;
      this.board(boardName)[toY][toX] = root;
      this.promoteIfNeeded(root);
      return;
    }
    this.removeGroup(root, boardName);
    root.x = toX; root.y = toY; root.board = boardName;
    const parts = root.related || [];
    for (let py = 0; py < size[1]; py++) for (let px = 0; px < size[0]; px++) {
      const part = parts[py * size[0] + px] || root;
      const occupant = this.getCell(toX + px, toY + py, boardName);
      if (occupant && occupant.group !== root.group && this.takeAt(toX + px, toY + py, root, boardName) !== true) continue;
      part.board = boardName; part.x = toX + px; part.y = toY + py;
      this.board(boardName)[toY + py][toX + px] = part;
    }
  }
  promoteIfNeeded(piece) {
    if (!piece || !PAWN_TYPES.has(piece.type)) return;
    if ((piece.color === COLORS.WHITE && piece.y === 0) || (piece.color === COLORS.BLACK && piece.y === 7)) {
      const board = piece.board; const x = piece.x; const y = piece.y;
      this.removeGroup(piece, board);
      this.placeNew("Queen", piece.color, x, y, board);
    }
  }

  validMove(from, to, boardName = this.currentBoard) {
    const board = this.board(boardName);
    if (!board || !inBounds(from.x, from.y) || !inBounds(to.x, to.y) || (from.x === to.x && from.y === to.y)) return false;
    let piece = this.getCell(from.x, from.y, boardName);
    if (!piece) return false;
    const target = this.getCell(to.x, to.y, boardName);
    if (target && target.color === piece.color) return false;
    if (piece.group && piece.part !== 0) {
      const leader = this.leader(piece);
      const diffX = piece.x - leader.x; const diffY = piece.y - leader.y;
      from = { x: leader.x, y: leader.y };
      to = { x: to.x - diffX, y: to.y - diffY };
      piece = leader;
      if (!inBounds(to.x, to.y)) return false;
    }
    if (LARGE_TYPES.has(piece.type)) {
      const size = LARGE_SIZES[piece.type];
      if (!inBounds(to.x + size[0] - 1, to.y + size[1] - 1)) return false;
      for (let py = 0; py < size[1]; py++) for (let px = 0; px < size[0]; px++) {
        const dest = this.getCell(to.x + px, to.y + py, boardName);
        const source = this.getCell(piece.x + px, piece.y + py, boardName);
        if (dest && dest.color === piece.color && dest.group !== piece.group) return false;
        if (source && !this.basicValid(source, { x: to.x + px, y: to.y + py }, boardName, true)) return false;
      }
    }
    return this.basicValid(piece, to, boardName, false);
  }
  basicValid(piece, to, boardName, largePart) {
    const from = { x: piece.x, y: piece.y }; const d = { x: from.x - to.x, y: from.y - to.y };
    const ad = { x: Math.abs(d.x), y: Math.abs(d.y) }; const target = this.getCell(to.x, to.y, boardName);
    const pathClear = (dx, dy) => {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      for (let i = 1; i < distance; i++) if (this.getCell(from.x + Math.sign(dx) * i, from.y + Math.sign(dy) * i, boardName)) return false;
      return true;
    };
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
      case "SuperKing": return ad.x <= 2 && ad.y <= 2 && (ad.x !== 0 || ad.y !== 0);
      case "TrojanHorse": return d.x === 0 && ((piece.color === COLORS.BLACK ? -d.y : d.y) === 1);
      case "Giraffe": return (ad.x === 3 && ad.y === 1) || (ad.x === 1 && ad.y === 3);
      case "Meteor": case "WildHorse": case "Zombie": return true;
      case "Wildlife": return !target;
      default: return false;
    }
  }
  legalMoves(from, boardName = this.currentBoard) {
    const result = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (this.validMove(from, { x, y }, boardName)) result.push({ x, y });
    return result;
  }

  currentColor() { return this.whiteToMove ? COLORS.WHITE : COLORS.BLACK; }
  funds() { return this.whiteToMove ? this.whiteGP : this.blackGP; }
  giveGold(amount) { if (this.whiteToMove) this.whiteGP += amount; else this.blackGP += amount; }
  withdraw(amount) { this.giveGold(-amount); }
  emit(message, icon = null) { this.lastEvent = { id: ++this.eventId, message, icon }; }

  buy(id, x, y) {
    const item = SHOP_ITEMS.find(entry => entry[0] === id);
    if (!item) return this.reject("Unknown shop item");
    if (this.currentBoard !== "Normal") return this.reject("Shop pieces can only be placed on the material board.");
    if (this.funds() < item[1]) return this.reject("Not enough GP.");
    if (this.getCell(x, y, "Normal")) return this.reject("Choose an empty square.");
    this.withdraw(item[1]);
    const type = id === "suicide-bomber" ? "SuicideBomber" : id === "rook-knight" ? "RookKnight" : id === "bishop-knight" ? "BishopKnight" : id === "knight-queen" ? "KnightQueen" : id === "angry-rook" ? "AngryRook" : id === "super-king" ? "SuperKing" : id === "ball-queen" ? "BallQueen" : id === "super-bishop" ? "SuperBishop" : id === "rook-tower" ? "RookTower" : id[0].toUpperCase() + id.slice(1);
    this.placeNew(type, this.currentColor(), x, y, "Normal");
    if (type === "Bomb") this.takeAt(x, y, null, "Normal");
    this.history.push({ type: "buy", id, x, y });
    this.nextTurn();
    return true;
  }
  upgrade(toId, x, y) {
    const upgrade = UPGRADES.find(entry => entry[0] === toId);
    const piece = this.getCell(x, y, this.currentBoard);
    if (!upgrade || !piece || piece.color !== this.currentColor() || this.funds() < 5 || !upgrade[1].includes(piece.type)) return this.reject("That piece cannot be upgraded here.");
    this.withdraw(5); const board = piece.board; this.removeGroup(piece, board);
    const type = toId === "suicide-bomber" ? "SuicideBomber" : toId === "rook-knight" ? "RookKnight" : toId === "bishop-knight" ? "BishopKnight" : toId === "knight-queen" ? "KnightQueen" : toId === "angry-rook" ? "AngryRook" : toId === "super-king" ? "SuperKing" : toId === "ball-queen" ? "BallQueen" : toId === "super-bishop" ? "SuperBishop" : toId === "rook-tower" ? "RookTower" : toId[0].toUpperCase() + toId.slice(1);
    this.placeNew(type, this.currentColor(), x, y, board);
    this.history.push({ type: "upgrade", to: toId, x, y });
    return true;
  }
  switchBoard() {
    if (this.currentBoard === "Normal") this.currentBoard = this.boards.Hell ? "Hell" : this.boards.Heaven ? "Heaven" : "Normal";
    else if (this.currentBoard === "Hell") this.currentBoard = this.boards.Heaven ? "Heaven" : "Normal";
    else this.currentBoard = "Normal";
    return true;
  }
  reject(message) { this.emit(message); return false; }

  move(from, to) {
    if (this.rulePicker || this.pendingDecision) return this.reject("Resolve the open choice first.");
    if (!this.validMove(from, to, this.currentBoard)) return this.reject("Illegal move.");
    let piece = this.getCell(from.x, from.y, this.currentBoard);
    if (piece.group && piece.part !== 0) {
      const leader = this.leader(piece); const offset = { x: piece.x - leader.x, y: piece.y - leader.y };
      from = { x: leader.x, y: leader.y }; to = { x: to.x - offset.x, y: to.y - offset.y }; piece = leader;
    }
    if (!piece || piece.color !== this.currentColor()) return this.reject("It is not that piece's turn.");
    const target = this.getCell(to.x, to.y, this.currentBoard);
    const captured = target ? this.leader(target) : null;
    const captureResult = captured ? this.takeAt(to.x, to.y, piece, this.currentBoard) : true;
    if (captureResult === "decision") {
      this.pendingDecision.continuation = { from, to, pieceUid: piece.uid, capturedUid: captured.uid };
      if (this.pendingDecision.advancesTurn) this.nextTurn();
      return true;
    }
    if (captureResult === false) { this.nextTurn(); return true; }
    this.moveGroup(piece, to.x, to.y, this.currentBoard);
    if (piece.type === "Pawn" || piece.type === "SuicideBomber" || piece.type === "Centaur") piece.moved = true;
    this.afterCapture(piece, captured, to, from, this.currentBoard);
    this.nextTurn();
    return true;
  }
  afterCapture(piece, captured, to, from, boardName) {
    const board = this.board(boardName);
    if (piece.type === "AngryRook") {
      const dx = Math.sign(to.x - from.x), dy = Math.sign(to.y - from.y);
      for (let i = 1; i < Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)); i++) if (board[from.y + dy * i]?.[from.x + dx * i]) this.takeAt(from.x + dx * i, from.y + dy * i, piece, boardName);
    } else if (piece.type === "Necromancer") {
      if (!captured) return;
      const dx = Math.sign(from.x - to.x), dy = Math.sign(from.y - to.y); const rx = to.x + dx, ry = to.y + dy;
      const resurrected = captured;
      this.removeGroup(resurrected, resurrected.board);
      resurrected.color = this.currentColor(); resurrected.group = null; resurrected.part = 0;
      if (this.getCell(rx, ry, boardName)) this.takeAt(rx, ry, piece, boardName);
      this.placeGroup(resurrected, rx, ry, boardName);
    } else if (piece.type === "Zebra") {
      const dx = Math.abs(to.x - from.x) > Math.abs(to.y - from.y) ? Math.sign(to.x - from.x) : 0;
      const dy = dx === 0 ? Math.sign(to.y - from.y) : 0;
      for (let i = 1; i <= 2; i++) this.takeAt(from.x + dx * i, from.y + dy * i, piece, boardName);
    } else if (piece.type === "Zombie") {
      if (!captured) return;
      const zombie = this.placeNew("Zombie", COLORS.NPC, from.x, from.y, boardName);
      zombie.movingRight = piece.movingRight;
      this.automovingPieces.push(zombie);
    } else if (piece.type === "Meteor") {
      this.explode(to.x, to.y, piece, "Normal");
    }
  }

  takeAt(x, y, taker, boardName = this.currentBoard) {
    const target = this.getCell(x, y, boardName);
    if (!target) return true;
    const piece = this.leader(target);
    if (!piece) return true;
    if (piece.type === "Portal") return this.portalKill(piece, taker, boardName);
    if (piece.type === "Church") {
      if (taker) { this.removeGroup(taker, taker.board); this.placeGroup(taker, piece.x, piece.y, "Normal"); }
      return false;
    }
    if (piece.type === "Atheism") {
      this.pendingDecision = { type: "atheism", title: "God Of Atheism", color: this.currentColor() };
      this.emit("Atheism demands a choice.", "atheism.png");
      return "decision";
    }
    if (piece.type === "Angel") {
      this.pendingDecision = { type: "angel", title: "Free him?", color: this.currentColor() };
      this.emit("Free him?", "aggro-angel.png");
      return "decision";
    }
    if (piece.type === "Devil") {
      this.removeGroup(piece, boardName);
      this.pendingDecision = { type: "devil", title: "The Devil", color: this.currentColor() };
      this.emit("The Devil offers a bargain.", "devil.png");
      return true;
    }
    let result = true;
    switch (piece.type) {
      case "Coin": this.giveGold(4); this.removeGroup(piece, boardName); break;
      case "Treasure": this.giveGold(15); this.removeGroup(piece, boardName); break;
      case "Landmine": this.explode(x, y, piece, "Normal"); if (taker) this.removeGroup(taker, "Normal"); result = false; break;
      case "Pittrap": this.removeGroup(piece, boardName); if (taker) this.removeGroup(taker, boardName); result = false; break;
      case "Whirlpool": if (taker) this.removeGroup(taker, boardName); result = false; break;
      case "Bomb": this.removeGroup(piece, boardName); this.explode(x, y, piece, "Normal"); result = true; break;
      case "Void": if (taker) { this.removeGroup(taker, "Normal"); const empty = this.findEmpty("Normal"); if (empty) this.placeGroup(taker, empty.x, empty.y, "Normal"); } result = false; break;
      case "SuicideBomber": case "Jester":
        this.giveGold(1); if (piece.board === "Normal" && this.boards.Heaven) { this.removeGroup(piece, "Normal"); this.placeGroup(piece, piece.x, piece.y, "Heaven"); }
        this.explode(x, y, piece, boardName); if (taker) this.removeGroup(taker, "Normal"); result = false; break;
      case "RookTower":
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const near = this.getCell(piece.x + dx, piece.y + dy, boardName); if (near?.color === COLORS.WHITE) near.color = COLORS.BLACK; else if (near?.color === COLORS.BLACK) near.color = COLORS.WHITE; }
        result = this.baseKill(piece, boardName); break;
      case "TrojanHorse":
        for (let dy = -1, spawned = 0; dy <= 1 && spawned < 3; dy++) for (let dx = -1; dx <= 1 && spawned < 3; dx++) if (inBounds(piece.x + dx, piece.y + dy) && !this.getCell(piece.x + dx, piece.y + dy, boardName)) { this.placeNew("Pawn", piece.color, piece.x + dx, piece.y + dy, boardName); spawned++; }
        result = this.baseKill(piece, boardName); break;
      case "SuperKing":
      case "AggroDevil":
        if (piece.type === "AggroDevil" && taker) this.removeGroup(taker, "Normal");
        piece.health = (piece.health ?? 1) - 1;
        if (piece.health > 0) result = false; else { if (piece.type === "SuperKing" && piece.part === 0 && (piece.board === "Hell" || (piece.board === "Normal" && !this.boards.Hell))) this.win(piece.color); result = this.baseKill(piece, boardName); }
        break;
      case "King":
        if (piece.board === "Hell" || (piece.board === "Normal" && !this.boards.Hell)) this.win(piece.color);
        result = this.baseKill(piece, boardName); break;
      case "AggroAngel": this.automovingPieces = this.automovingPieces.filter(item => item.uid !== piece.uid); this.removeGroup(piece, boardName); result = true; break;
      default:
        if (NPC_TYPES.has(piece.type)) { this.removeGroup(piece, boardName); result = true; }
        else result = this.baseKill(piece, boardName);
        break;
    }
    if (result && this.rules.includes("NEXT_PIECE_EXPLODES")) {
      this.rules = this.rules.filter(rule => rule !== "NEXT_PIECE_EXPLODES");
      this.explode(x, y, piece, boardName); result = false;
    }
    return result;
  }
  baseKill(piece, boardName) {
    this.removeGroup(piece, boardName);
    if (piece.board === "Normal" && this.boards.Hell) {
      const x = piece.x, y = piece.y; piece.board = "Hell"; this.placeGroup(piece, x, y, "Hell"); this.giveGold(1);
    } else if (piece.board === "Normal") this.giveGold(1);
    return true;
  }
  portalKill(portal, taker, boardName) {
    if (!taker) return false;
    this.removeGroup(taker, taker.board);
    const destination = portal.portalTo || (boardName === "Heaven" ? "Hell" : "Heaven");
    if (this.boards[destination]) this.placeGroup(taker, portal.x, portal.y, destination);
    return false;
  }
  explode(x, y, taker, boardName = this.currentBoard) {
    const board = this.board(boardName); if (!board) return;
    this.removeAt(x, y, boardName);
    if (this._exploding) return;
    this._exploding = true; this.emit("Explosion", "explosion.png");
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) this.takeAt(x + dx, y + dy, taker, boardName);
    this._exploding = false;
  }
  findEmpty(boardName = "Normal") {
    const spots = []; const board = this.board(boardName); if (!board) return null;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (!board[y][x]) spots.push({ x, y });
    return spots.length ? spots[this.random.nextInt(spots.length)] : null;
  }
  win(color) { this.winner = color === COLORS.WHITE ? "Black" : "White"; this.emit(`${this.winner} wins!`); }

  decision(choice) {
    const decision = this.pendingDecision; if (!decision) return this.reject("No decision is pending.");
    this.pendingDecision = null;
    if (decision.type === "atheism") {
      if (choice === "heaven") { this.boards.Heaven = null; if (this.currentBoard === "Heaven") this.currentBoard = "Normal"; }
      else if (choice === "hell") { this.boards.Hell = null; if (this.currentBoard === "Hell") this.currentBoard = "Normal"; }
      else if (choice === "metaphysical") for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (["Angel", "Devil"].includes(this.getCell(x, y, "Normal")?.type)) this.removeGroup(this.getCell(x, y, "Normal"), "Normal");
    } else if (decision.type === "angel") {
      if (choice === "yes") { const angel = this.findByUid(decision.continuation?.capturedUid); if (angel) this.removeGroup(angel, angel.board); const aggro = this.placeNew("AggroAngel", COLORS.NPC, 3, 3, "Normal"); this.automovingPieces.push(aggro); }
      if (choice === "no") this.nextTurn();
    } else if (decision.type === "devil") {
      if (choice === "release") { const devil = this.placeNew("AggroDevil", COLORS.NPC, 3, 3, "Normal"); this.automovingPieces.push(devil); }
      else if (choice === "gold") { if (this.whiteToMove) { this.whiteGP += 10; this.blackGP += 5; } else { this.whiteGP += 5; this.blackGP += 10; } }
    }
    if (decision.type === "angel" && choice === "yes") this.finishInterruptedMove(decision.continuation);
    if (decision.type === "atheism") this.nextTurn();
    return true;
  }
  finishInterruptedMove(continuation) {
    if (!continuation) { this.nextTurn(); return; }
    const piece = this.findByUid(continuation.pieceUid); if (!piece) { this.nextTurn(); return; }
    const captured = this.findByUid(continuation.capturedUid);
    if (captured) this.removeGroup(captured, captured.board);
    this.moveGroup(piece, continuation.to.x, continuation.to.y, this.currentBoard);
    if (PAWN_TYPES.has(piece.type)) piece.moved = true;
    this.afterCapture(piece, captured, continuation.to, continuation.from, this.currentBoard);
    this.nextTurn();
  }
  findByUid(uid) {
    for (const boardName of BOARD_NAMES) { const board = this.board(boardName); if (!board) continue; for (const row of board) for (const piece of row) if (piece?.uid === uid) return this.leader(piece); }
    return null;
  }

  addRule(rule) {
    if (!RULES.includes(rule)) return this.reject("Unknown rule.");
    this.rulePicker = false; this.turnsSinceNewRule = 0;
    switch (rule) {
      case "MORE_GOLD": this.whiteGP += 10; this.blackGP += 10; this.emit("EVERYONE GETS +10GP!"); break;
      case "GOLD_RUSH": this.emit("GOLD RUSH!"); for (let i = 0; i < 5; i++) { const p = { x: this.random.inclusive(0, 7), y: this.random.inclusive(0, 7) }; if (!this.getCell(p.x, p.y, "Normal")) this.placeNew("Coin", COLORS.NPC, p.x, p.y, "Normal"); } break;
      case "UNICORNS": this.replaceMatching(KNIGHT_TYPES, "Unicorn"); break;
      case "BISHOPS_GAIN_NECROMANCY": this.replaceMatching(BISHOP_TYPES, "Necromancer"); break;
      case "PORTALS_OPEN": { const heaven = this.placeNew("Portal", COLORS.NPC, 0, 4, "Normal"); heaven.portalTo = "Heaven"; const hell = this.placeNew("Portal", COLORS.NPC, 7, 3, "Normal"); hell.portalTo = "Hell"; } break;
      case "PAWN_UPGRADE": { let white = false, black = false; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const p = this.getCell(x, y, "Normal"); if (p && PAWN_TYPES.has(p.type) && ((p.color === COLORS.WHITE && !white) || (p.color === COLORS.BLACK && !black))) { this.removeGroup(p, "Normal"); this.placeNew("Centaur", p.color, x, y, "Normal"); if (p.color === COLORS.WHITE) white = true; else black = true; } } } break;
      case "TREASURE": this.placeNew("Treasure", COLORS.NPC, this.random.inclusive(0, 7), this.random.inclusive(3, 4), "Normal"); break;
      case "LANDMINES": case "PITTRAPS": { const type = rule === "LANDMINES" ? "Landmine" : "Pittrap"; for (let i = 0; i < 3; i++) { const p = { x: this.random.inclusive(0, 7), y: this.random.inclusive(0, 7) }; if (!this.getCell(p.x, p.y, "Normal")) this.placeNew(type, COLORS.NPC, p.x, p.y, "Normal"); } } break;
      case "WILD_LIFE": { const a = this.placeNew("Wildlife", COLORS.NPC, 0, 3, "Normal"); if (a) a.movingRight = true; const b = this.placeNew("Wildlife", COLORS.NPC, 7, 4, "Normal"); if (b) b.movingRight = false; this.automovingPieces.push(a, b); } break;
      case "WILD_HORSE": { const p = this.placeNew("WildHorse", COLORS.NPC, 4, 3, "Normal"); if (p) this.automovingPieces.push(p); } break;
      case "ZOMBIE_APOCALYPSE": for (const [x, y, right] of [[0, 3, true], [0, 4, true], [7, 3, false], [7, 4, false]]) { const p = this.placeNew("Zombie", COLORS.NPC, x, y, "Normal"); if (p) { p.movingRight = right; this.automovingPieces.push(p); } } break;
      case "EVERYONE_UPGRADES": for (let i = 0; i < 8; i++) { const x = this.random.inclusive(0, 7), y = this.random.inclusive(0, 7), p = this.getCell(x, y, "Normal"); if (!p || p.color === COLORS.NPC) continue; const map = { Pawn: "SuicideBomber", Knight: "TrojanHorse", Rook: "RookTower", Queen: "BallQueen", King: "King", Bishop: "Necromancer" }; const type = map[p.type] || "Jester"; this.removeGroup(p, "Normal"); this.placeNew(type, p.color, x, y, "Normal"); } break;
      case "WHIRLPOOL": this.placeNew("Whirlpool", COLORS.NPC, 3 + this.random.inclusive(0, 1), 3 + this.random.inclusive(0, 1), "Normal"); break;
      case "VOID": this.placeNew("Void", COLORS.NPC, 3, 3, "Normal"); break;
      case "METEOR_SHOWER": { const p = this.placeNew("Meteor", COLORS.NPC, 0, 2, "Normal"); if (p) this.automovingPieces.push(p); } break;
    }
    if (!EVENT_RULES.has(rule) && !this.rules.includes(rule)) this.rules.push(rule);
    this.availableRules = this.availableRules.filter(item => item !== rule);
    this.history.push({ type: "rule", rule });
    return true;
  }
  replaceMatching(types, replacement) {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const p = this.getCell(x, y, "Normal"); if (p && types.has(p.type)) { const color = p.color; this.removeGroup(p, "Normal"); this.placeNew(replacement, color, x, y, "Normal"); } }
  }
  nextTurn() {
    this.whiteToMove = !this.whiteToMove; this.turnsSinceNewRule++;
    for (const piece of [...this.automovingPieces]) this.automove(piece);
    if (!this.online && this.turnsSinceNewRule >= this.rules.length * 2 && this.availableRules.length) { this.rulePicker = true; this.turnsSinceNewRule = 0; }
  }
  automove(piece) {
    const current = this.findByUid(piece.uid); if (!current || current.board !== "Normal") return;
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
          this.removeGroup(source, "Normal");
          this.placeGroup(source, x + dx, y + dy, "Normal");
        }
      };
      if (direction === 1) for (let y = 0; y < 8; y++) for (let x = 6; x >= 0; x--) shift(x, y);
      if (direction === 2) for (let y = 0; y < 8; y++) for (let x = 1; x < 8; x++) shift(x, y);
      if (direction === 3) for (let y = 6; y >= 0; y--) for (let x = 0; x < 8; x++) shift(x, y);
      if (direction === 4) for (let y = 1; y < 8; y++) for (let x = 0; x < 8; x++) shift(x, y);
      return;
    }
    if (!to || !inBounds(to.x, to.y)) { if (current.type === "Wildlife" && (current.x === 0 || current.x === 7)) current.movingRight = current.x === 0; return; }
    if (this.validMove(from, to, "Normal")) {
      const oldTarget = this.getCell(to.x, to.y, "Normal");
      const captured = oldTarget ? this.leader(oldTarget) : null;
      const result = oldTarget ? this.takeAt(to.x, to.y, current, "Normal") : true;
      if (result === true) { this.moveGroup(current, to.x, to.y, "Normal"); this.afterCapture(current, captured, to, from, "Normal"); }
      if (current.type === "Wildlife" && (current.x === 0 || current.x === 7)) current.movingRight = current.x === 0;
    }
  }

  toSnapshot() {
    const serialize = boardName => {
      const board = this.board(boardName); if (!board) return null;
      return board.map(row => row.map(piece => piece ? { uid: piece.uid, type: piece.type, color: piece.color, part: piece.part, group: piece.group, x: piece.x, y: piece.y, health: piece.health, moved: piece.moved, movingRight: piece.movingRight, portalTo: piece.portalTo, board: piece.board } : null));
    };
    return { online: this.online, mode: this.mode, currentBoard: this.currentBoard, whiteToMove: this.whiteToMove, whiteGP: this.whiteGP, blackGP: this.blackGP, rules: [...this.rules], availableRules: [...this.availableRules], rulePicker: this.rulePicker, pendingDecision: this.pendingDecision ? { type: this.pendingDecision.type, title: this.pendingDecision.title, color: this.pendingDecision.color, advancesTurn: this.pendingDecision.advancesTurn, continuation: this.pendingDecision.continuation } : null, winner: this.winner, lastEvent: this.lastEvent, automovingUids: this.automovingPieces.map(piece => piece.uid), boards: { Normal: serialize("Normal"), Heaven: serialize("Heaven"), Hell: serialize("Hell") }, history: this.history.slice(-100) };
  }

  static fromSnapshot(snapshot) {
    const game = Object.create(GameState.prototype);
    Object.assign(game, { online: snapshot.online, mode: snapshot.mode, currentBoard: snapshot.currentBoard, whiteToMove: snapshot.whiteToMove, whiteGP: snapshot.whiteGP, blackGP: snapshot.blackGP, rules: [...snapshot.rules], availableRules: [...(snapshot.availableRules || RULE_PICKER)], rulePicker: snapshot.rulePicker, pendingDecision: snapshot.pendingDecision, winner: snapshot.winner, lastEvent: snapshot.lastEvent, eventId: snapshot.lastEvent?.id || 0, history: snapshot.history || [], automovingPieces: [], nextUid: 1, nextGroup: 1, turnsSinceNewRule: 0, _exploding: false, boards: { Normal: blankBoard(), Heaven: blankBoard(), Hell: blankBoard() }, random: new JavaRandom(1n) });
    for (const boardName of BOARD_NAMES) {
      const rows = snapshot.boards[boardName]; if (!rows) { game.boards[boardName] = null; continue; }
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const piece = rows[y][x]; if (piece) { game.boards[boardName][y][x] = { ...piece }; game.nextUid = Math.max(game.nextUid, piece.uid + 1); game.nextGroup = Math.max(game.nextGroup, Number(String(piece.group || "g0").slice(1)) + 1); } }
    }
    for (const boardName of BOARD_NAMES) {
      const board = game.board(boardName); if (!board) continue;
      const groups = new Map();
      for (const row of board) for (const piece of row) if (piece?.group) { if (!groups.has(piece.group)) groups.set(piece.group, []); groups.get(piece.group)[piece.part] = piece; }
      for (const parts of groups.values()) if (parts[0]) parts[0].related = parts;
    }
    game.automovingPieces = (snapshot.automovingUids || []).map(uid => game.findByUid(uid)).filter(Boolean);
    return game;
  }
}

export function imageKey(piece) {
  if (!piece) return null;
  const large = LARGE_TYPES.has(piece.type);
  const rootName = piece.type === "SuicideBomber" ? "suicide-bomber" : piece.type === "KnightQueen" ? "knight-queen" : piece.type === "BishopKnight" ? "bishop-knight" : piece.type === "RookKnight" ? "rook-knight" : piece.type === "AngryRook" ? "angry-rook" : piece.type === "SuperKing" ? "super-king" : piece.type === "SuperBishop" ? "super-bishop" : piece.type === "BallQueen" ? "ball-queen" : piece.type === "RookTower" ? "rook-tower" : piece.type === "TrojanHorse" ? "trojan-horse" : piece.type.toLowerCase();
  if (large) {
    const base = piece.type === "SuperKing" ? (piece.color === COLORS.WHITE ? "white/super-king" : "black/super-king") : piece.type === "AggroAngel" ? "aggro-angel" : piece.type === "AggroDevil" ? "devil" : piece.type.toLowerCase();
    return `${base}${piece.part}.png`;
  }
  if (piece.type === "WildHorse") return "wild-horse.png";
  if (piece.color === COLORS.WHITE || piece.color === COLORS.BLACK) return `${piece.color.toLowerCase()}/${rootName}.png`;
  return `${rootName}.png`;
}

export { COLORS, BOARD_NAMES, LARGE_SIZES, LARGE_TYPES, NPC_TYPES };
