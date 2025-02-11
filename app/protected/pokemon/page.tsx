"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

const supabase = createClient();

type Pokemon = {
  id: string;
  user_id: string;
  name: string;
  url: string;
  uploaded_at: string;
  file_path: string;
};

export default function PokemonGallery() {
  const [pokemons, setPokemon] = useState<Pokemon[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editingPokemon, setEditingPokemon] = useState<Pokemon | null>(null);
  const [pokemonName, setPokemonName] = useState<string>(""); 
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
    async function fetchPokemons() {
      const { data, error } = await supabase
        .from("pokemon_photos")
        .select("id, photo_name, file_path, uploaded_at, user_id")
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error("Error fetching pokemon:", error.message);
        return;
      }

      const urls = data.map((pokemon) => {
        const { data: publicUrlData } = supabase.storage.from("photos").getPublicUrl(pokemon.file_path);
        return {
          id: pokemon.id,
          name: pokemon.photo_name,
          uploaded_at: format(new Date(pokemon.uploaded_at), "yyyy-MM-dd HH:mm"),
          url: publicUrlData?.publicUrl || "",
          file_path: pokemon.file_path,
          user_id: pokemon.user_id,
        };
      });

      setPokemon(urls);
    }

    fetchPokemons();
  }, []);

  const sortPokemons = (criteria: "name" | "date", order: "asc" | "desc") => {
    const sortedPokemons = [...pokemons].sort((a, b) => {
      if (criteria === "name") {
        return order === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      } else {
        return order === "asc" ? new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime() : new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
      }
    });
    setPokemon(sortedPokemons);
  };

  useEffect(() => {
    sortPokemons(sortCriteria, sortOrder);
  }, [sortCriteria, sortOrder]);

  const handleSortCriteriaChange = (criteria: "name" | "date") => {
    setSortCriteria(criteria);
  };

  const handleSortOrderChange = (order: "asc" | "desc") => {
    setSortOrder(order);
  };

  const uploadPokemon = async () => {
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
      .from("pokemon_photos")
      .insert([{ photo_name: file.name, file_path: uniqueName, user_id: userId }])
      .select()
      .single();

    if (insertError) {
      setMessage("❌ Failed to save metadata.");
      setLoadingUpload(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("photos").getPublicUrl(insertedData.file_path);

    setPokemon((prev) => [
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
    setLoadingUpload(false);
  };

  const startEditing = (pokemon: Pokemon) => {
    setEditingPokemon(pokemon);
    setPokemonName(pokemon.name);
  };

  const updatePokemon = async () => {
    if (!editingPokemon) return;
    setLoadingUpload(true);
    setMessage(null);

    const updatedData: any = { photo_name: pokemonName };

    if (file) {
      const uniqueName = `user-${editingPokemon.id}-${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage.from("photos").upload(uniqueName, file);
      if (uploadError) {
        setMessage("❌ Upload failed! Try again.");
        setLoadingUpload(false);
        return;
      }

      updatedData.file_path = uniqueName;
    }

    const { error } = await supabase
      .from("pokemon_photos")
      .update(updatedData)
      .eq("id", editingPokemon.id);

    if (error) {
      setMessage("❌ Update failed! Try again.");
      setLoadingUpload(false);
      return;
    }

    // Fetch updated data
    const { data: publicUrlData } = supabase.storage.from("photos").getPublicUrl(updatedData.file_path || editingPokemon.file_path);

    setPokemon((prev) =>
      prev.map((pokemon) =>
        pokemon.id === editingPokemon.id
          ? {
              ...pokemon,
              name: pokemonName,
              url: publicUrlData?.publicUrl || pokemon.url,
              file_path: updatedData.file_path || pokemon.file_path,
            }
          : pokemon
      )
    );

    setEditingPokemon(null);
    setPokemonName("");
    setFile(null);
    setMessage("✅ Update successful!");
    setLoadingUpload(false);
  };

  const deletePokemon = async (pokemonId: string) => {
    const { data: reviews, error: reviewsError } = await supabase
      .from("pokemon_reviews")
      .select("id")
      .eq("pokemon_id", pokemonId);
  
    if (reviewsError) {
      setMessage("❌ Failed to check reviews.");
      return;
    }
  
    if (reviews && reviews.length > 0) {
      setMessage("❌ This pokemon item has reviews and cannot be deleted.");
      return;
    }
  
    const isConfirmed = window.confirm("Are you sure you want to delete this pokemon item?");
  
    if (!isConfirmed) {
      return;
    }
  
    const { error } = await supabase.from("pokemon_photos").delete().eq("id", pokemonId);
  
    if (error) {
      setMessage("❌ Deletion failed! Try again.");
      return;
    }
  
    setPokemon((prev) => prev.filter((pokemon) => pokemon.id !== pokemonId));
    setMessage("✅ Deletion successful!");
  };
  

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Pokemon Gallery</h1>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button
        onClick={uploadPokemon}
        disabled={loadingUpload}
        className="bg-blue-500 text-white px-4 py-2 mt-2"
      >
        {loadingUpload ? "Uploading..." : "Upload Pokemon"}
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
        {pokemons.map((pokemon) => (
          <div key={pokemon.id} className="border p-2 rounded">
            <img src={pokemon.url} alt={pokemon.name} className="w-full h-40 object-cover" />
            <p className="font-semibold mt-2">{pokemon.name}</p>
            <p className="text-sm text-gray-500">Uploaded: {pokemon.uploaded_at}</p>
            <button
              onClick={() => router.push(`/protected/pokemon/${pokemon.id}`)}
              className="bg-green-500 text-white px-3 py-1 mt-2 w-full"
            >
              View or Add Review
            </button>

            {/* Edit and Delete buttons */}
            {pokemon.user_id === user?.id && (  
            <div className="mt-2">
              <button
                onClick={() => startEditing(pokemon)}
                className="bg-yellow-500 text-white px-3 py-1"
              >
                Edit
              </button>
              <button
                onClick={() => deletePokemon(pokemon.id)}
                className="bg-red-500 text-white px-3 py-1 ml-2"
              >
                Delete
              </button>
            </div>
            )}
          </div>
        ))}
      </div>

      {editingPokemon && (
        <div className="mt-4">
          <h2>Edit Pokemon</h2>
          <input
            type="text"
            value={pokemonName}
            onChange={(e) => setPokemonName(e.target.value)}
            className="border p-2 w-full mt-2"
          />
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="border p-2 mt-2"
          />
          <button
            onClick={updatePokemon}
            className="bg-blue-500 text-white px-4 py-2 mt-2 w-full"
          >
            Update Pokemon
          </button>
        </div>
      )}
    </div>
  );
}