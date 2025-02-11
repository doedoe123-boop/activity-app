import FetchDataSteps from "@/components/tutorial/fetch-data-steps";
import { createClient } from "@/utils/supabase/server";
import { InfoIcon, List, Image, Utensils, Star, FileText } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const activities = [
    {
      title: "Activity 1: To-Do List App",
      description: "A simple to-do list application where users can manage their tasks. Supports CRUD operations and maintains state on browser restart.",
      icon: <List className="w-6 h-6" />,
      link: "/protected/todo",
      gradient: "from-green-400 to-blue-500 dark:from-green-600 dark:to-blue-700"
    },
    {
      title: "Activity 2: Google Drive 'Lite'",
      description: "An application that allows users to manage photos. Users can perform CRUD operations, search, and sort photos.",
      icon: <Image className="w-6 h-6" />,
      link: "/protected/google-drive-lite",
      gradient: "from-purple-400 to-pink-500 dark:from-purple-600 dark:to-pink-700"
    },
    {
      title: "Activity 3: Food Review App",
      description: "An app where users can add food photos and reviews. Supports CRUD operations on photos and reviews, with sorting options.",
      icon: <Utensils className="w-6 h-6" />,
      link: "/protected/food-review",
      gradient: "from-red-400 to-yellow-500 dark:from-red-600 dark:to-yellow-700"
    },
    {
      title: "Activity 4: Pokemon Review App",
      description: "An app for searching Pokemon and adding reviews. Users can perform CRUD operations on reviews and sort them.",
      icon: <Star className="w-6 h-6" />,
      link: "/protected/pokemon",
      gradient: "from-yellow-400 to-orange-500 dark:from-yellow-600 dark:to-orange-700"
    },
    {
      title: "Activity 5: Markdown Notes App",
      description: "A notes application that supports Markdown. Users can create, read, update, and delete notes, with raw and preview views.",
      icon: <FileText className="w-6 h-6" />,
      link: "/protected/notes",
      gradient: "from-blue-400 to-indigo-500 dark:from-blue-600 dark:to-indigo-700"
    }
  ];

  return (
    <div className="flex-1 w-full flex flex-col gap-12 p-6">
      <div className="flex flex-col gap-4 items-start">
        <h1 className="text-2xl font-bold">Welcome to the Protected Page</h1>
        <p className="text-lg">This application demonstrates various functionalities using Supabase:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity, index) => (
            <a href={activity.link} key={index} className={`p-4 border rounded-lg shadow-md bg-gradient-to-r ${activity.gradient} text-white`}>
              <div className="flex items-center gap-2 mb-2">
                {activity.icon}
                <h2 className="text-xl font-semibold">{activity.title}</h2>
              </div>
              <p>{activity.description}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}