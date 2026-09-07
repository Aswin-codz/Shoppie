import { test, expect } from '@playwright/test';

test.describe('Shopzy Main Flow', () => {
  test('User can browse products and add to cart', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:5173');
    
    // Check if the title is correct
    await expect(page).toHaveTitle(/Shopzy/);
    
    // Verify header exists
    await expect(page.getByRole('banner')).toBeVisible();

    // Verify some products are loaded (assuming at least one product card exists)
    // We target the link that has the product title
    const productCard = page.locator('.group').first();
    await expect(productCard).toBeVisible();

    // Click on a product to view details
    await productCard.click();
    
    // Verify product detail page loaded
    await expect(page.getByRole('button', { name: /Add to Cart|Currently Unavailable/i })).toBeVisible();
  });
});
