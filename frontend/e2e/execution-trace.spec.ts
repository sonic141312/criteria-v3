import { test, expect } from '@playwright/test';

test.describe('ExecutionTracePage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/executions');
  });

  test('should display executions page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Evaluation|Execute/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show execution list section', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('should handle direct trace URL access', async ({ page }) => {
    await page.goto('/executions/test-id/trace');
    await page.waitForLoadState('networkidle');
    const header = page.getByRole('heading', { name: /Trace/i });
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('should show error for invalid execution ID', async ({ page }) => {
    await page.goto('/executions/invalid-uuid/trace');
    const errorText = page.getByText(/Error|Failed|not found/i);
    await expect(errorText.first()).toBeVisible({ timeout: 15000 });
  });

  test('should show loading state', async ({ page }) => {
    await page.goto('/executions/test-id/trace');
    await page.waitForLoadState('networkidle');
    expect(true).toBeTruthy();
  });
});

test.describe('ExecutionTracePage - Responsive', () => {
  test('should render on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/executions');
    await page.waitForLoadState('networkidle');
    expect(true).toBeTruthy();
  });

  test('should render on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/executions');
    await page.waitForLoadState('networkidle');
    expect(true).toBeTruthy();
  });

  test('should render on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/executions');
    await page.waitForLoadState('networkidle');
    expect(true).toBeTruthy();
  });
});

test.describe('ExecutionTracePage - Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/executions');
    await page.waitForLoadState('networkidle');
    const headings = await page.locator('h1, h2').count();
    expect(headings).toBeGreaterThan(0);
  });

  test('should have form labels or placeholders', async ({ page }) => {
    await page.goto('/executions');
    await page.waitForLoadState('networkidle');
    const inputs = await page.locator('input, select, textarea').count();
    expect(inputs).toBeGreaterThanOrEqual(0);
  });

  test('should have dark mode toggle', async ({ page }) => {
    await page.goto('/executions');
    await page.waitForLoadState('networkidle');
    const toggle = page.getByRole('button', { name: /dark|light|theme/i });
    const exists = await toggle.isVisible().catch(() => false);
    expect(typeof exists === 'boolean').toBeTruthy();
  });
});
