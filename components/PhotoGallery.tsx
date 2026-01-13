'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoGalleryProps {
    restaurantId: string;
}

interface Photo {
    id: string;
    storage_path: string;
    url: string;
    caption?: string;
    uploaded_at: string;
}

export function PhotoGallery({ restaurantId }: PhotoGalleryProps) {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    useEffect(() => {
        fetchPhotos();
    }, [restaurantId]);

    const fetchPhotos = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/photos?restaurantId=${restaurantId}`);
            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Failed to load photos');
                return;
            }

            setPhotos(data.photos || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load photos');
        } finally {
            setIsLoading(false);
        }
    };

    const openLightbox = (index: number) => {
        setSelectedIndex(index);
    };

    const closeLightbox = () => {
        setSelectedIndex(null);
    };

    const goToPrevious = () => {
        if (selectedIndex === null) return;
        setSelectedIndex(selectedIndex === 0 ? photos.length - 1 : selectedIndex - 1);
    };

    const goToNext = () => {
        if (selectedIndex === null) return;
        setSelectedIndex(selectedIndex === photos.length - 1 ? 0 : selectedIndex + 1);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-primary-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-sm text-red-500">{error}</p>
                <button
                    onClick={fetchPhotos}
                    className="mt-2 text-sm text-primary-500 hover:underline"
                >
                    Try again
                </button>
            </div>
        );
    }

    if (photos.length === 0) {
        return null;
    }

    return (
        <>
            {/* Photo Grid */}
            <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
                {photos.map((photo, index) => (
                    <button
                        key={photo.id}
                        onClick={() => openLightbox(index)}
                        className="aspect-square relative overflow-hidden bg-muted hover:opacity-90 transition-base"
                    >
                        <img
                            src={photo.url}
                            alt={photo.caption || `Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    </button>
                ))}
            </div>

            {/* Lightbox */}
            {selectedIndex !== null && (
                <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                    {/* Close button */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-base"
                    >
                        <X size={24} />
                    </button>

                    {/* Navigation */}
                    {photos.length > 1 && (
                        <>
                            <button
                                onClick={goToPrevious}
                                className="absolute left-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-base"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                onClick={goToNext}
                                className="absolute right-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-base"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </>
                    )}

                    {/* Image */}
                    <img
                        src={photos[selectedIndex].url}
                        alt={photos[selectedIndex].caption || `Photo ${selectedIndex + 1}`}
                        className="max-w-full max-h-full object-contain"
                    />

                    {/* Counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                        {selectedIndex + 1} / {photos.length}
                    </div>
                </div>
            )}
        </>
    );
}
