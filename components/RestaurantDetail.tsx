'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { MapPin, ExternalLink, Star, Clock, Edit2, Upload, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PhotoUpload } from './PhotoUpload';
import { PhotoGallery } from './PhotoGallery';
import type { Restaurant } from '@/lib/types';

interface RestaurantDetailProps {
    restaurant: Restaurant;
    onClose: () => void;
    onEdit?: (restaurant: Restaurant) => void;
    onDelete?: (restaurant: Restaurant) => void;
}

export function RestaurantDetail({ restaurant, onClose, onEdit, onDelete }: RestaurantDetailProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'photos'>('info');
    const [showUpload, setShowUpload] = useState(false);
    const [photosKey, setPhotosKey] = useState(0);

    const handleUploadComplete = () => {
        setShowUpload(false);
        setPhotosKey(prev => prev + 1); // Refresh gallery
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${restaurant.name}"? This cannot be undone.`)) return;

        try {
            const response = await fetch(`/api/restaurants/${restaurant.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                onDelete?.(restaurant);
                onClose();
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    return (
        <Drawer.Root open={true} onOpenChange={(open) => !open && onClose()} shouldScaleBackground>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
                <Drawer.Content className="bg-background flex flex-col rounded-t-[10px] h-[96%] mt-24 fixed bottom-0 left-0 right-0 z-50 focus:outline-none">
                    <Drawer.Title className="sr-only">{restaurant.name}</Drawer.Title>
                    <Drawer.Description className="sr-only">
                        Details and photos for {restaurant.name}
                    </Drawer.Description>
                    {/* Visual Handle */}
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mt-4 mb-4" />

                    <div className="flex-1 flex flex-col overflow-hidden max-w-md mx-auto w-full">
                        {/* Header */}
                        <header className="px-4 pb-4 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <h1 className="font-bold text-2xl truncate bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
                                    {restaurant.name}
                                </h1>
                                {restaurant.cuisine && (
                                    <p className="text-muted-foreground">{restaurant.cuisine}</p>
                                )}
                            </div>
                            <div className="flex gap-2 ml-4">
                                {onEdit && (
                                    <button
                                        onClick={() => onEdit(restaurant)}
                                        className="p-2 rounded-full hover:bg-muted transition-base"
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={handleDelete}
                                        className="p-2 rounded-full hover:bg-red-100 text-red-500 transition-base"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-muted transition-base"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </header>

                        {/* Tabs */}
                        <div className="px-4 flex gap-4 mb-4">
                            <button
                                onClick={() => setActiveTab('info')}
                                className={cn(
                                    'flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200',
                                    activeTab === 'info'
                                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                )}
                            >
                                Info
                            </button>
                            <button
                                onClick={() => setActiveTab('photos')}
                                className={cn(
                                    'flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200',
                                    activeTab === 'photos'
                                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                )}
                            >
                                Photos
                            </button>
                        </div>

                        {/* Content Scroll Area */}
                        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6">
                            {activeTab === 'info' && (
                                <>
                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {restaurant.booking_link ? (
                                            (() => {
                                                const getBookingProvider = (url: string) => {
                                                    const lowerUrl = url.toLowerCase();
                                                    if (lowerUrl.includes('tabit')) return 'Tabit';
                                                    if (lowerUrl.includes('ontopo')) return 'Ontopo';
                                                    return 'Table';
                                                };
                                                const provider = getBookingProvider(restaurant.booking_link);

                                                return (
                                                    <a
                                                        href={restaurant.booking_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="col-span-2 py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold text-center shadow-lg shadow-primary-500/25 hover:shadow-xl active:scale-[0.98] transition-base flex items-center justify-center gap-2"
                                                    >
                                                        Book on {provider}
                                                        <ExternalLink size={16} />
                                                    </a>
                                                );
                                            })()
                                        ) : (
                                            <div className="col-span-2 py-3 px-4 rounded-xl bg-muted text-muted-foreground text-center text-sm font-medium">
                                                No booking link available
                                            </div>
                                        )}

                                        {restaurant.lat && restaurant.lng && (
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="py-3 px-4 rounded-xl border-2 border-primary-100 hover:border-primary-500 text-primary-600 font-medium text-center transition-base flex items-center justify-center gap-2"
                                            >
                                                <MapPin size={18} />
                                                Directions
                                            </a>
                                        )}

                                        {restaurant.social_link && (
                                            <a
                                                href={restaurant.social_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="py-3 px-4 rounded-xl border-2 border-transparent bg-muted hover:bg-muted/80 font-medium text-center transition-base flex items-center justify-center gap-2"
                                            >
                                                Socials
                                                <ExternalLink size={16} />
                                            </a>
                                        )}
                                    </div>

                                    {/* Info Cards */}
                                    <div className="space-y-4">
                                        <div className="bg-muted/30 p-4 rounded-2xl space-y-3">
                                            {/* Rating */}
                                            {restaurant.rating && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Rating</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="flex">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <Star
                                                                    key={star}
                                                                    size={16}
                                                                    className={cn(
                                                                        star <= restaurant.rating!
                                                                            ? 'text-yellow-400 fill-yellow-400'
                                                                            : 'text-muted-foreground/30'
                                                                    )}
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                                            {restaurant.rating}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Address */}
                                            {restaurant.address && (
                                                <div className="pt-3 border-t border-dashed border-muted-foreground/20">
                                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Address</span>
                                                    <p className="mt-1 text-sm">{restaurant.address}</p>
                                                    {restaurant.city && <p className="text-sm text-muted-foreground">{restaurant.city}</p>}
                                                </div>
                                            )}

                                            {/* Status */}
                                            <div className="pt-3 border-t border-dashed border-muted-foreground/20 flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Status</span>
                                                <div className={cn(
                                                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                                                    restaurant.is_visited
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-orange-100 text-orange-700"
                                                )}>
                                                    <Clock size={12} />
                                                    {restaurant.is_visited ? 'Visited' : 'Want to visit'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        {restaurant.notes && (
                                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                                <span className="text-xs text-amber-700 uppercase tracking-wider font-semibold flex items-center gap-1.5 mb-2">
                                                    <Edit2 size={12} />
                                                    My Notes
                                                </span>
                                                <p className="text-sm text-amber-900 leading-relaxed">
                                                    {restaurant.notes}
                                                </p>
                                            </div>
                                        )}

                                        <p className="text-xs text-center text-muted-foreground/50 pt-4">
                                            Added on {new Date(restaurant.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </>
                            )}

                            {activeTab === 'photos' && (
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
                                                restaurantId={restaurant.id}
                                                onUploadComplete={handleUploadComplete}
                                            />
                                        </div>
                                    )}

                                    {/* Photo Gallery */}
                                    <div className="min-h-[200px]">
                                        <PhotoGallery key={photosKey} restaurantId={restaurant.id} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
