"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, ReceiptText, Building2, Users, type LucideIcon } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { navForRole } from "@/lib/nav";
import { useSession } from "@/lib/query/session";
import { useGlobalSearch } from "@/lib/query/search";
import { useDebouncedValue } from "@/lib/use-debounce";
import type { SearchResultType } from "@/lib/search/service";

const RESULT_ICON: Record<SearchResultType, LucideIcon> = {
  proyek: FolderKanban,
  faktur: ReceiptText,
  perusahaan: Building2,
  karyawan: Users,
};

const RESULT_GROUP_LABEL: Record<SearchResultType, string> = {
  proyek: "Proyek",
  faktur: "Faktur",
  perusahaan: "Perusahaan",
  karyawan: "Karyawan",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { data: session } = useSession();
  const nav = navForRole(session?.role);

  const debouncedSearch = useDebouncedValue(search, 250);
  const { data: results, isFetching } = useGlobalSearch(debouncedSearch);
  const isSearching = search.trim().length >= 2;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  const groupedResults = (results ?? []).reduce<Record<SearchResultType, typeof results>>(
    (acc, r) => ({ ...acc, [r.type]: [...(acc[r.type] ?? []), r] }),
    { proyek: [], faktur: [], perusahaan: [], karyawan: [] },
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Perintah"
      description="Cari data atau navigasi halaman"
      shouldFilter={!isSearching}
    >
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder="Cari proyek, faktur, perusahaan, karyawan…"
      />
      <CommandList>
        {isSearching ? (
          <>
            {!isFetching && (results?.length ?? 0) === 0 && <CommandEmpty>Tidak ada hasil.</CommandEmpty>}
            {(Object.keys(RESULT_GROUP_LABEL) as SearchResultType[]).map((type) => {
              const rows = groupedResults[type];
              if (!rows || rows.length === 0) return null;
              const Icon = RESULT_ICON[type];
              return (
                <CommandGroup key={type} heading={RESULT_GROUP_LABEL[type]}>
                  {rows.map((r) => (
                    <CommandItem key={r.id} value={`${type}-${r.id}`} onSelect={() => go(r.href)}>
                      <Icon className="mr-2 size-4" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{r.title}</span>
                        {r.subtitle && <span className="truncate text-xs text-muted-foreground">{r.subtitle}</span>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </>
        ) : (
          <>
            <CommandEmpty>Tidak ada hasil.</CommandEmpty>
            {nav.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.items.map((item) => (
                  <CommandItem key={item.href} value={item.label} onSelect={() => go(item.href)}>
                    <item.icon className="mr-2 size-4" />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
