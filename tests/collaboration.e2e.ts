import { readFile } from 'node:fs/promises';
import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { attachmentFixture, createIssue, createProject, openIssue, tasks } from './helpers';

test('comment create, edit, delete and issue attachment upload, download, delete', async ({ app, screen, browser }) => {
  await app.open('/?lang=en');
  await createProject(screen, 'E2E comments and files');
  await createIssue(screen, 'Discussion issue');
  await openIssue(screen, 'Discussion issue');
  await screen.getByRole('textbox', 'Leave a comment').fill('Initial comment');
  await screen.getByRole('button', 'Comment').tap();
  await expect(screen.getByText('Initial comment')).toBeVisible();
  await screen.getByRole('button', 'Comment actions').tap();
  await screen.getByRole('menuitem', 'Edit comment').tap();
  await screen.getByRole('textbox', 'Edit comment').fill('Updated comment');
  await screen.getByRole('button', 'Save').tap();
  await expect(screen.getByText('Updated comment')).toBeVisible();
  await browser.reload();
  await expect(screen.getByText('Updated comment')).toBeVisible();
  await browser.locator('.issue-attachments input[type=file]').setInputFiles(attachmentFixture);
  await expect(screen.getByRole('button', 'Delete attachment.txt')).toBeVisible();
  const downloaded = await browser.waitForDownload(() => screen.getByRole('link', 'Download attachment.txt').tap());
  expect(await readFile(downloaded.absolutePath, 'utf8')).toBe('Dashi E2E attachment fixture\n');
  await screen.getByRole('button', 'Delete attachment.txt').tap();
  await screen.getByRole('button', 'Delete attachment').tap();
  await expect(screen.getByRole('button', 'Delete attachment.txt')).toBeHidden();
  await screen.getByRole('button', 'Comment actions').tap();
  await screen.getByRole('menuitem', 'Delete comment').tap();
  await screen.getByRole('alertdialog').getByRole('button', 'Delete comment').tap();
  await expect(screen.getByText('Updated comment')).toBeHidden();
});

test('comment attachments are uploaded with the comment and removed through UI', async ({ app, screen, browser }) => {
  await app.open('/?lang=en');
  await createProject(screen, 'E2E comment files');
  await createIssue(screen, 'Comment attachment issue');
  await openIssue(screen, 'Comment attachment issue');
  await screen.getByRole('textbox', 'Leave a comment').fill('Comment with file');
  await browser.locator('.comment-composer input[type=file]').setInputFiles(attachmentFixture);
  await expect(screen.getByRole('list', 'Pending comment attachments')).toContainText('attachment.txt');
  await screen.getByRole('button', 'Comment').tap();
  await expect(screen.getByRole('list', 'Comment attachments')).toContainText('attachment.txt');
  await browser.reload();
  await expect(screen.getByRole('list', 'Comment attachments')).toContainText('attachment.txt');
  await screen.getByRole('button', 'Delete attachment.txt').tap();
  await screen.getByRole('button', 'Delete attachment').tap();
  await expect(screen.getByRole('list', 'Comment attachments')).toBeHidden();
});

test('parent, sub-issue, blocked-by, blocks and related relations can be added and removed', async ({ app, screen, browser }) => {
  await app.open('/?lang=en');
  await createProject(screen, 'E2E relations');
  for (const title of ['Relation anchor', 'Relation target']) await createIssue(screen, title);
  await openIssue(screen, 'Relation anchor');
  const target = (await tasks(browser)).find(task => task.title === 'Relation target');
  expect(target).toBeDefined();
  for (const label of ['Set parent issue', 'Add sub-issue', 'Add blocker', 'Add blocked issue', 'Add related issue']) {
    await screen.getByRole('button', label).tap();
    await screen.getByPlaceholder('Search issues…').fill('Relation target');
    await screen.getByRole('option', new RegExp(target!.identifier)).tap();
    await expect(screen.getByRole('button', `Remove ${target!.identifier}`)).toBeVisible();
    await browser.reload();
    await expect(screen.getByRole('button', `Remove ${target!.identifier}`)).toBeVisible();
    // The remove control is revealed on row hover (opacity 0 until then), so
    // hover the row the way a pointing user would, then tap.
    const row = browser.locator('.issue-relation-row').filter({ hasText: target!.identifier });
    await row.hover();
    await screen.getByRole('button', `Remove ${target!.identifier}`).tap();
    await expect(screen.getByRole('button', `Remove ${target!.identifier}`)).toBeHidden();
  }
});
