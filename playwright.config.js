// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build in CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry once on CI only; a second retry triples the cost of any failing test */
  retries: process.env.CI ? 1 : 0,
  /* Three workers on CI: standard GitHub-hosted runners have 4 vCPUs for a public
     repository (this one is), and one is left for the web server and browser
     overhead. A private repository's runner has 2, so lower this if that changes. */
  workers: process.env.CI ? 3 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot settings */
    screenshot: 'only-on-failure',
    /* Recording every test costs CPU, so CI relies on the screenshot and the trace */
    video: process.env.CI ? 'off' : 'retain-on-failure',

    /* Consistent viewport for visual testing */
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  },

  /* Visual testing configuration */
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      animations: 'disabled',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* CI serves the production build the workflow already made (`vite preview`);
     locally the tests run against the dev server. */
  webServer: {
    command: process.env.CI
      ? 'npm run preview -- --port 5173 --strictPort'
      : 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
