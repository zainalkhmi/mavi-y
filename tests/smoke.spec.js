import { test, expect } from '@playwright/test';

test('basic test @smoke', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeDefined();
    await expect(page.locator('body')).toContainText(/Motion|MAVi/i);
});

test('admin panel access @admin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('body')).toContainText(/Admin|Access|Login/i);
});

test('analysis dashboard @analysis', async ({ page }) => {
    await page.goto('/analysis');
    await expect(page.locator('body')).toBeVisible();
});

test('cycle time analysis @cycle', async ({ page }) => {
    await page.goto('/cycle-analysis');
    await expect(page.locator('body')).toBeVisible();
});

test('knowledge base @knowledge', async ({ page }) => {
    await page.goto('/knowledge-base');
    await expect(page.locator('body')).toBeVisible();
});

test('maviclass @maviclass', async ({ page }) => {
    await page.goto('/mavi-class');
    await expect(page.locator('body')).toBeVisible();
});

test('file explorer @files', async ({ page }) => {
    await page.goto('/files');
    await expect(page.locator('body')).toBeVisible();
});

test('statistical analysis @statistical', async ({ page }) => {
    await page.goto('/statistical-analysis');
    await expect(page.locator('body')).toBeVisible();
});

test('value stream map @vsm', async ({ page }) => {
    await page.goto('/value-stream-map');
    await expect(page.locator('body')).toBeVisible();
});

test('element rearrangement @rearrangement', async ({ page }) => {
    await page.goto('/rearrangement');
    await expect(page.locator('body')).toBeVisible();
});

test('waste elimination @waste', async ({ page }) => {
    await page.goto('/waste-elimination');
    await expect(page.locator('body')).toBeVisible();
});

test('best/worst cycle @best-worst', async ({ page }) => {
    await page.goto('/best-worst');
    await expect(page.locator('body')).toBeVisible();
});

test('video comparison @comparison', async ({ page }) => {
    await page.goto('/comparison');
    await expect(page.locator('body')).toBeVisible();
});

test('studio model @studio-model', async ({ page }) => {
    await page.goto('/studio-model');
    await expect(page.locator('body')).toBeVisible();
});

test('teachable machine @teachable-machine', async ({ page }) => {
    await page.goto('/teachable-machine');
    await expect(page.locator('body')).toBeVisible();
});

test('real-time compliance @compliance', async ({ page }) => {
    await page.goto('/realtime-compliance');
    await expect(page.locator('body')).toBeVisible();
});

test('multi-axial analysis @multi-axial', async ({ page }) => {
    await page.goto('/multi-axial');
    await expect(page.locator('body')).toBeVisible();
});

test('vr training mode @vr-training', async ({ page }) => {
    await page.goto('/vr-training');
    await expect(page.locator('body')).toBeVisible();
});

test('broadcast @broadcast', async ({ page }) => {
    await page.goto('/broadcast');
    await expect(page.locator('body')).toBeVisible();
});

test('manual creation @manual-creation', async ({ page }) => {
    await page.goto('/manual-creation');
    await expect(page.locator('body')).toBeVisible();
});

test('yamazumi chart @yamazumi', async ({ page }) => {
    await page.goto('/yamazumi');
    await expect(page.locator('body')).toBeVisible();
});

test('standard work sheet @swcs', async ({ page }) => {
    await page.goto('/swcs');
    await expect(page.locator('body')).toBeVisible();
});

test('mtm calculator @mtm', async ({ page }) => {
    await page.goto('/mtm');
    await expect(page.locator('body')).toBeVisible();
});
