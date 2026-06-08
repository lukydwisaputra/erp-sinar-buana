"use client";
import * as React from "react";

/** Full-page builder shell: header (title + actions) over a two-column body (form | preview), stacks below lg; preview sticky on lg+. */
export function BuilderLayout({ title, subtitle, actions, form, preview }: {
  title: React.ReactNode; subtitle?: string; actions?: React.ReactNode;
  form: React.ReactNode; preview: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">{form}</div>
        <div className="min-w-0">
          <div className="lg:sticky lg:top-20">{preview}</div>
        </div>
      </div>
    </div>
  );
}

/** A labelled card section for builder forms. */
export function BuilderSection({ title, description, action, children }: {
  title: string; description?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border p-4">
      <header className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
