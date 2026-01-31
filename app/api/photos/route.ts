import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, getPhotos, uploadPhoto, deletePhoto } from '@/lib/skills/db';

export const dynamic = 'force-dynamic';

export interface UploadResponse {
    success: boolean;
    photos?: Array<{
        id: string;
        storage_path: string;
        url: string;
    }>;
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
    if (!isSupabaseConfigured()) {
        console.error('[Photos API] Supabase not configured');
        return NextResponse.json({
            success: false,
            error: 'Storage not configured. Please set up Supabase credentials.',
        }, { status: 503 });
    }

    try {
        const formData = await request.formData();
        const restaurantId = formData.get('restaurantId') as string;
        const files = formData.getAll('files') as File[];

        if (!restaurantId) {
            return NextResponse.json(
                { success: false, error: 'Restaurant ID is required' },
                { status: 400 }
            );
        }

        if (!files || files.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No files provided' },
                { status: 400 }
            );
        }

        const uploadedPhotos: UploadResponse['photos'] = [];
        const errors: string[] = [];

        for (const file of files) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                continue;
            }

            try {
                // Convert File to ArrayBuffer then to Buffer
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                const result = await uploadPhoto(buffer, file.type, restaurantId, file.name);

                if (result.success && result.data) {
                    uploadedPhotos.push({
                        id: result.data.id,
                        storage_path: result.data.storage_path,
                        url: result.data.url,
                    });
                } else {
                    errors.push(`Failed to upload ${file.name}: ${result.error}`);
                }
            } catch (loopError) {
                console.error('[Photos API] Error processing file:', file.name, loopError);
                errors.push(`Error processing ${file.name}: ${loopError instanceof Error ? loopError.message : String(loopError)}`);
            }
        }

        if (uploadedPhotos.length === 0) {
            console.error('[Photos API] No photos uploaded successfully. Errors:', errors);
            return NextResponse.json({
                success: false,
                error: errors.length > 0 ? errors.join(', ') : 'No valid photos found',
            });
        }

        return NextResponse.json({
            success: true,
            photos: uploadedPhotos,
        });

    } catch (error) {
        console.error('[Photos API] Global error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Get photos for a restaurant
export async function GET(request: NextRequest): Promise<NextResponse> {
    if (!isSupabaseConfigured()) {
        return NextResponse.json({
            success: false,
            error: 'Storage not configured',
            photos: [],
        }, { status: 503 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const restaurantId = searchParams.get('restaurantId');

        if (!restaurantId) {
            return NextResponse.json(
                { success: false, error: 'Restaurant ID is required', photos: [] },
                { status: 400 }
            );
        }

        const result = await getPhotos(restaurantId);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
                photos: [],
            });
        }

        return NextResponse.json({
            success: true,
            photos: result.data || [],
        });

    } catch (error) {
        console.error('[Photos API] Get photos error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error', photos: [] },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    if (!isSupabaseConfigured()) {
        return NextResponse.json({
            success: false,
            error: 'Storage not configured',
        }, { status: 503 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const storagePath = searchParams.get('path');

        if (!id || !storagePath) {
            return NextResponse.json(
                { success: false, error: 'Photo ID and path are required' },
                { status: 400 }
            );
        }

        const result = await deletePhoto(id, storagePath);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
            });
        }

        return NextResponse.json({
            success: true,
        });

    } catch (error) {
        console.error('[Photos API] Delete photo error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
