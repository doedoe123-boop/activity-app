import NextLogo from "./next-logo";
import SupabaseLogo from "./supabase-logo";

export default function Header() {
  return (
    <div className="flex flex-col gap-16 items-center py-16">
  <h1 className="text-4xl lg:text-5xl font-extrabold text-center text-gray-800 dark:text-gray-300">
    Multi-Activity Web App
  </h1>

  <p className="text-xl lg:text-2xl mx-auto max-w-4xl text-center text-gray-700 dark:text-gray-400">
    A versatile app that helps you manage and explore a variety of activities.
    From task lists to food reviews, photo management, Pokémon reviews, and Markdown notes—{" "}
    <span className="font-semibold text-blue-600">you can do it all here!</span>
  </p>

  <div className="mt-10 flex flex-col items-center gap-10">
    <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-400">Activities You Can Try</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-lg text-gray-700 dark:text-gray-400">
      <div className="flex items-center space-x-4">
        <span className="text-blue-600">📝</span>
        <div>
          <h3 className="font-semibold">To-Do List</h3>
          <p>Manage tasks by adding, editing, and deleting your to-dos.</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-blue-600">📸</span>
        <div>
          <h3 className="font-semibold">Google Drive Lite</h3>
          <p>Upload, delete, and organize your photos easily.</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-blue-600">🍽️</span>
        <div>
          <h3 className="font-semibold">Food Review App</h3>
          <p>Upload food photos and share your reviews for others to see.</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-blue-600">🦸</span>
        <div>
          <h3 className="font-semibold">Pokémon Review App</h3>
          <p>Rate and review your favorite Pokémon with the community.</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-blue-600">🗒️</span>
        <div>
          <h3 className="font-semibold">Markdown Notes</h3>
          <p>Write and organize your notes with Markdown support.</p>
        </div>
      </div>
    </div>
  </div>

  <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-blue-300/20 to-transparent my-8" />
</div>
  );
}
