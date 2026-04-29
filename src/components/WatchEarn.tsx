import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Youtube, MessageCircle, Twitter, Video, Play, Upload, CheckCircle, Clock, XCircle, ExternalLink, Coins, Link as LinkIcon, ChevronLeft, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Task {
  id: string;
  title: string;
  task_url: string;
  reward_amount: number;
  platform: 'whatsapp' | 'x' | 'tiktok' | 'youtube';
  requirements: string;
}

interface Proof {
  id: string;
  task_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export function WatchEarn({ user }: { user: any }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myProofs, setMyProofs] = useState<Record<string, Proof>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [proofLink, setProofLink] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
    
    // Timer interval
    const interval = setInterval(() => {
      // Only count down if the document is visible to ensure actual watching
      if (document.hidden) return;

      setActiveTimers(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (next[id] > 0) {
            next[id] -= 1;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: tasksData, error: taskError } = await supabase.from('earn_tasks').select('*').eq('is_active', true);
      const { data: proofsData, error: proofError } = await supabase.from('proofs').select('*').eq('user_id', user.id);
      
      if (taskError) throw taskError;
      if (proofError) throw proofError;

      const tasksWithUrl = (tasksData || []).map(t => ({
        ...t,
        task_url: t.task_url || t.video_url || '', // fallback to video_url if task_url is missing
        platform: t.platform || 'youtube' // fallback to youtube if platform is missing
      }));
      
      setTasks(tasksWithUrl);
      
      const proofsMap: Record<string, Proof> = {};
      proofsData?.forEach(p => {
        proofsMap[p.task_id] = p;
      });
      setMyProofs(proofsMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = (task: Task) => {
    if (task.platform === 'youtube') {
      setActiveVideo(task.id);
      // 3 minutes = 180 seconds
      setActiveTimers(prev => ({ ...prev, [task.id]: 180 }));
    } else {
      window.open(task.task_url, '_blank');
    }
  };

  const extractYouTubeID = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmitLink = async (taskId: string) => {
    try {
      const link = proofLink[taskId];
      if (!link || !link.trim()) {
        toast.error('Please enter a valid link');
        return;
      }

      setUploading(taskId);

      const { data: proofData, error: dbError } = await supabase.from('proofs').insert({
        task_id: taskId,
        user_id: user.id,
        image_url: link, // We store the link in the same field
        status: 'pending'
      }).select().single();

      if (dbError) throw dbError;

      setMyProofs(prev => ({ ...prev, [taskId]: proofData }));
      toast.success('Link submitted! Waiting for admin approval.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(null);
    }
  };

  const handleUploadProof = async (taskId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      
      setUploading(taskId);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${taskId}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Create Proof Record
      const { data: proofData, error: dbError } = await supabase.from('proofs').insert({
        task_id: taskId,
        user_id: user.id,
        image_url: filePath,
        status: 'pending'
      }).select().single();

      if (dbError) throw dbError;

      setMyProofs(prev => ({ ...prev, [taskId]: proofData }));
      toast.success('Proof uploaded! Waiting for admin approval.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Watch & Earn</h2>
          <p className="text-muted-foreground">Complete video tasks to earn RWF rewards.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl flex items-center gap-2">
          <Coins className="h-5 w-5" />
          <span className="font-bold">100 RWF / Task</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-t-xl" />
              <CardHeader><div className="h-6 bg-muted rounded w-3/4" /></CardHeader>
            </Card>
          ))
        ) : tasks.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl">
            <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground">No active tasks at the moment.</p>
          </div>
        ) : (
          tasks.map((task) => {
            const proof = myProofs[task.id];
            const timeLeft = activeTimers[task.id] || 0;
            const isYouTube = task.platform === 'youtube';
            const isWhatsApp = task.platform === 'whatsapp';
            const isActive = activeVideo === task.id;

            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(isActive ? "col-span-full" : "")}
              >
                <Card className={cn(
                  "overflow-hidden border-2 transition-all duration-500",
                  isActive ? "border-primary shadow-2xl shadow-primary/10" : "hover:border-primary/50 group"
                )}>
                  <div className={cn(
                    "relative flex flex-col items-center justify-center text-center transition-all duration-500",
                    isActive ? "aspect-[21/9] bg-black" : "aspect-video",
                    task.platform === 'youtube' ? "bg-red-600/10" :
                    task.platform === 'tiktok' ? "bg-black/10" :
                    task.platform === 'x' ? "bg-slate-900/10" :
                    "bg-green-600/10"
                  )}>
                    {isActive && isYouTube ? (
                      <div className="absolute inset-0 z-10">
                        <iframe 
                          className="w-full h-full"
                          src={`https://www.youtube.com/embed/${extractYouTubeID(task.task_url)}?autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0`}
                          title="YouTube video player" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                          allowFullScreen={false}
                        ></iframe>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="absolute top-4 left-4 z-20"
                          onClick={() => setActiveVideo(null)}
                        >
                          <ChevronLeft className="h-4 w-4 mr-2" />
                          Back to List
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className={cn(
                          "p-3 rounded-full mb-2",
                          task.platform === 'youtube' ? "bg-red-600 text-white" :
                          task.platform === 'tiktok' ? "bg-black text-white" :
                          task.platform === 'x' ? "bg-slate-900 text-white" :
                          "bg-green-600 text-white"
                        )}>
                          {task.platform === 'youtube' && <Youtube className="h-6 w-6" />}
                          {task.platform === 'tiktok' && <Video className="h-6 w-6" />}
                          {task.platform === 'x' && <Twitter className="h-6 w-6" />}
                          {task.platform === 'whatsapp' && <MessageCircle className="h-6 w-6" />}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest opacity-50">
                          {task.platform} Task
                        </span>
                        <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-bold">
                          {task.reward_amount} RWF
                        </div>
                      </>
                    )}
                  </div>
                  
                  <CardHeader className={isActive ? "bg-muted/30" : ""}>
                    <div className="flex items-center justify-between">
                      <CardTitle className={isActive ? "text-2xl" : "text-lg"}>{task.title}</CardTitle>
                      {isActive && isYouTube && (
                        <div className="flex items-center gap-2 bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold">
                          <Clock className="h-4 w-4 animate-pulse" />
                          Watch: {formatTime(timeLeft)}
                        </div>
                      )}
                    </div>
                    <CardDescription className="text-xs">
                      {task.requirements || 'Complete the task and upload a screenshot as proof.'}
                    </CardDescription>
                    
                    {isWhatsApp && (task.proof_image_url || task.proof_link) && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
                        <p className="text-[10px] font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wider">Proof Example</p>
                        {task.proof_image_url && (
                          <div className="w-full rounded-md overflow-hidden border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900">
                            <img src={task.proof_image_url} alt="Proof Example" className="w-full h-auto max-h-40 object-cover" />
                          </div>
                        )}
                        {task.proof_link && (
                          <div className="text-[10px] text-blue-800 dark:text-blue-200 p-2 bg-blue-100 dark:bg-blue-900 rounded border border-blue-300 dark:border-blue-700">
                            <p className="font-semibold mb-1">Instructions:</p>
                            <p className="break-words">{task.proof_link}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {isActive && isYouTube && (
                      <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[10px] text-yellow-700 flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        <p>
                          <strong>Watchtime Protection:</strong> Seeking (fast-forwarding) is disabled. 
                          The timer will pause if you leave this tab.
                        </p>
                      </div>
                    )}
                  </CardHeader>

                  <CardFooter className={cn("flex flex-col gap-3", isActive ? "bg-muted/30 pb-8" : "")}>
                    {!isActive && (
                      <Button 
                        variant={isYouTube ? "default" : "outline"}
                        className="w-full" 
                        onClick={() => handleStartTask(task)}
                      >
                        {isYouTube ? <Play className="h-4 w-4 mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                        Open {task.platform.charAt(0).toUpperCase() + task.platform.slice(1)}
                      </Button>
                    )}
                    
                    {!proof ? (
                      <div className="w-full space-y-4">
                        {isYouTube && activeTimers[task.id] === undefined ? (
                          !isActive && (
                            <div className="w-full flex items-center justify-center gap-2 bg-muted/50 text-muted-foreground h-10 rounded-md px-4 py-2 text-xs italic">
                              <Play className="h-3 w-3" />
                              Open video first
                            </div>
                          )
                        ) : isYouTube && timeLeft > 0 ? (
                          <div className="w-full flex items-center justify-center gap-2 bg-muted text-muted-foreground h-10 rounded-md px-4 py-2 font-mono text-sm cursor-not-allowed border-2 border-dashed">
                            <Clock className="h-4 w-4 animate-pulse text-primary" />
                            Finish Watching: {formatTime(timeLeft)}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {isWhatsApp && (
                              <div className="grid grid-cols-1 gap-2">
                                <div className="space-y-2">
                                  <Label className="text-[10px] uppercase tracking-wider font-bold opacity-50">Submit Link (Optional)</Label>
                                  <div className="flex gap-2">
                                    <Input 
                                      placeholder="https://..." 
                                      className="h-10 text-xs"
                                      value={proofLink[task.id] || ''}
                                      onChange={(e) => setProofLink(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    />
                                    <Button 
                                      size="icon" 
                                      className="shrink-0"
                                      onClick={() => handleSubmitLink(task.id)}
                                      disabled={uploading === task.id || !proofLink[task.id]}
                                    >
                                      <LinkIcon className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="relative py-2">
                                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-muted"></div></div>
                                  <div className="relative flex justify-center text-[10px] uppercase h-full"><span className="bg-background px-2 text-muted-foreground">Or Upload Screenshot</span></div>
                                </div>
                              </div>
                            )}

                            <div>
                              <Label 
                                htmlFor={`proof-${task.id}`}
                                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground h-10 rounded-md px-4 py-2 cursor-pointer hover:bg-primary/90 transition-all font-bold shadow-lg shadow-primary/20"
                              >
                                {uploading === task.id ? (
                                  <Clock className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                                {uploading === task.id ? 'Uploading...' : 'Submit Screenshot Proof'}
                              </Label>
                              <input 
                                id={`proof-${task.id}`}
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => handleUploadProof(task.id, e)}
                                disabled={!!uploading}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={cn(
                        "w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold",
                        proof.status === 'pending' ? "bg-yellow-500/10 text-yellow-600" :
                        proof.status === 'approved' ? "bg-green-500/10 text-green-600" :
                        "bg-red-500/10 text-red-600"
                      )}>
                        {proof.status === 'pending' && <Clock className="h-4 w-4" />}
                        {proof.status === 'approved' && <CheckCircle className="h-4 w-4" />}
                        {proof.status === 'rejected' && <XCircle className="h-4 w-4" />}
                        {proof.status.charAt(0).toUpperCase() + proof.status.slice(1)}
                      </div>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
