import { DocumentPage } from "@/components/shared/document/document-page";
import { DocumentLetterhead } from "@/components/shared/document/document-letterhead";
import type { SphKelengkapan } from "@/lib/schemas/penawaran";

const cell = "border border-(--doc-rule) px-2 py-1";

export function SphKelengkapanPage({ kelengkapan }: { kelengkapan: SphKelengkapan }) {
  return (
    <DocumentPage header={<DocumentLetterhead variant="strip" />}>
      <div className="px-8 py-4 text-[11px]">
        <p className="text-center font-bold">{kelengkapan.nama}</p>
        <table className="mt-3 w-full border-collapse border border-(--doc-rule)">
          <thead>
            <tr className="bg-(--doc-blue-soft) text-center font-bold">
              <th className={`${cell} w-8`}>No</th>
              <th className={cell}>Persyaratan</th>
              <th className={`${cell} w-12`}>Ada</th>
              <th className={`${cell} w-12`}>Tidak</th>
              <th className={`${cell} w-36`}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {kelengkapan.items.map((item, i) => (
              <tr key={i}>
                <td className={`${cell} text-center`}>{String.fromCharCode(97 + i)}.</td>
                <td className={cell}>{item.persyaratan}</td>
                <td className={`${cell} text-center`}>{item.status === "ada" ? "✓" : ""}</td>
                <td className={`${cell} text-center`}>{item.status === "tidak" ? "✓" : ""}</td>
                <td className={cell}>{item.keterangan || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DocumentPage>
  );
}
