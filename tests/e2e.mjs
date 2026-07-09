#!/usr/bin/env node
/**
 * Zero-dependency E2E suite for creator-dashboard.
 *
 * Hits a real production server (`next start` against the existing .next
 * build) over plain HTTP with the built-in fetch — no Playwright, no new
 * npm deps. Page-render checks use plain fetch too: every route under test
 * is a Next.js "use client" page component, and Next still server-renders
 * the initial markup for client components (effects/fetches only run after
 * hydration), so the static marker text is present in the raw HTML without
 * needing to execute JS in a browser. Headless Chrome was intentionally
 * skipped for that reason (it also clamps viewport to 500px under
 * --headless=new, which isn't needed here).
 *
 * Server is started with env overrides that force keyless MemoryDb demo
 * mode. MemoryDb resets on every server start, so every test seeds its own
 * data — do not assume ordering across separate `npm run test:e2e` runs,
 * but DO assume ordering *within* this file (tests run sequentially and
 * later tests rely on state created by earlier ones).
 *
 * Run: node tests/e2e.mjs   (or) npm run test:e2e
 */

import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = 3038;
const BASE = `http://localhost:${PORT}`;
const SERVER_READY_TIMEOUT_MS = 30_000;

const results = [];
const state = {};
let serverHandle = null;

function log(...args) {
  console.log(...args);
}

// ---------------------------------------------------------------------------
// Build freshness check
// ---------------------------------------------------------------------------

function findNewestMtime(dir, since) {
  let newest = since;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return newest;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, findNewestMtime(full, since));
    } else {
      const mtime = fs.statSync(full).mtimeMs;
      if (mtime > newest) newest = mtime;
    }
  }
  return newest;
}

function runBuild() {
  return new Promise((resolve, reject) => {
    log("[e2e] Running `npm run build`...");
    const b = spawn("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit" });
    b.on("error", reject);
    b.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm run build exited with code ${code}`));
    });
  });
}

async function ensureFreshBuild() {
  const buildIdPath = path.join(ROOT, ".next", "BUILD_ID");
  if (!fs.existsSync(buildIdPath)) {
    log("[e2e] No .next build output found.");
    await runBuild();
    return;
  }
  const buildTime = fs.statSync(buildIdPath).mtimeMs;
  const srcNewest = findNewestMtime(path.join(ROOT, "src"), 0);
  if (srcNewest > buildTime) {
    log("[e2e] .next build is stale relative to src/.");
    await runBuild();
  } else {
    log("[e2e] Existing .next build looks fresh — skipping rebuild.");
  }
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

function startServer() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      APP_PASSWORD: "",
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      PORT: String(PORT),
    };
    const child = spawn("npm", ["start"], {
      cwd: ROOT,
      env,
      detached: true, // own process group so we can kill npm + `next start` together
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      out += d.toString();
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (serverHandle && !serverHandle.ready) {
        reject(new Error(`Server process exited early (code=${code}, signal=${signal})\n${out}`));
      }
    });
    serverHandle = { child, ready: false, getOutput: () => out };
    resolve();
  });
}

async function waitForServerReady() {
  const start = Date.now();
  while (Date.now() - start < SERVER_READY_TIMEOUT_MS) {
    try {
      const res = await fetch(`${BASE}/`);
      if (res.status) {
        serverHandle.ready = true;
        return;
      }
    } catch {
      // not up yet
    }
    await delay(500);
  }
  throw new Error(
    `Server did not become ready within ${SERVER_READY_TIMEOUT_MS}ms.\n--- server output ---\n${serverHandle.getOutput()}`,
  );
}

function stopServer() {
  if (!serverHandle?.child?.pid) return;
  const pid = serverHandle.child.pid;
  try {
    // Negative PID => signal the whole process group we created via
    // `detached: true` (npm + the `next start` child it spawns), not a
    // broad system-wide pkill.
    process.kill(-pid, "SIGTERM");
    log(`[e2e] Sent SIGTERM to server process group (pgid ${pid}).`);
  } catch {
    try {
      serverHandle.child.kill("SIGTERM");
      log(`[e2e] Sent SIGTERM directly to server pid ${pid}.`);
    } catch (err2) {
      log(`[e2e] Warning: failed to stop server pid ${pid}: ${err2.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Tiny test harness
// ---------------------------------------------------------------------------

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    log(`PASS  ${name}`);
  } catch (err) {
    results.push({ name, pass: false, error: err });
    log(`FAIL  ${name}`);
    log(`      ${err && err.stack ? err.stack : err}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

async function postJson(pathName, body) {
  const res = await fetch(`${BASE}${pathName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function getJson(pathName) {
  const res = await fetch(`${BASE}${pathName}`);
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function patchJson(pathName, body) {
  const res = await fetch(`${BASE}${pathName}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

// ---------------------------------------------------------------------------
// Test flows
// ---------------------------------------------------------------------------

async function runTests() {
  await test("1. POST /api/posts (YouTube URL) auto-detects platform + enriches stats", async () => {
    const { res, json } = await postJson("/api/posts", {
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    assert(res.status === 201, `expected 201, got ${res.status}: ${JSON.stringify(json)}`);
    const post = json.post;
    assert(post, "missing post in response");
    assert(post.platform === "youtube", `expected platform "youtube", got "${post.platform}"`);
    assert(
      typeof post.title === "string" && post.title.includes("Rick Astley"),
      `expected title to include "Rick Astley", got "${post.title}"`,
    );
    assert(post.image_url != null, "expected image_url to be non-null");
    assert(post.stats_updated_at != null, "expected stats_updated_at to be non-null");
    state.youtubePostId = post.id;
  });

  await test("2. POST /api/posts (X status URL) auto-detects platform x (soft live-stats check)", async () => {
    const { res, json } = await postJson("/api/posts", {
      url: "https://x.com/elonmusk/status/1585841080431321088",
    });
    assert(res.status < 500, `unexpected server error ${res.status}: ${JSON.stringify(json)}`);
    assert(res.status === 201, `expected 201, got ${res.status}: ${JSON.stringify(json)}`);
    const post = json.post;
    assert(post, "missing post in response");
    assert(post.platform === "x", `expected platform "x", got "${post.platform}"`);
    if (post.likes && post.likes > 0) {
      log(`      [soft] live X syndication stats came back — likes=${post.likes}`);
    } else {
      log(
        `      [soft] X syndication endpoint returned no live numbers (likes=${post.likes ?? 0}) — non-fatal, endpoint is unofficial/fragile`,
      );
    }
    state.xPostId = post.id;
  });

  await test("3. POST /api/refresh-posts refreshes tracked posts, no 5xx", async () => {
    const { res, json } = await postJson("/api/refresh-posts", undefined);
    assert(res.status < 500, `unexpected 5xx from refresh-posts: ${res.status}`);
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(json)}`);
    assert(json.checked >= 2, `expected checked >= 2, got ${json.checked}`);
  });

  await test("4. GET /api/posts?platform=youtube includes the seeded post", async () => {
    const { res, json } = await getJson("/api/posts?platform=youtube");
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const found = (json.posts || []).some((p) => p.id === state.youtubePostId);
    assert(found, "seeded YouTube post not found in platform-filtered list");
  });

  await test("5a. POST /api/knowledge {url} auto-enriches title + image", async () => {
    const { res, json } = await postJson("/api/knowledge", {
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    assert(res.status === 201, `expected 201, got ${res.status}: ${JSON.stringify(json)}`);
    const item = json.item;
    assert(item, "missing item in response");
    assert(
      typeof item.title === "string" && item.title.includes("Rick Astley"),
      `expected title to include "Rick Astley", got "${item.title}"`,
    );
    assert(item.image_url != null, "expected image_url to be non-null");
    state.knowledgeUrlId = item.id;
  });

  await test('5b. POST /api/knowledge {text} creates a "note" kind item', async () => {
    const { res, json } = await postJson("/api/knowledge", { text: "test thought" });
    assert(res.status === 201, `expected 201, got ${res.status}: ${JSON.stringify(json)}`);
    const item = json.item;
    assert(item, "missing item in response");
    assert(item.kind === "note", `expected kind "note", got "${item.kind}"`);
    state.knowledgeNoteId = item.id;
  });

  await test('5c. PATCH /api/knowledge status -> "promoted" works', async () => {
    assert(state.knowledgeUrlId, "precondition failed: no knowledge item id from test 5a");
    const { res, json } = await patchJson("/api/knowledge", {
      id: state.knowledgeUrlId,
      status: "promoted",
    });
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(json)}`);
    assert(
      json.item?.status === "promoted",
      `expected status "promoted", got "${json.item?.status}"`,
    );
  });

  await test("6a. POST /api/metrics manual insert (x/followers=1000)", async () => {
    const { res, json } = await postJson("/api/metrics", {
      platform: "x",
      metric_key: "followers",
      value: 1000,
    });
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(json)}`);
    assert(json.inserted === 1, `expected inserted=1, got ${json.inserted}`);
  });

  await test("6b. POST /api/metrics manual insert again (x/followers=2000)", async () => {
    const { res, json } = await postJson("/api/metrics", {
      platform: "x",
      metric_key: "followers",
      value: 2000,
    });
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(json)}`);
    assert(json.inserted === 1, `expected inserted=1, got ${json.inserted}`);
  });

  await test("6c. GET /api/metrics shows latest value (2000) in byPlatform", async () => {
    const { res, json } = await getJson("/api/metrics");
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const group = (json.byPlatform || []).find((g) => g.platform === "x");
    assert(group, "no x group in byPlatform");
    const followers = group.metrics.find((m) => m.metric_key === "followers");
    assert(followers, "no followers metric found for platform x");
    assert(followers.value === 2000, `expected latest value 2000, got ${followers.value}`);
  });

  await test("6d. GET /api/metrics/history preserves both data points", async () => {
    const { res, json } = await getJson("/api/metrics/history?platform=x&key=followers");
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const history = json.history || [];
    assert(history.length === 2, `expected 2 history points, got ${history.length}`);
    assert(history[0].value === 1000, `expected first point value 1000, got ${history[0].value}`);
    assert(history[1].value === 2000, `expected second point value 2000, got ${history[1].value}`);
  });

  await test("7. POST/GET /api/audience upsert roundtrip", async () => {
    const payload = {
      platform: "x",
      gender: [
        { label: "Male", pct: 60 },
        { label: "Female", pct: 40 },
      ],
      age: [
        { label: "18-24", pct: 55 },
        { label: "25-34", pct: 45 },
      ],
    };
    const { res: postRes, json: postBody } = await postJson("/api/audience", payload);
    assert(postRes.status === 200, `expected 200, got ${postRes.status}: ${JSON.stringify(postBody)}`);

    const { res, json } = await getJson("/api/audience");
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const profile = (json.profiles || []).find((p) => p.platform === "x");
    assert(profile, "no audience profile found for platform x");
    assert(profile.gender.length === 2, `expected 2 gender rows, got ${profile.gender.length}`);
    assert(profile.age.length === 2, `expected 2 age rows, got ${profile.age.length}`);
  });

  const pages = [
    { path: "/", marker: "Overview" },
    { path: "/brain", marker: "Brain" },
    { path: "/hub", marker: "Hub" },
    { path: "/scripts", marker: "Scripts" },
    { path: "/media-kit", marker: "Media Kit" },
    { path: "/pipeline", marker: "Pipeline" },
    { path: "/platform/x", marker: "Twitter / X" },
    { path: "/platform/youtube", marker: "YouTube" },
  ];
  for (const { path: p, marker } of pages) {
    await test(`8. GET ${p} renders 200 with marker "${marker}"`, async () => {
      const res = await fetch(`${BASE}${p}`);
      assert(res.status === 200, `expected 200, got ${res.status}`);
      const html = await res.text();
      assert(html.includes(marker), `expected HTML for ${p} to include "${marker}"`);
    });
  }

  await test("9. POST /api/knowledge SSRF guard blocks fetch to link-local metadata IP", async () => {
    const { res, json } = await postJson("/api/knowledge", {
      url: "http://169.254.169.254/latest/",
    });
    assert(res.status === 201, `expected 201, got ${res.status}: ${JSON.stringify(json)}`);
    const item = json.item;
    assert(item, "missing item in response");
    assert(item.image_url == null, `expected image_url null, got "${item.image_url}"`);
    assert(
      item.title === "169.254.169.254",
      `expected title to fall back to hostname, got "${item.title}"`,
    );
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await ensureFreshBuild();
  await startServer();
  try {
    await waitForServerReady();
    log(`[e2e] Server ready at ${BASE} (pid ${serverHandle.child.pid})`);
    await runTests();
  } finally {
    stopServer();
  }

  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;

  log("\n" + "=".repeat(64));
  log("E2E SUMMARY");
  log("=".repeat(64));
  for (const r of results) log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}`);
  log("-".repeat(64));
  log(`Total: ${results.length}   Pass: ${pass}   Fail: ${fail}`);
  log("=".repeat(64));

  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error("[e2e] fatal error:", err);
  stopServer();
  process.exitCode = 1;
});
