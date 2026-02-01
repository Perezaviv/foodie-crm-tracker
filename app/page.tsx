'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Map, List, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRestaurants } from '@/hooks';
import { AppMode } from '@/hooks/useRestaurants';
import { RestaurantMap, RestaurantList, RestaurantDetail, HappyHourSwitch, SeeAllToggle } from '@/components';
import { AddDrawer } from '@/components/AddDrawer';
import type { Restaurant } from '@/lib/types';

type View = 'map' | 'list';

export default function Home() {
  const [activeView, setActiveView] = useState<View>('list');
  const [mode, setMode] = useState<AppMode>('regular');
  const [showAllHappyHours, setShowAllHappyHours] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const { restaurants, isLoading: restaurantsLoading, refresh } = useRestaurants(mode);

  const handleRestaurantAdded = () => {
    refresh();
    setIsAddDrawerOpen(false);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#dc2626', '#b91c1c', '#f87171', '#fbbf24']
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

  const handleDeleteRestaurant = async (id: string) => {
    const loadingToast = toast.loading('Deleting restaurant...');
    try {
      const response = await fetch(`/api/restaurants/${id}`, { method: 'DELETE' });

      if (response.ok) {
        refresh();
        toast.success('Restaurant deleted', { id: loadingToast });
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete', { id: loadingToast });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete restaurant', { id: loadingToast });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      <div className="absolute inset-0 mesh-subtle pointer-events-none z-0" />

      {/* Header */}
      <header className="glass border-b px-4 py-3 sticky top-0 z-40 flex-shrink-0">
        <div className="flex flex-col gap-3 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                <span className="text-white font-bold text-sm">❤️‍🔥</span>
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
                Burnt On Food
              </h1>
            </div>
            <div className="text-sm text-muted-foreground font-medium bg-muted/50 px-3 py-1 rounded-full flex items-center gap-2">
              {restaurantsLoading ? (
                <Loader2 size={14} className="animate-spin text-primary-500" />
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {restaurants.length} {mode === 'happy_hour' ? 'happy hours' : 'places'}
                </>
              )}
            </div>
          </div>

          <div className="flex justify-center items-center">
            <HappyHourSwitch
              isHappyHourMode={mode === 'happy_hour'}
              onToggle={(enabled) => setMode(enabled ? 'happy_hour' : 'regular')}
              isLoading={restaurantsLoading}
            />
            <AnimatePresence>
              {mode === 'happy_hour' && (
                <motion.div
                  initial={{ opacity: 0, width: 0, scale: 0.8 }}
                  animate={{ opacity: 1, width: 'auto', scale: 1 }}
                  exit={{ opacity: 0, width: 0, scale: 0.8 }}
                  className="overflow-hidden"
                >
                  <SeeAllToggle
                    showAll={showAllHappyHours}
                    onToggle={setShowAllHappyHours}
                  />
                </motion.div>
              )}
            </AnimatePresence>
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
                isLoading={restaurantsLoading}
                onRestaurantClick={handleRestaurantClick}
                isHappyHourMode={mode === 'happy_hour'}
                showAllHappyHours={showAllHappyHours}
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
                isLoading={restaurantsLoading}
                onRestaurantClick={handleRestaurantClick}
                onDelete={handleDeleteRestaurant}
                isHappyHourMode={mode === 'happy_hour'}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <nav className="glass border-t sticky bottom-0 z-40 pb-safe">
        <div className="flex items-center justify-around pt-2 pb-6 safe-bottom max-w-md mx-auto">
          <NavButton
            icon={<Map size={24} />}
            label="Map"
            active={activeView === 'map'}
            onClick={() => setActiveView('map')}
          />

          <button
            onClick={() => setIsAddDrawerOpen(true)}
            className="flex flex-col items-center gap-1 -mt-2 transition-all duration-200 active:scale-90"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/20 hover:scale-105 transition-transform">
              <Plus size={24} />
            </div>
            <span className="text-[10px] font-medium text-primary-600">Add</span>
          </button>

          <NavButton
            icon={<List size={24} />}
            label="List"
            active={activeView === 'list'}
            onClick={() => setActiveView('list')}
          />
        </div>
      </nav>

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
      <span className={cn('text-[10px] font-medium transition-colors', active ? "text-primary-600" : "text-muted-foreground")}>
        {label}
      </span>
    </button>
  );
}
