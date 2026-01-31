'use client';

import { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { cn } from '@/lib/utils';
import type { Restaurant } from '@/lib/types';
import { useRestaurants, useComments } from '@/lib/skills/ui';

// Sub-components
import { Header } from './restaurant-detail/Header';
import { InfoTab } from './restaurant-detail/InfoTab';
import { PhotosTab } from './restaurant-detail/PhotosTab';
import { CommentsTab } from './restaurant-detail/CommentsTab';

interface RestaurantDetailProps {
    restaurant: Restaurant;
    onClose: () => void;
    onEdit?: (restaurant: Restaurant) => void;
    onDelete?: (restaurant: Restaurant) => void;
}

export function RestaurantDetail({ restaurant, onClose, onEdit, onDelete }: RestaurantDetailProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'photos' | 'comments'>('info');
    const [showUpload, setShowUpload] = useState(false);
    const [photosKey, setPhotosKey] = useState(0);
    const [currentRating, setCurrentRating] = useState(restaurant.rating);
    const [isRating, setIsRating] = useState(false);
    const [newComment, setNewComment] = useState('');

    const { updateRestaurant, deleteRestaurant } = useRestaurants();
    const {
        comments,
        isLoading: isLoadingComments,
        isSubmitting: isSubmittingComment,
        fetchComments,
        submitComment
    } = useComments();

    // Fetch comments when tab switches to comments
    useEffect(() => {
        if (activeTab === 'comments') {
            fetchComments(restaurant.id);
        }
    }, [activeTab, restaurant.id, fetchComments]);

    const onSubmitComment = async () => {
        if (!newComment.trim()) return;
        const comment = await submitComment(restaurant.id, newComment);
        if (comment) {
            setNewComment('');
        }
    };

    const handleRatingChange = async (newRating: number) => {
        if (isRating) return;

        setIsRating(true);
        const previousRating = currentRating;
        setCurrentRating(newRating); // Optimistic update

        const success = await updateRestaurant(restaurant.id, { rating: newRating });
        if (!success) {
            setCurrentRating(previousRating); // Revert on failure
        }
        setIsRating(false);
    };

    const handleUploadComplete = () => {
        setShowUpload(false);
        setPhotosKey(prev => prev + 1); // Refresh gallery
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${restaurant.name}"? This cannot be undone.`)) return;

        const success = await deleteRestaurant(restaurant.id);
        if (success) {
            onDelete?.(restaurant);
            onClose();
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
                        <Header
                            restaurant={restaurant}
                            onClose={onClose}
                            onEdit={onEdit}
                            onDelete={handleDelete}
                        />

                        {/* Tabs Navigation */}
                        <div className="px-4 flex gap-4 mb-4">
                            {(['info', 'photos', 'comments'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        'flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200 capitalize',
                                        activeTab === tab
                                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    )}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Content Scroll Area */}
                        <div className="flex-1 overflow-y-auto px-4 pb-8">
                            {activeTab === 'info' && (
                                <InfoTab
                                    restaurant={restaurant}
                                    currentRating={currentRating}
                                    isRating={isRating}
                                    onRatingChange={handleRatingChange}
                                />
                            )}

                            {activeTab === 'photos' && (
                                <PhotosTab
                                    restaurantId={restaurant.id}
                                    showUpload={showUpload}
                                    setShowUpload={setShowUpload}
                                    photosKey={photosKey}
                                    onUploadComplete={handleUploadComplete}
                                />
                            )}

                            {activeTab === 'comments' && (
                                <CommentsTab
                                    comments={comments}
                                    isLoading={isLoadingComments}
                                    isSubmitting={isSubmittingComment}
                                    newComment={newComment}
                                    setNewComment={setNewComment}
                                    onSubmitComment={onSubmitComment}
                                />
                            )}
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
