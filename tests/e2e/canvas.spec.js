import { test, expect } from '@playwright/test';

async function fitView(page) {
  await page.locator('.svelte-flow__controls-fitview').click();
  await page.waitForTimeout(300);
}

test.describe('Canvas Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and ensure a clean state
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/'); // Re-navigate to apply the cleared storage state

    // Create a new map
    await page.getByTestId('new-map-name-input').fill('E2E Test Map');
    await page.getByTestId('create-map-button').click();
  });

  test('should pan the canvas when dragging the background', async ({ page }) => {
    // Add a step to have something to reference
    await page.getByRole('button', { name: 'Add Step' }).click();

    // The "Edit Step" panel opens automatically. Close it to ensure a clean state.
    await page.getByRole('button', { name: '✕' }).click();

    const stepNode = page.locator('.vsm-node').first();
    const initialPosition = await stepNode.boundingBox();

    // Ensure we have an initial position
    expect(initialPosition).not.toBeNull();

    // Simulate dragging the canvas background from a known start point
    const canvas = page.locator('.svelte-flow__pane');
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 200, y: 200 },
      targetPosition: { x: 300, y: 250 },
    });

    // Get the new position
    const newPosition = await stepNode.boundingBox();
    expect(newPosition).not.toBeNull();

    // Assert that the position has changed
    expect(newPosition.x).not.toBe(initialPosition.x);
    expect(newPosition.y).not.toBe(initialPosition.y);

    // Assert that the node moved in the correct direction (right and down)
    // Avoid asserting exact pixel offsets as canvas transforms may scale the delta
    expect(newPosition.x).toBeGreaterThan(initialPosition.x);
    expect(newPosition.y).toBeGreaterThan(initialPosition.y);
  });

  test('should add a step to the map', async ({ page }) => {
    // Click the Add Step button
    await page.getByRole('button', { name: 'Add Step' }).click();

    // Verify a step node appears on the canvas
    const stepNode = page.locator('.vsm-node').first();
    await expect(stepNode).toBeVisible();

    // Verify the edit panel opens
    await expect(page.getByTestId('step-editor')).toBeVisible();
  });

  test('should edit a step with custom values', async ({ page }) => {
    // Add a step
    await page.getByRole('button', { name: 'Add Step' }).click();

    // Fill in step details
    await page.getByTestId('step-name-input').fill('Development');
    await page.getByTestId('process-time-input').fill('60');
    await page.getByTestId('lead-time-input').fill('240');
    await page.getByTestId('percent-ca-input').fill('95');

    // Save the step
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify the step displays the correct name
    await expect(page.locator('.vsm-node').first()).toContainText('Development');
  });

  test('should connect two steps', async ({ page }) => {
    // Add first step (positioned right) then second step (positioned left)
    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.getByTestId('step-name-input').fill('Development');
    await page.getByRole('button', { name: 'Save' }).click();

    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.getByTestId('step-name-input').fill('Testing');
    await page.getByRole('button', { name: 'Save' }).click();

    // Fit view to show all nodes after adding steps
    await fitView(page);

    // With backwards mapping, Testing (2nd) is left of Development (1st)
    // Connect left→right: Testing's right handle → Development's left handle
    const devNode = page.locator('.vsm-node', { hasText: 'Development' });
    const testNode = page.locator('.vsm-node', { hasText: 'Testing' });

    await testNode.locator('.svelte-flow__handle-right').dragTo(
      devNode.locator('.svelte-flow__handle-left')
    );

    // Verify connection edge appears
    const edge = page.locator('.svelte-flow__edge').first();
    await expect(edge).toBeVisible();
  });

  test('should complete workflow: create map → add steps → connect → edit → view metrics', async ({ page }) => {
    // Step 1: Add Development step
    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.getByTestId('step-name-input').fill('Development');
    await page.getByTestId('process-time-input').fill('120');
    await page.getByTestId('lead-time-input').fill('480');
    await page.getByTestId('percent-ca-input').fill('90');
    await page.getByRole('button', { name: 'Save' }).click();

    // Step 2: Add Code Review step
    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.getByTestId('step-name-input').fill('Code Review');
    await page.getByTestId('process-time-input').fill('30');
    await page.getByTestId('lead-time-input').fill('120');
    await page.getByTestId('percent-ca-input').fill('95');
    await page.getByRole('button', { name: 'Save' }).click();

    // Step 3: Add Testing step
    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.getByTestId('step-name-input').fill('Testing');
    await page.getByTestId('process-time-input').fill('60');
    await page.getByTestId('lead-time-input').fill('240');
    await page.getByTestId('percent-ca-input').fill('85');
    await page.getByRole('button', { name: 'Save' }).click();

    // Fit view to show all nodes
    await fitView(page);

    // With backwards mapping: Development (right), Code Review (middle), Testing (left)
    // Connect left→right: Testing → Code Review → Development
    const devNode = page.locator('.vsm-node', { hasText: 'Development' });
    const reviewNode = page.locator('.vsm-node', { hasText: 'Code Review' });
    const testNode = page.locator('.vsm-node', { hasText: 'Testing' });

    await testNode.locator('.svelte-flow__handle-right').dragTo(reviewNode.locator('.svelte-flow__handle-left'));

    await reviewNode.locator('.svelte-flow__handle-right').dragTo(devNode.locator('.svelte-flow__handle-left'));

    // Verify all connections exist
    const edges = page.locator('.svelte-flow__edge');
    await expect(edges).toHaveCount(2);

    // Step 6: View metrics dashboard
    await page.getByRole('button', { name: 'Metrics' }).click();

    // Verify metrics are displayed
    await expect(page.getByTestId('metrics-dashboard')).toBeVisible();
    await expect(page.getByTestId('flow-efficiency-card')).toBeVisible();
    await expect(page.getByTestId('total-lead-time-card')).toBeVisible();

    // Verify flow efficiency calculation (150 min process / 840 min lead = ~18%)
    const flowEfficiency = page.getByTestId('flow-efficiency-value');
    await expect(flowEfficiency).toContainText(/1[78]%|19%/);
  });

  test('should run a simulation', async ({ page }) => {
    // Create a simple two-step process
    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.getByTestId('step-name-input').fill('Development');
    await page.getByTestId('process-time-input').fill('60');
    await page.getByTestId('lead-time-input').fill('120');
    await page.getByRole('button', { name: 'Save' }).click();

    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.getByTestId('step-name-input').fill('Testing');
    await page.getByTestId('process-time-input').fill('30');
    await page.getByTestId('lead-time-input').fill('90');
    await page.getByRole('button', { name: 'Save' }).click();

    // Fit view, then connect: Testing (left) → Development (right)
    await fitView(page);
    const devNode = page.locator('.vsm-node', { hasText: 'Development' });
    const testNode = page.locator('.vsm-node', { hasText: 'Testing' });
    await testNode.locator('.svelte-flow__handle-right').dragTo(devNode.locator('.svelte-flow__handle-left'));

    // Open simulation panel
    await page.getByRole('button', { name: 'Simulate' }).click();
    await expect(page.getByTestId('simulation-panel')).toBeVisible();

    // Configure simulation
    await page.getByTestId('work-item-count-input').fill('10');
    await page.getByTestId('simulation-duration-input').fill('100');

    // Run simulation
    await page.getByRole('button', { name: 'Run Simulation' }).click();

    // Verify simulation results appear
    await expect(page.getByTestId('simulation-results')).toBeVisible();
    await expect(page.getByTestId('completed-items-count')).toBeVisible();
    await expect(page.getByTestId('average-cycle-time')).toBeVisible();
  });

  test('should delete a step', async ({ page }) => {
    // Add a step
    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.getByTestId('step-name-input').fill('Development');
    await page.getByRole('button', { name: 'Save' }).click();

    // Select the step
    const stepNode = page.locator('.vsm-node').first();
    await stepNode.click();

    // Delete the step
    await page.getByRole('button', { name: 'Delete Step' }).click();

    // Confirm deletion
    await page.getByRole('button', { name: 'Confirm' }).click();

    // Verify step is removed
    await expect(stepNode).not.toBeVisible();
  });

  test('should export map as image', async ({ page }) => {
    // Create a simple map
    await page.getByRole('button', { name: 'Add Step' }).click();
    await page.getByTestId('step-name-input').fill('Development');
    await page.getByRole('button', { name: 'Save' }).click();

    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    await page.getByRole('button', { name: 'Export as PNG' }).click();

    // Verify download initiated
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });
});
