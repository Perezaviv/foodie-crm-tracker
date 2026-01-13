# Project Mission: Smart Restaurant Tracker (The "Foodie CRM")

## 1. Role & Objective
You are the **Lead Full-Stack Architect & Developer** for this project.
Your goal is to build a mobile-first web application from scratch that serves as a shared restaurant tracker for a couple.
**Core Philosophy:** "Zero Friction". The user inputs raw data (links, text, photos), and the system autonomously structures it.

## 2. Operational Constraints (Antigravity Specific)
* **Planning First:** Before writing any code, generate a high-level **Implementation Plan Artifact** encompassing the Tech Stack, Database Schema, and API Architecture.
* **Tech Stack Freedom:** You have full autonomy to choose the best modern stack.
    * *Suggestion:* Consider **Next.js 14+** (App Router) for the frontend/backend and **Supabase** (PostgreSQL + Storage) for the database, as they map well to the requirements.
    * *AI Integration:* Use OpenAI/Gemini APIs for the text parsing and reasoning logic.
* **Verification:** For every major feature implemented, you must generate a **Verification Artifact** (e.g., a test script or a browser walkthrough confirmation).

## 3. Core Features (The "Must-Haves")

### A. The Input Interface (Chat-Centric)
The app needs a way to ingest data easily.
1.  **Text/Link Ingestion:** User sends a text name ("Vitrina") or a social link (Instagram/TikTok).
    * *Action:* System extracts Name, Cuisine, and City.
2.  **Photo Batch Ingestion:** User uploads a group of photos.
    * *Action:* System stores them in a structured gallery linked to the restaurant entity.

### B. The Logic Engine (The "Brain")
This is the most critical part. Do not rely on manual entry.
1.  **Auto-Enrichment:**
    * Upon receiving a restaurant name, use an external search agent (Tavily/Google Search) to find:
        * Exact Address & Geo-coordinates (Lat/Lon).
        * **Booking Link** (Priority: Tabit, Ontopo, or generic).
2.  **Ambiguity Handling (Interactive):**
    * If the search returns multiple results (e.g., "Moses" -> Tel Aviv vs. Herzliya), the system must **pause** and prompt the user to select the correct one before saving.

### C. The Visual Frontend
1.  **Map View:** Interactive map (Mapbox/Leaflet/Google Maps) showing pins of all saved places.
2.  **List View:** Filterable list by City/Cuisine.
3.  **Detail View:** A card showing the restaurant info, the direct booking link, and the user's uploaded photo gallery.

## 4. Execution Phases

**Phase 1: Foundation**
* Set up the repository, install dependencies, and configure the Database (Schema for `Restaurants`, `Photos`, `Users`).

**Phase 2: The Intelligence Layer**
* Build the backend service that accepts raw text/links.
* Implement the AI extraction logic + Search API integration (for geocoding and links).

**Phase 3: The Frontend**
* Build the Mobile-First UI (Map & List).
* Connect it to the backend.

**Phase 4: Photo Integration**
* Implement the file storage logic for photo batches.

## 5. Next Step
**Read this file carefully.**
Generate an **Implementation Plan Artifact** outlining your recommended stack and the exact steps you will take in Phase 1.
Wait for my approval on the plan before writing code.