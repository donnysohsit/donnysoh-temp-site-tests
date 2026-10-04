import { test, expect, type Page, type Locator } from '@playwright/test';

// Every test names the SPEC.md line it checks. Where the spec is loose, the
// comment says how the line was read so a reviewer can disagree with it.

const SITE = process.env.BASE_URL!;
const GITHUB_API = /^https:\/\/api\.github\.com\//;
// A link to a single repo page: github.com/<owner>/<repo>
const REPO_LINK = /^https:\/\/github\.com\/[^/?#]+\/[^/?#]+\/?$/;

async function open(page: Page) {
  await page.goto(SITE, { waitUntil: 'networkidle' });
}

async function isDark(page: Page) {
  return page.locator('body').evaluate((b) => b.classList.contains('dark'));
}

// SPEC.md:10 says "a button in the nav" without naming it. Read literally:
// some visible button inside <nav> flips the 'dark' class on <body>.
// Returns that button, or null if none of them does.
async function findDarkToggle(page: Page): Promise<Locator | null> {
  await open(page);
  const count = await page.locator('nav button').count();
  for (let i = 0; i < count; i++) {
    await open(page);
    const button = page.locator('nav button').nth(i);
    if (!(await button.isVisible())) continue;
    const before = await isDark(page);
    await button.click();
    if ((await isDark(page)) !== before) return button;
  }
  return null;
}

async function repoLinks(section: Locator) {
  const hrefs = await section.locator('a[href]').evaluateAll((as) =>
    as.map((a) => (a as HTMLAnchorElement).href),
  );
  return hrefs.filter((h) => REPO_LINK.test(h));
}

// Every test starts on the site. Tests that need a viewport or network mocks
// set them up and then open the site again.
test.beforeEach(async ({ page }) => {
  await open(page);
});

test.describe('Conventions', () => {
  test('SPEC.md:4 all six section ids exist', async ({ page }) => {
    await open(page);
    for (const id of ['hero', 'about', 'skills', 'projects', 'repos', 'contact']) {
      await expect(page.locator(`#${id}`), `#${id} is missing`).toHaveCount(1);
    }
  });

  test('SPEC.md:5 no horizontal scroll at 375px wide', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await open(page);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, 'page is wider than the viewport').toBeLessThanOrEqual(clientWidth);
  });

  // SPEC.md:6 has three cases. The site's data source is not stated; these
  // tests assume "the fetch" goes to api.github.com and fail clearly if the
  // site never calls it. "Cards" has no definition, so only the repo's
  // presence is checked, not its card styling.
  test.describe('SPEC.md:6 #repos', () => {
    async function openWithGitHub(page: Page, handle: Parameters<Page['route']>[1]) {
      let called = false;
      await page.route(GITHUB_API, (route, request) => {
        called = true;
        return handle(route, request);
      });
      await open(page);
      expect(called, 'site never requested api.github.com').toBe(true);
      return page.locator('#repos');
    }

    test('lists the public repos returned by GitHub', async ({ page }) => {
      const repo = {
        id: 900001,
        name: 'spec-check-repo',
        full_name: 'spec-owner/spec-check-repo',
        html_url: 'https://github.com/spec-owner/spec-check-repo',
        description: 'Repo injected by the SPEC.md:6 test',
        private: false,
        visibility: 'public',
        fork: false,
        archived: false,
        language: 'TypeScript',
        stargazers_count: 1,
        forks_count: 0,
        updated_at: '2026-01-01T00:00:00Z',
        pushed_at: '2026-01-01T00:00:00Z',
      };
      const repos = await openWithGitHub(page, (route) => route.fulfill({ json: [repo] }));
      await expect(repos).toContainText(repo.name);
    });

    test('shows a plain message when there are no repos', async ({ page }) => {
      const repos = await openWithGitHub(page, (route) => route.fulfill({ json: [] }));
      await expect(repos).not.toBeEmpty();
      expect(await repoLinks(repos), 'expected a message, found repo links').toEqual([]);
    });

    test('shows a plain message when the fetch fails', async ({ page }) => {
      const repos = await openWithGitHub(page, (route) => route.abort('failed'));
      await expect(repos).not.toBeEmpty();
      expect(await repoLinks(repos), 'expected a message, found repo links').toEqual([]);
    });
  });

  for (const id of ['hero', 'contact']) {
    test(`SPEC.md:7 #${id} links to email, GitHub and LinkedIn`, async ({ page }) => {
      await open(page);
      const section = page.locator(`#${id}`);
      await expect(section.locator('a[href^="mailto:"]').first(), 'email link').toBeAttached();
      await expect(section.locator('a[href*="github.com"]').first(), 'GitHub link').toBeAttached();
      await expect(section.locator('a[href*="linkedin.com"]').first(), 'LinkedIn link').toBeAttached();
    });
  }
});

test.describe('Issue #1: dark-mode toggle', () => {
  test('SPEC.md:10 a nav button toggles the dark class on <body>', async ({ page }) => {
    const toggle = await findDarkToggle(page);
    expect(toggle, 'no button in <nav> changes the dark class on <body>').not.toBeNull();
    // A toggle must also switch back.
    const now = await isDark(page);
    await toggle!.click();
    expect(await isDark(page)).toBe(!now);
  });

  // "Kept for the session" is read as: the choice survives a reload in the
  // same tab. Whether it should also carry to a new tab, or reset in a new
  // browser session, is not stated and is not tested.
  test('SPEC.md:11 the dark-mode choice survives a reload', async ({ page }) => {
    const toggle = await findDarkToggle(page);
    expect(toggle, 'no dark-mode toggle found (see SPEC.md:10)').not.toBeNull();
    const chosen = await isDark(page);
    await page.reload({ waitUntil: 'networkidle' });
    expect(await isDark(page)).toBe(chosen);
  });
});
