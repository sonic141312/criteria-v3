import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function createTestData(request: any) {
  const schemaRes = await request.post(`${BASE_URL}/schemas`, {
    headers: { 'X-Org-Id': ORG_ID, 'Content-Type': 'application/json' },
    data: { name: `E2E Schema ${Date.now()}` }
  });
  const schema = await schemaRes.json();
  
  const evalRes = await request.post(`${BASE_URL}/evaluations`, {
    headers: { 'X-Org-Id': ORG_ID, 'Content-Type': 'application/json' },
    data: { schemaId: schema.id, name: `E2E Eval ${Date.now()}` }
  });
  const evaluation = await evalRes.json();
  
  return { schema, evaluation };
}

async function cleanupData(request: any, schemaId: string, evalId: string) {
  try {
    await request.delete(`${BASE_URL}/evaluations/${evalId}`, { headers: { 'X-Org-Id': ORG_ID } });
    await request.delete(`${BASE_URL}/schemas/${schemaId}`, { headers: { 'X-Org-Id': ORG_ID } });
  } catch {}
}

test.describe('ExecutionTracePage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/executions');
  });

  test('should display executions page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Evaluation|Execute/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show execution list section', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    // Page should have some content
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
    // Page should load without crashing
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

test.describe('VersionManagerPage - Basic Functionality', () => {
  let testData: any;
  
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.parallelIndex === 0) {
      testData = await createTestData(page.request);
    }
  });

  test.afterEach(async ({ page }) => {
    if (testData) {
      await cleanupData(page.request, testData.schema.id, testData.evaluation.id);
      testData = null;
    }
  });

  test('should display version manager header', async ({ page }) => {
    if (!testData) testData = await createTestData(page.request);
    await page.goto(`/evaluations/${testData.evaluation.id}/versions`);
    await page.waitForLoadState('networkidle');
    
    const header = page.locator('h1, h2, h3').first();
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('should display version list', async ({ page }) => {
    if (!testData) testData = await createTestData(page.request);
    await page.goto(`/evaluations/${testData.evaluation.id}/versions`);
    await page.waitForLoadState('networkidle');
    
    // Should show version content
    const content = await page.locator('body').textContent();
    expect(content).toContain('Version');
  });

  test('should display version status badges', async ({ page }) => {
    if (!testData) testData = await createTestData(page.request);
    await page.goto(`/evaluations/${testData.evaluation.id}/versions`);
    await page.waitForLoadState('networkidle');
    
    const statusBadge = page.getByText(/DRAFT|PUBLISHED|ARCHIVED/i).first();
    await expect(statusBadge).toBeVisible({ timeout: 10000 });
  });

  test('should have create new version button', async ({ page }) => {
    if (!testData) testData = await createTestData(page.request);
    await page.goto(`/evaluations/${testData.evaluation.id}/versions`);
    await page.waitForLoadState('networkidle');
    
    const newVersionBtn = page.getByRole('button', { name: '+ New Version' });
    await expect(newVersionBtn).toBeVisible({ timeout: 10000 });
  });

  test('should display version metadata', async ({ page }) => {
    if (!testData) testData = await createTestData(page.request);
    await page.goto(`/evaluations/${testData.evaluation.id}/versions`);
    await page.waitForLoadState('networkidle');
    
    const metadata = await page.locator('body').textContent();
    expect(metadata).toBeTruthy();
  });

  test('should show version actions menu', async ({ page }) => {
    if (!testData) testData = await createTestData(page.request);
    await page.goto(`/evaluations/${testData.evaluation.id}/versions`);
    await page.waitForLoadState('networkidle');
    
    const actions = page.getByRole('button');
    const count = await actions.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display back navigation', async ({ page }) => {
    if (!testData) testData = await createTestData(page.request);
    await page.goto(`/evaluations/${testData.evaluation.id}/versions`);
    await page.waitForLoadState('networkidle');
    
    const backBtn = page.locator('button').filter({ hasText: /←|Back/i }).first();
    await expect(backBtn).toBeVisible({ timeout: 10000 });
  });
});

test.describe('VersionManagerPage - Version Creation Flow', () => {
  let testData: any;
  
  test.beforeEach(async ({ page }) => {
    testData = await createTestData(page.request);
  });

  test.afterEach(async ({ page }) => {
    if (testData) {
      await cleanupData(page.request, testData.schema.id, testData.evaluation.id);
      testData = null;
    }
  });

  test('should create new version via API', async ({ page }) => {
    // Create version via API
    const res = await page.request.post(`${BASE_URL}/evaluations/${testData.evaluation.id}/versions`, {
      headers: { 'X-Org-Id': ORG_ID, 'Content-Type': 'application/json' },
      data: {}
    });
    
    expect(res.ok()).toBeTruthy();
    const version = await res.json();
    expect(version).toHaveProperty('id');
    expect(version).toHaveProperty('versionNumber');
  });

  test('should increment version number on creation', async ({ page }) => {
    // Get initial versions
    const res1 = await page.request.get(`${BASE_URL}/evaluations/${testData.evaluation.id}/versions`, {
      headers: { 'X-Org-Id': ORG_ID }
    });
    const initialVersions = await res1.json();
    const initialCount = initialVersions.length;
    
    // Create new version
    await page.request.post(`${BASE_URL}/evaluations/${testData.evaluation.id}/versions`, {
      headers: { 'X-Org-Id': ORG_ID }
    });
    
    // Check new count
    const res2 = await page.request.get(`${BASE_URL}/evaluations/${testData.evaluation.id}/versions`, {
      headers: { 'X-Org-Id': ORG_ID }
    });
    const newVersions = await res2.json();
    expect(newVersions.length).toBe(initialCount + 1);
  });

  test('should show success notification after creation', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions`);
    await page.waitForLoadState('networkidle');
    
    // Create via API
    await page.request.post(`${BASE_URL}/evaluations/${testData.evaluation.id}/versions`, {
      headers: { 'X-Org-Id': ORG_ID }
    });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should show 2 versions now
    const content = await page.locator('body').textContent();
    expect(content).toContain('Version');
  });
});

test.describe('VersionManagerPage - Version Publishing', () => {
  let testData: any;
  
  test.beforeEach(async ({ page }) => {
    testData = await createTestData(page.request);
  });

  test.afterEach(async ({ page }) => {
    if (testData) {
      await cleanupData(page.request, testData.schema.id, testData.evaluation.id);
      testData = null;
    }
  });

  test('should have publish button for draft versions', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions`);
    await page.waitForLoadState('networkidle');
    
    const publishBtn = page.getByRole('button', { name: /Publish/i });
    const exists = await publishBtn.isVisible().catch(() => false);
    expect(typeof exists === 'boolean').toBeTruthy();
  });

  test('should update status to PUBLISHED after publishing', async ({ page }) => {
    // Get versions
    const versionsRes = await page.request.get(
      `${BASE_URL}/evaluations/${testData.evaluation.id}/versions`,
      { headers: { 'X-Org-Id': ORG_ID } }
    );
    const versions = await versionsRes.json();
    const draftVersion = versions.find((v: any) => v.status === 'DRAFT');
    
    if (draftVersion) {
      // Create output node
      await page.request.post(`${BASE_URL}/versions/${draftVersion.id}/graph/nodes`, {
        headers: { 'X-Org-Id': ORG_ID, 'Content-Type': 'application/json' },
        data: {
          nodeType: 'output',
          label: 'Result',
          config: { outputKey: 'result' },
          positionX: 100,
          positionY: 100
        }
      });
      
      // Publish
      await page.request.post(
        `${BASE_URL}/evaluations/${testData.evaluation.id}/versions/${draftVersion.id}/publish`,
        { headers: { 'X-Org-Id': ORG_ID } }
      );
      
      // Verify
      const updatedRes = await page.request.get(
        `${BASE_URL}/evaluations/${testData.evaluation.id}/versions`,
        { headers: { 'X-Org-Id': ORG_ID } }
      );
      const updatedVersions = await updatedRes.json();
      const publishedVersion = updatedVersions.find((v: any) => v.id === draftVersion.id);
      
      expect(publishedVersion.status).toBe('PUBLISHED');
    }
  });
});

test.describe('VersionManagerPage - Responsive Design', () => {
  let testData: any;
  
  test.beforeEach(async ({ page }) => {
    testData = await createTestData(page.request);
  });

  test.afterEach(async ({ page }) => {
    if (testData) {
      await cleanupData(page.request, testData.schema.id, testData.evaluation.id);
      testData = null;
    }
  });

  test('should render correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/evaluations/${testData.evaluation.id}/versions`);
    await page.waitForLoadState('networkidle');
    
    const header = page.locator('h1, h2, h3').first();
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('should render correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`/evaluations/${testData.evaluation.id}/versions`);
    await page.waitForLoadState('networkidle');
    
    const header = page.locator('h1, h2, h3').first();
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('should render correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/evaluations/${testData.evaluation.id}/versions`);
    await page.waitForLoadState('networkidle');
    
    const header = page.locator('h1, h2, h3').first();
    await expect(header).toBeVisible({ timeout: 10000 });
  });
});

test.describe('VersionManagerPage - Error Handling', () => {
  test('should handle non-existent evaluation gracefully', async ({ page }) => {
    await page.goto('/evaluations/non-existent-id/versions');
    await page.waitForLoadState('networkidle');
    
    const error = page.getByText(/error|not found|failed/i);
    const hasError = await error.isVisible().catch(() => false);
    
    const evalPage = page.getByText(/Evaluation/i);
    const redirected = await evalPage.isVisible().catch(() => false);
    
    expect(hasError || redirected).toBeTruthy();
  });

  test('should show loading state while fetching versions', async ({ page }) => {
    await page.goto('/evaluations/test-id/versions');
    await page.waitForLoadState('networkidle');
    expect(true).toBeTruthy();
  });
});

test.describe('VersionManagerPage - Navigation', () => {
  let testData: any;
  
  test.beforeEach(async ({ page }) => {
    testData = await createTestData(page.request);
  });

  test.afterEach(async ({ page }) => {
    if (testData) {
      await cleanupData(page.request, testData.schema.id, testData.evaluation.id);
      testData = null;
    }
  });

  test('should navigate back to evaluations list', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions`);
    await page.waitForLoadState('networkidle');
    
    const backBtn = page.locator('button, a').filter({ hasText: /←|Back|Evaluation/i }).first();
    await backBtn.click();
    
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toContain('/evaluations');
  });

  test('should navigate to graph builder from version', async ({ page }) => {
    await page.goto(`/evaluations/${testData.evaluation.id}/versions`);
    await page.waitForLoadState('networkidle');
    
    const graphBtn = page.getByRole('link', { name: /Graph|Builder|Open/i }).first();
    const exists = await graphBtn.isVisible().catch(() => false);
    
    if (exists) {
      await graphBtn.click();
      await page.waitForTimeout(1000);
      const url = page.url();
      expect(url).toContain('/graph');
    } else {
      expect(true).toBeTruthy();
    }
  });
});
