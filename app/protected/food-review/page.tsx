"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

const supabase = createClient();

type Food = {
  id: string;
  name: string;
  url: string;
  uploaded_at: string;
  file_path: string;
};

export default function FoodGallery() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchFoods() {
      const { data, error } = await supabase
        .from("food")
        .select("id, food_name, file_path, uploaded_at")
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error("Error fetching food:", error.message);
        return;
      }

      const urls = data.map((food) => {
        const { data: publicUrlData } = supabase.storage.from("photos").getPublicUrl(food.file_path);
        return {
          id: food.id,
          name: food.food_name,
          uploaded_at: format(new Date(food.uploaded_at), "yyyy-MM-dd HH:mm"),
          url: publicUrlData?.publicUrl || "",
          file_path: food.file_path,
        };
      });

      setFoods(urls);
    }

    fetchFoods();
  }, []);

  const uploadFood = async () => {
    if (!file) return;
    setLoadingUpload(true);
    setMessage(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData || !userData.user) {
      setMessage("❌ User not authenticated!");
      setLoadingUpload(false);
      return;
    }

    const userId = userData.user.id;
    const uniqueName = `user-${userId}-${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from("photos").upload(uniqueName, file);
    if (uploadError) {
      setMessage("❌ Upload failed! Try again.");
      setLoadingUpload(false);
      return;
    }

    const { data: insertedData, error: insertError } = await supabase
      .from("food")
      .insert([{ food_name: file.name, file_path: uniqueName, user_id: userId }])
      .select()
      .single();

    if (insertError) {
      setMessage("❌ Failed to save metadata.");
      setLoadingUpload(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("photos").getPublicUrl(insertedData.file_path);

    setFoods((prev) => [
      {
        id: insertedData.id,
        name: insertedData.food_name,
        uploaded_at: format(new Date(insertedData.uploaded_at), "yyyy-MM-dd HH:mm"),
        url: publicUrlData?.publicUrl || "",
        file_path: insertedData.file_path,
      },
      ...prev,
    ]);

    setMessage("✅ Upload successful!");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLoadingUpload(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Food Gallery</h1>
      <input type="file" ref={fileInputRef} onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={uploadFood} disabled={loadingUpload} className="bg-blue-500 text-white px-4 py-2 mt-2">
        {loadingUpload ? "Uploading..." : "Upload Food"}
      </button>
      {message && <p className="mt-2 text-red-500">{message}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {foods.map((food) => (
          <div key={food.id} className="border p-2 rounded">
            <img src={food.url} alt={food.name} className="w-full h-40 object-cover" />
            <p className="font-semibold mt-2">{food.name}</p>
            <p className="text-sm text-gray-500">Uploaded: {food.uploaded_at}</p>
            <button 
              onClick={() => router.push(`/protected/food-review/${food.id}`)}
              className="bg-green-500 text-white px-3 py-1 mt-2 w-full"
            >
              View or Add Review
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
