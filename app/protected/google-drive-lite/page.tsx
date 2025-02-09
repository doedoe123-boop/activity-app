"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";

const supabase = createClient();

type Photo = {
  id: string;
  user_id: string;
  name: string;
  url: string;
  uploaded_at: string;
  file_path: string;
};

export default function PhotoGallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("uploaded_at");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [newPhotoName, setNewPhotoName] = useState("");

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }

    fetchUser();
  }, []);

  // Fetch photos
  useEffect(() => {
    async function fetchPhotos() {
      const { data, error } = await supabase
        .from("photos")
        .select("id, photo_name, file_path, uploaded_at, user_id")
        .order(sortBy, { ascending: sortBy === "photo_name" });

      if (error) {
        console.error("Error fetching photos:", error.message);
        return;
      }

      const urls = data.map((photo) => {
        const { data: publicUrlData } = supabase.storage.from("photos").getPublicUrl(photo.file_path);
        return {
          id: photo.id,
          name: photo.photo_name,
          uploaded_at: format(new Date(photo.uploaded_at), "yyyy-MM-dd HH:mm"),
          url: publicUrlData?.publicUrl || "",
          file_path: photo.file_path,
          user_id: photo.user_id,
        };
      });

      setPhotos(urls);
    }

    fetchPhotos();
  }, [sortBy]);

  // Upload photo
  const uploadPhoto = async () => {
    if (!file) return;
    setLoading(true);
    setMessage(null);

    const uniqueName = `user-${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage.from("photos").upload(uniqueName, file);
    if (error) {
      setMessage("❌ Upload failed! Try again.");
      setLoading(false);
      return;
    }

    const { data: insertedData, error: insertError } = await supabase
      .from("photos")
      .insert([{ photo_name: file.name, file_path: uniqueName, user_id: userId }])
      .select()
      .single();

    if (insertError) {
      setMessage("❌ Failed to save metadata.");
      setLoading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("photos").getPublicUrl(insertedData.file_path);

    setPhotos((prev) => [
      {
        id: insertedData.id,
        name: insertedData.photo_name,
        uploaded_at: format(new Date(insertedData.uploaded_at), "yyyy-MM-dd HH:mm"),
        url: publicUrlData?.publicUrl || "",
        file_path: insertedData.file_path,
        user_id: insertedData.user_id,
      },
      ...prev,
    ]);

    setMessage("✅ Upload successful!");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLoading(false);
  };

   // Update photo name
   const updatePhotoName = async (photoId: string) => {
    if (!newPhotoName) return;
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("photos")
      .update({ photo_name: newPhotoName })
      .eq("id", photoId)
      .select()
      .single();

    if (error) {
      setMessage("❌ Failed to update photo name.");
      setLoading(false);
      return;
    }

    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === photoId ? { ...photo, name: newPhotoName } : photo
      )
    );

    setMessage("✅ Photo name updated successfully!");
    setEditingPhotoId(null);
    setNewPhotoName("");
    setLoading(false);
  };

  // Delete photo
  const deletePhoto = async (photoId: string, filePath: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this photo?");
    if (!confirmDelete) return;
    setLoading(true);
    setMessage(null);

    // Delete from storage
    const { error: storageError } = await supabase.storage.from("photos").remove([filePath]);
    if (storageError) {
      setMessage("❌ Failed to delete from storage.");
      setLoading(false);
      return;
    }

    // Delete from database
    const { error: dbError } = await supabase.from("photos").delete().eq("id", photoId);
    if (dbError) {
      setMessage("❌ Failed to delete from database.");
      setLoading(false);
      return;
    }

    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
    setMessage("✅ Photo deleted successfully!");
    setLoading(false);
  };

  // Filter photos based on search query
  const filteredPhotos = photos.filter((photo) =>
    photo.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Photo Gallery</h2>

      {/* File Upload */}
      {message && <div className="mb-2 p-2 text-white bg-green-500 rounded">{message}</div>}
      <input
        ref={fileInputRef}
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="border p-2 w-full mb-2"
      />
      <button
        onClick={uploadPhoto}
        disabled={loading || !file}
        className={`p-2 w-full text-white ${loading ? "bg-gray-500" : "bg-blue-500"} rounded`}
      >
        {loading ? "Uploading..." : "Upload Photo"}
      </button>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search photos..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border p-2 w-full mt-4 mb-4"
      />

      {/* Sorting Options */}
      <select
        className="border p-2 w-full mb-4"
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
      >
        <option value="uploaded_at">Sort by Upload Date</option>
        <option value="photo_name">Sort by Name</option>
      </select>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPhotos.map((photo) => (
          <div key={photo.id} className="border rounded-lg overflow-hidden relative">
            <img src={photo.url} alt={photo.name} className="w-full h-20 object-cover" />
            {editingPhotoId === photo.id ? (
              <div className="p-2">
                <input
                  type="text"
                  value={newPhotoName}
                  onChange={(e) => setNewPhotoName(e.target.value)}
                  className="border p-1 w-full mb-2"
                />
                <button
                  onClick={() => updatePhotoName(photo.id)}
                  className="bg-blue-500 text-white p-1 text-xs rounded w-full"
                >
                  Save
                </button>
              </div>
            ) : (
              <>
                <p className="p-2 text-center text-sm font-semibold">{photo.name}</p>
                <p className="text-xs text-gray-500 text-center">{photo.uploaded_at}</p>
                {photo.user_id === userId && (
                  <div className="absolute top-2 right-2 flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingPhotoId(photo.id);
                        setNewPhotoName(photo.name);
                      }}
                      className="bg-yellow-500 text-white p-1 text-xs rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deletePhoto(photo.id, photo.file_path)}
                      className="bg-red-500 text-white p-1 text-xs rounded"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
