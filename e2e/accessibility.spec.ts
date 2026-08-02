import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Runs a real accessibility scan (axe-core) against the rendered DOM in a real
// browser - catches things static JSX linting can't, like Radix components that
// render correctly in markup but end up with a broken computed accessibility
// tree, or genuine color-contrast failures. Scoped to the public pages so this
// suite doesn't depend on Arcjet's real (and sometimes slow) network calls.
const PAGES = ["/", "/sign-in", "/sign-up", "/forgot-password"];

for (const path of PAGES) {
  test(`no critical/serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const seriousOrWorse = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? "")
    );

    if (seriousOrWorse.length > 0) {
      console.log(JSON.stringify(seriousOrWorse, null, 2));
    }

    expect(seriousOrWorse, `Accessibility violations found on ${path}`).toEqual([]);
  });
}
