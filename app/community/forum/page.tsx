'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, MessageSquare, Heart, ArrowLeft, Plus } from 'lucide-react';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  users?: {
    display_name: string;
  };
  comment_count?: number;
  reaction_count?: number;
}

interface HabitCategory {
  id: string;
  name: string;
  description: string;
}

export default function ForumPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    getCurrentUser();
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadPosts();
    }
  }, [selectedCategory]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        setCurrentUser(data);
      }
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await supabase
        .from('habit_categories')
        .select('*')
        .order('name');

      if (data) {
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategory(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('forum_posts')
        .select(`
          id,
          title,
          content,
          user_id,
          created_at,
          users:user_id (
            display_name
          )
        `)
        .eq('category_id', selectedCategory)
        .order('created_at', { ascending: false });

      if (data) {
        setPosts(data);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card to-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-accent" />
            <span className="text-xl font-bold text-foreground">Habit Breaker</span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Community Forum
            </h1>
            <p className="text-muted-foreground">
              Share your experiences and learn from others
            </p>
          </div>
          <Button
            className="flex items-center gap-2 bg-accent hover:bg-accent/90"
            onClick={() => router.push('/forum/new')}
          >
            <Plus className="w-4 h-4" />
            New Post
          </Button>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full border transition-all ${
                  selectedCategory === category.id
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border/40 bg-card/50 text-muted-foreground hover:border-accent/40'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">
              <Flame className="w-8 h-8 text-accent" />
            </div>
            <p className="text-foreground mt-4">Loading forum posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <Card className="border border-dashed border-border/40 p-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No posts yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Be the first to start a discussion in this category!
            </p>
            <Button
              className="bg-accent hover:bg-accent/90"
              onClick={() => router.push('/forum/new')}
            >
              Create First Post
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card
                key={post.id}
                className="border border-border/40 bg-card/50 backdrop-blur-sm hover:border-accent/40 hover:bg-card/80 transition-all cursor-pointer p-6 group"
                onClick={() => router.push(`/forum/${post.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors mb-2">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground line-clamp-2">
                      {post.content}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{post.users?.display_name || 'Anonymous'}</span>
                    <span>
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm">{post.comment_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">{post.reaction_count || 0}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
