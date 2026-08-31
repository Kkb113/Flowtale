import { expect, test } from '@playwright/test';

test('semantic editor action can be applied, undone, redone, and recovered after reload', async ({ page }) => {
  await page.goto('/__phase0/editor');

  const option = page.getByTestId('minimize-module');
  await expect(option).not.toBeChecked();
  await expect(page.getByTestId('persisted-state')).toHaveText('Off');

  await option.check();
  await expect(option).toBeChecked();
  await expect(page.getByTestId('diff')).toHaveText('Minimize module on start: Off → On');

  await page.getByTestId('undo').click();
  await expect(option).not.toBeChecked();

  await page.getByTestId('redo').click();
  await expect(option).toBeChecked();

  await page.reload();
  await expect(option).toBeChecked();
  await expect(page.getByTestId('persisted-state')).toHaveText('On');
});
