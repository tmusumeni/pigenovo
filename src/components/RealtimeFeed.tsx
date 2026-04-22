import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Activity, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RealtimeEvent {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  timestamp: string;
  data: any;
}

export function RealtimeFeed({ user }: { user: any }) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);

  useEffect(() => {
    // Subscribe to all changes in the 'user_tasks' and 'trades' tables
    const taskChannel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          addEvent(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          addEvent(payload);
        }
      )
      .subscribe();

    const addEvent = (payload: any) => {
      const newEvent: RealtimeEvent = {
        id: Math.random().toString(36).substr(2, 9),
        type: payload.eventType as any,
        table: payload.table,
        timestamp: new Date().toLocaleTimeString(),
        data: payload.new || payload.old,
      };
      setEvents((prev) => [newEvent, ...prev].slice(0, 10));
    };

    return () => {
      supabase.removeChannel(taskChannel);
    };
  }, [user.id]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            Activity Feed
          </CardTitle>
          <CardDescription>
            Live updates from your trades and tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                <Activity className="h-8 w-8 mb-2 animate-pulse" />
                <p>Waiting for database events...</p>
                <p className="text-xs mt-1">Try placing a trade or adding a task.</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {events.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-start gap-4 p-4 bg-muted/30 rounded-xl border"
                  >
                    <div className={`p-2 rounded-lg ${
                      event.type === 'INSERT' ? 'bg-green-500/10 text-green-600' :
                      event.type === 'UPDATE' ? 'bg-blue-500/10 text-blue-600' :
                      'bg-red-500/10 text-red-600'
                    }`}>
                      <Zap className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold uppercase tracking-wider">
                          {event.type} - {event.table}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {event.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {event.table === 'trades' && `Trade ${event.type === 'INSERT' ? 'Executed' : 'Updated'}: ${event.data.type.toUpperCase()} ${event.data.amount} RWF`}
                        {event.table === 'user_tasks' && `Task ${event.type === 'INSERT' ? 'Created' : 'Updated'}: "${event.data.title}"`}
                      </p>
                      <pre className="mt-2 p-2 bg-black/5 rounded text-[10px] font-mono overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">Real-time Setup Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            To enable real-time for these tables, run this SQL:
          </p>
          <pre className="bg-black text-white p-4 rounded-lg text-xs overflow-x-auto">
{`-- Enable Realtime for tables
alter publication supabase_realtime add table user_tasks;
alter publication supabase_realtime add table trades;
alter publication supabase_realtime add table news_assets;`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
