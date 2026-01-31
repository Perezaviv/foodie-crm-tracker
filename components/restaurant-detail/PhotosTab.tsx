'use client';

import { Upload } from 'lucide-react';
import { PhotoUpload } from '../PhotoUpload';
import { PhotoGallery } from '../PhotoGallery';

interface PhotosTabProps {
    restaurantId: string;
    showUpload: boolean;
    setShowUpload: (show: boolean) => void;
    photosKey: number;
    onUploadComplete: () => void;
}

export function PhotosTab({
    restaurantId,
    showUpload,
    setShowUpload,
    photosKey,
    onUploadComplete
}: PhotosTabProps) {
    return (
        <div className="space-y-4">
            {/* Upload Button */}
            {!showUpload && (
                <button
                    onClick={() => setShowUpload(true)}
                    className="w-full py-4 px-4 rounded-2xl border-2 border-dashed border-muted hover:border-primary-500 bg-muted/20 hover:bg-primary-50/50 transition-base flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary-500 group"
                >
                    <div className="p-3 rounded-full bg-background shadow-sm group-hover:scale-110 transition-base">
                        <Upload size={24} />
                    </div>
                    <span className="font-medium">Upload New Photos</span>
                </button>
            )}

            {/* Upload Form */}
            {showUpload && (
                <div className="bg-card border rounded-2xl p-4 shadow-sm animate-slide-up">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">Upload Photos</h3>
                        <button
                            onClick={() => setShowUpload(false)}
                            className="text-sm text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </button>
                    </div>
                    <PhotoUpload
                        restaurantId={restaurantId}
                        onUploadComplete={onUploadComplete}
                    />
                </div>
            )}

            {/* Photo Gallery */}
            <div className="min-h-[200px]">
                <PhotoGallery key={photosKey} restaurantId={restaurantId} />
            </div>
        </div>
    );
}
