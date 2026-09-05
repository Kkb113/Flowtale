import { expect, test } from '@playwright/test';

test('the actual captured renderer keeps nested frames and parent editing without executing captured code', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/__phase0/renderer');
  await expect(page.getByTestId('render-status')).toHaveText('Ready');
  const frame = page.frameLocator('iframe[title="Captured security fixture"]');
  await expect(frame.locator('#target')).toHaveText('Captured button');
  await expect(frame.locator('#captured-input')).toHaveValue('Captured value');
  await expect(frame.frameLocator('#nested').locator('#nested-button')).toHaveText('Nested capture');
  await expect(frame.frameLocator('#srcdoc-frame').locator('#srcdoc-content')).toHaveText('Static nested content');
  await frame.locator('#target').click();
  await expect(page.getByTestId('captured-clicks')).toHaveText('1');
  await page.getByRole('button', { name: 'Edit captured text' }).click();
  await expect(frame.locator('#target')).toHaveText('Edited through parent DOM');
  await expect(frame.locator('#target')).not.toHaveAttribute('onclick');
  await frame.locator('#target').click();
  await expect(page.getByTestId('captured-clicks')).toHaveText('2');
  expect(await page.evaluate(() => ({ capture: (window as any).__captureScriptRan,
    annotation: (window as any).__annotationScriptRan }))).toEqual({ capture: undefined, annotation: undefined });
  expect(errors).toEqual([]);
});
