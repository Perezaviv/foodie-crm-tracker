# Backend Testing Plan (BackTest.md)

## Overview
This document outlines the testing strategy for the backend of the Foodie CRM application. The backend consists of Next.js API routes, Supabase integration (Database & Storage), and third-party AI/Map services.

## Testing Stack
- **Test Runner**: Jest (`ts-jest`)
- **Assertions**: Jest or Chai
- **HTTP Mocking**: `nock` or `msw` (for external APIs like Google Maps, Gemini)
- **Database Testing**: `pg-mem` (for in-memory DB mocking) or a dedicated Supabase test project.
- **Environment**: Node.js (via `npm test`)

## 1. Unit Testing
Focus on pure functions and utility logic.

### 1.1 `lib/utils.ts`
- **Goal**: Verify helper functions work as expected.
- **Tests**:
    - Validate date formatting functions.
    - Validate string manipulation helpers.
    - Validate any data transformation logic defined here.

### 1.2 `lib/ai/*.ts` (Gemini Integration)
- **Goal**: Verify AI prompt construction and response parsing *without* calling the actual API.
- **Tests**:
    - Mock the Gemini client.
    - `parseRestaurantData`: Feed sample raw text and assert the output structure matches the expected JSON schema.
    - Error handling: simulate API failures/timeouts and ensure the function throws or returns appropriate error codes.

### 1.3 `lib/supabase.ts` (Client Initialization)
- **Goal**: Ensure the client initializes with the correct environment variables.
- **Tests**:
    - Mock `process.env`.
    - Verification: `createClient` is called with provided URL and Key.

## 2. Integration Testing (API Routes)
Focus on the interaction between API routes, the database, and external services. These tests will simulate HTTP requests to your Next.js API handlers.

### 2.1 `/api/restaurants` (GET, POST)
- **GET (List Restaurants)**
    - **Scenario**: Fetch all restaurants for a user.
    - **Setup**: Seed test DB with 3 restaurants (Mocked Supabase).
    - **Test**: Call GET.
    - **Assert**: Response status 200, body contains array of 3 items.
    - **Edge Case**: Empty database returns `[]`.
- **POST (Add Restaurant)**
    - **Scenario**: Create a new restaurant.
    - **Test**: Send valid JSON payload.
    - **Assert**: Response 201, DB `insert` was called with correct fields.
    - **Validation**: Send missing required fields (e.g., name) -> Assert 400 Bad Request.

### 2.2 `/api/parse` (POST)
- **Scenario**: Parse raw text into structured data.
- **Test**: Send text "Sushi place in Tokyo".
- **Mock**: Intercept Gemini API call and return a canned JSON response.
- **Assert**: API returns the canned JSON structure properly.
- **Error**: Simulate Gemini API failure -> Assert 500 Internal Server Error.

### 2.3 `/api/photos` (POST, DELETE)
- **POST (Upload)**
    - **Scenario**: Upload an image file.
    - **Mock**: Mock Supabase Storage `upload` method.
    - **Assert**: Call returns the public URL of the uploaded asset.
- **DELETE (Remove)**
    - **Scenario**: Delete a photo.
    - **Mock**: Mock Supabase Storage `remove` method.
    - **Assert**: Database record deleted AND Storage file deleted.

## 3. Database Testing (Supabase)
- **RLS (Row Level Security)**:
    - **Goal**: Ensure users can only access their own data.
    - **Test**:
        - Create User A and User B.
        - User A verifies they cannot read User B's restaurants.
        - User A verifies they cannot delete User B's restaurants.
- **Schema Validation**:
    - Ensure constraints (e.g., `not null`, foreign keys) are enforced.

## 4. Security & Performance
- **Rate Limiting**: If implemented, verify that rapid requests are blocked.
- **Input Sanitization**: specific tests for SQL injection (handled by ORM mostly) and XSS payloads in text fields.

## CI/CD Integration
- Run `npm test` on every Pull Request.
- Block merge if coverage < 80%.
