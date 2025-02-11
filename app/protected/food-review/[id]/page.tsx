"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  const params = useParams(); 
  const id = params?.id as string;
  const router = useRouter();
  const [food, setFood] = useState<Food | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editReviewText, setEditReviewText] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function fetchUser() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) setUser(userData.user);
    }
    fetchUser();
  }, []);

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
  
    // Fetch the updated reviews to ensure consistency
    const { data: reviewsData, error: fetchError } = await supabase
      .from("reviews")
      .select("id, user_id, food_id, review_text, created_at")
      .eq("food_id", id)
      .order("created_at", { ascending: false });
  
    if (fetchError) {
      console.error("Error fetching reviews:", fetchError.message);
      return;
    }
  
    setReviews(reviewsData);
  
    setReviewText("");
  };
  

  const startEditing = (id: string, text: string) => {
    setEditingReviewId(id);
    setEditReviewText(text);
  };

  const updateReview = async (reviewId: string) => {
    if (!editReviewText.trim()) return;
  
    const { error } = await supabase
      .from("reviews")
      .update({ review_text: editReviewText })
      .eq("id", reviewId);
  
    if (error) {
      console.error("Error updating review:", error.message);
      return;
    }
  
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, review_text: editReviewText } : r))
    );
    setEditingReviewId(null);
  };

  const deleteReview = async (reviewId: string) => {
    const isConfirmed = window.confirm("Are you sure you want to delete this review?");
    
    if (!isConfirmed) {
      return; 
    }
  
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  
    if (error) {
      console.error("Error deleting review:", error.message);
      return;
    }
  
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };

  if (!food) return <p>Loading food details...</p>;

  return (
    <div className="p-4">
      <button onClick={() => router.back()} className="bg-gray-300 dark:bg-gray-500 px-3 py-1 mb-4">Go Back</button>
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
              {editingReviewId === review.id ? (
                <input
                  type="text"
                  value={editReviewText}
                  onChange={(e) => setEditReviewText(e.target.value)}
                  className="border p-1 w-full"
                />
              ) : (
                <p>{review.review_text}</p>
              )}
              <p className="text-sm text-gray-500">
                {format(new Date(review.created_at), "yyyy-MM-dd HH:mm")}
              </p>

              {review.user_id === user?.id && ( 
                <div className="flex gap-2 mt-2">
                  {editingReviewId === review.id ? (
                    <button
                      onClick={() => updateReview(review.id)}
                      className="bg-blue-500 text-white px-2 py-1"
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => startEditing(review.id, review.review_text)}
                      className="bg-yellow-500 text-white px-2 py-1"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => deleteReview(review.id)}
                    className="bg-red-500 text-white px-2 py-1"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500">No reviews yet.</p>
        )}
      </div>
    </div>
  );
}