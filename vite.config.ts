import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
    exclude: ['e2e/**', 'scripts/assert-e2e-release-evidence.test.mjs', 'scripts/release-e2e-bindings.test.mjs'],
  },
})
