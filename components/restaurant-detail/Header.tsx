'use client';

import { Utensils, Edit2, Trash2, X } from 'lucide-react';
import type { Restaurant } from '@/lib/types';

interface HeaderProps {
    restaurant: Restaurant;
    onClose: () => void;
    onEdit?: (restaurant: Restaurant) => void;
    onDelete?: () => void;
}

export function Header({ restaurant, onClose, onEdit, onDelete }: HeaderProps) {
    return (
        <header className="px-4 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                {/* Logo */}
                {restaurant.logo_url ? (
                    <img
                        src={restaurant.logo_url}
                        alt={`${restaurant.name} logo`}
                        className="w-12 h-12 rounded-lg object-contain bg-muted shadow-sm flex-shrink-0"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shadow-sm flex-shrink-0">
                        <Utensils size={20} className="text-primary-500" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h1 className="font-bold text-2xl truncate bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
                        {restaurant.name}
                    </h1>
                    {restaurant.cuisine && (
                        <p className="text-muted-foreground">{restaurant.cuisine}</p>
                    )}
                </div>
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
                        onClick={onDelete}
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
    );
}
