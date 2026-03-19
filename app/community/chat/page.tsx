'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Flame, Send, Hash, Users } from 'lucide-react';
import Link from 'next/link';

// Chat rooms
const ROOMS = [
  { id: 'general', name: 'General Support', icon: Hash },
  { id: 'smoking', name: 'Quit Smoking', icon: Flame },
  { id: 'alcohol', name: 'Alcohol Free', icon: Users },
  { id: 'social-media', name: 'Digital Detox', icon: Hash },
  { id: 'fitness', name: 'Fitness Journey', icon: Users },
];

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  user_display_name: string;
  content: string;
  created_at: string;
}

export default function ChatPage() {
  const [currentRoom, setCurrentRoom] = useState(ROOMS[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<any>(null);

  // Generate a random user ID if not set
  useEffect(() => {
    const storedUserId = localStorage.getItem('chat_user_id');
    const storedUserName = localStorage.getItem('chat_user_name');
    
    if (storedUserId) {
      setUserId(storedUserId);
      setUserName(storedUserName || storedUserId.slice(0, 8));
    } else {
      const newUserId = `user_${Math.random().toString(36).substring(2, 15)}`;
      const newUserName = `User_${newUserId.slice(-6)}`;
      localStorage.setItem('chat_user_id', newUserId);
      localStorage.setItem('chat_user_name', newUserName);
      setUserId(newUserId);
      setUserName(newUserName);
    }
  }, []);

  // Load messages when room changes
  const loadMessages = useCallback(async () => {
    if (!currentRoom) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabaseRef.current
        .from('chat_messages')
        .select('*')
        .eq('room_id', currentRoom)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error loading messages:', error);
        setMessages([]);
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [currentRoom]);

  // Subscribe to new messages
  const subscribeToMessages = useCallback(() => {
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
    }

    const channel = supabaseRef.current
      .channel(`room:${currentRoom}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${currentRoom}`,
        },
        (payload: any) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [currentRoom]);

  // Load messages and subscribe on room change
  useEffect(() => {
    loadMessages();
    subscribeToMessages();

    return () => {
      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
      }
    };
  }, [currentRoom, loadMessages, subscribeToMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !userId) return;

    const newMessage = {
      user_id: userId,
      room_id: currentRoom,
      content: messageText.trim(),
      user_display_name: userName,
    };

    // Clear input immediately for better UX
    setMessageText('');

    try {
      const { error } = await supabaseRef.current
        .from('chat_messages')
        .insert(newMessage);

      if (error) {
        console.error('Error sending message:', error);
        // Restore the message on error
        setMessageText(newMessage.content);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageText(newMessage.content);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-accent" />
            <span className="font-bold text-foreground">Habit Breaker</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{userName}</span>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Chat Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Room List */}
        <aside className="w-64 border-r border-border/40 bg-card/30 hidden md:block">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Channels
            </h2>
            <div className="space-y-1">
              {ROOMS.map((room) => {
                const Icon = room.icon;
                return (
                  <button
                    key={room.id}
                    onClick={() => setCurrentRoom(room.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      currentRoom === room.id
                        ? 'bg-accent/20 text-accent font-medium'
                        : 'text-muted-foreground hover:bg-card hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {room.name}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Chat Content */}
        <main className="flex-1 flex flex-col">
          {/* Room Header */}
          <div className="h-12 border-b border-border/40 px-4 flex items-center bg-card/30">
            <Hash className="w-5 h-5 text-muted-foreground mr-2" />
            <span className="font-medium text-foreground">
              {ROOMS.find(r => r.id === currentRoom)?.name || 'Chat'}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-muted-foreground">Loading messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Hash className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  Welcome to #{ROOMS.find(r => r.id === currentRoom)?.name}
                </h3>
                <p className="text-muted-foreground text-sm">
                  Be the first to send a message!
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.user_id === userId ? 'justify-end' : ''}`}
                >
                  {msg.user_id !== userId && (
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-medium">
                      {msg.user_display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`max-w-[70%] ${msg.user_id === userId ? 'order-1' : ''}`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className={`text-sm font-medium ${msg.user_id === userId ? 'text-accent' : 'text-foreground'}`}>
                        {msg.user_id === userId ? 'You' : msg.user_display_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <div className={`rounded-lg px-3 py-2 ${
                      msg.user_id === userId 
                        ? 'bg-accent text-accent-foreground' 
                        : 'bg-card border border-border/40'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-border/40 bg-card/30">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={`Message #${ROOMS.find(r => r.id === currentRoom)?.name || 'chat'}...`}
                className="flex-1 bg-background"
              />
              <Button 
                type="submit" 
                disabled={!messageText.trim()}
                className="bg-accent hover:bg-accent/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
