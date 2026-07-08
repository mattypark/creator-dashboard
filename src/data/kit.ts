import type { MetricPlatform } from "@/lib/types";

/**
 * Media Kit — single source of truth. Edit these values to update the
 * /media-kit page. Display values are pre-formatted STRINGS ("412K", "9.1%");
 * live follower counts from /api/metrics override the `followers` field at
 * render time when available.
 */

export interface KitMetric {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}

export interface KitPlatform {
  key: MetricPlatform;
  name: string;
  handle: string;
  url: string;
  followers: string;
  followersDelta?: string;
  metrics: KitMetric[];
}

export interface Bar {
  label: string;
  pct: number;
}

export interface KitService {
  name: string;
  featured?: boolean;
  includes: string[];
}

export const identity = {
  name: "Matthew Park",
  title: "Creator · Founder · Student",
  location: "Houston, TX",
  email: "andysampark@gmail.com",
  bio: "I build in public — content on tech, startups, and the young-founder journey. 75K+ followers and 30M+ organic views across platforms, turning audience into products, partnerships, and momentum.",
  headline: [
    { label: "Followers", value: "75K+", highlight: true },
    { label: "Organic views", value: "30M+" },
    { label: "Avg engagement", value: "8.4%" },
  ] as KitMetric[],
};

export const platforms: KitPlatform[] = [
  {
    key: "x",
    name: "X / Twitter",
    handle: "MattyparkW",
    url: "https://x.com/MattyparkW",
    followers: "42K",
    followersDelta: "+9.1% / 30d",
    metrics: [
      { label: "Impressions", value: "3.2M", sub: "30d", highlight: true },
      { label: "Engagement", value: "7.8%" },
      { label: "Profile visits", value: "88K", sub: "30d" },
    ],
  },
  {
    key: "youtube",
    name: "YouTube",
    handle: "matty_park",
    url: "https://www.youtube.com/@matty_park",
    followers: "18K",
    followersDelta: "+12.4% / 30d",
    metrics: [
      { label: "Views", value: "1.1M", sub: "30d", highlight: true },
      { label: "Watch time", value: "62K hrs" },
      { label: "Avg view dur", value: "4:12" },
    ],
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    handle: "matthew-park-487889350",
    url: "https://www.linkedin.com/in/matthew-park-487889350",
    followers: "9.5K",
    followersDelta: "+15.0% / 30d",
    metrics: [
      { label: "Post impressions", value: "540K", sub: "30d", highlight: true },
      { label: "Engagement", value: "6.2%" },
      { label: "New connections", value: "1.2K", sub: "30d" },
    ],
  },
  {
    key: "instagram",
    name: "Instagram",
    handle: "matty.park",
    url: "https://www.instagram.com/matty.park",
    followers: "6.1K",
    followersDelta: "+4.5% / 30d",
    metrics: [
      { label: "Reach", value: "210K", sub: "30d", highlight: true },
      { label: "Saves", value: "4.3K", sub: "30d" },
      { label: "Shares", value: "2.9K", sub: "30d" },
    ],
  },
  {
    key: "tiktok",
    name: "TikTok",
    handle: "mattparxy",
    url: "https://www.tiktok.com/@mattparxy",
    followers: "5.0K",
    followersDelta: "+22.0% / 30d",
    metrics: [
      { label: "Views", value: "820K", sub: "30d", highlight: true },
      { label: "Completion", value: "41%" },
      { label: "Shares", value: "6.1K", sub: "30d" },
    ],
  },
];

export const audience = {
  gender: [
    { label: "Male", pct: 64 },
    { label: "Female", pct: 34 },
    { label: "Other", pct: 2 },
  ] as Bar[],
  age: [
    { label: "13–17", pct: 8 },
    { label: "18–24", pct: 44 },
    { label: "25–34", pct: 33 },
    { label: "35–44", pct: 11 },
    { label: "45+", pct: 4 },
  ] as Bar[],
  geo: [
    { label: "United States", pct: 62 },
    { label: "United Kingdom", pct: 9 },
    { label: "Canada", pct: 7 },
    { label: "India", pct: 6 },
    { label: "Other", pct: 16 },
  ] as Bar[],
  interests: ["startups", "tech", "AI", "productivity", "self-improvement", "college"],
};

export const showcase = [
  { title: "How I got 30M views in a year", views: "4.2M", platform: "x" as const },
  { title: "Building my first startup at 17", views: "1.8M", platform: "youtube" as const },
  { title: "The young founder playbook", views: "980K", platform: "linkedin" as const },
];

export const services: KitService[] = [
  { name: "Single video", includes: ["1 dedicated video", "1 revision", "Usage: 30 days organic"] },
  {
    name: "Campaign",
    featured: true,
    includes: ["3 videos across platforms", "Story/post support", "2 revisions", "Usage: 90 days"],
  },
  { name: "Partnership", includes: ["Ongoing monthly content", "Priority scheduling", "Custom deliverables", "Whitelisting available"] },
];

export const modifiers = [
  "Paid usage rights",
  "Whitelisting / Spark Ads",
  "Category exclusivity",
  "Raw footage",
];

export const partners = ["Notion", "Vercel", "Anthropic", "Linear", "Supabase"];
