'use client';

import { MapPin, ChevronRight, X } from 'lucide-react';

interface Alternative {
    name: string;
    address?: string;
    city?: string;
    bookingLink?: string;
}

interface AlternativesListProps {
    alternatives: Alternative[];
    onSelect: (index: number) => void;
    onReset: () => void;
}

export function AlternativesList({ alternatives, onSelect, onReset }: AlternativesListProps) {
    return (
        <div className="space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
                    Did you mean...?
                </h2>
                <button onClick={onReset} className="p-2 rounded-full hover:bg-muted transition-base">
                    <X size={20} />
                </button>
            </div>
            <p className="text-muted-foreground">We found a few places. Pick the right one:</p>
            <div className="space-y-3">
                {alternatives.map((alt, index) => (
                    <button
                        key={index}
                        onClick={() => onSelect(index)}
                        className="w-full text-left bg-card rounded-2xl border p-4 hover:border-primary-500 hover:shadow-md transition-base"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold">{alt.name}</h3>
                                {alt.address && (
                                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                        <MapPin size={14} />
                                        {alt.address}
                                    </p>
                                )}
                                {alt.city && !alt.address && (
                                    <p className="text-sm text-muted-foreground mt-1">{alt.city}</p>
                                )}
                            </div>
                            <ChevronRight size={20} className="text-muted-foreground" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
