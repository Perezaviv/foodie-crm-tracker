import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured, createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Get all comments for a restaurant
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    if (!isSupabaseConfigured()) {
        return NextResponse.json({
            success: false,
            error: 'Database not configured',
        }, { status: 503 });
    }

    try {
        const { id } = await context.params;

        const supabase = createServerClient();

        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .eq('restaurant_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({
                success: false,
                error: error.message,
            });
        }

        return NextResponse.json({
            success: true,
            comments: data || [],
        });

    } catch (error) {
        console.error('Get comments error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Add a new comment
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    if (!isSupabaseConfigured()) {
        return NextResponse.json({
            success: false,
            error: 'Database not configured',
        }, { status: 503 });
    }

    try {
        const { id } = await context.params;
        const body = await request.json();

        if (!body.content || body.content.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Comment content is required' },
                { status: 400 }
            );
        }

        // Use admin client to bypass RLS for Telegram/anonymous comments
        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('comments')
            .insert({
                restaurant_id: id,
                content: body.content.trim(),
                author_name: body.author_name || 'Anonymous',
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({
                success: false,
                error: error.message,
            });
        }

        return NextResponse.json({
            success: true,
            comment: data,
        });

    } catch (error) {
        console.error('Add comment error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
