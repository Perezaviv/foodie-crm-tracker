'use client';

import { motion } from 'framer-motion';
import { Locate, Moon, Sun, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapControlsProps {
    onLocate: () => void;
    isLocating: boolean;
    isHappyHour: boolean;
    onToggleHappyHour: () => void;
    currentTheme: 'light' | 'dark';
}

export function MapControls({
    onLocate,
    isLocating,
    isHappyHour,
    onToggleHappyHour,
    currentTheme
}: MapControlsProps) {
    return (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
            {/* Happy Hour Toggle Pill */}
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onToggleHappyHour}
                className={cn(
                    "relative overflow-hidden group flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl transition-all duration-300 border backdrop-blur-xl",
                    isHappyHour
                        ? "bg-slate-900/80 border-purple-500/50 text-white"
                        : "bg-white/80 border-white/50 text-slate-700"
                )}
            >
                <div className={cn(
                    "absolute inset-0 opacity-20 transition-opacity duration-300",
                    isHappyHour ? "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500" : "bg-transparent"
                )} />

                <span className="relative text-xl">
                    {isHappyHour ? '🍹' : '🍽️'}
                </span>
                <div className="flex flex-col items-start relative">
                    <span className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        isHappyHour ? "text-fuchsia-300" : "text-slate-500"
                    )}>
                        Mode
                    </span>
                    <span className="text-sm font-bold leading-none">
                        {isHappyHour ? 'Happy Hour' : 'Standard'}
                    </span>
                </div>
            </motion.button>

            {/* Filter / Search Pill (Visual only for now) */}
            <motion.div
                className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-black/60 backdrop-blur-md rounded-full border border-white/20 shadow-lg w-max"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Filter size={14} className="text-slate-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Showing <strong>All Places</strong>
                </span>
            </motion.div>
        </div>
    );
}
