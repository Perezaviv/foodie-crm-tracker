import { Restaurant } from './types'

export interface HappyHour extends Partial<Restaurant> {
    name: string;
    hh_days: string[] | null;
    hh_times: string | null;
    hh_drinks: string | null;
    hh_food: string | null;
    address: string | null;
    source_url: string;
    rating?: number; // 1=Bronze, 2=Silver, 3=Gold
    start_time?: string | null; // HH:MM
    end_time?: string | null;   // HH:MM
}

export type LocationMode = 'regular' | 'happy_hour';

export interface LocationProvider {
    getLocations(mode: LocationMode): Promise<Restaurant[] | HappyHour[]>;
}
