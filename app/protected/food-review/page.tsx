"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

const supabase = createClient();

type Food = {
  id: string;
  user_id: string;
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
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [foodName, setFoodName] = useState<string>(""); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sortCriteria, setSortCriteria] = useState<"name" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    async function fetchUser() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) setUser(userData.user);
    }
    fetchUser();
  }, []);

  useEffect(() => {
    async function fetchFoods() {
      const { data, error } = await supabase
        .from("food")
        .select("id, food_name, file_path, uploaded_at, user_id")
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
          user_id: food.user_id,
        };
      });

      setFoods(urls);
    }

    fetchFoods();
  }, []);

  const sortFoods = (criteria: "name" | "date", order: "asc" | "desc") => {
    const sortedFoods = [...foods].sort((a, b) => {
      if (criteria === "name") {
        return order === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      } else {
        return order === "asc" ? new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime() : new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
      }
    });
    setFoods(sortedFoods);
  };

  useEffect(() => {
    sortFoods(sortCriteria, sortOrder);
  }, [sortCriteria, sortOrder]);

  const handleSortCriteriaChange = (criteria: "name" | "date") => {
    setSortCriteria(criteria);
  };

  const handleSortOrderChange = (order: "asc" | "desc") => {
    setSortOrder(order);
  };

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
        user_id: insertedData.user_id,
      },
      ...prev,
    ]);

    setMessage("✅ Upload successful!");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLoadingUpload(false);
  };

  const startEditing = (food: Food) => {
    setEditingFood(food);
    setFoodName(food.name);
  };

  const updateFood = async () => {
    if (!editingFood) return;
    setLoadingUpload(true);
    setMessage(null);

    const updatedData: any = { food_name: foodName };

    if (file) {
      const uniqueName = `user-${editingFood.id}-${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage.from("photos").upload(uniqueName, file);
      if (uploadError) {
        setMessage("❌ Upload failed! Try again.");
        setLoadingUpload(false);
        return;
      }

      updatedData.file_path = uniqueName;
    }

    const { error } = await supabase
      .from("food")
      .update(updatedData)
      .eq("id", editingFood.id);

    if (error) {
      setMessage("❌ Update failed! Try again.");
      setLoadingUpload(false);
      return;
    }

    // Fetch updated data
    const { data: publicUrlData } = supabase.storage.from("photos").getPublicUrl(updatedData.file_path || editingFood.file_path);

    setFoods((prev) =>
      prev.map((food) =>
        food.id === editingFood.id
          ? {
              ...food,
              name: foodName,
              url: publicUrlData?.publicUrl || food.url,
              file_path: updatedData.file_path || food.file_path,
            }
          : food
      )
    );

    setEditingFood(null);
    setFoodName("");
    setFile(null);
    setMessage("✅ Update successful!");
    setLoadingUpload(false);
  };

  const deleteFood = async (foodId: string) => {
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("id")
      .eq("food_id", foodId);
  
    if (reviewsError) {
      setMessage("❌ Failed to check reviews.");
      return;
    }
  
    if (reviews && reviews.length > 0) {
      setMessage("❌ This food item has reviews and cannot be deleted.");
      return;
    }
  
    const isConfirmed = window.confirm("Are you sure you want to delete this food item?");
  
    if (!isConfirmed) {
      return;
    }
  
    const { error } = await supabase.from("food").delete().eq("id", foodId);
  
    if (error) {
      setMessage("❌ Deletion failed! Try again.");
      return;
    }
  
    setFoods((prev) => prev.filter((food) => food.id !== foodId));
    setMessage("✅ Deletion successful!");
  };
  

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Food Gallery</h1>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button
        onClick={uploadFood}
        disabled={loadingUpload}
        className="bg-blue-500 text-white px-4 py-2 mt-2"
      >
        {loadingUpload ? "Uploading..." : "Upload Food"}
      </button>
      {message && <p className="mt-2 text-red-500">{message}</p>}

      <div className="mt-4">
        <label>Sort by: </label>
        <select
          value={sortCriteria}
          onChange={(e) => handleSortCriteriaChange(e.target.value as "name" | "date")}
          className="border p-2"
        >
          <option value="name">Name</option>
          <option value="date">Date</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => handleSortOrderChange(e.target.value as "asc" | "desc")}
          className="border p-2 ml-2"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

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

            {/* Edit and Delete buttons */}
            {food.user_id === user?.id && (  
            <div className="mt-2">
              <button
                onClick={() => startEditing(food)}
                className="bg-yellow-500 text-white px-3 py-1"
              >
                Edit
              </button>
              <button
                onClick={() => deleteFood(food.id)}
                className="bg-red-500 text-white px-3 py-1 ml-2"
              >
                Delete
              </button>
            </div>
            )}
          </div>
        ))}
      </div>

      {editingFood && (
        <div className="mt-4">
          <h2>Edit Food</h2>
          <input
            type="text"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            className="border p-2 w-full mt-2"
          />
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="border p-2 mt-2"
          />
          <button
            onClick={updateFood}
            className="bg-blue-500 text-white px-4 py-2 mt-2 w-full"
          >
            Update Food
          </button>
        </div>
      )}
    </div>
  );
}