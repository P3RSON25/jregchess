# Jreg Chess Web Port Progress

## Current status — consistency update complete

The interrupted shared-engine consistency refactor is complete in the working
tree. The earlier three failing fixtures have been corrected, the overlapping
capture/arrival paths have been consolidated, and the remaining A–I implementation
checklist is covered by engine, server, and real-browser checks.

Latest verification:

- `npm test`: **82 tests passing**.
- `npm run test:browser`: passed with two real Chromium clients.
- Node syntax checks and `git diff --check`: passed.
- Desktop and 390px mobile Black-perspective screenshots inspected.

The HTTP/WebSocket server remains dependency-free at runtime. Playwright is a
development dependency for the repeatable browser check.

## Completed checklist

### A. One resolution pipeline

- `resolve` wraps a complete action, including its nested effects.
- `resolveArrival` handles moves, creation, replacements, death transfers, and
  portal destinations before `installGroup` writes a complete footprint.
- `resolveCapture`, `resolveHit`, `resolveDeath`, and `baseKill` share removal,
  health, rewards, and afterlife behavior.
- `removePiece`/`detachPiece` distinguish permanent removal from relocation.
- The old `takeAtUnsafe`, interrupted-move continuations, local `win` logic,
  and boolean explosion guard have been removed.
- Large pieces preserve the root and every component object/UID across moves
  and transfers. Snapshots reconstruct the same relationships and shared fields.

### B. Global victory

- `kingColorsAlive` scans all active boards and counts each large group once.
- A side survives while any of its Kings or Super Kings remain anywhere.
- Simultaneous loss of both sides' final kings produces a draw.
- Victory runs after the complete action, including resurrection, chain
  explosions, replacements, and dimension destruction.
- Terminal states clear queued decisions, pending turns, and rule pickers.

### C. Portal travel and replacement

- Arrivals preserve coordinates and forward through destination portals.
- Destination player pieces resolve their death before installation.
- Heaven NPCs resolve their interaction and consume the incoming piece rather
  than being overwritten. Collectibles can be consumed by that interaction.
- Cycles are detected. Same-coordinate portals spanning all active dimensions
  collapse, including when dimension destruction completes such a chain.
- Explicit destinations fall back to surviving dimensions, preferring a
  surviving corresponding portal when the original destination is gone.
- Portal creation/replacement, occupied destinations, controlled travelers,
  and complete large-group identity are covered by regressions.

### D. Deaths and explosions

- Ordinary Normal deaths transfer to Hell; Suicide Bombers and Jesters transfer
  to Heaven, preserving the Java Jester behavior.
- Heaven/Hell deaths are permanent except for explicit living-piece transport.
- Blasts resolve the center and eight neighbors through the same hit/death path.
- A breadth-first blast queue and per-chain hit set propagate chained explosives
  while preventing repeated component hits, rewards, and removals.
- Explosions destroy portals instead of transporting the explosive source.
- Attacker deaths use their actual board/coordinates, with no hard-coded Normal
  deletion of a same-coordinate bystander in another dimension.
- `NEXT_PIECE_EXPLODES` is consumed before nested arrivals and rewards.
- Bombs detonate on placement; a dead attacker is never reinstalled by its move.

### E. Angel and Super King lives

- First hits synchronize one remaining life across all components and absorb
  the attacker. The next hit resolves normal death behavior.
- A defeated Normal Super King transfers to Hell on its final life; global king
  survival still includes it there until its permanent death.
- King-range movement and two-square ranged attacks are separate and agree with
  highlights/input even when a non-leader component is clicked.
- Freeing an Angel removes the original and installs/registers one Aggro Angel.
  If the preferred center is occupied, an empty 2x2 footprint is selected. If no
  such footprint exists, release is rejected and the choice remains open.
- Aggro Angel performs the Java wind shift through the shared arrival pipeline.
- Decisions queue without overwriting one another, survive snapshots, and
  resume a pending turn or remaining automovers exactly once.
- Obsolete Angel offers are discarded when that Angel dies before the choice.

### F. Controlled wildlife

- `controlledBy`, `wildCounterpart`, health, movement flags, and portal state
  serialize and restore with all group components.
- Necromancer resurrection preserves Zombie/Wild Horse/Wildlife identity while
  assigning player control and King movement. Hostile automoving stops.
- Control persists through Normal → Hell → Heaven → Normal travel and snapshots.
- Autonomous NPC interactions now resolve with no player beneficiary: their
  spawns, captures, replacements, and indirect portal/death/explosion effects
  award no GP and queue no Heaven NPC decisions for either side. Player-controlled
  wildlife retains its player's rewards and choices. Regression coverage checks
  both turns, all entry paths, and restoration of player attribution afterward.
- The Java source has no Wild Giraffe class, asset, or spawn behavior. Unsupported
  partial Wild Giraffe references were removed; ordinary Giraffe remains a leaper.

### G. Treasure and Gold Rush

- Treasure selects an empty Normal square at y=3 or y=4 and reports no-space cases.
- Gold Rush selects up to five distinct empty Normal squares and reports the
  actual count, including full-board and low-capacity cases.
- Coins and Treasure update `whiteGP`/`blackGP`, the same balances used by Shop,
  authoritative snapshots, and the UI.
- The Java random generator's power-of-two/rejection arithmetic was corrected.
  Its state and identity counters now survive snapshots for deterministic
  continuation of future actions.

### H. Angry Rook and upgrades

- White/Black normal and purchased Rooks upgrade successfully on explicit boards.
- Upgrades preserve color, board, health/control/movement state and charge once.
- Eligibility checks validate the complete footprint before mutation, so an
  invalid upgrade cannot remove the source piece or spend GP.
- Angry Rook path captures and Rook Tower group-wide color flips use shared
  capture/state handling.
- Moves, purchases, and upgrades cannot bypass pending decisions or rule picks.

### I. Browser targets and rendering

- UI buy/upgrade highlights call the engine's `canBuy`/`canUpgrade` checks.
- Black coordinates and input align after mirroring, including group-component
  input and leader-only upgrade eligibility.
- Shop targets never appear on Heaven or Hell.
- Large composites rotate together in Black view. Black Super King uses its
  existing full sprite because numbered Black component images are absent.
- Board viewing stays client-local. Explicit board purchases/upgrades/moves
  are validated by the server.
- Queued/replaced/terminal decision modals update correctly, including reconnect.

## Verification entry points

```text
npm test
npm run test:browser
```

For browser checks on a fresh checkout:

```text
npm ci
npx playwright install chromium
npm run test:browser
```

`scripts/check-ui.js` starts an ephemeral local server, uses two isolated browser
contexts and real WebSocket actions, and closes its resources afterward. Set
`UI_SCREENSHOT_DIR` to an existing directory to save its desktop/mobile captures.

`test/game.test.js` includes state-integrity assertions for coordinates, unique
UIDs, complete groups, health/ownership synchronization, and live automovers.
It also compares original and JSON-snapshot-restored games through more than
100 mixed real actions. `test/server.test.js` checks independent alternating
rule ownership and rejection of out-of-turn/blocked/off-board actions.

## Architecture and source reference

- Original Java source: `C:\Users\wenyu\Downloads\JregChess`
- Web workspace: `C:\Users\wenyu\Downloads\JregChess Web Port`
- Shared authoritative engine: `shared/game.js`
- HTTP/WebSocket transport: `server.js`
- Browser: `public/index.html`, `public/app.js`, `public/styles.css`
- Original assets: `public/assets`
- Browser regression runner: `scripts/check-ui.js`

The server owns each room's `GameState`; clients reconstruct snapshots for
display and submit validated actions. Views remain local to each client.

The Java source remains the behavioral reference unless this update explicitly
corrected behavior requested by the handoff (global victory, two-life combat,
King-range Super King movement, reliable placement, and consistent resolution).
Its unimplemented GUN/TREADMILL_BOARD/MEGA_CASTLE/POTIONS behaviors and Devil
"remove"/"smite" handlers remain source-backed no-ops. Offline play is hot-seat;
the source has no chess AI, check/checkmate, clocks, castling, or en passant.

When changing gameplay, keep action mutations inside `resolve`, use shared
arrival/hit/death helpers, and validate the whole action before spending GP.
Fixture construction may use `initializing` to suppress victory until both
sides' kings are installed; production rules should not be weakened for tests.
