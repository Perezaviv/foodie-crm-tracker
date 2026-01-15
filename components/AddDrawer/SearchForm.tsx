'use client';

import { Loader2, ChevronRight, Check, X, Utensils } from 'lucide-react';

interface SearchFormProps {
    input: string;
    isParsing: boolean;
    error: string | null;
    onInputChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export function SearchForm({ input, isParsing, error, onInputChange, onSubmit }: SearchFormProps) {
    return (
        <div className="space-y-6 animate-slide-up">
            <div className="text-center space-y-2 mb-8">
                <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4 animate-pulse-subtle">
                    <Utensils size={32} />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
                    Add a New Spot
                </h2>
                <p className="text-muted-foreground">
                    Paste a link or type a name. We&apos;ll do the magic.
                </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => onInputChange(e.target.value)}
                        placeholder="e.g. Vitrina, or instagram.com/..."
                        className="w-full px-4 py-4 rounded-2xl bg-muted border-2 border-transparent focus:border-primary-500 focus:bg-background transition-all outline-none text-lg"
                        disabled={isParsing}
                        autoFocus
                    />
                    {input && (
                        <button type="button" onClick={() => onInputChange('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {error && (
                    <div className="bg-red-100 text-red-700 rounded-xl p-3 text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isParsing || !input.trim()}
                    className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-lg shadow-lg shadow-primary-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
                >
                    {isParsing ? (
                        <>
                            <Loader2 size={24} className="animate-spin" />
                            Hunting for details...
                        </>
                    ) : (
                        <>
                            Search & Add <ChevronRight size={20} />
                        </>
                    )}
                </button>
            </form>

            <div className="bg-muted/40 rounded-2xl p-4 text-sm text-muted-foreground space-y-2 border border-dashed">
                <p className="flex items-center gap-2"><Check size={14} className="text-green-500" />Auto-finds address & photos</p>
                <p className="flex items-center gap-2"><Check size={14} className="text-green-500" />Supports Instagram links</p>
            </div>
        </div>
    );
}
