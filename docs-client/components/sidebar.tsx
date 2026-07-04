"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_GROUPS } from "@/lib/modules";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="sidebar" aria-label="Navigasi panduan">
      <Link href="/" className="sidebar-title">
        Panduan Aplikasi
        <br />
        Sinar Buana ERP
      </Link>
      {DOC_GROUPS.map((group) => (
        <div className="sidebar-group" key={group.label}>
          <div className="sidebar-group-label">{group.label}</div>
          {group.modules.map((m) => {
            const href = `/${m.slug}`;
            const active = pathname === href;
            return (
              <Link
                key={m.slug}
                href={href}
                className={active ? "sidebar-link active" : "sidebar-link"}
              >
                {m.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
