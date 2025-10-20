/**
 * データベース接続デモコンポーネント
 * Turso + Prismaの動作確認用
 */
"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { Calendar, Database, Plus, RefreshCw, User } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

type Post = {
  id: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
  author: {
    name: string;
    email: string;
  };
};

export default function DatabaseDemo() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    authorEmail: "demo@example.com",
  });
  const connectionStatusVariant = error ? "destructive" : "default";
  let connectionStatusLabel = "Connected";
  if (error) {
    connectionStatusLabel = "Error";
  } else if (loading) {
    connectionStatusLabel = "Connecting...";
  }

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/posts", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      setFormData({ title: "", content: "", authorEmail: "demo@example.com" });
      setShowForm(false);
      fetchPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="">
        <CardHeader className="">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Connection Status
              </CardTitle>
              <CardDescription className="">
                Turso と Prisma の組み合わせで、エッジ最適化された SQLite
                データベースに安全に接続しています。
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge className="" variant={connectionStatusVariant}>
                {connectionStatusLabel}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="">
          <div className="flex gap-2">
            <Button
              className=""
              disabled={loading}
              onClick={fetchPosts}
              size="sm"
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button className="" onClick={() => setShowForm(!showForm)} size="sm" variant="default">
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="">
          <CardHeader className="">
            <CardTitle className="">Create New Post</CardTitle>
          </CardHeader>
          <CardContent className="">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Input
                  className=""
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Post title"
                  required
                  type="text"
                  value={formData.title}
                />
              </div>
              <div>
                <Textarea
                  className=""
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Post content"
                  rows={4}
                  value={formData.content}
                />
              </div>
              <div>
                <Input
                  className=""
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, authorEmail: e.target.value })
                  }
                  placeholder="Author email"
                  required
                  type="email"
                  value={formData.authorEmail}
                />
              </div>
              <div className="flex gap-2">
                <Button className="" size="default" type="submit" variant="default">
                  Create Post
                </Button>
                <Button
                  className=""
                  onClick={() => setShowForm(false)}
                  size="default"
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {!(loading || error) && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Posts ({posts.length})</h3>
          {posts.length === 0 ? (
            <Card className="">
              <CardContent className="pt-6">
                <p className="text-muted-foreground">No posts yet. Create your first post!</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card className="" key={post.id}>
                <CardHeader className="">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                    <Badge className="" variant="secondary">
                      Published
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {post.author.name || post.author.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </CardDescription>
                </CardHeader>
                {post.content && (
                  <CardContent className="">
                    <p className="text-muted-foreground text-sm">{post.content}</p>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// EOF
