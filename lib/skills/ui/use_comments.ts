/**
 * Skill: UseComments
 * @owner AGENT-2
 * @status READY
 * @created 2026-01-31
 * @dependencies none
 */

'use client';

import { useState, useCallback } from 'react';
import type { Comment } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface UseCommentsOutput {
    comments: Comment[];
    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;
    fetchComments: (restaurantId: string) => Promise<void>;
    submitComment: (restaurantId: string, content: string) => Promise<Comment | null>;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Hook for managing restaurant comments.
 * 
 * @example
 * const { comments, isLoading, fetchComments, submitComment } = useComments();
 * 
 * useEffect(() => {
 *     fetchComments(restaurantId);
 * }, [restaurantId]);
 */
export function useComments(): UseCommentsOutput {
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchComments = useCallback(async (restaurantId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/restaurants/${restaurantId}/comments`);
            const data = await response.json();
            if (data.success) {
                setComments(data.comments);
            } else {
                setError(data.error || 'Failed to fetch comments');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const submitComment = useCallback(async (restaurantId: string, content: string): Promise<Comment | null> => {
        if (!content.trim()) return null;

        setIsSubmitting(true);
        setError(null);
        try {
            const response = await fetch(`/api/restaurants/${restaurantId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: content.trim() }),
            });
            const data = await response.json();
            if (data.success) {
                setComments(prev => [data.comment, ...prev]);
                return data.comment;
            } else {
                setError(data.error || 'Failed to submit comment');
                return null;
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            return null;
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    return {
        comments,
        isLoading,
        isSubmitting,
        error,
        fetchComments,
        submitComment,
    };
}
