"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

type Todo = {
  id: string;
  task: string;
  completed: boolean;
};

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [editedTask, setEditedTask] = useState("");

  // 🔹 Fetch logged-in user
  useEffect(() => {
    async function fetchUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("Error fetching user:", error);
      else setUser(data?.user);
    }
    fetchUser();
  }, []);

  // 🔹 Fetch todos when user is available
  useEffect(() => {
    if (!user) return;

    async function fetchTodos() {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) console.error("Error fetching todos:", error);
      else setTodos(data);
    }

    fetchTodos();
  }, [user]);

  // 🔹 Add a new todo
  const addTodo = async () => {
    if (!task.trim() || !user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("todos")
      .insert([{ task, completed: false, user_id: user.id }])
      .select("*"); // Ensures the new task is returned

    if (error) console.error("Error adding task:", error);
    else if (data) setTodos((prev) => [data[0], ...prev]);

    setTask("");
    setLoading(false);
  };

  // 🔹 Toggle completion status
  const toggleComplete = async (id: string, completed: boolean) => {
    const { error } = await supabase
      .from("todos")
      .update({ completed: !completed })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) console.error("Error updating todo:", error);
    else {
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, completed: !completed } : todo
        )
      );
    }
  };

  // 🔹 Delete a todo
  const deleteTodo = async (id: string) => {
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) console.error("Error deleting todo:", error);
    else setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  // 🔹 Start editing a task
  const startEditing = (todo: Todo) => {
    setEditingTodo(todo.id);
    setEditedTask(todo.task);
  };

  // 🔹 Save updated task
  const saveEdit = async (id: string) => {
    if (!editedTask.trim()) return;

    const { error } = await supabase
      .from("todos")
      .update({ task: editedTask })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) console.error("Error updating task:", error);
    else {
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, task: editedTask } : todo
        )
      );
    }

    setEditingTodo(null);
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">To-Do List</h2>
      <input
        type="text"
        className="border p-2 w-full"
        placeholder="Add a task..."
        value={task}
        onChange={(e) => setTask(e.target.value)}
      />
      <button
        onClick={addTodo}
        disabled={loading}
        className="bg-blue-500 text-white p-2 w-full mt-2"
      >
        {loading ? "Adding..." : "Add Task"}
      </button>

      <ul className="mt-4">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="p-2 border-b flex justify-between items-center"
          >
            {editingTodo === todo.id ? (
              <input
                type="text"
                className="border p-1 flex-grow mr-2"
                value={editedTask}
                onChange={(e) => setEditedTask(e.target.value)}
              />
            ) : (
              <span
                className={`cursor-pointer flex-grow ${
                  todo.completed ? "line-through text-gray-500" : ""
                }`}
                onClick={() => toggleComplete(todo.id, todo.completed)}
              >
                {todo.task}
              </span>
            )}

            <div className="flex gap-2">
              {editingTodo === todo.id ? (
                <button
                  onClick={() => saveEdit(todo.id)}
                  className="text-green-500"
                >
                  ✅
                </button>
              ) : (
                <button
                  onClick={() => startEditing(todo)}
                  className="text-yellow-500"
                >
                  📝
                </button>
              )}
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-red-500"
              >
                ❌
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
