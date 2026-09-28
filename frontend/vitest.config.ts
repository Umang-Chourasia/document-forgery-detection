import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Component tests run in jsdom. Tailwind is left out on purpose: the tests
// assert behaviour and content, not computed styles.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Only the theme file is read, and only as raw text by the theme tests.
    css: { include: [/index\.css/] },
  },
});
