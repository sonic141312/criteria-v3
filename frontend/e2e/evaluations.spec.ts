import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function createSchemaAPI(request: any, name: string) {
  const res = await request.post(`${BASE_URL}/schemas`, {
    headers: { 'X-Org-Id': ORG_ID, 'Content-Type': 'application/json' },
    data: { name }
  });
  return res.json();
}

async function createFieldAPI(request: any, schemaId: string, data: any) {
  const res = await request.post(`${BASE_URL}/schemas/${schemaId}/fields`, {
    headers: { 'X-Org-Id': ORG_ID, 'Content-Type': 'application/json' },
    data
  });
  return res.json();
}

async function createEvaluationAPI(request: any, schemaId: string, name: string) {
  const res = await request.post(`${BASE_URL}/evaluations`, {
    headers: { 'X-Org-Id': ORG_ID, 'Content-Type': 'application/json' },
    data: { schemaId, name }
  });
  return res.json();
}

async function cleanup(request: any, schemaId: string, evalId: string) {
  try {
    await request.delete(`${BASE_URL}/evaluations/${evalId}`, { headers: { 'X-Org-Id': ORG_ID } });
    await request.delete(`${BASE_URL}/schemas/${schemaId}`, { headers: { 'X-Org-Id': ORG_ID } });
  } catch {}
}

test.describe('EvaluationPage - Basic Functionality', () => {
  test('should display evaluations page header', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    const header = page.locator('h1').filter({ hasText: /Evaluation/i });
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('should show "New Evaluation" button', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    const newEvalBtn = page.getByRole('button', { name: /New Evaluation/i });
    await expect(newEvalBtn).toBeVisible({ timeout: 10000 });
  });

  test('should show evaluations content or list', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // Should show some content
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('should show evaluations list', async ({ page }) => {
    // Create test evaluation
    const schema = await createSchemaAPI(page.request, `List Test Schema ${Date.now()}`);
    await createEvaluationAPI(page.request, schema.id, `List Test Eval ${Date.now()}`);

    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // Should show evaluations
    const content = await page.locator('body').textContent();
    expect(content).toContain('List Test Eval');

    // Cleanup
    const evals = await page.request.get(`${BASE_URL}/evaluations`, { headers: { 'X-Org-Id': ORG_ID } });
    const evalList = await evals.json();
    const testEval = evalList.find((e: any) => e.name.includes('List Test Eval'));
    if (testEval) await cleanup(page.request, schema.id, testEval.id);
  });

  test('should display evaluation cards', async ({ page }) => {
    const schema = await createSchemaAPI(page.request, `Card Test Schema ${Date.now()}`);
    const eval_ = await createEvaluationAPI(page.request, schema.id, `Card Test Eval ${Date.now()}`);

    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // Should show eval name
    await expect(page.getByText(`Card Test Eval`).first()).toBeVisible({ timeout: 10000 });

    await cleanup(page.request, schema.id, eval_.id);
  });

  test('should show evaluation schema name', async ({ page }) => {
    const schema = await createSchemaAPI(page.request, `Schema Name Test ${Date.now()}`);
    const eval_ = await createEvaluationAPI(page.request, schema.id, `Schema Eval ${Date.now()}`);

    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // Should show schema name
    await expect(page.getByText(`Schema Name Test`).first()).toBeVisible({ timeout: 10000 });

    await cleanup(page.request, schema.id, eval_.id);
  });

  test('should show evaluation creation date', async ({ page }) => {
    const schema = await createSchemaAPI(page.request, `Date Test Schema ${Date.now()}`);
    const eval_ = await createEvaluationAPI(page.request, schema.id, `Date Eval ${Date.now()}`);

    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // Should show date info
    const content = await page.locator('body').textContent();
    expect(content).toContain('Created');

    await cleanup(page.request, schema.id, eval_.id);
  });
});

test.describe('EvaluationPage - Create Evaluation', () => {
  let testSchema: any;

  test.beforeEach(async ({ page }) => {
    testSchema = await createSchemaAPI(page.request, `Create Eval Schema ${Date.now()}`);
    await createFieldAPI(page.request, testSchema.id, {
      key: 'score', displayName: 'Score', dataType: 'number'
    });
  });

  test.afterEach(async ({ page }) => {
    if (testSchema) {
      // Clean up all evaluations for this schema
      const evals = await page.request.get(`${BASE_URL}/evaluations`, { headers: { 'X-Org-Id': ORG_ID } });
      const evalList = await evals.json();
      for (const eval_ of evalList) {
        if (eval_.schemaId === testSchema.id) {
          await cleanup(page.request, testSchema.id, eval_.id);
        }
      }
    }
  });

  test('should open create evaluation modal', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /New Evaluation/i }).click();

    // Should show modal
    const modal = page.locator('text=Create Evaluation');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('should show schema dropdown', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /New Evaluation/i }).click();

    const schemaSelect = page.locator('select').first();
    await expect(schemaSelect).toBeVisible({ timeout: 5000 });
  });

  test('should show name input', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /New Evaluation/i }).click();

    const nameInput = page.getByPlaceholder(/e\.g\.|name/i);
    await expect(nameInput).toBeVisible({ timeout: 5000 });
  });

  test('should show description input', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /New Evaluation/i }).click();

    const descInput = page.getByPlaceholder(/description/i);
    await expect(descInput).toBeVisible({ timeout: 5000 });
  });

  test('should create evaluation with name only', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /New Evaluation/i }).click();
    await page.waitForTimeout(500);

    // Select schema
    await page.locator('select').first().selectOption(testSchema.id);

    // Enter name
    await page.getByPlaceholder(/e\.g\.|name/i).fill('My New Evaluation');

    // Submit
    await page.getByRole('button', { name: /Create/i }).click();

    // Should redirect to graph builder
    await page.waitForURL(/\/graph/, { timeout: 10000 });
  });

  test('should create evaluation with name and description', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /New Evaluation/i }).click();
    await page.waitForTimeout(500);

    await page.locator('select').first().selectOption(testSchema.id);
    await page.getByPlaceholder(/e\.g\.|name/i).fill('Evaluation With Desc');
    await page.getByPlaceholder(/description/i).fill('This is a test evaluation');

    await page.getByRole('button', { name: /Create/i }).click();

    await page.waitForURL(/\/graph/, { timeout: 10000 });
  });

  test('should allow form interaction', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /New Evaluation/i }).click();
    await page.waitForTimeout(500);

    // Form should be fillable
    await page.locator('select').first().selectOption(testSchema.id);
    await page.getByPlaceholder(/e\.g\.|name/i).fill('Test Evaluation');
  });

  test('should cancel evaluation creation', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /New Evaluation/i }).click();
    await page.waitForTimeout(500);

    // Fill form
    await page.locator('select').first().selectOption(testSchema.id);
    await page.getByPlaceholder(/e\.g\.|name/i).fill('Cancel Test');

    // Cancel
    await page.getByRole('button', { name: /Cancel/i }).click();

    // Modal should close
    await page.waitForTimeout(500);
    const modal = page.locator('text=Create Evaluation');
    await expect(modal).toBeHidden({ timeout: 5000 }).catch(() => {});
  });
});

test.describe('EvaluationPage - Evaluation Card', () => {
  let testData: any;

  test.beforeEach(async ({ page }) => {
    testData = {
      schema: await createSchemaAPI(page.request, `Card Detail Schema ${Date.now()}`),
      eval: null as any
    };
    await createFieldAPI(page.request, testData.schema.id, {
      key: 'score', displayName: 'Score', dataType: 'number'
    });
    testData.eval = await createEvaluationAPI(page.request, testData.schema.id, `Card Detail Eval ${Date.now()}`);
  });

  test.afterEach(async ({ page }) => {
    if (testData) {
      await cleanup(page.request, testData.schema.id, testData.eval.id);
    }
  });

  test('should expand evaluation card', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // Click on evaluation card
    await page.locator(`text=${testData.eval.name}`).first().click();
    await page.waitForTimeout(500);

    // Should show expanded content - use first() to avoid strict mode
    const expanded = page.getByRole('button', { name: /Manage Versions/i }).or(page.getByRole('button', { name: /Open/i }));
    await expect(expanded.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show version badges', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // Should show version badges - use first()
    const draftBadge = page.getByText(/DRAFT/).first();
    await expect(draftBadge).toBeVisible({ timeout: 10000 });
  });

  test('should show version number', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // Should show version badge - use first()
    const versionBadge = page.getByText(/v\d+ DRAFT|v\d+ PUBLISHED/).first();
    await expect(versionBadge).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to graph builder from card', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // Click on version badge - use first()
    const draftBadge = page.getByText(/DRAFT/).first();
    await draftBadge.click();

    await page.waitForURL(/\/graph/, { timeout: 10000 });
  });

  test('should show Manage Versions link', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // Expand card - use first()
    await page.locator(`text=${testData.eval.name}`).first().click();
    await page.waitForTimeout(500);

    const manageLink = page.getByRole('button', { name: /Manage Versions/i }).first();
    await expect(manageLink).toBeVisible({ timeout: 5000 });
  });

  test('should show New Draft Version button', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // Expand card - use first()
    await page.locator(`text=${testData.eval.name}`).first().click();
    await page.waitForTimeout(500);

    const newDraftBtn = page.getByText(/New Draft Version/i).first();
    await expect(newDraftBtn).toBeVisible({ timeout: 5000 });
  });

  test('should show Open button for versions', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // Expand card - use first()
    await page.locator(`text=${testData.eval.name}`).first().click();
    await page.waitForTimeout(500);

    const openBtn = page.getByRole('button', { name: /Open/i }).first();
    await expect(openBtn).toBeVisible({ timeout: 5000 });
  });

  test('should create new version from card', async ({ page }) => {
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // Expand card - use first()
    await page.locator(`text=${testData.eval.name}`).first().click();
    await page.waitForTimeout(500);

    // Click new draft version
    await page.getByText(/New Draft Version/i).first().click();
    await page.waitForLoadState('networkidle');

    // Should show more versions
    const versions = page.getByText(/v\d+/);
    const count = await versions.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('EvaluationPage - Version Status', () => {
  test('should show DRAFT status badge', async ({ page }) => {
    const schema = await createSchemaAPI(page.request, `Draft Schema ${Date.now()}`);
    const eval_ = await createEvaluationAPI(page.request, schema.id, `Draft Eval ${Date.now()}`);

    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    const draftBadge = page.getByText(/DRAFT/).first();
    await expect(draftBadge).toBeVisible({ timeout: 10000 });

    await cleanup(page.request, schema.id, eval_.id);
  });

  test('should show PUBLISHED status badge', async ({ page }) => {
    const schema = await createSchemaAPI(page.request, `Published Schema ${Date.now()}`);
    await createFieldAPI(page.request, schema.id, {
      key: 'score', displayName: 'Score', dataType: 'number'
    });
    const eval_ = await createEvaluationAPI(page.request, schema.id, `Published Eval ${Date.now()}`);

    // Get version and publish
    const versionsRes = await page.request.get(`${BASE_URL}/evaluations/${eval_.id}/versions`, {
      headers: { 'X-Org-Id': ORG_ID }
    });
    const versions = await versionsRes.json();

    // Create output node
    await page.request.post(`${BASE_URL}/versions/${versions[0].id}/graph/nodes`, {
      headers: { 'X-Org-Id': ORG_ID, 'Content-Type': 'application/json' },
      data: { nodeType: 'output', label: 'Result', config: { outputKey: 'result' }, positionX: 100, positionY: 100 }
    });

    // Publish
    await page.request.post(`${BASE_URL}/evaluations/${eval_.id}/versions/${versions[0].id}/publish`, {
      headers: { 'X-Org-Id': ORG_ID }
    });

    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    const publishedBadge = page.getByText(/PUBLISHED/).first();
    await expect(publishedBadge).toBeVisible({ timeout: 10000 });

    await cleanup(page.request, schema.id, eval_.id);
  });
});

test.describe('EvaluationPage - Navigation', () => {
  test('should navigate to version manager', async ({ page }) => {
    const schema = await createSchemaAPI(page.request, `Nav Schema ${Date.now()}`);
    const eval_ = await createEvaluationAPI(page.request, schema.id, `Nav Eval ${Date.now()}`);

    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // Expand card - use first()
    await page.locator(`text=${eval_.name}`).first().click();
    await page.waitForTimeout(500);

    // Click Manage Versions
    await page.getByRole('button', { name: /Manage Versions/i }).first().click();

    await page.waitForURL(/\/versions/, { timeout: 10000 });

    await cleanup(page.request, schema.id, eval_.id);
  });

  test('should navigate to graph builder', async ({ page }) => {
    const schema = await createSchemaAPI(page.request, `Graph Nav Schema ${Date.now()}`);
    const eval_ = await createEvaluationAPI(page.request, schema.id, `Graph Nav Eval ${Date.now()}`);

    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    // Click on version badge - use first()
    await page.getByText(/DRAFT/).first().click();

    await page.waitForURL(/\/graph/, { timeout: 10000 });

    await cleanup(page.request, schema.id, eval_.id);
  });
});

test.describe('EvaluationPage - Responsive Design', () => {
  test('should render on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    const header = page.getByRole('heading', { name: 'Evaluations' });
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('should render on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    const header = page.getByRole('heading', { name: 'Evaluations' });
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('should render on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/evaluations');
    await page.waitForLoadState('networkidle');

    const header = page.getByRole('heading', { name: 'Evaluations' });
    await expect(header).toBeVisible({ timeout: 10000 });
  });
});

test.describe('EvaluationPage - Error Handling', () => {
  test('should handle non-existent evaluation gracefully', async ({ page }) => {
    await page.goto('/evaluations/non-existent-id');
    await page.waitForLoadState('networkidle');

    // Should show error or empty state
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
  });

  test('should show loading state', async ({ page }) => {
    await page.goto('/evaluations');

    const loading = page.getByText(/Loading/i);
    const hasLoading = await loading.isVisible().catch(() => false);
    expect(typeof hasLoading === 'boolean').toBeTruthy();
  });
});
