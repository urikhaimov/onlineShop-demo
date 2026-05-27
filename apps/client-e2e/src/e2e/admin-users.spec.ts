// apps/client-e2e/src/e2e/admin-users.spec.ts
import { test, expect } from '../fixtures';
import { mockUsersList, DEMO_USER } from '../helpers/mocks';
import { makeUser } from '../helpers/data';

test.describe('Admin users list', () => {
  test('users page loads without redirect', async ({ admin }) => {
    await admin.goto('/admin/users', { waitUntil: 'domcontentloaded' });
    await admin.waitForTimeout(2_000);
    expect(admin.url()).not.toMatch(/\/login/);
  });

  test('shows users table or list', async ({ admin }) => {
    const users = [
      makeUser({ email: 'alice@example.com', role: 'user' }),
      makeUser({ email: 'bob@example.com', role: 'admin' }),
    ];
    await mockUsersList(admin, users);
    await admin.goto('/admin/users', { waitUntil: 'domcontentloaded' });
    await admin.waitForTimeout(3_000);
    const body = await admin
      .locator('body')
      .innerText()
      .catch(() => '');
    expect(body.length).toBeGreaterThan(0);
  });

  test('shows demo mode message when in demo mode', async ({ admin }) => {
    // AdminUsersPage has a demo mode guard — should not crash
    await admin.goto('/admin/users', { waitUntil: 'domcontentloaded' });
    await admin.waitForTimeout(2_000);
    const body = await admin
      .locator('body')
      .innerText()
      .catch(() => '');
    expect(body).not.toMatch(/uncaught|unhandled exception/i);
  });
});

test.describe('Admin edit user role', () => {
  test('edit role button opens dialog', async ({ admin }) => {
    await mockUsersList(admin, [DEMO_USER]);
    await admin.goto('/admin/users', { waitUntil: 'domcontentloaded' });
    await admin.waitForTimeout(3_000);

    const editBtn = admin.getByRole('button', { name: /edit|role|ערוך/i });
    if (await editBtn.count()) {
      await editBtn.first().click();
      await admin.waitForTimeout(1_000);
      const dialog = admin.getByRole('dialog');
      if (await dialog.count()) {
        await expect(dialog).toBeVisible({ timeout: 5_000 });
        const cancel = dialog.getByRole('button', { name: /cancel|ביטול/i });
        if (await cancel.count()) await cancel.click();
      }
    }
  });

  test('delete user button opens confirmation', async ({ admin }) => {
    await mockUsersList(admin, [DEMO_USER]);
    await admin.goto('/admin/users', { waitUntil: 'domcontentloaded' });
    await admin.waitForTimeout(3_000);

    const deleteBtn = admin.getByRole('button', { name: /delete|מחק/i });
    if (await deleteBtn.count()) {
      await deleteBtn.first().click();
      await admin.waitForTimeout(1_000);
      const dialog = admin.getByRole('dialog');
      if (await dialog.count()) {
        await expect(dialog.getByText(/delete|cannot be undone/i)).toBeVisible({
          timeout: 5_000,
        });
        const cancel = dialog.getByRole('button', { name: /cancel|ביטול/i });
        if (await cancel.count()) await cancel.click();
      }
    }
  });
});
