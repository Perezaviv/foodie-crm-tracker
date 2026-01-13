import { test, expect } from '@playwright/test';

test.describe('Foodie CRM E2E', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('has title', async ({ page }) => {
        await expect(page).toHaveTitle(/Foodie CRM/);
    });

    test('can see empty state or list', async ({ page }) => {
        // Check for "No Restaurants Yet" or "foodie crm" header to ensure load
        // Also check for the header to be sure page loaded
        await expect(page.locator('text=Foodie CRM')).toBeVisible();

        // Check if either exists (list of items or empty state)
        // We can't easily check for "either" with simple expect, but we can check if content area is present.
        const mainContent = page.locator('.flex-1.overflow-hidden');
        await expect(mainContent).toBeVisible();
    });

    test('add restaurant flow via parsing', async ({ page }) => {
        // 1. Click Add button (bottom nav)
        const addButton = page.getByRole('button', { name: 'Add' }).first();
        await addButton.click();

        // 2. Wait for drawer input
        const input = page.getByPlaceholder('e.g. Vitrina, or instagram.com/...');
        await expect(input).toBeVisible();

        await input.fill('The Best Pizza in Rome');

        // 3. Click Search & Add
        const searchButton = page.getByRole('button', { name: 'Search & Add' });
        await expect(searchButton).toBeVisible();

        // We don't click it to avoid actual API call in this basic smoke test, 
        // or we can click and expect loading state.
        await searchButton.click();
        await expect(page.locator('text=Hunting for details...')).toBeVisible();
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
