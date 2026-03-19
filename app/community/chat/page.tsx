'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/solana/wallet-provider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Hash } from 'lucide-react';
import Link from 'next/link';

interface ChatRoom {
  id: string;
  name: string;
}

const FALLBACK_ROOMS: ChatRoom[] = [
  { id: 'general', name: 'General Support' },
  { id: 'smoking', name: 'Quit Smoking' },
  { id: 'alcohol', name: 'Alcohol Free' },
  { id: 'social-media', name: 'Digital Detox' },
  { id: 'fitness', name: 'Fitness Journey' },
]

// Basic shortcode -> emoji mapping.
// You can expand this as you add more emotes.
const EMOTE_MAP: Record<string, string> = {
  fire: '🔥',
  heart: '❤️',
  clap: '👏',
  strong: '💪',
  smile: '😊',
  wink: '😉',
  thumbs_up: '👍',
};

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  user_display_name?: string;
  content: string;
  created_at: string;
}

export default function ChatPage() {
  const { publicKey, initialized } = useWallet();

  // Keep the chat usable even if the database is not set up yet.
  // Once Supabase loads, we replace this list with real rooms from `chat_rooms`.
  const [rooms, setRooms] = useState<ChatRoom[]>(FALLBACK_ROOMS);
  const [currentRoom, setCurrentRoom] = useState<string>(FALLBACK_ROOMS[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  const [supabaseClient, setSupabaseClient] = useState<ReturnType<typeof createClient> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Local identity fallback (only used if you aren't authenticated).
  useEffect(() => {
    const storedUserId = localStorage.getItem('chat_user_id');
    const storedUserName = localStorage.getItem('chat_user_name');
    
    if (storedUserId) {
      setUserId(storedUserId);
      setUserName(storedUserName || storedUserId.slice(0, 8));
    } else {
      // Use UUID-ish format to reduce chance of DB type errors.
      const newUserId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `user_${Math.random().toString(36).substring(2, 15)}`;
      const newUserName = `User_${newUserId.slice(-6)}`;
      localStorage.setItem('chat_user_id', newUserId);
      localStorage.setItem('chat_user_name', newUserName);
      setUserId(newUserId);
      setUserName(newUserName);
    }
  }, []);

  // Create Supabase client on the client-side (after env vars exist in the browser).
  useEffect(() => {
    setSupabaseClient(createClient());
  }, []);

  // If the user has connected a wallet, prefer their profile (for consistent "You" rendering).
  useEffect(() => {
    if (!initialized || !publicKey || !supabaseClient) return;

    (async () => {
      try {
        const { data: userRow, error } = await supabaseClient
          .from('users')
          .select('id, display_name')
          .eq('wallet_address', publicKey)
          .maybeSingle();

        if (error) throw error;

        const fallbackName = publicKey.slice(0, 8);

        if (userRow?.id) {
          setUserId(userRow.id);
          setUserName(userRow.display_name || fallbackName);
          localStorage.setItem('chat_user_id', userRow.id);
          localStorage.setItem('chat_user_name', userRow.display_name || fallbackName);
        } else {
          const { data: newUser, error: insertError } = await supabaseClient
            .from('users')
            .insert({
              wallet_address: publicKey,
              display_name: fallbackName,
              current_streak: 0,
              best_streak: 0,
            })
            .select('id, display_name')
            .single();

          if (insertError) throw insertError;

          if (newUser?.id) {
            setUserId(newUser.id);
            setUserName(newUser.display_name || fallbackName);
            localStorage.setItem('chat_user_id', newUser.id);
            localStorage.setItem('chat_user_name', newUser.display_name || fallbackName);
          }
        }
      } catch (e) {
        console.error('Error loading wallet profile for chat:', e);
      }
    })();
  }, [publicKey, initialized, supabaseClient]);

  // Load available chat rooms (UUID IDs) from Supabase.
  useEffect(() => {
    if (!supabaseClient) return;

    (async () => {
      try {
        const { data, error } = await supabaseClient
          .from('chat_rooms')
          .select('id, name')
          .limit(100);

        if (error) throw error;
        const nextRooms = (data && data.length > 0 ? (data as ChatRoom[]) : FALLBACK_ROOMS);
        setRooms(nextRooms);
        setCurrentRoom((prev) => (nextRooms.some((r) => r.id === prev) ? prev : nextRooms[0].id));
      } catch (err) {
        console.error('Error loading rooms:', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseClient]);

  // Load messages when room changes
  const loadMessages = useCallback(async () => {
    if (!supabaseClient || !currentRoom) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('chat_messages')
        .select('id, room_id, user_id, user_display_name, content, created_at')
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
  }, [currentRoom, supabaseClient]);

  // Subscribe to new messages
  // Load messages and subscribe on room change
  useEffect(() => {
    if (!supabaseClient || !currentRoom) return;

    loadMessages();

    const channel = supabaseClient
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
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [currentRoom, loadMessages, supabaseClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseClient || !messageText.trim() || !userId || !currentRoom) return;
    setSendError(null);

    const newMessage = {
      user_id: userId,
      room_id: currentRoom,
      user_display_name: userName,
      content: messageText.trim(),
    };

    // Clear input immediately for better UX
    setMessageText('');

    try {
      const { data, error } = await supabaseClient
        .from('chat_messages')
        .insert(newMessage)
        .select('id, room_id, user_id, user_display_name, content, created_at')
        .single();

      if (error) {
        console.error('Error sending message:', error);
        // Restore the message on error
        setMessageText(newMessage.content);
        const msg = (error as any)?.message || String(error);
        setSendError(msg || 'Failed to send message. Please try again.');
      } else if (data) {
        // Optimistic update so the sender sees their message instantly
        const inserted = Array.isArray(data) ? data[0] : data;
        setMessages((prev) => {
          if (prev.some((m) => m.id === inserted?.id)) return prev;
          return [
            ...prev,
            {
              ...(inserted as ChatMessage),
              room_id: currentRoom,
              user_id: userId,
              user_display_name: userName,
            },
          ];
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageText(newMessage.content);
      const msg = (error as any)?.message || String(error);
      setSendError(msg || 'Failed to send message. Please try again.');
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const URL_REGEX = /(https?:\/\/[^\s]+)/i;

  const extractFirstUrl = (text: string) => {
    const match = text.match(URL_REGEX);
    return match?.[0] ?? null;
  };

  const isGifUrl = (url: string) => {
    const u = url.toLowerCase();
    return u.includes('.gif') || u.includes('giphy') || u.includes('tenor');
  };

  const renderEmotes = (text: string) => {
    // Supports :fire: style shortcodes.
    const parts: Array<string | { emote: string }> = [];
    const re = /:([a-zA-Z0-9_]+):/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null = null;

    while ((m = re.exec(text)) !== null) {
      if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
      parts.push({ emote: m[1].toLowerCase() });
      lastIndex = re.lastIndex;
    }

    if (lastIndex < text.length) parts.push(text.slice(lastIndex));

    return (
      <>
        {parts.map((p, idx) => {
          if (typeof p === 'string') return <span key={idx}>{p}</span>;
          const emoji = EMOTE_MAP[p.emote];
          return (
            <span key={idx}>
              {emoji ?? `:${p.emote}:`}
            </span>
          );
        })}
      </>
    );
  };

  const renderContent = (content: string) => {
    const trimmed = (content ?? '').trim();
    const firstUrl = extractFirstUrl(trimmed);

    // If the message is basically a GIF URL, render it as an image.
    if (firstUrl && trimmed === firstUrl && isGifUrl(firstUrl)) {
      return (
        <img
          src={firstUrl}
          alt="gif"
          className="max-w-[260px] max-h-[240px] rounded-md object-contain"
        />
      );
    }

    return renderEmotes(trimmed);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-accent" />
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
              {rooms.length === 0 ? (
                <div className="text-sm text-muted-foreground">Loading channels...</div>
              ) : (
                rooms.map((room) => {
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
                    <Hash className="w-4 h-4" />
                    {room.name}
                  </button>
                );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Chat Content */}
        <main className="flex-1 flex flex-col">
          {/* Room Header */}
          <div className="h-12 border-b border-border/40 px-4 flex items-center bg-card/30">
            <Hash className="w-5 h-5 text-muted-foreground mr-2" />
            <span className="font-medium text-foreground">
              {rooms.find((r) => r.id === currentRoom)?.name || 'Chat'}
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
                  Welcome{rooms.find((r) => r.id === currentRoom)?.name ? ` to #${rooms.find((r) => r.id === currentRoom)?.name}` : ''}
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
                      {(msg.user_display_name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`max-w-[70%] ${msg.user_id === userId ? 'order-1' : ''}`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className={`text-sm font-medium ${msg.user_id === userId ? 'text-accent' : 'text-foreground'}`}>
                        {msg.user_id === userId ? 'You' : (msg.user_display_name || 'User')}
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
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {renderContent(msg.content)}
                      </div>
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
                placeholder={
                  currentRoom
                    ? `Message #${rooms.find((r) => r.id === currentRoom)?.name || 'chat'}...`
                    : 'Select a channel...'
                }
                className="flex-1 bg-background"
                disabled={!supabaseClient || !currentRoom}
              />
              <Button 
                type="submit" 
                disabled={!supabaseClient || !currentRoom || !messageText.trim()}
                className="bg-accent hover:bg-accent/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            {sendError ? <div className="text-sm text-destructive mt-2">{sendError}</div> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
