export function LegalBody({
  sections,
}: {
  sections: readonly { title: string; body: string }[];
}) {
  return (
    <div className="divide-y divide-gold/15 border-y border-gold/15">
      {sections.map((section, i) => (
        <article key={section.title} className="py-7">
          <div className="flex items-baseline gap-4">
            <span className="tnum font-display text-[1rem] text-gold/70">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h2 className="text-[1.2rem]">{section.title}</h2>
          </div>
          <p className="mt-2.5 max-w-2xl ps-8 text-[0.88rem] leading-8 text-ink-muted">
            {section.body}
          </p>
        </article>
      ))}
    </div>
  );
}
