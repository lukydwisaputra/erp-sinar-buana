import { DocumentFooter } from "@/components/shared/document/document-footer";

/**
 * A single A4 page: 210mm wide, white. Built as a `<table>` so the letterhead
 * (`thead`) repeats on every overflow page in print; the footer is a `tfoot`
 * spacer (screen-only paint) — the visible running footer is fixed (see globals.css).
 */
export function DocumentPage({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="doc-page mx-auto flex min-h-[297mm] w-[210mm] flex-col bg-white text-[var(--doc-ink)] shadow-sm print:shadow-none">
      <table className="doc-page-table w-full flex-1 border-collapse">
        <thead className="doc-page-head"><tr><td className="p-0">{header}</td></tr></thead>
        <tfoot className="doc-page-foot"><tr><td className="p-0"><DocumentFooter /></td></tr></tfoot>
        <tbody><tr><td className="p-0 align-top">{children}</td></tr></tbody>
      </table>
    </div>
  );
}
