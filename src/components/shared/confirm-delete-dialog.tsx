"use client";
import * as React from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Generic "Hapus {entity}?" confirmation dialog — the delete-confirm shape
 * repeated across list pages (target name in bold, permanent-delete warning,
 * Batal/Hapus footer with a loading state on the destructive action). */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  entityLabel,
  target,
  description,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "Perusahaan" → title becomes "Hapus Perusahaan?" */
  entityLabel: string;
  /** The record's display name, rendered in bold in the description. */
  target: string | undefined;
  /** Override the default "akan dihapus permanen…" description. */
  description?: React.ReactNode;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus {entityLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? (
              <>
                <strong>{target}</strong> akan dihapus permanen dan tidak dapat dipulihkan.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Menghapus…" : "Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
