'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer } from 'vaul';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Map, List, Plus, User, Loader2, Check, MapPin, ExternalLink, ChevronRight, X, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRestaurantParser, useRestaurants } from '@/hooks';
import { RestaurantMap, RestaurantList, RestaurantDetail } from '@/components';
import type { Restaurant } from '@/lib/types';

type View = 'map' | 'list' | 'profile';

export default function Home() {
  const [activeView, setActiveView] = useState<View>('list');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const { restaurants, isLoading: restaurantsLoading, refresh } = useRestaurants();

  const handleRestaurantAdded = () => {
    refresh();
    setIsAddDrawerOpen(false);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f97316', '#ea580c', '#fb923c', '#ffffff']
    });
    toast.success('Restaurant saved!', {
      description: 'Time to plan your next meal 🍽️',
      duration: 3000,
    });
  };

  const handleRestaurantClick = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const handleRestaurantDeleted = () => {
    setSelectedRestaurant(null);
    refresh();
    toast.info('Restaurant removed', { icon: '🗑️' });
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden relative">
      <div className="absolute inset-0 mesh-subtle pointer-events-none z-0" />

      {/* Header */}
      <header className="glass border-b px-4 py-3 sticky top-0 z-40 flex-shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <span className="text-white font-bold text-sm">🍽️</span>
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
              Foodie CRM
            </h1>
          </div>
          <div className="text-sm text-muted-foreground font-medium bg-muted/50 px-3 py-1 rounded-full">
            {restaurantsLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              `${restaurants.length} places`
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative z-0">
        <AnimatePresence mode="wait">
          {activeView === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full"
            >
              <RestaurantMap
                restaurants={restaurants}
                onRestaurantClick={handleRestaurantClick}
              />
            </motion.div>
          )}
          {activeView === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full w-full"
            >
              <RestaurantList
                restaurants={restaurants}
                onRestaurantClick={handleRestaurantClick}
              />
            </motion.div>
          )}
          {activeView === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full w-full"
            >
              <ProfileView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <nav className="glass border-t safe-bottom sticky bottom-0 z-40">
        <div className="flex items-center justify-around py-2 max-w-md mx-auto">
          <NavButton
            icon={<Map size={24} />}
            label="Map"
            active={activeView === 'map'}
            onClick={() => setActiveView('map')}
          />
          <NavButton
            icon={<List size={24} />}
            label="List"
            active={activeView === 'list'}
            onClick={() => setActiveView('list')}
          />

          <button
            onClick={() => setIsAddDrawerOpen(true)}
            className="relative -top-5"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex flex-col items-center justify-center shadow-xl shadow-primary-500/30 animate-pulse-subtle hover:scale-105 active:scale-95 transition-transform">
              <Plus size={28} />
            </div>
            <span className="text-xs font-semibold mt-1 block text-primary-600 dark:text-primary-400">Add</span>
          </button>

          <NavButton
            icon={<User size={24} />}
            label="Profile"
            active={activeView === 'profile'}
            onClick={() => setActiveView('profile')}
          />
        </div>
      </nav>

      {/* Drawers & Modals */}

      {/* Add Restaurant Drawer */}
      <AddDrawer
        open={isAddDrawerOpen}
        onOpenChange={setIsAddDrawerOpen}
        onSuccess={handleRestaurantAdded}
      />

      {/* Restaurant Detail Drawer */}
      {selectedRestaurant && (
        <RestaurantDetail
          restaurant={selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
          onDelete={handleRestaurantDeleted}
        />
      )}
    </div>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 active:scale-90',
        active
          ? 'text-primary-500'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <div className={cn("transition-transform duration-200", active && "scale-110")}>
        {icon}
      </div>
      <span className={cn('text-[10px] font-medium transition-colors', active ? "text-primary-600 dark:text-primary-400" : "text-muted-foreground")}>
        {label}
      </span>
    </button>
  );
}

// ===================================
// ADD DRAWER - Refactored
// ===================================
function AddDrawer({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) {
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
      reset();
      setInput('');
      onSuccess();
    }
  };

  const handleReset = () => {
    reset();
    setInput('');
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Drawer.Content className="bg-background flex flex-col rounded-t-[10px] h-[90%] mt-24 fixed bottom-0 left-0 right-0 z-50 focus:outline-none">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mt-4 mb-4" />

          <div className="flex-1 overflow-y-auto px-4 pb-8 max-w-md mx-auto w-full">
            {/* AMBIGUOUS SELECTION STATE */}
            {requiresSelection && alternatives ? (
              <div className="space-y-4 animate-slide-up">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
                    Did you mean...?
                  </h2>
                  <button onClick={handleReset} className="p-2 rounded-full hover:bg-muted transition-base">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-muted-foreground">We found a few places. Pick the right one:</p>
                <div className="space-y-3">
                  {alternatives.map((alt, index) => (
                    <button
                      key={index}
                      onClick={() => selectAlternative(index)}
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
            ) : parsedRestaurant ? (
              // CONFIRMATION STATE
              <div className="space-y-4 animate-slide-up">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
                    Confirm Details
                  </h2>
                  <button onClick={handleReset} className="p-2 rounded-full hover:bg-muted transition-base">
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-card rounded-2xl border p-5 shadow-sm space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Name</label>
                    <p className="font-bold text-xl">{parsedRestaurant.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {parsedRestaurant.cuisine && (
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Cuisine</label>
                        <p>{parsedRestaurant.cuisine}</p>
                      </div>
                    )}
                    {parsedRestaurant.city && (
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">City</label>
                        <p>{parsedRestaurant.city}</p>
                      </div>
                    )}
                  </div>

                  {parsedRestaurant.address && (
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Address</label>
                      <p className="flex items-start gap-1">
                        <MapPin size={16} className="flex-shrink-0 mt-0.5 text-primary-500" />
                        {parsedRestaurant.address}
                      </p>
                    </div>
                  )}

                  {parsedRestaurant.booking_link && (
                    <div className="pt-2 border-t border-dashed">
                      <a href={parsedRestaurant.booking_link} target="_blank" className="text-primary-500 hover:underline flex items-center gap-1 text-sm font-medium">
                        <ExternalLink size={14} />
                        Booking Link Found
                      </a>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl p-3 text-sm flex items-center gap-2">
                    <X size={16} /> {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={handleReset} className="flex-1 py-3 px-4 rounded-xl border hover:bg-muted font-medium transition-base">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold shadow-lg shadow-primary-500/25 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 transition-base flex items-center justify-center gap-2">
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                    {isSaving ? 'Saving...' : 'Save It!'}
                  </button>
                </div>
              </div>
            ) : (
              // INPUT STATE
              <div className="space-y-6 animate-slide-up">
                <div className="text-center space-y-2 mb-8">
                  <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto mb-4 animate-pulse-subtle">
                    <Utensils size={32} />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
                    Add a New Spot
                  </h2>
                  <p className="text-muted-foreground">
                    Paste a link or type a name. We&apos;ll do the magic.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="e.g. Vitrina, or instagram.com/..."
                      className="w-full px-4 py-4 rounded-2xl bg-muted border-2 border-transparent focus:border-primary-500 focus:bg-background transition-all outline-none text-lg"
                      disabled={isParsing}
                      autoFocus
                    />
                    {input && (
                      <button type="button" onClick={() => setInput('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X size={20} />
                      </button>
                    )}
                  </div>

                  {error && (
                    <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl p-3 text-sm">
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
                  <p className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Auto-finds address & photos</p>
                  <p className="flex items-center gap-2"><Check size={14} className="text-green-500" /> Supports Instagram links</p>
                </div>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ===================================
// PROFILE VIEW
// ===================================
function ProfileView() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted/30 p-6">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center mb-6 shadow-iner animate-pulse-subtle">
        <User size={48} className="text-primary-500" />
      </div>
      <h2 className="text-2xl font-bold mb-2">My Profile</h2>
      <p className="text-muted-foreground text-center max-w-sm mb-8">
        Sign in to sync your tasty discoveries across all your devices.
      </p>
      <button className="py-3 px-8 rounded-xl bg-foreground text-background font-semibold shadow-lg hover:scale-105 active:scale-95 transition-all">
        Sign In / Sign Up
      </button>
      <p className="text-xs text-muted-foreground mt-6 opacity-60">
        v0.1.0 • Built with ❤️ by Foodie CRM
      </p>
    </div>
  );
}
