# Agent: Happy Hour Data Pipeline

## Goal
Scrape Happy Hour data from HappyTLV and ingest it into the Supabase database.

## Inputs
- **Target URL**: `https://www.happytlv.com/tel-aviv-happy-hours`
- **Output Schema**: `HappyHour` (to be defined in `lib/happy_hour_types.ts`)

## Execution
1.  **Define Types**: Create `lib/happy_hour_types.ts` defining the `HappyHour` interface and `LocationProvider` interface.
2.  **Scraper**: Create `execution/scrape_happy_hour.py` using `BeautifulSoup` or `playwright`.
    -   Must extract: Name, Address, Coordinates (if available), Happy Hour Times, Discount Details.
    -   Output: `.tmp/happy_hour_data.json`
3.  **Database Migration**: Create `supabase/migrations/<YYYYMMDD_HHMMSS>_happy_hour.sql`.
    -   Table: `happy_hours` (linked to `restaurants` or standalone with similar schema).
4.  **Ingestor**: Create `execution/seed_happy_hours.py`.
    -   Reads `.tmp/happy_hour_data.json`.
    -   Inserts/Upserts into Supabase `happy_hours` table.
5.  **Verification**:
    -   Run scraper and check JSON validity.
    -   Run migration locally.
    -   Run seed script and check DB row count.

## Output
-   `lib/happy_hour_types.ts`
-   `execution/scrape_happy_hour.py`
-   `execution/seed_happy_hours.py`
-   Populated `happy_hours` table.

-   **Missing Data**: If address is missing, flag for manual review or use AI Geocoding skill.

---
#### 🏁 Status: Completed (2026-02-01)
Scraped data seeded into `restaurants` table with Happy Hour fields. Geocoding completed via `scripts/fix_happy_hour_data.ts`.
