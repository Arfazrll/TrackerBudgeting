"use client";

import { Check, LoaderCircle, NotebookPen, Pencil, Pin, Plus, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";

type Note = {
  id: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
};

function sortNotes(notes: Note[]) {
  return [...notes].sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
}

export function NotesManager({ initialNotes }: { initialNotes: Note[] }) {
  const { t } = useLanguage();
  const [notes, setNotes] = useState(initialNotes);
  const [editing, setEditing] = useState<Note | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function showForm(note: Note | null = null) {
    setEditing(note);
    setOpen(true);
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const body = {
      title: data.get("title"),
      content: data.get("content"),
      color: data.get("color"),
      isPinned: data.get("isPinned") === "on",
    };
    try {
      const response = await fetch(editing ? `/api/notes/${editing.id}` : "/api/notes", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(t("enterprise.notes.failure"));
      setNotes((items) => sortNotes(editing
        ? items.map((item) => item.id === editing.id ? payload.note : item)
        : [payload.note, ...items]));
      toast.success(t("enterprise.notes.success"));
      setOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("enterprise.notes.failure"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(note: Note) {
    if (!window.confirm(t("enterprise.notes.confirmDelete"))) return;
    const response = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    if (!response.ok) return toast.error(t("enterprise.notes.failure"));
    setNotes((items) => items.filter((item) => item.id !== note.id));
    toast.success(t("enterprise.notes.deleted"));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t("enterprise.notes.tag")}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">{t("enterprise.notes.title")}</h1>
          <p className="mt-2 text-sm muted">{t("enterprise.notes.subtitle")}</p>
        </div>
        <button onClick={() => showForm()} className="btn-primary w-full sm:w-auto"><Plus size={17} /> {t("enterprise.notes.add")}</button>
      </div>

      {notes.length ? (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
          {notes.map((note) => (
            <article key={note.id} className="card mb-4 break-inside-avoid overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: note.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {note.isPinned && <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[var(--card-muted)] px-2.5 py-1 text-[0.65rem] font-bold muted"><Pin size={11} /> {t("enterprise.notes.pinnedLabel")}</span>}
                    <h2 className="break-words text-lg font-bold">{note.title}</h2>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button aria-label={t("common.edit")} onClick={() => showForm(note)} className="grid size-10 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><Pencil size={16} /></button>
                    <button aria-label={t("common.delete")} onClick={() => deleteNote(note)} className="grid size-10 place-items-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 size={16} /></button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 muted">{note.content || t("common.noDescription")}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card grid min-h-72 place-items-center p-8 text-center">
          <div><NotebookPen className="mx-auto muted" size={36} /><p className="mt-3 text-sm muted">{t("enterprise.notes.empty")}</p></div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" className="card max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-b-none p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between">
              <div><h2 className="text-xl font-bold">{editing ? t("enterprise.notes.edit") : t("enterprise.notes.add")}</h2><p className="mt-1 text-sm muted">{t("enterprise.notes.subtitle")}</p></div>
              <button aria-label={t("common.close")} onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-lg hover:bg-[var(--card-muted)]"><X size={19} /></button>
            </div>
            <form onSubmit={saveNote} className="mt-5 space-y-4">
              <div><label className="label">{t("enterprise.notes.noteTitle")}</label><input aria-label={t("enterprise.notes.noteTitle")} name="title" defaultValue={editing?.title} className="input" maxLength={100} required /></div>
              <div><label className="label">{t("enterprise.notes.content")}</label><textarea aria-label={t("enterprise.notes.content")} name="content" defaultValue={editing?.content} className="input min-h-40 resize-y" maxLength={10000} /></div>
              <div className="grid grid-cols-[1fr_auto] items-end gap-4">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm font-medium">
                  <input name="isPinned" type="checkbox" defaultChecked={editing?.isPinned} className="size-4 accent-emerald-600" />
                  <Pin size={16} /> {t("enterprise.notes.pinned")}
                </label>
                <div><label className="label">{t("enterprise.notes.color")}</label><input aria-label={t("enterprise.notes.color")} name="color" type="color" defaultValue={editing?.color ?? "#64748b"} className="input h-11 w-16 p-1" /></div>
              </div>
              <button disabled={saving} className="btn-primary w-full">{saving ? <LoaderCircle className="animate-spin" size={17} /> : <Check size={17} />} {t("enterprise.notes.save")}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
