import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

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

    const fetchPhotos = useCallback(async () => {
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
    }, [restaurantId]);

    useEffect(() => {
        fetchPhotos();
    }, [fetchPhotos]);

    const handleDelete = async (photo: Photo, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this photo?')) return;

        try {
            const response = await fetch(`/api/photos?id=${photo.id}&path=${encodeURIComponent(photo.storage_path)}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setPhotos(prev => prev.filter(p => p.id !== photo.id));
                if (selectedIndex !== null) closeLightbox();
            } else {
                alert('Failed to delete photo');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete photo');
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
                        className="aspect-square relative overflow-hidden bg-muted hover:opacity-90 transition-base group"
                    >
                        <Image
                            src={photo.url}
                            alt={photo.caption || `Photo ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 33vw, 20vw"
                        />
                        <button
                            onClick={(e) => handleDelete(photo, e)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                            title="Delete photo"
                        >
                            <Trash2 size={14} />
                        </button>
                    </button>
                ))}
            </div>

            {/* Lightbox */}
            {selectedIndex !== null && (
                <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                    {/* Delete button (Lightbox) */}
                    <button
                        onClick={(e) => handleDelete(photos[selectedIndex], e)}
                        className="absolute top-4 right-16 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-red-500/50 transition-base"
                        title="Delete photo"
                    >
                        <Trash2 size={20} />
                    </button>

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
                    <div className="relative w-full h-full max-w-4xl max-h-[80vh] mx-4">
                        <Image
                            src={photos[selectedIndex].url}
                            alt={photos[selectedIndex].caption || `Photo ${selectedIndex + 1}`}
                            fill
                            className="object-contain"
                            unoptimized
                        />
                    </div>

                    {/* Counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                        {selectedIndex + 1} / {photos.length}
                    </div>
                </div>
            )}
        </>
    );
}
