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
- `test/game.test.js` and `test/server.test.js` cover rules, state integrity,
  snapshots, and authoritative multiplayer actions.
- `scripts/check-ui.js` checks the real frontend with two Chromium clients.

The original game used a seed plus polling and deterministic local replay.
The web version keeps the same seed-driven rule behavior but makes the server
authoritative: it validates turns, coordinates, purchases, upgrades, rules,
choices, and moves, then broadcasts complete snapshots to both players. Each
player receives a reconnect token stored in `localStorage`. A disconnected
player can refresh the same join URL and resume the original color while the
room is retained.

## Start

Node.js 20 or newer is required. Running the game requires no npm packages.

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

For the browser checks, install the development dependencies and Chromium once:

```text
npm ci
npx playwright install chromium
npm run test:browser
```

The browser check starts its own server on an ephemeral port. It covers mirrored
input and highlights, large sprites, purchases, cross-board upgrades and views,
decisions, reconnect, terminal dialogs, and desktop/mobile layouts. Set
`UI_SCREENSHOT_DIR` to an existing directory to also save desktop/mobile screenshots.

## Playing

### Single-player

Choose **Offline game**. This matches the Java meaning of single-player: a
local hot-seat game where both sides are played in the same window. There is
no computer chess opponent in the original source.

### Multiplayer

1. Player 1 chooses **Create online game**.
2. Share the five-letter code shown in the Toolbox.
3. Player 2 chooses **Join online game** and enters the code.
4. Both clients receive the same authoritative state. Moves, purchases, and
   upgrades belong to the player whose color is to move. Rule-picker ownership
   alternates separately; special decisions belong to their designated player.
   Either player can inspect any board, offer a draw, or resign.
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

Victory counts every King and Super King across all surviving dimensions,
including purchased Kings. A side loses when it has none remaining; losing both
sides' final kings in the same resolution produces a draw. Destroying Heaven or
Hell removes that dimension's pieces and evaluates the remaining global position.

## Consistent gameplay resolution

- Captures, replacements, portal arrivals, explosions, and resurrection resolve
  completely before victory is checked. Pending NPC decisions are queued and
  complete the initiating turn exactly once, including after reconnect.
- Ordinary Normal deaths travel to Hell at the same coordinates. Suicide Bombers
  and Jesters travel to Heaven and explode on their original board. Deaths in
  Heaven/Hell are permanent; explicit portals can transfer living pieces again.
- A Super King moves one square with its whole 2x2 footprint and has separate
  two-square ranged attacks. Super Kings and Angels absorb the first attacker and
  retain one life. The next hit resolves their normal death behavior. A defeated
  Normal Super King enters Hell on its final life.
- Heaven NPC arrivals consume the incoming piece while resolving the NPC's
  interaction. A freed Angel becomes one Aggro Angel whose action is the Java
  wind shift. Releasing an active NPC requires an empty 2x2 Normal footprint.
- Portals preserve coordinates, forward through destination portals, and resolve
  occupied destinations through the same death rules. A same-coordinate portal
  chain spanning every active dimension collapses; other cycles lose the traveler.
- Explosions affect the center and all eight neighboring squares. Chained blasts
  propagate, with each unit hit once per chain and rewards applied once. Bombs
  detonate when placed.
- Necromancers resurrect behind their target. Controlled Zombies, Wild Horses,
  and Wildlife retain their identity/sprite, use King movement, and stop hostile
  automoving. Ownership, health, and counterpart state survive portals/snapshots.
- Coins award 4 GP and Treasure awards 15 GP. Gold Rush spawns up to five distinct
  empty Normal squares and reports the count. Treasure chooses an empty square
  in its original middle-rank range.
- Shop purchases consume a turn and are limited to Normal. Upgrades cost 5 GP
  without consuming a turn and preserve piece state. Large upgrades require
  their entire footprint to fit and be clear. Highlighting uses the same
  eligibility checks as the authoritative engine.

Large pieces retain all component identities during movement and transport.
Black's large Super King uses the original full sprite because the Java assets
contain no numbered Black Super King tiles.

## Porting notes

The port intentionally preserves source quirks instead of silently turning
the game into standard chess. In particular, the Java code has no check,
checkmate, stalemate, repetition, fifty-move, insufficient-material, clock,
undo, or AI system. Multiplayer resignation and agreed draws are web transport
features added because the browser version requires them. Kings can move into
attack and can be captured. The web consistency update uses the global
King/Super King survival condition described above.

The Java enum includes `GUN`, `TREADMILL_BOARD`, `MEGA_CASTLE`, and `POTIONS`,
but the Java implementation does not provide their gameplay behavior and does
not offer most of them in the rule picker. They remain represented in the web
rule catalog and Rules text, with the same no-op behavior where applicable.
The Devil's "remove" and "smite" buttons likewise have no Java handlers. The Java
source has a player Giraffe but no Wild Giraffe type or spawn mechanic; the port
retains the Giraffe's original leaper movement.

The Java client has no audio files or audio API usage, so there is no audio
system to port. Its numbered PNGs are static per-piece tiles rather than an
animation system; the web version uses them as static tiles as well.
