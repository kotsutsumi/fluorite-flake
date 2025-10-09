'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Database, Plus, RefreshCw, User } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

interface Post {
    id: string;
    title: string;
    content: string;
    published: boolean;
    createdAt: string;
    author: {
        name: string;
        email: string;
    };
}

export default function DatabaseDemo() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        authorEmail: 'demo@example.com',
    });

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/posts', { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Failed to fetch posts');
            }
            const data = await response.json();
            setPosts(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load posts');
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
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error('Failed to create post');
            }

            setFormData({ title: '', content: '', authorEmail: 'demo@example.com' });
            setShowForm(false);
            fetchPosts();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create post');
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
                            <Badge className="" variant={error ? 'destructive' : 'default'}>
                                {error ? 'Error' : loading ? 'Connecting...' : 'Connected'}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="">
                    <div className="flex gap-2">
                        <Button
                            className=""
                            onClick={fetchPosts}
                            disabled={loading}
                            variant="default"
                            size="sm"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Button
                            className=""
                            onClick={() => setShowForm(!showForm)}
                            variant="default"
                            size="sm"
                        >
                            <Plus className="h-4 w-4 mr-2" />
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
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Input
                                    className=""
                                    type="text"
                                    placeholder="Post title"
                                    value={formData.title}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <Textarea
                                    className=""
                                    placeholder="Post content"
                                    value={formData.content}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                        setFormData({ ...formData, content: e.target.value })
                                    }
                                    rows={4}
                                />
                            </div>
                            <div>
                                <Input
                                    className=""
                                    type="email"
                                    placeholder="Author email"
                                    value={formData.authorEmail}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setFormData({ ...formData, authorEmail: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button className="" type="submit" variant="default" size="default">
                                    Create Post
                                </Button>
                                <Button
                                    className=""
                                    type="button"
                                    variant="outline"
                                    size="default"
                                    onClick={() => setShowForm(false)}
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

            {!loading && !error && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Posts ({posts.length})</h3>
                    {posts.length === 0 ? (
                        <Card className="">
                            <CardContent className="pt-6">
                                <p className="text-muted-foreground">
                                    No posts yet. Create your first post!
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        posts.map((post) => (
                            <Card className="" key={post.id}>
                                <CardHeader className="">
                                    <div className="flex justify-between items-start">
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
                                        <p className="text-sm text-muted-foreground">
                                            {post.content}
                                        </p>
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
