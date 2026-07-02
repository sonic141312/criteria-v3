import { test, expect } from '@playwright/test';
import {
  createSchemaAPI,
  createFieldAPI,
  updateFieldAPI,
  deleteSchemaAPI,
  navigateToEvaluations,
  waitForPageLoad,
} from './fixtures';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000';
const ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Field Update E2E Tests
 *
 * Tests the field editing functionality in Schema Editor.
 */
test.describe('Field Update Flow', () => {
  let testData: {
    schemaId: string;
    fieldId: string;
    cleanup: () => Promise<void>;
  };

  test.beforeAll(async ({ request }) => {
    // Create schema
    const schemaName = `Field Update Test Schema ${Date.now()}`;
    const schemaId = await createSchemaAPIByRequest(request, schemaName);

    // Create field
    const fieldId = await createFieldAPIByRequest(request, schemaId, {
      key: 'test_field',
      displayName: 'Original Display Name',
      dataType: 'number',
    });

    testData = {
      schemaId,
      fieldId,
      cleanup: async () => {
        await deleteSchemaAPIByRequest(request, schemaId);
      },
    };
  });

  test.afterAll(async () => {
    if (testData?.cleanup) {
      await testData.cleanup();
    }
  });

  test('should update field displayName via API', async ({ request }) => {
    // Update field via API
    await updateFieldAPIByRequest(request, testData.schemaId, testData.fieldId, {
      displayName: 'Updated Display Name',
    });

    // Verify update by fetching field
    const response = await request.fetch(
      `${API_URL}/schemas/${testData.schemaId}/fields`,
      { headers: { 'X-Org-Id': ORG_ID } }
    );
    const fields = await response.json();
    const updatedField = fields.find((f: any) => f.id === testData.fieldId);

    expect(updatedField.displayName).toBe('Updated Display Name');
  });

  test('should update field description via API', async ({ request }) => {
    // Update field description via API
    await updateFieldAPIByRequest(request, testData.schemaId, testData.fieldId, {
      description: 'Updated description text',
    });

    // Verify update
    const response = await request.fetch(
      `${API_URL}/schemas/${testData.schemaId}/fields`,
      { headers: { 'X-Org-Id': ORG_ID } }
    );
    const fields = await response.json();
    const updatedField = fields.find((f: any) => f.id === testData.fieldId);

    expect(updatedField.description).toBe('Updated description text');
  });

  test('should update both displayName and description in one call', async ({ request }) => {
    // Update both fields
    await updateFieldAPIByRequest(request, testData.schemaId, testData.fieldId, {
      displayName: 'Final Display Name',
      description: 'Final description',
    });

    // Verify both updates
    const response = await request.fetch(
      `${API_URL}/schemas/${testData.schemaId}/fields`,
      { headers: { 'X-Org-Id': ORG_ID } }
    );
    const fields = await response.json();
    const updatedField = fields.find((f: any) => f.id === testData.fieldId);

    expect(updatedField.displayName).toBe('Final Display Name');
    expect(updatedField.description).toBe('Final description');
  });
});

test.describe('Schema Editor Field UI', () => {
  let testData: {
    schemaId: string;
    fieldId: string;
    cleanup: () => Promise<void>;
  };

  test.beforeEach(async ({ request }) => {
    // Create fresh schema for each test
    const schemaName = `UI Test Schema ${Date.now()}`;
    const schemaId = await createSchemaAPIByRequest(request, schemaName);

    const fieldId = await createFieldAPIByRequest(request, schemaId, {
      key: 'ui_test_field',
      displayName: 'Initial Name',
      dataType: 'string',
    });

    testData = {
      schemaId,
      fieldId,
      cleanup: async () => {
        await deleteSchemaAPIByRequest(request, schemaId);
      },
    };
  });

  test.afterEach(async () => {
    if (testData?.cleanup) {
      await testData.cleanup();
    }
  });

  test('should show Edit button for each field', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas`);
    await waitForPageLoad(page);

    // Select the schema
    await page.click(`text=${testData.schemaId.substring(0, 8)}`);

    // Should show Edit button
    await expect(page.locator('button:has-text("Edit")')).toBeVisible();
  });

  test('should show Delete button for each field', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas`);
    await waitForPageLoad(page);

    // Select the schema
    await page.click(`text=${testData.schemaId.substring(0, 8)}`);

    // Should show Delete button
    await expect(page.locator('button:has-text("Delete")')).toBeVisible();
  });

  test('should display field dataType badge', async ({ page }) => {
    await page.goto(`${BASE_URL}/schemas`);
    await waitForPageLoad(page);

    // Select the schema
    await page.click(`text=${testData.schemaId.substring(0, 8)}`);

    // Should show data type badge
    await expect(page.locator('text=string')).toBeVisible();
  });
});

// Helper functions for direct API calls
async function createSchemaAPIByRequest(
  request: any,
  name: string
): Promise<string> {
  const response = await request.fetch(`${API_URL}/schemas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Org-Id': ORG_ID },
    data: { name },
  });
  const data = await response.json();
  return data.id;
}

async function createFieldAPIByRequest(
  request: any,
  schemaId: string,
  data: { key: string; displayName: string; dataType: string }
): Promise<string> {
  const response = await request.fetch(`${API_URL}/schemas/${schemaId}/fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Org-Id': ORG_ID },
    data,
  });
  const result = await response.json();
  return result.id;
}

async function updateFieldAPIByRequest(
  request: any,
  schemaId: string,
  fieldId: string,
  data: { displayName?: string; description?: string }
): Promise<void> {
  await request.fetch(`${API_URL}/schemas/${schemaId}/fields/${fieldId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Org-Id': ORG_ID },
    data,
  });
}

async function deleteSchemaAPIByRequest(
  request: any,
  schemaId: string
): Promise<void> {
  await request.fetch(`${API_URL}/schemas/${schemaId}`, {
    method: 'DELETE',
    headers: { 'X-Org-Id': ORG_ID },
  });
}
