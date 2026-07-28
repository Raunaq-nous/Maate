// ============================================
// Mobile — Chat Store (Zustand)
// Real-time AI Conversations
// ============================================

import { create } from 'zustand';
import { apiClient } from '../services/api';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  metadata?: {
    suggestions?: string[];
    sources?: any[];
  };
  createdAt: string;
}

interface ChatState {
  sessionId: string;
  messages: ChatMessage[];
  isLoading: boolean;
  suggestions: string[];
  
  sendMessage: (text: string) => Promise<void>;
  initSession: () => void;
  fetchHistory: (sessionId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessionId: uuidv4(),
  messages: [],
  isLoading: false,
  suggestions: ['How is my blood sugar?', 'Summary of last report', 'Explain my medications'],

  initSession: () => {
    set({ sessionId: uuidv4(), messages: [] });
  },

  fetchHistory: async (sessionId: string) => {
    set({ isLoading: true, sessionId });
    try {
      const { data } = await apiClient.get(`/chat/sessions/${sessionId}/history`);
      set({ messages: data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to fetch chat history', error);
    }
  },

  sendMessage: async (text: string) => {
    const { sessionId, messages } = get();
    
    // 1. Add user message optimistic update
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };
    
    set({ messages: [...messages, userMsg], isLoading: true });

    try {
      // 2. Call API
      const { data } = await apiClient.post('/chat/message', {
        message: text,
        sessionId,
      });

      // 3. Add AI message
      const aiMsg: ChatMessage = {
        id: data.messageId,
        role: 'ASSISTANT',
        content: data.answer,
        metadata: { suggestions: data.suggestions },
        createdAt: new Date().toISOString(),
      };

      set({ 
        messages: [...get().messages, aiMsg], 
        suggestions: data.suggestions || [],
        isLoading: false 
      });

    } catch (error) {
      set({ isLoading: false });
      console.error('Chat failed', error);
      
      const errorMsg: ChatMessage = {
        id: uuidv4(),
        role: 'ASSISTANT',
        content: "I'm having trouble connecting to my brain. Please try again.",
        createdAt: new Date().toISOString(),
      };
      set({ messages: [...get().messages, errorMsg] });
    }
  },
}));
