'use client';

import { motion } from 'framer-motion';
import { GlassWater, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HappyHourSwitchProps {
    isHappyHourMode: boolean;
    onToggle: (enabled: boolean) => void;
    isLoading?: boolean;
}

export function HappyHourSwitch({ isHappyHourMode, onToggle, isLoading }: HappyHourSwitchProps) {
    return (
        <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl glass border border-white/10 shadow-inner">
            <button
                onClick={() => onToggle(false)}
                className={cn(
                    "relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                    !isHappyHourMode
                        ? "text-primary-foreground shadow-lg"
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                {!isHappyHourMode && (
                    <motion.div
                        layoutId="activeMode"
                        className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                <Utensils size={16} className={cn("transition-transform duration-300", !isHappyHourMode && "scale-110")} />
                <span>Restaurants</span>
            </button>

            <button
                onClick={() => onToggle(true)}
                className={cn(
                    "relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                    isHappyHourMode
                        ? "text-primary-foreground shadow-lg"
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                {isHappyHourMode && (
                    <motion.div
                        layoutId="activeMode"
                        className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                <GlassWater size={16} className={cn("transition-transform duration-300", isHappyHourMode && "scale-110")} />
                <span>Happy Hour</span>
                {isLoading && (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full ml-1"
                    />
                )}
            </button>
        </div>
    );
}

interface SeeAllToggleProps {
    showAll: boolean;
    onToggle: (show: boolean) => void;
}

export function SeeAllToggle({ showAll, onToggle }: SeeAllToggleProps) {
    return (
        <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-xl glass border border-white/10 shadow-inner ml-2">
            <button
                onClick={() => onToggle(!showAll)}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                    showAll
                        ? "bg-primary-100 text-primary-700"
                        : "text-muted-foreground hover:text-foreground"
                )}
            >
                <span className={cn("w-2 h-2 rounded-full", showAll ? "bg-primary-500" : "bg-gray-300")} />
                See All
            </button>
        </div>
    );
}
