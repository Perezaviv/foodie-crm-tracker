'use client';

import { MessageSquare, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Comment } from '@/lib/types';

interface CommentsTabProps {
    comments: Comment[];
    isLoading: boolean;
    isSubmitting: boolean;
    newComment: string;
    setNewComment: (val: string) => void;
    onSubmitComment: () => void;
}

export function CommentsTab({
    comments,
    isLoading,
    isSubmitting,
    newComment,
    setNewComment,
    onSubmitComment
}: CommentsTabProps) {
    return (
        <div className="space-y-4">
            {/* Add Comment Form */}
            <div className="bg-card border rounded-2xl p-4 shadow-sm">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSubmitComment()}
                        placeholder="Write a comment..."
                        className="flex-1 px-4 py-2 rounded-xl border border-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                    <button
                        onClick={onSubmitComment}
                        disabled={!newComment.trim() || isSubmitting}
                        className={cn(
                            'p-3 rounded-xl transition-all',
                            newComment.trim() && !isSubmitting
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25 hover:bg-primary-600 active:scale-95'
                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                        )}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Loading comments...
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-8">
                        <MessageSquare size={48} className="mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">No comments yet</p>
                        <p className="text-sm text-muted-foreground/70">Be the first to share your thoughts!</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div
                            key={comment.id}
                            className="bg-muted/30 p-4 rounded-2xl space-y-2"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-primary-600">
                                    {comment.author_name || 'Anonymous'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {new Date(comment.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-sm leading-relaxed">
                                {comment.content}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
