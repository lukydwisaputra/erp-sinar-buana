export function ShowcaseSection({ id, title, description, children }: {
  id: string; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-border py-10">
      <header className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </header>
      <div className="flex flex-wrap items-start gap-6">{children}</div>
    </section>
  );
}
