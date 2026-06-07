"use client";

type NavLink = { id: string; title: string };
type NavGroup = { label: string; links: NavLink[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Form & input",
    links: [
      { id: "form-tombol", title: "Tombol" },
      { id: "form-input", title: "Input & Form" },
      { id: "form-pilihan", title: "Pilihan & Tanggal" },
      { id: "form-uang-unggah", title: "Khusus: Uang & Unggah" },
    ],
  },
  {
    label: "Tampilan data",
    links: [
      { id: "data-kartu", title: "Kartu & KPI" },
      { id: "data-tabel", title: "Tabel Data" },
      { id: "data-status", title: "Badge Status" },
      { id: "data-avatar", title: "Avatar, Progress & Item" },
      { id: "data-grafik", title: "Grafik" },
      { id: "data-pembagi", title: "Pembagi & Rasio" },
    ],
  },
  {
    label: "Overlay",
    links: [
      { id: "overlay-dialog", title: "Dialog & Konfirmasi" },
      { id: "overlay-drawer", title: "Panel Rincian (Sheet)" },
      { id: "overlay-menu", title: "Menu Aksi Baris" },
      { id: "overlay-tooltip", title: "Tooltip & Popover" },
      { id: "overlay-hovercard", title: "Kartu Pratinjau" },
      { id: "overlay-command", title: "Palet Perintah" },
    ],
  },
  {
    label: "Umpan balik & status",
    links: [
      { id: "feedback-alert", title: "Banner Inline (Alert)" },
      { id: "feedback-toast", title: "Notifikasi Sembul (Toast)" },
      { id: "feedback-loading", title: "Status Memuat" },
      { id: "feedback-empty", title: "Keadaan Kosong" },
      { id: "feedback-error", title: "Keadaan Galat" },
    ],
  },
  {
    label: "Pengungkapan & navigasi",
    links: [
      { id: "disclosure-tabs", title: "Tab (Tabs)" },
      { id: "disclosure-accordion", title: "Akordeon & Collapsible" },
      { id: "disclosure-toggle", title: "Sakelar (Toggle) & Grup Sakelar" },
      { id: "disclosure-breadcrumb", title: "Remah Roti (Breadcrumb)" },
      { id: "disclosure-scrollarea", title: "Area Gulir (Scroll Area)" },
    ],
  },
];

export function ShowcaseNav() {
  return (
    <nav
      aria-label="Daftar isi"
      className="sticky top-10 hidden max-h-[calc(100vh-5rem)] overflow-y-auto pr-2 lg:block"
    >
      <ul className="flex flex-col gap-6">
        {NAV_GROUPS.map((group) => (
          <li key={group.label}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5 border-l border-border">
              {group.links.map((link) => (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    className="-ml-px block border-l border-transparent py-1 pl-3 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
