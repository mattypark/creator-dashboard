// Unit tests for the vision-extraction remediation layer.
// Zero-dep: node:test + node:assert, importing the .ts module directly via
// Node's native type stripping (Node >= 22.18). Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";

import {
  remediateAnalytics,
  parseMetricValue,
  normalizeTitle,
  titlesMatch,
} from "../src/lib/extract-remediate.ts";

const EMPTY = {
  platform: null,
  followers: null,
  following: null,
  views: null,
  engagement: null,
  profile_visits: null,
  reach: null,
  gender: [],
  age: [],
  geo: [],
  active_hours: [],
  top_posts: [],
};

// --- parseMetricValue -------------------------------------------------------

test("parses K/M/B suffixes, commas, and percent strings", () => {
  assert.equal(parseMetricValue("42.9K"), 42900);
  assert.equal(parseMetricValue("3.2M"), 3200000);
  assert.equal(parseMetricValue("1.2B"), 1200000000);
  assert.equal(parseMetricValue("1,204"), 1204);
  assert.equal(parseMetricValue("1,234,567"), 1234567);
  assert.equal(parseMetricValue("8.4%"), 8.4);
  assert.equal(parseMetricValue("  12k "), 12000);
  assert.equal(parseMetricValue(42), 42);
});

test("rejects negatives, NaN, Infinity, and garbage to null", () => {
  assert.equal(parseMetricValue(-5), null);
  assert.equal(parseMetricValue("-5"), null);
  assert.equal(parseMetricValue(NaN), null);
  assert.equal(parseMetricValue(Infinity), null);
  assert.equal(parseMetricValue("a lot"), null);
  assert.equal(parseMetricValue("12kk"), null);
  assert.equal(parseMetricValue(null), null);
  assert.equal(parseMetricValue(undefined), null);
  assert.equal(parseMetricValue({}), null);
});

// --- Headline metrics -------------------------------------------------------

test("coerces numeric-ish strings on headline metrics, rounds counts", () => {
  const out = remediateAnalytics({
    followers: "42.9K",
    following: 12.6,
    views: "3.2M",
    reach: "1,204",
    profile_visits: -3, // negative -> null
  });
  assert.equal(out.followers, 42900);
  assert.equal(out.following, 13); // counts round to integers
  assert.equal(out.views, 3200000);
  assert.equal(out.reach, 1204);
  assert.equal(out.profile_visits, null);
});

test("clamps engagement to 0-100 and accepts percent strings", () => {
  assert.equal(remediateAnalytics({ engagement: "8.4%" }).engagement, 8.4);
  assert.equal(remediateAnalytics({ engagement: 240 }).engagement, 100);
  assert.equal(remediateAnalytics({ engagement: -7 }).engagement, null);
  assert.equal(remediateAnalytics({ engagement: "840%" }).engagement, 100);
});

// --- Demographics ------------------------------------------------------------

test("keeps valid demographic bars, drops bad entries", () => {
  const out = remediateAnalytics({
    gender: [
      { label: "Male", pct: 60 },
      { label: "Female", pct: "38.5%" }, // string pct parses
      { label: "", pct: 1 }, // empty label dropped
      { label: "Other", pct: 130 }, // pct > 100 dropped
      { label: "X", pct: -4 }, // negative dropped
      "garbage", // non-object dropped
    ],
  });
  assert.deepEqual(out.gender, [
    { label: "Male", pct: 60 },
    { label: "Female", pct: 38.5 },
  ]);
});

test("rejects corrupt demographic sets summing over 120", () => {
  const out = remediateAnalytics({
    age: [
      { label: "18-24", pct: 80 },
      { label: "25-34", pct: 70 }, // sum 150 > 120 -> whole set corrupt
    ],
  });
  assert.deepEqual(out.age, []);
});

test("dedupes demographic labels case-insensitively, keeping first", () => {
  const out = remediateAnalytics({
    geo: [
      { label: "USA", pct: 40 },
      { label: "usa", pct: 30 },
      { label: "Korea", pct: 20 },
    ],
  });
  assert.deepEqual(out.geo, [
    { label: "USA", pct: 40 },
    { label: "Korea", pct: 20 },
  ]);
});

// --- active_hours -------------------------------------------------------------

test("truncates long active_hours to 24 and pads short ones with 0", () => {
  const long = remediateAnalytics({ active_hours: new Array(30).fill(1) });
  assert.equal(long.active_hours.length, 24);

  const short = remediateAnalytics({ active_hours: [5, 3, 2] });
  assert.equal(short.active_hours.length, 24);
  assert.deepEqual(short.active_hours.slice(0, 3), [5, 3, 2]);
  assert.ok(short.active_hours.slice(3).every((v) => v === 0));
});

test("clamps negative hours to 0 and rejects non-numeric arrays", () => {
  const clamped = remediateAnalytics({ active_hours: [-2, 4] });
  assert.equal(clamped.active_hours[0], 0);
  assert.equal(clamped.active_hours[1], 4);

  assert.deepEqual(remediateAnalytics({ active_hours: [1, "x", 3] }).active_hours, []);
  assert.deepEqual(remediateAnalytics({ active_hours: "busy" }).active_hours, []);
  assert.deepEqual(remediateAnalytics({ active_hours: [] }).active_hours, []);
});

// --- top_posts ----------------------------------------------------------------

test("drops posts without a usable title, trims titles to 200 chars", () => {
  const long = "x".repeat(300);
  const out = remediateAnalytics({
    top_posts: [
      { title: "  " }, // whitespace-only dropped
      { title: 42 }, // non-string dropped
      { title: long, views: 1 },
      null, // non-object dropped
    ],
  });
  assert.equal(out.top_posts.length, 1);
  assert.equal(out.top_posts[0].title.length, 200);
});

test("dedupes posts in a batch by fuzzy title match", () => {
  const out = remediateAnalytics({
    top_posts: [
      { title: "Step #1", views: 100 },
      { title: "step #1 — the hook that works", views: 200 }, // fuzzy dup
      { title: "Totally different", views: 50 },
    ],
  });
  assert.equal(out.top_posts.length, 2);
  assert.equal(out.top_posts[0].title, "Step #1");
});

test("coerces post stats through the number rule and posted_at to ISO", () => {
  const out = remediateAnalytics({
    top_posts: [
      {
        title: "My post",
        views: "42.9K",
        likes: "1,204",
        comments: -8, // negative -> null
        shares: "not a number", // garbage -> null
        saves: 3.7, // count rounds
        posted_at: "2026-06-01",
      },
      { title: "Bad date", posted_at: "yesterday-ish" },
    ],
  });
  const p = out.top_posts[0];
  assert.equal(p.views, 42900);
  assert.equal(p.likes, 1204);
  assert.equal(p.comments, null);
  assert.equal(p.shares, null);
  assert.equal(p.saves, 4);
  assert.ok(p.posted_at?.startsWith("2026-06-01"));
  assert.equal(out.top_posts[1].posted_at, null);
});

// --- Garbage input --------------------------------------------------------------

test("garbage input yields the safe empty shape", () => {
  assert.deepEqual(remediateAnalytics(null), EMPTY);
  assert.deepEqual(remediateAnalytics(undefined), EMPTY);
  assert.deepEqual(remediateAnalytics([]), EMPTY);
  assert.deepEqual(remediateAnalytics([1, 2, 3]), EMPTY);
  assert.deepEqual(remediateAnalytics("nope"), EMPTY);
  assert.deepEqual(remediateAnalytics(42), EMPTY);
  assert.deepEqual(remediateAnalytics({}), EMPTY);
  // wrong-typed fields degrade to safe values, never throw
  assert.deepEqual(
    remediateAnalytics({ platform: 7, followers: {}, gender: "many", top_posts: {} }),
    EMPTY,
  );
});

// --- Shared title identity --------------------------------------------------------

test("normalizeTitle and titlesMatch behave like the ingest route expects", () => {
  assert.equal(normalizeTitle("Step #1 — The Hook!"), "step 1 the hook");
  assert.ok(titlesMatch("step #1", "Step #1 — the hook that works"));
  assert.ok(!titlesMatch("", "anything"));
  assert.ok(!titlesMatch("alpha", "beta"));
});
