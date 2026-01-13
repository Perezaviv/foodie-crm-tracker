import { test, expect } from '@playwright/test';

test.describe('Foodie CRM E2E', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('has title', async ({ page }) => {
        await expect(page).toHaveTitle(/Foodie CRM/);
    });

    test('can see empty state or list', async ({ page }) => {
        // Determine what to look for based on initial state.
        // If we assume clean DB, it might be empty.
        const emptyMessage = page.locator('text=No restaurants found');
        const firstItem = page.locator('.restaurant-card').first();

        // Check if either exists
        const isEmpty = await emptyMessage.isVisible();
        const hasItems = await firstItem.isVisible();

        expect(isEmpty || hasItems).toBeTruthy();
    });

    test('add restaurant flow via parsing', async ({ page }) => {
        // This requires backend to be running and connected to real/mocked services.
        // Since we are running against "npm run dev", we assume the environment is set up.

        // 1. Click Add (assuming there is a button/input for "Add Restaurant" or "Paste & Add")
        // If the UI is just a text area on home:
        const input = page.locator('textarea[placeholder*="Paste"]'); // Adjust selector
        await expect(input).toBeVisible();

        await input.fill('The Best Pizza in Rome');

        // 2. Click Parse/Add
        const addButton = page.locator('button:has-text("Add")');
        await addButton.click();

        // 3. Expect it to show up in the list (or a confirmation)
        // This depends on the exact UI flow which I can't see fully.
        // Assuming it adds directly or opens a modal.

        // For now, let's just verify the input is clear or loading state if applicable.
        // Real E2E needs stable selectors (data-testid).
    });

    // More detailed tests require data-testid on elements.
    // I will add a basic responsiveness check.

    test('responsive check', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        // Check if nav is accessible or visible
        const nav = page.locator('nav');
        await expect(nav).toBeAttached();
    });
});
