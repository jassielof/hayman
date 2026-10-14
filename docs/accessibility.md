# Accessibility checks

Hayman's HTML interface runs inside a native Tauri webview. Web accessibility requirements still apply to its content, controls, focus behavior and contrast. The target is WCAG 2.2 AA; passing the automated checks is not a claim of complete conformance.

## Run locally

```sh
bun install --frozen-lockfile
bunx playwright install chromium webkit
bun run test:a11y
```

On Linux, use `bunx playwright install --with-deps chromium webkit` to install the required browser libraries too. The suite builds the production frontend and serves it on a dedicated loopback port, 1421. It never reuses the development server. Tauri IPC is replaced with deterministic fixtures in the browser tests only; no real database, bibliography files, installed fonts, native dialogs or online services are accessed.

The CI accessibility job runs the same suite and uploads its HTML report, axe results (including findings that require manual review), failure screenshots and traces. Run `bunx playwright show-report` to view the report locally. These are behavioral tests, not a PWA or screenshot-comparison harness.

## Automated coverage

- Chromium and WebKit, in system-selected light/dark themes and the light-only Sepia theme, approximate the engine families used by Tauri. Sepia is also checked with a dark OS preference, across reloads and theme changes. These browsers do not replace installed-app testing on WebView2, WKWebView and WebKitGTK.
- axe checks for WCAG 2.0/2.1 A/AA, WCAG 2.2 AA and applicable best-practice rules on the main pages and representative open dialogs, previews and editor states. Rules are not disabled to make the suite pass.
- Rendered theme-token contrast checks cover normal text at 4.5:1, including muted text, links, destructive actions, tinted warnings and hover fills. Required input boundaries and focus colors are checked at 3:1. Decorative separators and disabled controls are not subject to those same requirements.
- Color values are resolved by the browser, including OKLCH and alpha compositing, then evaluated with WCAG's sRGB relative-luminance formula without rounding the resulting ratio.
- Keyboard checks cover skip-to-content, visible focus, combobox selection, preview tabs, modal focus containment, Escape dismissal and focus restoration.
- First-Tab skip-link discovery is checked in Chromium. WebKit's check explicitly focuses the link and verifies its visibility and Enter activation because Tab navigation through links depends on host preferences. Manually check Safari with Option+Tab or its "Press Tab to highlight each item" preference enabled; Hayman does not override those preferences.
- Settings and the populated editor are checked at 320 CSS-pixel width, and with 200% root text sizing plus WCAG text-spacing overrides. These smoke checks catch document-level overflow; they cannot prove that every possible reference or installed font fits.

WCAG does not prescribe a universal minimum font size. Hayman's body text defaults to 16px, controls to 14px, and secondary labels to 12px using relative units. Small or semibold text must still meet 4.5:1: the 3:1 large-text exception only applies at 24 CSS px, or approximately 18.667 CSS px when bold. Logo text is exempt from the text-contrast criterion; ordinary interface text is not.

## Manual installed-app checklist

Before release, check Windows with NVDA/WebView2, macOS with VoiceOver/WKWebView, and Linux with Orca/WebKitGTK where supported. Native file dialogs, menus and the OS accessibility bridge are outside the browser suite.

- Navigate all workflows without a pointer, including nested parent entries, add/remove people, validation failures, import, export, confirmations and attachment actions. Check reading order, accessible names, group context, focus visibility and focus return after every modal or native dialog.
- Check 200% text resizing, 400% zoom/reflow, text spacing, very long titles/URLs, CJK and RTL references, and alternate installed fonts. Ensure no essential text or control is clipped or overlapped; scrolling code and data tables horizontally can be necessary, but the whole interface should not require it.
- Check both themes, OS theme changes, reduced motion, forced-colors/high-contrast mode, and keyboard focus that is not hidden by overlays. Do not communicate success, errors, selection or duplicates through color alone.
- Review axe's `incomplete` findings in the report. Automated scans cannot establish useful alternative text, understandable instructions, a sensible overall focus order or a good screen-reader experience.

References: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [contrast calculation and large text](https://www.w3.org/WAI/WCAG21/Techniques/general/G18), [Playwright accessibility testing and its limits](https://playwright.dev/docs/accessibility-testing).
