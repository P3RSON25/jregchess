# Jreg Chess Web Port

This is a browser port of the MIT-licensed Jreg Chess Java game in the sibling
`JregChess` directory. The Java implementation remains unchanged and is the
behavioral reference.

## Architecture

- `shared/game.js` contains the gameplay model used by the browser and server.
- `server.js` serves the static frontend and implements a small WebSocket
  server with authoritative rooms.
- `public/index.html`, `public/styles.css`, and `public/app.js` implement the
  menu, board, Toolbox, Shop, Skill Tree, Rules window, rule picker, waiting
  state, and special-piece dialogs.
- `public/assets` contains the original PNG resources copied from the Java
  repository without modification.

The original game used a seed plus polling and deterministic local replay.
The web version keeps the same seed-driven rule behavior but makes the server
authoritative: it validates turns, coordinates, purchases, upgrades, rules,
choices, and moves, then broadcasts complete snapshots to both players. Each
player receives a reconnect token stored in `localStorage`. A disconnected
player can refresh the same join URL and resume the original color while the
room is retained.

## Start

Node.js 20 or newer is required. No npm packages are required.

```text
npm start
```

Open `http://localhost:3000` in a browser. Set `PORT` to use another port:

```text
set PORT=8080
npm start
```

Run the automated tests with:

```text
npm test
```

## Playing

### Single-player

Choose **Offline game**. This matches the Java meaning of single-player: a
local hot-seat game where both sides are played in the same window. There is
no computer chess opponent in the original source.

### Multiplayer

1. Player 1 chooses **Create online game**.
2. Share the five-letter code shown in the Toolbox.
3. Player 2 chooses **Join online game** and enters the code.
4. Both clients receive the same authoritative state. Only the player whose
   color is to move can submit an action.
5. A refresh on the same room URL resumes the player when that browser still
   has its reconnect token. A third connection becomes a spectator.

The server is intended to run on a host reachable by both browsers. For a
public deployment, place it behind HTTPS so the browser uses secure WebSocket
connections and add the normal deployment reverse-proxy configuration.

## Porting notes

The port intentionally preserves source quirks instead of silently turning
the game into standard chess. In particular, the Java code has no check,
checkmate, stalemate, repetition, fifty-move, insufficient-material, clock,
resign, undo, or AI system. Kings can move into attack and can be captured;
the source's win condition is the King/SuperKing death behavior.

The Java enum includes `GUN`, `TREADMILL_BOARD`, `MEGA_CASTLE`, and `POTIONS`,
but the Java implementation does not provide their gameplay behavior and does
not offer most of them in the rule picker. They remain represented in the web
rule catalog and Rules text, with the same no-op behavior where applicable.

The Java client has no audio files or audio API usage, so there is no audio
system to port. Its numbered PNGs are static per-piece tiles rather than an
animation system; the web version uses them as static tiles as well.
