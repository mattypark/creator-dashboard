"use client";

import { PLATFORM_META, type KnowledgeItem, type MetricPlatform } from "@/lib/types";

const KIND_ICON: Record<KnowledgeItem["kind"], string> = {
  link: "🔗",
  tweet: "𝕏",
  video: "▶",
  article: "📄",
  note: "✎",
};

function safeUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") return url;
  } catch {
    return undefined;
  }
  return undefined;
}

type Props = {
  item: KnowledgeItem;
  onPromote: (item: KnowledgeItem) => void;
  onDelete: (item: KnowledgeItem) => void;
  isBusy: boolean;
};

export function KnowledgeCard({ item, onPromote, onDelete, isBusy }: Props) {
  const href = safeUrl(item.url);
  const platform = item.source_platform as MetricPlatform | null;
  const excerpt = item.summary || item.raw_text;

  return (
    <article className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col hover:border-[var(--muted)] transition-colors">
      {item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt=""
          className="w-full h-36 object-cover border-b border-[var(--border)]"
          loading="lazy"
        />
      )}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
          <span>{KIND_ICON[item.kind]}</span>
          <span className="uppercase tracking-wide">{item.kind}</span>
          {platform && (
            <span
              className="ml-auto w-2 h-2 rounded-full"
              style={{ background: PLATFORM_META[platform].color }}
              title={PLATFORM_META[platform].label}
            />
          )}
        </div>

        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium leading-snug hover:underline line-clamp-2"
          >
            {item.title}
          </a>
        ) : (
          <div className="text-sm font-medium leading-snug line-clamp-2">
            {item.title}
          </div>
        )}

        {item.author && (
          <div className="text-[11px] text-[var(--muted)]">{item.author}</div>
        )}

        {excerpt && (
          <p className="text-xs text-[var(--muted)] line-clamp-3">{excerpt}</p>
        )}

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((t) => (
              <span
                key={t}
                className="text-[10px] bg-[var(--surface-2)] rounded px-1.5 py-0.5 text-[var(--muted)]"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 mt-auto pt-1">
          {item.status === "promoted" ? (
            <span className="text-[11px] text-[var(--blueberry)]">✓ in pipeline</span>
          ) : (
            <button
              onClick={() => onPromote(item)}
              disabled={isBusy}
              className="text-[11px] font-medium text-[var(--mango)] hover:brightness-110 disabled:opacity-50"
            >
              → promote to pipeline
            </button>
          )}
          <button
            onClick={() => onDelete(item)}
            className="text-[11px] text-[var(--muted)] hover:text-red-500 ml-auto"
          >
            delete
          </button>
        </div>
      </div>
    </article>
  );
}
