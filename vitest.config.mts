import { defineConfig } from "vitest/config";

// tsconfig keeps JSX as-is for Next.js; tests that render components (tests/glossary.test.ts) need it compiled.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
});
