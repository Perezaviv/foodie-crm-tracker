import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Delete a restaurant
export async function DELETE(
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

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Restaurant ID is required' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // First delete associated photos from storage
        const { data: photos } = await supabase
            .from('photos')
            .select('storage_path')
            .eq('restaurant_id', id);

        if (photos && photos.length > 0) {
            const paths = photos.map(p => p.storage_path);
            await supabase.storage.from('photos').remove(paths);
        }

        // Delete from database (photos will cascade due to foreign key)
        const { error } = await supabase
            .from('restaurants')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({
                success: false,
                error: error.message,
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete restaurant error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Get a single restaurant
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
            .from('restaurants')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return NextResponse.json({
                success: false,
                error: error.message,
            });
        }

        return NextResponse.json({
            success: true,
            restaurant: data,
        });

    } catch (error) {
        console.error('Get restaurant error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Update a restaurant
export async function PATCH(
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

        const supabase = createServerClient();

        const { data, error } = await supabase
            .from('restaurants')
            .update(body)
            .eq('id', id)
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
            restaurant: data,
        });

    } catch (error) {
        console.error('Update restaurant error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
