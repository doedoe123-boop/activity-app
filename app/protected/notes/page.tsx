"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";

export default function MarkdownNotesApp() {
  const [note, setNote] = useState<string>("");
  const [notes, setNotes] = useState<{ id: string; content: string }[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);

  const handleSave = () => {
    if (note.trim()) {
      const newNote = { id: Date.now().toString(), content: note };
      setNotes([...notes, newNote]);
      setNote(""); 
    }
  };

  const handleEdit = (id: string, content: string) => {
    setCurrentNoteId(id);
    setNote(content);
    setIsEditing(true);
  };

  const handleUpdate = () => {
    if (currentNoteId) {
      setNotes(notes.map((n) =>
        n.id === currentNoteId ? { ...n, content: note } : n
      ));
      setNote(""); 
      setIsEditing(false);
      setCurrentNoteId(null); 
    }
  };
  

  const handleDelete = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
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
        <Button onClick={isEditing ? handleUpdate : handleSave}>
          {isEditing ? "Update Note" : "Save Note"}
        </Button>
      </div>

      <h2 className="text-xl">Your Notes</h2>
      <ul>
        {notes.map((note) => (
          <li key={note.id} className="mb-4">
            <h3 className="text-lg font-semibold">Note {note.id}</h3>
            <div className="prose max-w-full">
              {/* Render Markdown Preview */}
              <ReactMarkdown>{note.content}</ReactMarkdown>
            </div>

            <div className="mt-2 flex space-x-4">
              <Button onClick={() => handleEdit(note.id, note.content)}>Edit</Button>
              <Button onClick={() => handleDelete(note.id)} variant="destructive">Delete</Button>
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
