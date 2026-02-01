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
[x] Phase 1: Extraction - Write scraper.py to target the URL. (Completed: Data extracted and stored)
[x] Phase 2: Database Injection (Completed: Seeded 161+ records)
[x] Phase 3: Logic Refactor (Completed: Integrated into LocationService and API routes)
[x] Phase 4: UI Update (Completed: Added Switch and Detail views with deal info)