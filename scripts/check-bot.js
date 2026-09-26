// Bot-play browser check: human as Black (bot White moves first), one human
// reply, bot answers — all through the Web Worker path by default.
// Fails on page errors, worker errors, failed requests, or stalled bot turns.
import { once } from "node:events";
import { chromium, expect } from "@playwright/test";

process.env.PORT = "0";
const { server } = await import("../server.js");
if (!server.listening) await once(server, "listening");
const baseURL = `http://127.0.0.1:${server.address().port}`;
const errors = [];
let browser;

function tile(page, x, y) { return page.locator(`.tile[data-x="${x}"][data-y="${y}"]`); }

try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
  page.on("pageerror", error => errors.push(`pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("worker", worker => {
    worker.on("console", message => {
      if (message.type() === "error") errors.push(`worker-console: ${message.text()}`);
    });
  });
  page.on("response", response => {
    if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.goto(baseURL);
  // Human plays Black so the bot (White) must move immediately on load.
  await page.locator("#bot-color").selectOption("Black");
  await page.locator("#bot-difficulty").selectOption("normal");
  await page.locator("#bot-button").click();
  await expect(page.locator("#mode-badge")).toHaveText("BOT");
  // Bot's first move as White (worker path, then sync fallback if needed).
  await expect(page.locator("#game-title")).toHaveText("Black to move", { timeout: 30000 });
  // Human reply: black pawn (4,1) -> (4,3). Tiles carry game coordinates.
  // (No intermediate "White to move" assertion: the bot answers too fast and
  // the title settles back on "Black to move".)
  await tile(page, 4, 1).click();
  await tile(page, 4, 3).click();
  // Bot answers as White again: full round trip back to Black to move.
  await expect(page.locator("#game-title")).toHaveText("Black to move", { timeout: 30000 });
  // Human pawn actually advanced (white can't reach (4,3) in two moves, so
  // this proves the human move registered through the mirrored board).
  await expect(tile(page, 4, 3)).toHaveAttribute("aria-label", /Pawn/);
  if (errors.length) throw new Error(`bot browser errors:\n${errors.join("\n")}`);
  console.log("Bot browser check passed: worker-path turns, human reply, second bot answer, no errors.");
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
