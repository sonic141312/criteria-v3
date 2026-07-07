import { test, expect } from '@playwright/test';
import {
  createSchemaAPI,
  createFieldAPI,
  deleteSchemaAPI,
  navigateToSchemas,
  waitForPageLoad,
} from './fixtures';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3000';
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const ORG_ID = '00000000-0000-0000-0000-000000000001';

test.describe('Schema Editor - Bulk Import JSON', () => {
  let schemaId: string;

  test.beforeEach(async ({ page }) => {
    schemaId = await createSchemaAPI(page, `Bulk Import Test ${Date.now()}`);
    await navigateToSchemas(page);
    await waitForPageLoad(page);
  });

  test.afterEach(async ({ page }) => {
    if (schemaId) await deleteSchemaAPI(page, schemaId);
  });

  test('should open Bulk Import modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas/${schemaId}`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /Bulk Import \(JSON\)/ }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Bulk Import Fields')).toBeVisible({ timeout: 3000 });
  });

  test('should show error for invalid JSON', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas/${schemaId}`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /Bulk Import \(JSON\)/ }).click();
    await waitForPageLoad(page);

    const textarea = page.locator('textarea').first();
    await textarea.fill('{ not valid json');
    await page.waitForTimeout(500);

    await expect(page.getByText(/invalid json/i)).toBeVisible({ timeout: 3000 });
  });

  test('should show error for non-array JSON', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas/${schemaId}`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /Bulk Import \(JSON\)/ }).click();
    await waitForPageLoad(page);

    const textarea = page.locator('textarea').first();
    await textarea.fill('{"key": "value"}');
    await page.waitForTimeout(500);

    await expect(page.getByText(/must be an array/i)).toBeVisible({ timeout: 3000 });
  });

  test('should preview fields before submit', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas/${schemaId}`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /Bulk Import \(JSON\)/ }).click();
    await waitForPageLoad(page);

    const textarea = page.locator('textarea').first();
    await textarea.fill(JSON.stringify([
      { key: 'bulk1', displayName: 'Bulk Field 1', dataType: 'number' },
      { key: 'bulk2', displayName: 'Bulk Field 2', dataType: 'string' },
    ]));
    await page.waitForTimeout(500);

    await expect(page.getByText(/Preview \(2 fields\)/)).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Import 2 field(s)')).toBeVisible();
  });

  test('should import all valid fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas/${schemaId}`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /Bulk Import \(JSON\)/ }).click();
    await waitForPageLoad(page);

    const textarea = page.locator('textarea').first();
    await textarea.fill(JSON.stringify([
      { key: 'f1', displayName: 'Field 1', dataType: 'number' },
      { key: 'f2', displayName: 'Field 2', dataType: 'string' },
      { key: 'f3', displayName: 'Field 3', dataType: 'boolean' },
    ]));
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /Import 3 field/ }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText('f1')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('f2')).toBeVisible();
    await expect(page.getByText('f3')).toBeVisible();
  });

  test('should reject when missing required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas/${schemaId}`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /Bulk Import \(JSON\)/ }).click();
    await waitForPageLoad(page);

    const textarea = page.locator('textarea').first();
    await textarea.fill(JSON.stringify([{ key: 'a' }]));
    await page.waitForTimeout(500);

    await expect(page.getByText(/missing.*displayName/i)).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Schema Editor - Bulk Add Form', () => {
  let schemaId: string;

  test.beforeEach(async ({ page }) => {
    schemaId = await createSchemaAPI(page, `Bulk Form Test ${Date.now()}`);
    await navigateToSchemas(page);
  });

  test.afterEach(async ({ page }) => {
    if (schemaId) await deleteSchemaAPI(page, schemaId);
  });

  test('should open Add Field modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas/${schemaId}`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /^\+ Add Field$/ }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/Add Field\(s\)/)).toBeVisible({ timeout: 3000 });
  });

  test('should add multiple field rows', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas/${schemaId}`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /^\+ Add Field$/ }).click();
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /Add row/ }).click();
    await page.waitForTimeout(300);

    const rows = page.locator('input[placeholder^="key"]');
    await expect(rows).toHaveCount(2);
  });

  test('should submit multiple field rows', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas/${schemaId}`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /^\+ Add Field$/ }).click();
    await waitForPageLoad(page);

    const rows = page.locator('input[placeholder^="key"]');
    const displayRows = page.locator('input[placeholder^="Display name"]');

    await rows.first().fill('multi1');
    await displayRows.first().fill('Multi Field 1');
    await page.getByRole('button', { name: /Add row/ }).click();
    await page.waitForTimeout(300);

    await rows.nth(1).fill('multi2');
    await displayRows.nth(1).fill('Multi Field 2');

    await page.getByRole('button', { name: /Add 2 field/ }).click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('multi1')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('multi2')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Schema Editor - Duplicate from Schema', () => {
  let sourceSchemaId: string;
  let targetSchemaId: string;

  test.beforeEach(async ({ page }) => {
    sourceSchemaId = await createSchemaAPI(page, `Source Schema ${Date.now()}`);
    await createFieldAPI(page, sourceSchemaId, { key: 'source1', displayName: 'Source Field 1', dataType: 'number' });
    await createFieldAPI(page, sourceSchemaId, { key: 'source2', displayName: 'Source Field 2', dataType: 'string' });

    targetSchemaId = await createSchemaAPI(page, `Target Schema ${Date.now()}`);
  });

  test.afterEach(async ({ page }) => {
    if (sourceSchemaId) await deleteSchemaAPI(page, sourceSchemaId);
    if (targetSchemaId) await deleteSchemaAPI(page, targetSchemaId);
  });

  test('should open Duplicate from Schema modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas/${targetSchemaId}`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /Duplicate from Schema/ }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/Duplicate Fields from Schema/)).toBeVisible({ timeout: 3000 });
  });

  test('should load and select fields from source schema', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas/${targetSchemaId}`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /Duplicate from Schema/ }).click();
    await waitForPageLoad(page);

    const sourceSelect = page.locator('select').filter({ hasText: /select a schema/i }).first();
    await sourceSelect.selectOption(sourceSchemaId);
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /Load Fields/ }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/source1_copy/)).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/source2_copy/)).toBeVisible();
  });
});

test.describe('Schema Editor - Edit Field Modal', () => {
  let schemaId: string;

  test.beforeEach(async ({ page }) => {
    schemaId = await createSchemaAPI(page, `Edit Modal ${Date.now()}`);
    await createFieldAPI(page, schemaId, { key: 'editable', displayName: 'Original', dataType: 'number' });
    await navigateToSchemas(page);
  });

  test.afterEach(async ({ page }) => {
    if (schemaId) await deleteSchemaAPI(page, schemaId);
  });

  test('should open Edit modal when clicking Edit', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas/${schemaId}`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /^Edit$/ }).first().click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/^Edit Field$/)).toBeVisible({ timeout: 3000 });
  });

  test('should save field changes', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas/${schemaId}`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /^Edit$/ }).first().click();
    await waitForPageLoad(page);

    const input = page.locator('input').filter({ hasNotText: /key/i }).first();
    await input.fill('Updated Display Name');
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /^Save$/ }).click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('Updated Display Name')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Schema Editor - Delete Confirmations', () => {
  let schemaId: string;

  test.beforeEach(async ({ page }) => {
    schemaId = await createSchemaAPI(page, `Delete Confirm ${Date.now()}`);
    await createFieldAPI(page, schemaId, { key: 'todelete', displayName: 'To Delete', dataType: 'number' });
  });

  test.afterEach(async ({ page }) => {
    if (schemaId) await deleteSchemaAPI(page, schemaId);
  });

  test('should show ConfirmDialog when clicking Delete Field', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas/${schemaId}`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /^Delete$/ }).first().click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/Delete Field/i).first()).toBeVisible();
  });

  test('should show ConfirmDialog when clicking Delete Schema', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas/${schemaId}`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /Delete Schema/ }).click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/Delete Schema/i).first()).toBeVisible();
  });
});

test.describe('Schema Editor - Empty State', () => {
  test('should show EmptyState when schema has no fields', async ({ page }) => {
    const sid = await createSchemaAPI(page, `Empty State ${Date.now()}`);
    await page.goto(`${BASE_URL}/schemas/${sid}`);
    await waitForPageLoad(page);

    await expect(page.getByText(/No fields yet/i)).toBeVisible({ timeout: 5000 });
    await deleteSchemaAPI(page, sid);
  });
});
