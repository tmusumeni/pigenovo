import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { GoogleGenAI } from "@google/genai";
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Bot, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIAssistant({ user }: { user: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    
    if (data && data.length > 0) {
      setMessages(data.map(m => ({ role: m.role, content: m.content })));
    } else {
      setMessages([
        { role: 'assistant', content: 'Hello! I am your PiGenovo AI Assistant. I can help you with business advice, trend predictions, and platform guidance. How can I assist you today?' }
      ]);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // 1. Save user message to DB
      await supabase.from('ai_messages').insert({
        user_id: user.id,
        role: 'user',
        content: userMessage
      });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: "You are the PiGenovo AI Assistant. Your goal is to provide expert advice on business, news trends, and trading. You are professional, insightful, and helpful. Keep responses concise and actionable."
        }
      });

      const assistantMessage = response.text || "I'm sorry, I couldn't process that request.";
      
      // 2. Save assistant message to DB
      await supabase.from('ai_messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: assistantMessage
      });

      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error: any) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
      <Card className="flex-1 flex flex-col overflow-hidden border-2">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-xl">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>AI Trend Assistant</CardTitle>
              <CardDescription>Expert advice on business & market trends</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-6">
            <div className="space-y-6">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-4 max-w-[85%]",
                    m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl h-fit",
                    m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {m.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed",
                    m.role === 'user' ? "bg-primary/10 border border-primary/20" : "bg-card border"
                  )}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex gap-4 max-w-[85%]">
                  <div className="p-2 rounded-xl bg-muted h-fit">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="p-4 rounded-2xl bg-card border flex gap-1">
                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </CardContent>
        <div className="p-4 border-t bg-muted/30">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2"
          >
            <Input 
              placeholder="Ask about business trends or trading advice..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-background"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
      
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          "Predict TECH trends",
          "Business advice",
          "Market analysis",
          "Trading tips"
        ].map((hint) => (
          <Button 
            key={hint} 
            variant="outline" 
            size="sm" 
            className="text-xs text-muted-foreground hover:text-primary"
            onClick={() => setInput(hint)}
          >
            <Sparkles className="h-3 w-3 mr-2" />
            {hint}
          </Button>
        ))}
      </div>
    </div>
  );
}
