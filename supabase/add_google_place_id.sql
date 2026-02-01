-- Add google_place_id column to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- Add index for faster lookups and uniqueness checks (though we won't enforce unique constraint on DB level yet to avoid breaking existing duplicates immediately, unless desired)
CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON restaurants(google_place_id);

-- Optional: Add a comment
COMMENT ON COLUMN restaurants.google_place_id IS 'Unique identifier from Google Places API';
