# donnysoh-temp-site-tests

Functional tests for donnysoh-tempsite, written with Playwright and TypeScript.

Tests are derived from SPEC.md in this repo and run against a live deployment:

```sh
npm install
npx playwright install chromium
BASE_URL=https://example.com npm test
```
