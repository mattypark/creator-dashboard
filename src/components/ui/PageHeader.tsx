type Props = {
  kicker: string;
  title: string;
  action?: React.ReactNode;
};

/**
 * Editorial masthead: gold-ticked kicker, display serif title, thick-thin
 * broadsheet rule with a gold hairline that draws in (see .masthead in
 * globals.css).
 */
export function PageHeader({ kicker, title, action }: Props) {
  return (
    <header className="masthead flex items-end justify-between gap-4 pb-7">
      <div className="space-y-2.5">
        <p className="kicker flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-block h-px w-6 bg-[var(--mango)]"
          />
          {kicker}
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}
