type Props = {
  kicker: string;
  title: string;
  action?: React.ReactNode;
};

export function PageHeader({ kicker, title, action }: Props) {
  return (
    <header className="flex items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
      <div className="space-y-2">
        <p className="kicker">{kicker}</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}
