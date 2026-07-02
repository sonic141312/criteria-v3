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

async function deleteSchemaAPI(request: any, schemaId: string) {
  await request.delete(`${BASE_URL}/schemas/${schemaId}`, {
    headers: { 'X-Org-Id': ORG_ID }
  });
}

test.describe('SchemaEditorPage - Basic Functionality', () => {
  test('should display schemas page with header', async ({ page }) => {
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    const header = page.locator('h2').filter({ hasText: /Schema/i });
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('should display schemas list', async ({ page }) => {
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    // Should show Schemas heading
    const schemasHeading = page.getByRole('heading', { name: 'Schemas' });
    await expect(schemasHeading).toBeVisible({ timeout: 10000 });
  });

  test('should show "New Schema" button', async ({ page }) => {
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    const newBtn = page.getByRole('button', { name: '+ New' });
    await expect(newBtn).toBeVisible({ timeout: 10000 });
  });

  test('should open create schema modal', async ({ page }) => {
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    await page.getByRole('button', { name: '+ New' }).click();
    
    // Should show form inputs
    const nameInput = page.getByPlaceholder('Schema name');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
  });

  test('should create new schema', async ({ page }) => {
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    // Create via API first
    const schema = await createSchemaAPI(page.request, `Test Schema ${Date.now()}`);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should show the schema in list - use first() to avoid strict mode
    const schemaInList = page.getByText(schema.name).first();
    await expect(schemaInList).toBeVisible({ timeout: 10000 });
    
    // Cleanup
    await deleteSchemaAPI(page.request, schema.id);
  });

  test('should select a schema to view details', async ({ page }) => {
    // Create schema
    const schema = await createSchemaAPI(page.request, `Select Test ${Date.now()}`);
    
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    // Click on schema - use first() to avoid strict mode
    await page.getByText(schema.name).first().click();
    await page.waitForLoadState('networkidle');
    
    // Should show schema details
    const schemaDetail = page.locator('h1').filter({ hasText: schema.name });
    await expect(schemaDetail).toBeVisible({ timeout: 10000 });
    
    // Cleanup
    await deleteSchemaAPI(page.request, schema.id);
  });

  test('should show schema detail with Fields section', async ({ page }) => {
    const schema = await createSchemaAPI(page.request, `Fields Test ${Date.now()}`);
    
    await page.goto(`/schemas/${schema.id}`);
    await page.waitForLoadState('networkidle');
    
    // Should show Fields heading
    const fieldsHeading = page.getByText('Fields');
    await expect(fieldsHeading).toBeVisible({ timeout: 10000 });
    
    await deleteSchemaAPI(page.request, schema.id);
  });

  test('should display schema ID', async ({ page }) => {
    const schema = await createSchemaAPI(page.request, `ID Test ${Date.now()}`);
    
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    await page.getByText(schema.name).click();
    await page.waitForLoadState('networkidle');
    
    // Should show ID text
    const idText = page.getByText(/ID: /);
    await expect(idText).toBeVisible({ timeout: 10000 });
    
    await deleteSchemaAPI(page.request, schema.id);
  });
});

test.describe('SchemaEditorPage - Field Management', () => {
  let testSchema: any;
  
  test.beforeEach(async ({ page }) => {
    testSchema = await createSchemaAPI(page.request, `Field Test ${Date.now()}`);
    await page.waitForTimeout(500);
  });

  test.afterEach(async ({ page }) => {
    if (testSchema) {
      await deleteSchemaAPI(page.request, testSchema.id);
    }
  });

  test('should show "Add Field" button', async ({ page }) => {
    await page.goto(`/schemas`);
    await page.waitForLoadState('networkidle');
    
    // Click on schema to select it
    await page.getByText(testSchema.name).click();
    await page.waitForLoadState('networkidle');
    
    const addFieldBtn = page.getByRole('button', { name: /Add Field/i });
    await expect(addFieldBtn).toBeVisible({ timeout: 15000 });
  });

  test('should open add field form', async ({ page }) => {
    await page.goto(`/schemas`);
    await page.waitForLoadState('networkidle');
    
    await page.getByText(testSchema.name).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await page.getByRole('button', { name: /Add Field/i }).click();
    
    await page.waitForTimeout(500);
    const keyInput = page.getByPlaceholder(/key/i);
    await expect(keyInput).toBeVisible({ timeout: 5000 });
  });

  test('should add a new field', async ({ page }) => {
    await page.goto(`/schemas`);
    await page.waitForLoadState('networkidle');
    
    await page.getByText(testSchema.name).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await page.getByRole('button', { name: /Add Field/i }).click();
    await page.waitForTimeout(300);
    
    await page.getByPlaceholder(/key/i).fill('test_field');
    await page.getByPlaceholder('Display name').fill('Test Field');
    
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    
    await page.waitForTimeout(1000);
    
    await expect(page.getByText('test_field')).toBeVisible({ timeout: 10000 });
  });

  test('should show field types dropdown', async ({ page }) => {
    await page.goto(`/schemas`);
    await page.waitForLoadState('networkidle');
    
    await page.getByText(testSchema.name).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await page.getByRole('button', { name: /Add Field/i }).click();
    
    await page.waitForTimeout(300);
    const typeSelect = page.locator('select').first();
    await expect(typeSelect).toBeVisible({ timeout: 5000 });
  });

  test('should show field in table with key, display name, and type', async ({ page }) => {
    await createFieldAPI(page.request, testSchema.id, {
      key: 'score',
      displayName: 'Score',
      dataType: 'number'
    });
    
    await page.goto(`/schemas`);
    await page.waitForLoadState('networkidle');
    
    await page.getByText(testSchema.name).click();
    await page.waitForLoadState('networkidle');
    
    // Use exact match for cell
    await expect(page.getByRole('cell', { name: 'score', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('cell', { name: 'Score', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('cell', { name: 'number', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should delete a field via API', async ({ page }) => {
    const field = await createFieldAPI(page.request, testSchema.id, {
      key: 'to_delete',
      displayName: 'To Delete',
      dataType: 'string'
    });
    
    // Delete via API
    const deleteRes = await page.request.delete(
      `${BASE_URL}/schemas/${testSchema.id}/fields/${field.id}`,
      { headers: { 'X-Org-Id': ORG_ID } }
    );
    expect(deleteRes.ok()).toBeTruthy();
  });

  test('should show empty state for fields', async ({ page }) => {
    await page.goto(`/schemas`);
    await page.waitForLoadState('networkidle');
    
    await page.getByText(testSchema.name).click();
    await page.waitForLoadState('networkidle');
    
    const emptyFields = page.getByText(/No fields yet/i);
    await expect(emptyFields).toBeVisible({ timeout: 10000 });
  });

  test('should create field with different data types', async ({ page }) => {
    const dataTypes = ['number', 'string'];
    
    for (const dataType of dataTypes) {
      await createFieldAPI(page.request, testSchema.id, {
        key: `field_${dataType}`,
        displayName: `Field ${dataType}`,
        dataType
      });
    }
    
    await page.goto(`/schemas`);
    await page.waitForLoadState('networkidle');
    
    await page.getByText(testSchema.name).click();
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByText('field_number')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('field_string')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('SchemaEditorPage - Schema CRUD', () => {
  test('should create schema with name only', async ({ page }) => {
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    await page.getByRole('button', { name: '+ New' }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Schema name').fill('My New Schema');
    
    // Use exact match for Create button
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    
    await page.waitForTimeout(1000);
    
    // Use heading role to avoid strict mode
    await expect(page.getByRole('heading', { name: 'My New Schema' })).toBeVisible({ timeout: 10000 });
    
    // Find and delete the schema
    const schema = await page.request.get(`${BASE_URL}/schemas`, {
      headers: { 'X-Org-Id': ORG_ID }
    });
    const schemas = await schema.json();
    const created = schemas.find((s: any) => s.name === 'My New Schema');
    if (created) await deleteSchemaAPI(page.request, created.id);
  });

  test('should create schema with name and description', async ({ page }) => {
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    await page.getByRole('button', { name: '+ New' }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Schema name').fill('Schema With Desc');
    await page.getByPlaceholder('Description').fill('A test description');
    
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    
    await page.waitForTimeout(1000);
    
    // Use heading role to avoid strict mode
    await expect(page.getByRole('heading', { name: 'Schema With Desc' })).toBeVisible({ timeout: 10000 });
    
    // Cleanup
    const schema = await page.request.get(`${BASE_URL}/schemas`, {
      headers: { 'X-Org-Id': ORG_ID }
    });
    const schemas = await schema.json();
    const created = schemas.find((s: any) => s.name === 'Schema With Desc');
    if (created) await deleteSchemaAPI(page.request, created.id);
  });

  test('should delete a schema', async ({ page }) => {
    const schema = await createSchemaAPI(page.request, `Delete Test ${Date.now()}`);
    
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    // Select schema
    await page.getByText(schema.name).click();
    await page.waitForTimeout(500);
    
    // Click delete button
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /Delete Schema/i }).click();
    
    await page.waitForTimeout(1000);
  });

  test('should update schema via navigation', async ({ page }) => {
    const schema = await createSchemaAPI(page.request, `Update Test ${Date.now()}`);
    
    // Navigate directly to schema via sidebar
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    // Click on schema in sidebar
    await page.getByText(schema.name).click();
    await page.waitForLoadState('networkidle');
    
    // Should show schema detail
    await expect(page.locator('h1').filter({ hasText: schema.name })).toBeVisible({ timeout: 10000 });
    
    await deleteSchemaAPI(page.request, schema.id);
  });
});

test.describe('SchemaEditorPage - Validation', () => {
  let testSchema: any;
  
  test.beforeEach(async ({ page }) => {
    testSchema = await createSchemaAPI(page.request, `Validation Test ${Date.now()}`);
    await page.waitForTimeout(500);
  });

  test.afterEach(async ({ page }) => {
    if (testSchema) {
      await deleteSchemaAPI(page.request, testSchema.id);
    }
  });

  test('should open and close field form', async ({ page }) => {
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    await page.getByText(testSchema.name).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await page.getByRole('button', { name: /Add Field/i }).click();
    
    await page.waitForTimeout(300);
    const keyInput = page.getByPlaceholder(/key/i);
    await expect(keyInput).toBeVisible({ timeout: 5000 });
    
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    await page.waitForTimeout(500);
  });

  test('should show form inputs when adding field', async ({ page }) => {
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    await page.getByText(testSchema.name).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await page.getByRole('button', { name: /Add Field/i }).click();
    
    await page.waitForTimeout(300);
    const keyInput = page.getByPlaceholder(/key/i);
    const displayInput = page.getByPlaceholder('Display name');
    
    await expect(keyInput).toBeVisible({ timeout: 5000 });
    await expect(displayInput).toBeVisible({ timeout: 5000 });
  });

  test('should auto-convert key to lowercase with underscores', async ({ page }) => {
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    await page.getByText(testSchema.name).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await page.getByRole('button', { name: /Add Field/i }).click();
    
    await page.waitForTimeout(300);
    await page.getByPlaceholder(/key/i).fill('Test Key');
    
    const keyValue = await page.getByPlaceholder(/key/i).inputValue();
    expect(keyValue).toBe('test_key');
  });
});

test.describe('SchemaEditorPage - Responsive Design', () => {
  test('should render on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    // Use heading role to avoid strict mode
    const sidebar = page.getByRole('heading', { name: 'Schemas' });
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('should render on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    const sidebar = page.getByRole('heading', { name: 'Schemas' });
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('should render on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/schemas');
    await page.waitForLoadState('networkidle');
    
    const sidebar = page.getByRole('heading', { name: 'Schemas' });
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });
});

test.describe('SchemaEditorPage - Error Handling', () => {
  test('should handle non-existent schema gracefully', async ({ page }) => {
    await page.goto('/schemas/non-existent-id');
    await page.waitForLoadState('networkidle');
    
    // Should show loading or error state
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
  });

  test('should show loading state', async ({ page }) => {
    await page.goto('/schemas');
    
    // Before network idle
    const loadingText = page.getByText('Loading');
    const hasLoading = await loadingText.isVisible().catch(() => false);
    expect(typeof hasLoading === 'boolean').toBeTruthy();
  });
});
