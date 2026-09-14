# Jreg Chess Web Port

This is a browser port of the MIT-licensed Jreg Chess Java game in the sibling
`JregChess` directory. The Java implementation remains unchanged and is the
behavioral reference.

## Architecture

- `shared/game.js` contains the gameplay model used by the browser and server.
- `server.js` serves the static frontend and implements a small WebSocket
  server with authoritative rooms.
- `public/index.html`, `public/styles.css`, and `public/app.js` implement the
  menu, board, Toolbox, Shop, Skill Tree, Rules window, icon-only rule picker,
  and special-piece dialogs.
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

Open `http://localhost:3000` in a browser. The local server is plain HTTP, so
do not use `https://localhost:3000` unless you have placed it behind your own
TLS reverse proxy. Set `PORT` to use another port:

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
   color is to move can submit a move, purchase, upgrade, board switch, or
   rule choice. Either player can offer a draw or resign.
5. A refresh on the same room URL resumes the player when that browser still
   has its reconnect token. A third connection becomes a spectator.

The server is intended to run on a host reachable by both browsers. For a
public deployment, place it behind HTTPS so the browser uses secure WebSocket
connections and add the normal deployment reverse-proxy configuration.
Railway supplies `PORT` automatically; the server listens on that value and
on `0.0.0.0` so Railway's public proxy can reach it.

Browser multiplayer includes the Angel and Atheism pieces on Heaven so their
large images and interaction dialogs are available to both players. The
original Java online setup omitted them; this is an intentional web-port fix
for the missing multiplayer content. The rule picker uses only rule pictures,
matching the Java selection popup. The separate Rules window explains active
rules in text.

The Switch board control is a local view control, not a game action. Either
player can cycle through every surviving board at any time, including during
the opponent's turn, without changing turn state.

Black players see each board from the Black side: files and ranks are mirrored
in the browser, while submitted game coordinates are translated back to the
authoritative board coordinates.

Rule selection alternates between White and Black independently of the chess
turn. Landmine and Pittrap rules select from currently empty squares so their
three traps are placed reliably, and the game reports how many spawned.

Destroying Hell resolves kings immediately: both opposing king colors in Hell
produce a draw, while a single king color produces a win for the other side.
Purchased Kings and Super Kings are included in this resolution.

## Porting notes

The port intentionally preserves source quirks instead of silently turning
the game into standard chess. In particular, the Java code has no check,
checkmate, stalemate, repetition, fifty-move, insufficient-material, clock,
undo, or AI system. Multiplayer resignation and agreed draws are web transport
features added because the browser version requires them. Kings can move into
attack and can be captured;
the source's win condition is the King/SuperKing death behavior.

The Java enum includes `GUN`, `TREADMILL_BOARD`, `MEGA_CASTLE`, and `POTIONS`,
but the Java implementation does not provide their gameplay behavior and does
not offer most of them in the rule picker. They remain represented in the web
rule catalog and Rules text, with the same no-op behavior where applicable.

The Java client has no audio files or audio API usage, so there is no audio
system to port. Its numbered PNGs are static per-piece tiles rather than an
animation system; the web version uses them as static tiles as well.
