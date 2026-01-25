import { test, expect } from '@playwright/test';

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

    const stepNode = page.locator('.react-flow__node').first();
    const initialPosition = await stepNode.boundingBox();

    // Ensure we have an initial position
    expect(initialPosition).not.toBeNull();

    // Simulate dragging the canvas background from a known start point
    const canvas = page.locator('.react-flow__pane');
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

    // Assert that it moved by the dragged amount
    expect(newPosition.x).toBeCloseTo(initialPosition.x + 100);
    expect(newPosition.y).toBeCloseTo(initialPosition.y + 50);
  });
});
