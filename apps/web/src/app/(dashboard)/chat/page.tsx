// ============================================
// Maate Web — AIChatInterface
// Unified clinical conversational experience
// ============================================

"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Sparkles, 
  Paperclip, 
  History, 
  Info,
  FileText,
  BrainCircuit,
  MessageSquare,
  ArrowRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HealthCard } from "@/components/ui/health-card";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api";
import { useAuthStore } from "@/store/use-auth-store";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: string;
  citations?: { id: string; title: string; url?: string }[];
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
}

const suggestions = [
  "Explain my last CBC report",
  "Any trends in my HbA1c?",
  "When should I take Metformin?",
  "Summarize my 2026 visits"
];

const generateUUID = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function AIChatInterface() {
  const selectedProfileId = useAuthStore((state) => state.selectedProfileId);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await apiClient.get("/chat/sessions");
      const fetchedSessions = res.data || [];
      setSessions(fetchedSessions);

      if (fetchedSessions.length > 0) {
        // Load the most recent session
        const latestSession = fetchedSessions[0];
        setCurrentSessionId(latestSession.id);
        await loadHistory(latestSession.id);
      } else {
        // No session found, initialize a blank session
        startNewSession();
      }
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
      startNewSession();
    } finally {
      setLoadingSessions(false);
    }
  };

  // Reload sessions and history when patient context changes
  useEffect(() => {
    if (selectedProfileId) {
      loadSessions();
    }
  }, [selectedProfileId]);

  const loadHistory = async (sessionId: string) => {
    try {
      setLoadingHistory(true);
      const res = await apiClient.get(`/chat/sessions/${sessionId}/history`);
      const rawMessages = res.data || [];
      
      const mappedMessages: Message[] = rawMessages.map((m: any) => {
        const timestamp = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let citations: Message["citations"] = undefined;
        if (m.metadata) {
          const meta = typeof m.metadata === "string" ? JSON.parse(m.metadata) : m.metadata;
          if (meta.sources && Array.isArray(meta.sources)) {
            citations = meta.sources.map((s: any) => ({
              id: s.id || s.documentId || "source",
              title: s.title || s.name || "Attached Report",
              url: s.fileUrl || s.url,
            }));
          }
        }

        return {
          id: m.id,
          role: m.role === "USER" ? "user" : "ai",
          content: m.content,
          timestamp,
          citations,
        };
      });

      if (mappedMessages.length > 0) {
        setMessages(mappedMessages);
      } else {
        // Show default intro if history is empty
        setMessages([
          {
            id: "initial",
            role: "ai",
            content: "Hello! I'm your Maate Health Assistant. I have access to your clinical reports and medication history. How can I help you today?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewSession = () => {
    const newId = generateUUID();
    setCurrentSessionId(newId);
    setMessages([
      {
        id: "initial",
        role: "ai",
        content: "Hello! I'm your Maate Health Assistant. I have access to your clinical reports and medication history. How can I help you today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    await loadHistory(sessionId);
  };

  const handleSend = async () => {
    if (!input.trim() || !currentSessionId) return;

    const userText = input;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await apiClient.post("/chat/message", {
        sessionId: currentSessionId,
        message: userText,
      });

      const { answer, suggestions: returnedSuggestions } = res.data;
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Extract metadata citations if any
      // In NestJS we mapped sources to meta.sources
      // Let's reload messages/history or fetch updated history to ensure accurate db status
      await loadHistory(currentSessionId);
      
      // Refresh the sidebar sessions list to show correct titles and timestamps
      const sessionsRes = await apiClient.get("/chat/sessions");
      setSessions(sessionsRes.data || []);
      
    } catch (error) {
      console.error("Failed to send message:", error);
      
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: "ai",
        content: "I'm having trouble connecting to my clinical knowledge base right now. Please verify your internet connection or try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] max-w-5xl mx-auto bg-card/30 backdrop-blur-xl border rounded-[32px] overflow-hidden shadow-health-lg">
      
      {/* ─── Chat History Sidebar (Desktop) ────── */}
      <aside className="hidden lg:flex w-72 flex-col border-r bg-muted/20">
        <div className="p-6 border-b flex items-center justify-between">
           <h3 className="font-bold font-outfit text-sm flex items-center gap-2">
             <History size={16} className="text-muted-foreground" />
             Conversations
           </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
           {loadingSessions ? (
             <div className="flex justify-center py-10">
               <Loader2 className="animate-spin text-muted-foreground" size={20} />
             </div>
           ) : sessions.length > 0 ? (
             sessions.map((session) => (
               <button 
                 key={session.id} 
                 onClick={() => handleSelectSession(session.id)}
                 className={cn(
                   "w-full text-left p-3 rounded-xl text-xs font-bold transition-all truncate",
                   session.id === currentSessionId ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                 )}
               >
                 {session.title || "Consultation"}
               </button>
             ))
           ) : (
             <p className="text-[10px] text-muted-foreground text-center py-6">No previous conversations.</p>
           )}
        </div>
        <div className="p-4 border-t bg-muted/30">
           <Button 
             variant="outline" 
             onClick={startNewSession}
             className="w-full rounded-xl text-[10px] font-bold uppercase tracking-widest gap-2"
           >
              <MessageSquare size={14} /> New Consultation
           </Button>
        </div>
      </aside>

      {/* ─── Main Chat Area ───────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white/40">
        
        {/* Chat Header */}
        <header className="p-4 border-b flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-health-violet/10 text-health-violet flex items-center justify-center shadow-sm">
                 <BrainCircuit size={20} />
              </div>
              <div>
                 <h2 className="font-bold font-outfit">Medical Assistant</h2>
                 <p className="text-[10px] font-bold text-health-normal uppercase tracking-widest">Always Online • RAG Secure</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground">
                 <Info size={18} />
              </Button>
           </div>
        </header>

        {/* Messages */}
        <div 
          ref={scrollRef} 
          role="log"
          aria-live="polite"
          aria-label="Conversation history"
          className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
        >
           {loadingHistory ? (
             <div className="flex flex-col items-center justify-center py-20 space-y-2">
               <Loader2 className="animate-spin text-primary" size={24} />
               <p className="text-xs font-bold text-muted-foreground">Loading message history...</p>
             </div>
           ) : (
             messages.map((msg) => (
               <div key={msg.id} className={cn(
                 "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-500",
                 msg.role === "user" ? "justify-end" : "justify-start"
               )}>
                  <div className={cn(
                    "max-w-[80%] space-y-2",
                    msg.role === "user" ? "items-end" : "items-start"
                  )}>
                     <div className={cn(
                       "p-4 rounded-[24px] text-sm leading-relaxed",
                       msg.role === "user" 
                        ? "bg-primary text-white font-medium shadow-health-md" 
                        : "bg-white border shadow-sm text-foreground"
                     )}>
                        {msg.content}
                     </div>
                     
                     {msg.citations && msg.citations.length > 0 && (
                       <div className="flex flex-wrap gap-2 mt-2">
                          {msg.citations.map((cite, index) => {
                            const content = (
                              <>
                                <FileText size={12} />
                                {cite.title}
                              </>
                            );

                            if (cite.url) {
                              return (
                                <a 
                                  key={index} 
                                  href={cite.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-2 py-1 bg-health-violet/10 text-health-violet rounded-lg text-[10px] font-bold border border-health-violet/20 hover:bg-health-violet/20 transition-all"
                                >
                                  {content}
                                </a>
                              );
                            }

                            return (
                              <span 
                                key={index} 
                                className="flex items-center gap-1.5 px-2 py-1 bg-health-violet/10 text-health-violet rounded-lg text-[10px] font-bold border border-health-violet/20"
                              >
                                {content}
                              </span>
                            );
                          })}
                       </div>
                     )}

                     <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest px-2">
                        {msg.timestamp}
                     </p>
                  </div>
               </div>
             ))
           )}

           {isTyping && (
             <div className="flex justify-start">
                <div className="bg-white border p-4 rounded-[24px] flex gap-1">
                   <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                   <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                   <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
             </div>
           )}
        </div>

        {/* Input Area */}
        <div className="p-6 pt-0 space-y-4">
           {messages.length < 3 && (
             <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                   <button 
                     key={s}
                     onClick={() => setInput(s)}
                     className="px-4 py-2 bg-white border border-border/50 rounded-full text-[11px] font-bold text-muted-foreground hover:border-primary hover:text-primary transition-all flex items-center gap-2 group"
                   >
                     {s}
                     <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                   </button>
                ))}
             </div>
           )}

           <div className="relative group">
              <div className="absolute inset-0 bg-primary/5 rounded-[24px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-2 bg-white border rounded-[24px] p-2 pr-3 shadow-sm focus-within:ring-2 ring-primary/20 transition-all">
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   aria-label="Attach medical record or image"
                   className="rounded-xl text-muted-foreground hover:text-primary shrink-0"
                 >
                    <Paperclip size={20} aria-hidden="true" />
                 </Button>
                 <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask about your reports, medications, or health..."
                  aria-label="Ask a medical question"
                  className="flex-1 bg-transparent border-none outline-none text-sm py-2"
                 />
                 <Button 
                  onClick={handleSend}
                  disabled={!input.trim()}
                  aria-label="Send clinical query"
                  className="rounded-xl h-10 w-10 p-0 bg-primary hover:bg-primary/90 text-white shadow-health-md"
                 >
                    <Send size={18} aria-hidden="true" />
                 </Button>
              </div>
           </div>

           <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground/60 font-medium italic">
              <Sparkles size={10} className="text-health-violet" />
              AI health insights are for informational purposes. Consult a doctor for medical advice.
           </div>
        </div>
      </div>
    </div>
  );
}
