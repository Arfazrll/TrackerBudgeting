import { NotesManager } from "@/components/notes-manager";
import { db } from "@/lib/db";
import { requirePageFeature } from "@/lib/features";

export const metadata = { title: "Financial Notes" };

export default async function NotesPage() {
  const user = await requirePageFeature("NOTES");
  const notes = await db.note.findMany({
    where: { userId: user.id },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
  });
  return (
    <NotesManager
      initialNotes={notes.map((note) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        color: note.color,
        isPinned: note.isPinned,
      }))}
    />
  );
}
