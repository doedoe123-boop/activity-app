"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";

const supabase = createClient();

type Review = {
  id: string;
  user_id: string;
  food_id: string;
  review_text: string;
  created_at: string;
};

type Food = {
  id: string;
  name: string;
  url: string;
  uploaded_at: string;
};

export default function FoodReviewPage() {
  const router = useRouter();
  const { id } = router.query;
  const [food, setFood] = useState<Food | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewText, setReviewText] = useState("");

  useEffect(() => {
    if (!id) return;

    async function fetchFood() {
      const { data, error } = await supabase
        .from("food")
        .select("id, food_name, file_path, uploaded_at")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching food details:", error.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("photos").getPublicUrl(data.file_path);

      setFood({
        id: data.id,
        name: data.food_name,
        uploaded_at: format(new Date(data.uploaded_at), "yyyy-MM-dd HH:mm"),
        url: publicUrlData?.publicUrl || "",
      });
    }

    async function fetchReviews() {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, user_id, food_id, review_text, created_at")
        .eq("food_id", id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching reviews:", error.message);
        return;
      }

      setReviews(data);
    }

    fetchFood();
    fetchReviews();
  }, [id]);

  const submitReview = async () => {
    if (!reviewText.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData || !userData.user) {
      alert("You need to be logged in to submit a review.");
      return;
    }

    const { error } = await supabase.from("reviews").insert([
      { user_id: userData.user.id, food_id: id, review_text: reviewText },
    ]);

    if (error) {
      console.error("Error submitting review:", error.message);
      return;
    }

    setReviews((prev) => [
      { id: Math.random().toString(), user_id: userData.user.id, food_id: id as string, review_text: reviewText, created_at: new Date().toISOString() },
      ...prev,
    ]);

    setReviewText("");
  };

  if (!food) return <p>Loading food details...</p>;

  return (
    <div className="p-4">
      <button onClick={() => router.back()} className="bg-gray-300 px-3 py-1 mb-4">Go Back</button>
      <h1 className="text-2xl font-bold">{food.name}</h1>
      <img src={food.url} alt={food.name} className="w-full h-60 object-cover mt-2" />
      <p className="text-sm text-gray-500">Uploaded: {food.uploaded_at}</p>
      
      <h2 className="text-xl font-semibold mt-4">Reviews</h2>
      <input
        type="text"
        placeholder="Write a review..."
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        className="border p-2 w-full mt-2"
      />
      <button onClick={submitReview} className="bg-green-500 text-white px-3 py-1 mt-2 w-full">Submit Review</button>
      
      <div className="mt-4">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="border p-2 mt-2 rounded">
              <p>{review.review_text}</p>
              <p className="text-sm text-gray-500">{format(new Date(review.created_at), "yyyy-MM-dd HH:mm")}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No reviews yet.</p>
        )}
      </div>
    </div>
  );
}
