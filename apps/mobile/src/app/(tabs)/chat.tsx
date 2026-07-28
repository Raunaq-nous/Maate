// ============================================
// MAATE — AI Health Assistant Chat
// RAG-powered health insights & Q&A
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard } from '@/components/ui';
import { useChatStore, ChatMessage } from '@/store/chatStore';

export default function ChatScreen() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, isLoading, suggestions } = useChatStore();
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  return (
    <View style={s.container}>
      <LinearGradient colors={[Colors.dark.bg, Colors.dark.surface]} style={StyleSheet.absoluteFill} />
      
      {/* Header */}
      <View style={s.header}>
        <View style={s.aiProfile}>
          <LinearGradient colors={[Colors.primary[500], Colors.accent.violet]} style={s.aiAvatar}>
            <Ionicons name="sparkles" size={18} color="white" />
          </LinearGradient>
          <View>
            <Text style={s.aiName}>Maate AI</Text>
            <Text style={s.aiStatus}>Healthcare Assistant</Text>
          </View>
        </View>
        <Pressable onPress={() => useChatStore.getState().initSession()} style={s.newChatBtn}>
          <Ionicons name="add" size={24} color={Colors.dark.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={100}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={s.chatList}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={s.welcome}>
              <View style={s.welcomeIcon}>
                <Ionicons name="chatbubbles-outline" size={40} color={Colors.primary[400]} />
              </View>
              <Text style={s.welcomeTitle}>How can I help you today?</Text>
              <Text style={s.welcomeSub}>I can answer questions about your reports, medications, and medical history.</Text>
            </View>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isLoading && (
            <View style={s.loadingBubble}>
              <ActivityIndicator size="small" color={Colors.primary[400]} />
              <Text style={s.loadingText}>Maate is thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Suggestions */}
        <View style={s.footer}>
          {suggestions.length > 0 && !isLoading && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.suggestions}>
              {suggestions.map((sug, idx) => (
                <Pressable key={idx} style={s.suggestionChip} onPress={() => sendMessage(sug)}>
                  <Text style={s.suggestionText}>{sug}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Input Area */}
          <View style={s.inputWrapper}>
            <TextInput 
              style={s.input} 
              value={input} 
              onChangeText={setInput} 
              placeholder="Ask anything about your health..." 
              placeholderTextColor={Colors.dark.textMuted}
              multiline
            />
            <Pressable 
              onPress={handleSend} 
              style={[s.sendBtn, (!input.trim() || isLoading) && s.sendBtnDisabled]}
              disabled={!input.trim() || isLoading}
            >
              <Ionicons name="arrow-up" size={24} color="white" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'USER';
  return (
    <View style={[s.bubbleContainer, isUser ? s.userContainer : s.aiContainer]}>
      {!isUser && (
        <View style={s.miniAvatar}>
          <Ionicons name="sparkles" size={12} color={Colors.primary[400]} />
        </View>
      )}
      <View style={[s.bubble, isUser ? s.userBubble : s.aiBubble]}>
        <Text style={[s.msgText, isUser ? s.userText : s.aiText]}>{message.content}</Text>
        {message.metadata?.suggestions && (
          <View style={s.inlineActions}>
            {message.metadata.suggestions.slice(0, 2).map((s, i) => (
              <Chip key={i} label={s} size="sm" color={Colors.primary[500]} variant="outlined" />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  aiProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  aiName: { fontSize: 16, fontWeight: '700', color: Colors.dark.text },
  aiStatus: { fontSize: 11, color: Colors.primary[400], fontWeight: '600' },
  newChatBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.dark.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  chatList: { padding: Spacing.xl, paddingBottom: 100 },
  welcome: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  welcomeIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${Colors.primary[500]}10`, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  welcomeTitle: { fontSize: 22, fontWeight: '800', color: Colors.dark.text, textAlign: 'center' },
  welcomeSub: { fontSize: 15, color: Colors.dark.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  bubbleContainer: { flexDirection: 'row', marginBottom: 20, maxWidth: '85%' },
  userContainer: { alignSelf: 'flex-end' },
  aiContainer: { alignSelf: 'flex-start', gap: 8 },
  miniAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  bubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 },
  userBubble: { backgroundColor: Colors.primary[500], borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: Colors.dark.surfaceElevated, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.dark.border },
  msgText: { fontSize: 15, lineHeight: 22 },
  userText: { color: 'white' },
  aiText: { color: Colors.dark.text },
  inlineActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', marginLeft: 32 },
  loadingText: { fontSize: 13, color: Colors.dark.textMuted, fontStyle: 'italic' },
  footer: { paddingBottom: 30, paddingHorizontal: Spacing.xl },
  suggestions: { marginBottom: 12 },
  suggestionChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border, marginRight: 8 },
  suggestionText: { fontSize: 13, color: Colors.dark.textSecondary, fontWeight: '600' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.dark.surface, borderRadius: 28, paddingLeft: 20, paddingRight: 6, paddingVertical: 6, borderWidth: 1, borderColor: Colors.dark.border },
  input: { flex: 1, color: Colors.dark.text, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary[500], alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.dark.border },
});

// Helper component for chips (assuming they are in ui)
function Chip({ label, size, color, variant }: any) {
  return (
    <View style={{ 
      paddingHorizontal: 8, 
      paddingVertical: 4, 
      borderRadius: 8, 
      borderWidth: 1, 
      borderColor: color,
      backgroundColor: variant === 'outlined' ? 'transparent' : `${color}15`
    }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color }}>{label}</Text>
    </View>
  );
}
