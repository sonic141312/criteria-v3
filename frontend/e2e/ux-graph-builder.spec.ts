import { test, expect } from '@playwright/test';
import {
  test as base,
  setupTestEvaluation,
  navigateToGraphBuilder,
} from './fixtures';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3000';
const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function createNodeViaAPI(request: any, versionId: string, data: any) {
  const res = await request.fetch(`${API_URL}/versions/${versionId}/graph/nodes`, {
    method: 'POST',
    headers: { 'X-Org-Id': ORG_ID, 'Content-Type': 'application/json' },
    data,
  });
  return res.json();
}

test.describe('Graph Builder - Auto Layout', () => {
  test('should render Auto Layout button on draft version', async ({ page }) => {
    const { versionId, evaluationId, cleanup } = await setupTestEvaluation(page, `Auto Layout ${Date.now()}`);
    await navigateToGraphBuilder(page, evaluationId, versionId);
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('auto-layout-btn')).toBeVisible();
    await cleanup();
  });

  test('should rearrange nodes after clicking Auto Layout', async ({ page }) => {
    const evalName = `AutoLayout Test ${Date.now()}`;
    const { versionId, evaluationId, cleanup } = await setupTestEvaluation(page, evalName);

    await createNodeViaAPI(page.request, versionId, {
      nodeType: 'input', label: 'A', config: { fieldKey: 'test_score' }, positionX: 100, positionY: 100,
    });
    await createNodeViaAPI(page.request, versionId, {
      nodeType: 'output', label: 'B', config: { outputKey: 'result' }, positionX: 600, positionY: 400,
    });

    await navigateToGraphBuilder(page, evaluationId, versionId);
    await page.waitForLoadState('networkidle');

    await page.getByTestId('auto-layout-btn').click();
    await page.waitForTimeout(1000);

    const toast = page.getByTestId('toast');
    await expect(toast.first()).toBeVisible({ timeout: 5000 });

    await cleanup();
  });
});

test.describe('Graph Builder - MiniMap and Controls', () => {
  test('should render ReactFlow Controls', async ({ page }) => {
    const { versionId, evaluationId, cleanup } = await setupTestEvaluation(page, `Controls ${Date.now()}`);
    await createNodeViaAPI(page.request, versionId, {
      nodeType: 'input', label: 'A', config: { fieldKey: 'test_score' }, positionX: 200, positionY: 200,
    });

    await navigateToGraphBuilder(page, evaluationId, versionId);
    await page.waitForLoadState('networkidle');

    const controls = page.locator('.react-flow__controls');
    await expect(controls).toBeVisible({ timeout: 10000 });
    await cleanup();
  });

  test('should render mini-map when nodes exist', async ({ page }) => {
    const { versionId, evaluationId, cleanup } = await setupTestEvaluation(page, `MiniMap ${Date.now()}`);
    await createNodeViaAPI(page.request, versionId, {
      nodeType: 'input', label: 'TestNode', config: { fieldKey: 'test_score' }, positionX: 200, positionY: 200,
    });

    await navigateToGraphBuilder(page, evaluationId, versionId);
    await page.waitForLoadState('networkidle');

    const minimap = page.locator('.react-flow__minimap');
    await expect(minimap).toBeVisible({ timeout: 10000 });
    await cleanup();
  });
});

test.describe('Graph Builder - Palette Search', () => {
  test('should filter palette items by search query', async ({ page }) => {
    const { versionId, evaluationId, cleanup } = await setupTestEvaluation(page, `Search ${Date.now()}`);

    await navigateToGraphBuilder(page, evaluationId, versionId);
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('Search nodes...');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    await searchInput.fill('input');
    await page.waitForTimeout(500);

    const inputNode = page.getByTestId('palette-node-input');
    await expect(inputNode).toBeVisible();

    await searchInput.fill('xyz_no_match_xyz');
    await page.waitForTimeout(500);

    await expect(page.getByText(/no match/i)).toBeVisible({ timeout: 3000 });
    await cleanup();
  });
});

test.describe('Graph Builder - Confirm Delete (replaces native confirm())', () => {
  test('should show ConfirmDialog when double-clicking a node', async ({ page }) => {
    const { versionId, evaluationId, cleanup } = await setupTestEvaluation(page, `Confirm Dialog ${Date.now()}`);
    const node: any = await createNodeViaAPI(page.request, versionId, {
      nodeType: 'input', label: 'Deletable', config: { fieldKey: 'test_score' }, positionX: 200, positionY: 200,
    });

    await navigateToGraphBuilder(page, evaluationId, versionId);
    await page.waitForLoadState('networkidle');

    const reactNode = page.getByText('Deletable').first();
    await expect(reactNode).toBeVisible({ timeout: 10000 });
    await reactNode.dblclick();
    await page.waitForTimeout(500);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await cleanup();
  });

  test('should cancel delete when clicking Cancel in dialog', async ({ page }) => {
    const { versionId, evaluationId, cleanup } = await setupTestEvaluation(page, `Cancel Delete ${Date.now()}`);
    await createNodeViaAPI(page.request, versionId, {
      nodeType: 'input', label: 'KeepMe', config: { fieldKey: 'test_score' }, positionX: 200, positionY: 200,
    });

    await navigateToGraphBuilder(page, evaluationId, versionId);
    await page.waitForLoadState('networkidle');

    await page.getByText('KeepMe').first().dblclick();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Cancel' }).first().click();
    await page.waitForTimeout(500);

    await expect(page.getByText('KeepMe').first()).toBeVisible({ timeout: 3000 });
    await cleanup();
  });
});

test.describe('Graph Builder - Publish Confirmation', () => {
  test('should show ConfirmDialog when clicking Publish', async ({ page }) => {
    const { versionId, evaluationId, cleanup } = await setupTestEvaluation(page, `Publish ${Date.now()}`);
    await navigateToGraphBuilder(page, evaluationId, versionId);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /^Publish$/ }).click();
    await page.waitForTimeout(500);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/publish this version/i)).toBeVisible();
    await cleanup();
  });
});

test.describe('Graph Builder - Empty State', () => {
  test('should show empty state when no nodes', async ({ page }) => {
    const { versionId, evaluationId, cleanup } = await setupTestEvaluation(page, `Empty ${Date.now()}`);
    await navigateToGraphBuilder(page, evaluationId, versionId);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/no nodes yet/i)).toBeVisible({ timeout: 5000 });
    await cleanup();
  });
});
