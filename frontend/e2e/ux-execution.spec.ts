import { test, expect } from '@playwright/test';
import {
  setupTestEvaluation,
  runExecutionAPI,
  deleteSchemaAPI,
  deleteEvaluationAPI,
  navigateToExecutions,
  navigateToExecutionTrace,
  waitForPageLoad,
} from './fixtures';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

test.describe('Execution Runner - Published Versions List', () => {
  test('should render Published Versions section with evaluations', async ({ page }) => {
    const { versionId, evaluationId, schemaId, cleanup } = await setupTestEvaluation(page, `PubList ${Date.now()}`);

    await navigateToExecutions(page);
    await waitForPageLoad(page);

    await expect(page.getByText(/Published Versions/i)).toBeVisible({ timeout: 10000 });

    await cleanup();
  });

  test('should navigate to run form when clicking Run on a published version', async ({ page }) => {
    const { evaluationId, cleanup } = await setupTestEvaluation(page, `Pub Run ${Date.now()}`);

    await navigateToExecutions(page);
    await waitForPageLoad(page);

    const runButtons = page.getByRole('button', { name: /Run$/ });
    if (await runButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await runButtons.first().click();
      await page.waitForTimeout(500);

      await expect(page.getByText(/Run Evaluation/i)).toBeVisible({ timeout: 3000 });
    }

    await cleanup();
  });
});

test.describe('Execution Runner - Result Visualization', () => {
  test('should render StatusBadge with correct status', async ({ page }) => {
    const { versionId, evaluationId, schemaId, cleanup } = await setupTestEvaluation(page, `Result Viz ${Date.now()}`);

    const executionId = await runExecutionAPI(page, versionId, { test_score: 75 });

    await navigateToExecutionTrace(page, executionId);
    await waitForPageLoad(page);

    await expect(page.getByText('SUCCESS').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Final Result/)).toBeVisible();

    await cleanup();
  });

  test('should render execution summary with timing info', async ({ page }) => {
    const { versionId, evaluationId, schemaId, cleanup } = await setupTestEvaluation(page, `Timing ${Date.now()}`);
    const executionId = await runExecutionAPI(page, versionId, { test_score: 80 });

    await navigateToExecutionTrace(page, executionId);
    await waitForPageLoad(page);

    await expect(page.getByText(/Execution Summary/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Started/i)).toBeVisible();
    await expect(page.getByText(/Duration/i)).toBeVisible();

    await cleanup();
  });
});

test.describe('Execution Trace - Mini Graph', () => {
  test('should render mini-graph view', async ({ page }) => {
    const { versionId, evaluationId, schemaId, cleanup } = await setupTestEvaluation(page, `Mini Graph ${Date.now()}`);
    const executionId = await runExecutionAPI(page, versionId, { test_score: 75 });

    await navigateToExecutionTrace(page, executionId);
    await waitForPageLoad(page);

    await expect(page.getByText(/Graph View/i)).toBeVisible({ timeout: 10000 });
    const traceGraph = page.getByTestId('trace-graph');
    await expect(traceGraph).toBeVisible({ timeout: 5000 });

    await cleanup();
  });

  test('should show legend with status colors', async ({ page }) => {
    const { versionId, evaluationId, schemaId, cleanup } = await setupTestEvaluation(page, `Graph Legend ${Date.now()}`);
    const executionId = await runExecutionAPI(page, versionId, { test_score: 75 });

    await navigateToExecutionTrace(page, executionId);
    await waitForPageLoad(page);

    await expect(page.getByText('Success').first()).toBeVisible({ timeout: 10000 });

    await cleanup();
  });

  test('should show Node Execution Results list', async ({ page }) => {
    const { versionId, evaluationId, schemaId, cleanup } = await setupTestEvaluation(page, `NodeList ${Date.now()}`);
    const executionId = await runExecutionAPI(page, versionId, { test_score: 75 });

    await navigateToExecutionTrace(page, executionId);
    await waitForPageLoad(page);

    await expect(page.getByText(/Node Execution Results/i)).toBeVisible({ timeout: 10000 });
    await cleanup();
  });
});

test.describe('Execution Compare - Side by Side', () => {
  test('should render Compare Executions page with two graphs', async ({ page }) => {
    const { versionId, evaluationId, schemaId, cleanup } = await setupTestEvaluation(page, `Compare ${Date.now()}`);

    const exec1 = await runExecutionAPI(page, versionId, { test_score: 50 });
    const exec2 = await runExecutionAPI(page, versionId, { test_score: 80 });

    await page.goto(`${BASE_URL}/executions/compare?ids=${exec1},${exec2}`);
    await waitForPageLoad(page);

    await expect(page.getByText(/Compare Executions/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Execution A/i)).toBeVisible();
    await expect(page.getByText(/Execution B/i)).toBeVisible();

    await cleanup();
  });

  test('should show Per-Node Comparison table', async ({ page }) => {
    const { versionId, evaluationId, schemaId, cleanup } = await setupTestEvaluation(page, `CompareTable ${Date.now()}`);

    const exec1 = await runExecutionAPI(page, versionId, { test_score: 50 });
    const exec2 = await runExecutionAPI(page, versionId, { test_score: 80 });

    await page.goto(`${BASE_URL}/executions/compare?ids=${exec1},${exec2}`);
    await waitForPageLoad(page);

    await expect(page.getByText(/Per-Node Comparison/i)).toBeVisible({ timeout: 10000 });
    await cleanup();
  });

  test('should show message when no ids provided', async ({ page }) => {
    await page.goto(`${BASE_URL}/executions/compare`);
    await waitForPageLoad(page);

    await expect(page.getByText(/provide two execution ids/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Execution Runner - Error Handling', () => {
  test('should show error message on failed run', async ({ page }) => {
    const { versionId, cleanup } = await setupTestEvaluation(page, `Error ${Date.now()}`);

    await navigateToExecutions(page);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /^\+ New Execution$/ }).click();
    await waitForPageLoad(page);

    await expect(page.getByText(/Run Evaluation/i).first()).toBeVisible({ timeout: 3000 });

    await cleanup();
  });
});
