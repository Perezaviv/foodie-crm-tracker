import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient, isSupabaseConfigured } from '@/lib/supabase';

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
    console.log('[Photos API] Start upload request');

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

        console.log(`[Photos API] Received request for restaurant: ${restaurantId}, file count: ${files?.length}`);

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

        const supabase = createAdminClient();
        const uploadedPhotos: UploadResponse['photos'] = [];
        const errors: string[] = [];

        // Check for Service Role Key availability (debugging aid)
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.warn('⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Photo uploads may fail if RLS is enabled.');
        }

        console.log('[Photos API] Processing files...');

        for (const file of files) {
            // Validate file type
            console.log(`[Photos API] Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);
            if (!file.type.startsWith('image/')) {
                console.warn(`[Photos API] Skipping non-image file: ${file.name}`);
                continue;
            }

            try {
                // Generate unique filename
                const ext = file.name.split('.').pop() || 'jpg';
                const timestamp = Date.now();
                const randomId = Math.random().toString(36).substring(7);
                const storagePath = `restaurants/${restaurantId}/${timestamp}_${randomId}.${ext}`;

                // Convert File to ArrayBuffer then to Buffer
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // Upload to Supabase Storage
                console.log(`[Photos API] Uploading to storage: ${storagePath}`);
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('photos')
                    .upload(storagePath, buffer, {
                        contentType: file.type,
                        upsert: false,
                    });

                if (uploadError) {
                    console.error('[Photos API] Storage upload error:', uploadError);
                    errors.push(`Failed to upload ${file.name}: ${uploadError.message}`);
                    continue;
                }

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('photos')
                    .getPublicUrl(storagePath);

                console.log(`[Photos API] Uploaded to storage. Public URL: ${urlData.publicUrl}`);

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
                    console.error('[Photos API] Database insert error:', dbError);
                    // attempt cleanup?
                    errors.push(`Failed to save record for ${file.name}: ${dbError.message}`);
                    continue;
                }

                console.log(`[Photos API] Database record created: ${photoRecord.id}`);

                uploadedPhotos.push({
                    id: photoRecord.id,
                    storage_path: storagePath,
                    url: urlData.publicUrl,
                });
            } catch (loopError) {
                console.error('Error processing file:', file.name, loopError);
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

        console.log(`[Photos API] Successfully uploaded ${uploadedPhotos.length} photos`);

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
