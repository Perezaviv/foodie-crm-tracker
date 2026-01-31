import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, getRestaurantById, updateRestaurant, deleteRestaurant } from '@/lib/skills/db';

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

        const result = await deleteRestaurant(id);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
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

        const result = await getRestaurantById(id);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
            });
        }

        return NextResponse.json({
            success: true,
            restaurant: result.data,
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

        const result = await updateRestaurant(id, body);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
            });
        }

        return NextResponse.json({
            success: true,
            restaurant: result.data,
        });

    } catch (error) {
        console.error('Update restaurant error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
