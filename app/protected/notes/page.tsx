"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export default function MarkdownNotesApp() {
  const [note, setNote] = useState<string>("");
  const [notes, setNotes] = useState<{ id: string; content: string }[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function fetchUser() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user);
    }

    fetchUser();
  }, []);

  useEffect(() => {
    async function fetchNotes() {
      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching notes:", error.message);
        return;
      }

      setNotes(data || []);
    }

    fetchNotes();
  }, [user]);

  const handleSave = async () => {
    if (note.trim() && user) {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("notes")
        .insert([{ content: note, user_id: user.id }])
        .select();

      setIsLoading(false);

      if (error) {
        console.error("Error saving note:", error.message);
        return;
      }

      if (data && data.length > 0) {
        setNotes([...notes, data[0]]);
        setNote("");
      }
    }
  };

  const handleEdit = (id: string, content: string) => {
    setCurrentNoteId(id);
    setNote(content);
    setIsEditing(true);
  };

  const handleUpdate = async () => {
    if (currentNoteId && user) {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("notes")
        .update({ content: note })
        .match({ id: currentNoteId, user_id: user.id })
        .select();

      setIsLoading(false);

      if (error) {
        console.error("Error updating note:", error.message);
        return;
      }

      if (data && data.length > 0) {
        setNotes(notes.map((n) => (n.id === currentNoteId ? { ...n, content: note } : n)));
        setNote("");
        setIsEditing(false);
        setCurrentNoteId(null);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (user && confirm("Are you sure you want to delete this note?")) {
      const { error } = await supabase
        .from("notes")
        .delete()
        .match({ id, user_id: user.id });

      if (error) {
        console.error("Error deleting note:", error.message);
        return;
      }

      setNotes(notes.filter((note) => note.id !== id));
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <h1 className="text-2xl mb-4">Markdown Notes</h1>

      <div className="mb-6">
        <textarea
          className="w-full p-2 border rounded-md"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Type your note in Markdown"
          rows={10}
        />
        <Button onClick={isEditing ? handleUpdate : handleSave} disabled={isLoading}>
          {isEditing ? "Update Note" : isLoading ? "Saving..." : "Save Note"}
        </Button>
      </div>

      <h2 className="text-xl">Your Notes</h2>
      <ul>
        {notes.map((note) => (
          <li key={note.id} className="mb-4">
            <h3 className="text-lg font-semibold">Note {note.id}</h3>
            <div className="prose max-w-full">
              <ReactMarkdown>{note.content}</ReactMarkdown>
            </div>

            <div className="mt-2 flex space-x-4">
              <Button onClick={() => handleEdit(note.id, note.content)}>Edit</Button>
              <Button onClick={() => handleDelete(note.id)} variant="destructive">
                Delete
              </Button>
            </div>

            <div className="mt-6">
              <h2>Raw Markdown Content</h2>
              <pre className="bg-gray-100 dark:bg-gray-600 p-2 rounded">{note.content}</pre>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}