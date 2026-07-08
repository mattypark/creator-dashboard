"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { Post } from "@/lib/types";
import { fmt } from "@/lib/format";

type Props = {
  post: Post;
  onSave: (id: string, patch: Partial<Post>) => Promise<void>;
  onRemove: (id: string) => void;
};

const STAT_FIELDS = ["views", "likes", "comments", "shares"] as const;

/** Post card with inline editing — the manual path for platforms that block scraping. */
export function PostCard({ post, onSave, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(STAT_FIELDS.map((f) => [f, String(post[f] ?? 0)])),
  );
  const [busy, setBusy] = useState(false);

  const neverFetched = !post.stats_updated_at;

  async function save() {
    setBusy(true);
    try {
      const patch: Partial<Post> = { title: title.trim() || post.title };
      for (const f of STAT_FIELDS) {
        const n = Number(values[f]);
        if (Number.isFinite(n)) patch[f] = n;
      }
      await onSave(post.id, patch);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col hover:border-[var(--muted)] transition-colors">
      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.image_url}
          alt=""
          className="w-full h-36 object-cover border-b border-[var(--border)]"
          loading="lazy"
        />
      )}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {editing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1 text-sm font-medium outline-none focus:border-[var(--mango)]"
            placeholder="Post title"
            autoFocus
          />
        ) : post.url ? (
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium leading-snug hover:underline line-clamp-2"
          >
            {post.title}
          </a>
        ) : (
          <div className="text-sm font-medium leading-snug line-clamp-2">{post.title}</div>
        )}

        <div className="grid grid-cols-4 gap-1 text-center mt-auto pt-1">
          {STAT_FIELDS.map((field) => (
            <div key={field}>
              {editing ? (
                <input
                  value={values[field]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field]: e.target.value }))
                  }
                  inputMode="numeric"
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-1 py-0.5 text-center text-sm tabular-nums outline-none focus:border-[var(--mango)]"
                />
              ) : (
                <div className="text-sm font-semibold tabular-nums">
                  {fmt(post[field] ?? 0)}
                </div>
              )}
              <div className="text-[9px] uppercase tracking-wide text-[var(--muted)]">
                {field}
              </div>
            </div>
          ))}
        </div>

        {neverFetched && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-[10px] text-[var(--mango)] text-left hover:brightness-110"
          >
            Stats couldn&apos;t be fetched for this platform — tap to enter them
          </button>
        )}

        <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
          <span>
            {post.posted_at ? new Date(post.posted_at).toLocaleDateString() : "no date"}
          </span>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="hover:text-[var(--foreground)]"
                >
                  cancel
                </button>
                <button
                  onClick={save}
                  disabled={busy}
                  className="font-medium text-[var(--mango)] hover:brightness-110 disabled:opacity-50"
                >
                  {busy ? "…" : "save"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-0.5 hover:text-[var(--foreground)]"
                >
                  <Pencil size={9} /> edit
                </button>
                <button onClick={() => onRemove(post.id)} className="hover:text-red-500">
                  remove
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
