import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Task {
  id: string;
  title: string;
  is_completed: boolean;
  user_id: string;
}

export function DatabaseDemo({ user }: { user: any }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('user_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      // We don't toast here to avoid spamming if table doesn't exist yet
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      const { data, error } = await supabase
        .from('user_tasks')
        .insert([{ title: newTask, user_id: user.id }])
        .select();

      if (error) throw error;
      setTasks([data[0], ...tasks]);
      setNewTask('');
      toast.success('Task added!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add task. Make sure the "user_tasks" table exists.');
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const { error } = await supabase
        .from('user_tasks')
        .update({ is_completed: !task.is_completed })
        .eq('id', task.id);

      if (error) throw error;
      setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== id));
      toast.success('Task deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Postgres Database (RLS)</CardTitle>
          <CardDescription>
            This demo uses a "tasks" table with Row Level Security. Users can only see and edit their own tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addTask} className="flex gap-2 mb-6">
            <Input
              placeholder="Add a new task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </form>

          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
                <p>No tasks found.</p>
                <p className="text-xs mt-2">Make sure to run the SQL setup in your Supabase dashboard.</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group"
                  >
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleTask(task)} className="text-primary">
                        {task.is_completed ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>
                      <span className={task.is_completed ? 'line-through text-muted-foreground' : ''}>
                        {task.title}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">SQL Setup Required</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-black text-white p-4 rounded-lg text-xs overflow-x-auto">
{`-- Create user_tasks table
create table user_tasks (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  is_completed boolean default false,
  user_id uuid references auth.users not null
);

-- Enable RLS
alter table user_tasks enable row level security;

-- Create policies
create policy "Users can view their own tasks"
  on user_tasks for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own tasks"
  on user_tasks for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own tasks"
  on user_tasks for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own tasks"
  on user_tasks for delete
  using ( auth.uid() = user_id );`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
