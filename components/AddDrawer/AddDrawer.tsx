'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { useRestaurantParser } from '@/hooks';
import { AlternativesList } from './AlternativesList';
import { RestaurantConfirmation } from './RestaurantConfirmation';
import { SearchForm } from './SearchForm';

interface AddDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AddDrawer({ open, onOpenChange, onSuccess }: AddDrawerProps) {
    const [input, setInput] = useState('');
    const {
        parse,
        selectAlternative,
        save,
        reset,
        isParsing,
        isSaving,
        error,
        parsedRestaurant,
        alternatives,
        requiresSelection,
    } = useRestaurantParser();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        await parse(input);
    };

    const handleSave = async () => {
        const saved = await save();
        if (saved) {
            handleReset();
            onSuccess();
        }
    };

    const handleReset = () => {
        reset();
        setInput('');
    };

    // Determine which view to render
    const renderContent = () => {
        if (requiresSelection && alternatives) {
            return (
                <AlternativesList
                    alternatives={alternatives}
                    onSelect={selectAlternative}
                    onReset={handleReset}
                />
            );
        }

        if (parsedRestaurant) {
            return (
                <RestaurantConfirmation
                    restaurant={parsedRestaurant}
                    isSaving={isSaving}
                    error={error}
                    onSave={handleSave}
                    onReset={handleReset}
                />
            );
        }

        return (
            <SearchForm
                input={input}
                isParsing={isParsing}
                error={error}
                onInputChange={setInput}
                onSubmit={handleSubmit}
            />
        );
    };

    return (
        <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
                <Drawer.Content
                    className="bg-background flex flex-col rounded-t-[10px] max-h-[85dvh] fixed bottom-0 left-0 right-0 z-50 focus:outline-none"
                    aria-describedby="add-drawer-description"
                >
                    <Drawer.Title className="sr-only">Add a New Restaurant</Drawer.Title>
                    <p id="add-drawer-description" className="sr-only">
                        Enter a restaurant name or paste a link to add a new restaurant to your collection.
                    </p>
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mt-4 mb-4" />

                    <div className="flex-1 overflow-y-auto px-4 pb-8 max-w-md mx-auto w-full">
                        {renderContent()}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
