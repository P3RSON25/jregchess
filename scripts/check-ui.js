import assert from "node:assert/strict";
import { once } from "node:events";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";
import { BOARD_NAMES, COLORS } from "../shared/game.js";

// Exercise the real UI and authoritative WebSocket server with two isolated browsers.
// Fixtures live in this process; no test-only API or browser globals are exposed.
process.env.PORT = "0";
const { server, rooms } = await import("../server.js");
if (!server.listening) await once(server, "listening");
const baseURL = `http://127.0.0.1:${server.address().port}`;
const errors = [];
let browser;

function tile(page, x, y) { return page.locator(`.tile[data-x="${x}"][data-y="${y}"]`); }
async function upgrade(page, id) {
  await page.locator("#skill-button").click();
  await page.locator(`.upgrade[title^="${id}:"]`).click();
}
async function shop(page, id) {
  await page.locator("#shop-button").click();
  await page.locator(`.product[title="${id}"]`).click();
}
async function blackTurn(page) { await expect(page.locator("#game-title")).toHaveText("Black to move"); }

try {
  browser = await chromium.launch({ headless: true });
  const whiteContext = await browser.newContext({ viewport: { width: 1280, height: 960 } });
  const blackContext = await browser.newContext({ viewport: { width: 1280, height: 960 } });
  const white = await whiteContext.newPage();
  const black = await blackContext.newPage();
  for (const page of [white, black]) {
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => {
      if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(baseURL);
  }
  await white.locator("#create-button").click();
  await expect(white.locator("#room-code")).toHaveText(/^[a-z]{5}$/);
  const code = await white.locator("#room-code").textContent();
  const game = rooms.get(code).game;
  game.initializing = true;
  for (const board of BOARD_NAMES) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) game.removeAt(x, y, board);
  game.placeNew("King", COLORS.WHITE, 0, 0, "Heaven");
  game.placeNew("King", COLORS.BLACK, 7, 7, "Hell");
  game.placeNew("King", COLORS.BLACK, 2, 2, "Normal");
  game.placeNew("Rook", COLORS.BLACK, 6, 1, "Normal");
  game.placeNew("Rook", COLORS.WHITE, 7, 7, "Normal");
  game.placeNew("SuperKing", COLORS.WHITE, 4, 4, "Normal");
  game.placeNew("Rook", COLORS.BLACK, 2, 4, "Hell");
  game.placeNew("Rook", COLORS.BLACK, 0, 3, "Heaven");
  game.placeNew("Angel", COLORS.NPC, 2, 3, "Heaven");
  game.whiteToMove = false;
  game.blackGP = 50;
  game.availableRules = [];
  game.initializing = false;
  game.checkVictory();

  black.once("dialog", dialog => dialog.accept(code));
  await black.locator("#join-button").click();
  await blackTurn(black);
  await expect(black.locator(".tile")).toHaveCount(64);
  await expect(white.locator("#game-title")).toHaveText("Black to move");

  await upgrade(black, "angry-rook");
  await expect(black.locator(".upgrade-target")).toHaveCount(1);
  await expect(tile(black, 6, 1)).toHaveClass(/upgrade-target/);
  const mirroredTarget = await tile(black, 6, 1).evaluate(element => ({ column: element.style.gridColumn, row: element.style.gridRow }));
  assert.deepEqual(mirroredTarget, { column: "2", row: "7" });
  await tile(black, 6, 1).click();
  await expect(tile(black, 6, 1)).toHaveAttribute("aria-label", /AngryRook/);
  assert.equal(game.blackGP, 45);
  assert.equal(game.getCell(6, 1, "Normal").type, "AngryRook");

  await upgrade(black, "super-king");
  await expect(black.locator(".upgrade-target")).toHaveCount(1);
  await tile(black, 2, 2).click();
  await expect(tile(black, 2, 2)).toHaveAttribute("aria-label", /SuperKing/);
  const superKing = game.getCell(2, 2, "Normal");
  const parts = [...superKing.related];
  assert.equal(game.blackGP, 40);
  const blackOverlay = black.locator('.piece-overlay').filter({ has: black.locator('canvas[aria-label="SuperKing"]') }).first();
  // Both large sprites must draw successfully, including Black's full-sprite asset.
  await black.waitForFunction(() => [...document.querySelectorAll(".piece-composite")].every(canvas =>
    canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data.some(value => value > 0)));
  assert.equal(await blackOverlay.evaluate(element => getComputedStyle(element).transform), "matrix(-1, 0, 0, -1, 0, 0)");
  assert.deepEqual(await blackOverlay.evaluate(element => [element.style.gridColumn, element.style.gridRow]), ["5 / span 2", "5 / span 2"]);
  await upgrade(black, "super-king");
  await expect(black.locator(".upgrade-target")).toHaveCount(0);
  // Cycling clears the selected tool without changing anyone's turn.
  for (let i = 0; i < 3; i++) await black.locator("#switch-button").click();
  await tile(black, 3, 3).click();
  await expect(tile(black, 2, 2)).toHaveClass(/legal/);
  await tile(black, 2, 2).click();
  await expect(black.locator("#game-title")).toHaveText("White to move");
  assert.strictEqual(game.getCell(1, 1, "Normal"), superKing);
  for (let i = 0; i < parts.length; i++) assert.strictEqual(superKing.related[i], parts[i]);

  await tile(white, 7, 7).click();
  await tile(white, 7, 6).click();
  await blackTurn(black);
  await shop(black, "pawn");
  await expect(tile(black, 0, 5)).toHaveClass(/purchase-target/);
  await expect(tile(black, 0, 5)).toHaveCSS("background-color", "rgb(0, 255, 0)");
  assert.deepEqual(await tile(black, 0, 5).evaluate(element => [element.style.gridColumn, element.style.gridRow]), ["8", "3"]);
  await tile(black, 0, 5).click();
  await expect(tile(white, 0, 5)).toHaveAttribute("aria-label", /Pawn/);
  assert.equal(game.getCell(0, 5, "Normal").color, COLORS.BLACK);
  assert.equal(game.blackGP, 38);

  await black.locator("#switch-button").click();
  await expect(black.locator("#board-name")).toHaveText("Hell");
  await expect(white.locator("#board-name")).toHaveText("Normal");
  await tile(white, 7, 6).click();
  await tile(white, 7, 7).click();
  await blackTurn(black);
  await shop(black, "pawn");
  await expect(black.locator(".purchase-target")).toHaveCount(0);
  await tile(black, 4, 4).click();
  await expect(black.locator(".toast")).toContainText("Normal board");
  assert.equal(game.getCell(4, 4, "Hell"), null);
  assert.equal(game.blackGP, 38);
  await upgrade(black, "angry-rook");
  await expect(tile(black, 2, 4)).toHaveClass(/upgrade-target/);
  await tile(black, 2, 4).click();
  await expect(tile(black, 2, 4)).toHaveAttribute("aria-label", /AngryRook/);
  assert.equal(game.blackGP, 33);
  assert.equal(game.currentBoard, "Normal");
  await expect(black.locator("#board-name")).toHaveText("Hell");
  await expect(white.locator("#board-name")).toHaveText("Normal");

  await black.locator("#switch-button").click();
  await expect(black.locator("#board-name")).toHaveText("Heaven");
  await shop(black, "pawn");
  await expect(black.locator(".purchase-target")).toHaveCount(0);
  for (let i = 0; i < 3; i++) await black.locator("#switch-button").click();
  await tile(black, 0, 3).click();
  await tile(black, 2, 3).click();
  await expect(black.locator('#modal-root[data-kind="decision"]')).toBeVisible();
  await expect(white.locator("#modal-root")).toBeHidden();
  assert.equal(game.pendingDecision.color, COLORS.BLACK);
  assert.equal(game.whiteToMove, false);
  await black.getByRole("button", { name: "NO", exact: true }).click();
  await expect(black.locator("#modal-root")).toBeHidden();
  await expect(black.locator("#game-title")).toHaveText("White to move");
  assert.equal(game.pendingDecision, null);
  assert.equal(game.turnsSinceNewRule, 5);

  await black.locator("#switch-button").click();
  await black.reload();
  await expect(black.locator("#connection-status")).toHaveText("Player black");
  await expect(black.locator("#board-name")).toHaveText("Normal");
  await expect(tile(black, 1, 1)).toHaveAttribute("aria-label", /SuperKing/);
  await black.waitForFunction(() => [...document.querySelectorAll(".piece-composite")].every(canvas =>
    canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data.some(value => value > 0)));
  if (process.env.UI_SCREENSHOT_DIR) await black.screenshot({ path: join(process.env.UI_SCREENSHOT_DIR, "jreg-chess-black-desktop.png"), fullPage: true });
  await black.setViewportSize({ width: 390, height: 844 });
  const dimensions = await black.locator("#board").boundingBox();
  assert.ok(dimensions.width <= 390 && Math.abs(dimensions.width - dimensions.height) < 1);
  if (process.env.UI_SCREENSHOT_DIR) await black.screenshot({ path: join(process.env.UI_SCREENSHOT_DIR, "jreg-chess-black-mobile.png"), fullPage: true });

  // A terminal snapshot must dismiss a decision modal on the other client.
  game.setGroupHealth(game.getCell(2, 3, "Heaven"), 2);
  game.placeNew("Rook", COLORS.BLACK, 0, 3, "Heaven");
  await tile(white, 7, 7).click();
  await tile(white, 7, 6).click();
  await blackTurn(black);
  await black.locator("#switch-button").click();
  await black.locator("#switch-button").click();
  await tile(black, 0, 3).click();
  await tile(black, 2, 3).click();
  await expect(black.locator('#modal-root[data-kind="decision"]')).toBeVisible();
  white.once("dialog", dialog => dialog.accept());
  await white.locator("#resign-button").click();
  await expect(black.locator("#modal-root")).toBeHidden();
  await expect(black.locator("#game-title")).toHaveText("Black wins");
  assert.deepEqual(errors, []);
  console.log("Browser checks passed: mirrored input/highlights, large sprites, purchases, board-local upgrades/views, decisions, reconnect, terminal modals, and mobile layout.");
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
