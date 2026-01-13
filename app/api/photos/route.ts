import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase';

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

        const supabase = createServerClient();
        const uploadedPhotos: UploadResponse['photos'] = [];

        for (const file of files) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                continue; // Skip non-image files
            }

            // Generate unique filename
            const ext = file.name.split('.').pop() || 'jpg';
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(7);
            const storagePath = `restaurants/${restaurantId}/${timestamp}_${randomId}.${ext}`;

            // Convert File to ArrayBuffer then to Buffer
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('photos')
                .upload(storagePath, buffer, {
                    contentType: file.type,
                    upsert: false,
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                continue;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('photos')
                .getPublicUrl(storagePath);

            // Save to photos table
            const { data: photoRecord, error: dbError } = await supabase
                .from('photos')
                .insert({
                    restaurant_id: restaurantId,
                    storage_path: storagePath,
                })
                .select()
                .single();

            if (dbError) {
                console.error('DB error:', dbError);
                continue;
            }

            uploadedPhotos.push({
                id: photoRecord.id,
                storage_path: storagePath,
                url: urlData.publicUrl,
            });
        }

        if (uploadedPhotos.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No photos were uploaded successfully',
            });
        }

        return NextResponse.json({
            success: true,
            photos: uploadedPhotos,
        });

    } catch (error) {
        console.error('Upload API error:', error);
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

        const supabase = createServerClient();

        const { data: photos, error } = await supabase
            .from('photos')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('uploaded_at', { ascending: false });

        if (error) {
            return NextResponse.json({
                success: false,
                error: error.message,
                photos: [],
            });
        }

        // Add public URLs to photos
        const photosWithUrls = photos.map(photo => {
            const { data: urlData } = supabase.storage
                .from('photos')
                .getPublicUrl(photo.storage_path);

            return {
                ...photo,
                url: urlData.publicUrl,
            };
        });

        return NextResponse.json({
            success: true,
            photos: photosWithUrls,
        });

    } catch (error) {
        console.error('Get photos error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error', photos: [] },
            { status: 500 }
        );
    }
}
