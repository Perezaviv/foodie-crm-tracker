import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, getComments, addComment } from '@/lib/skills/db';

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

        const result = await getComments(id);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
            });
        }

        return NextResponse.json({
            success: true,
            comments: result.data || [],
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

        const result = await addComment(id, body.content, body.author_name);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
            });
        }

        return NextResponse.json({
            success: true,
            comment: result.data,
        });

    } catch (error) {
        console.error('Add comment error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
