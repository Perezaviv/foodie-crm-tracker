Agent Instructions: Happy Hour Feature Integration
🎯 Objective
Automate the extraction of data from Happy TLV and integrate it into the existing personal app using a Bulk Injection method. Implement a Feature Switch to toggle between regular restaurant data and Happy Hour data.

🏗️ Architectural Guidelines (3-Layer Refactor)
1. Data Layer (The "Shove")
Scraper Script: Create a Python utility using BeautifulSoup to scrape the website.

Fields to Capture: Name, Address, Happy Hour Times, Discount Details.

Bulk Ingestor: Instead of the standard single-entry upload, create a seed_happy_hours.py script that:

Reads the scraped JSON/CSV.

Uses a batch operation (e.g., db.insert_many()) to populate the database in one go.

Schema: Define a HappyHour model that maps to the existing location-based schema of the main app.

2. Logic Layer (The "Switch")
Service Coordinator: Implement a LocationService that acts as a traffic controller.

Toggle Logic: Use a boolean flag (e.g., is_happy_hour_mode).

if True: Fetch from HappyHourRepository.

if False: Fetch from MainRestaurantRepository.

Data Normalization: Ensure the Happy Hour data is formatted to match the app's standard Map/List view before passing it to the UI.

3. Presentation Layer
UI Toggle: Create a "Happy Hour Mode" switch component.

State Management: Ensure the app refreshes the location list immediately when the switch is flipped.

🛠️ Step-by-Step Task List
[ ] Phase 1: Extraction - Write scraper.py to target the URL.

Output data to happy_hour_data.json.

[ ] Phase 2: Database Injection

Create the database migration/schema for Happy Hour locations.

Run the bulk "shove" script to populate the DB.

[ ] Phase 3: Logic Refactor

Implement the LocationProvider interface to support multiple data sources.

Add the toggle logic in the backend controllers.

[ ] Phase 4: UI Update

Add the Switch component to the main dashboard.

Link the switch state to the data fetching logic.