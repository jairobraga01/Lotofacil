// Testes no navegador: abrem pwa/index.html (gerado por `npm run build`) no Chromium.
import { defineConfig, devices } from '@playwright/test';
const executablePath = process.env.PW_CHROMIUM || undefined;   // opcional: navegador já instalado
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  projects: [
    { name: 'computador', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
    { name: 'celular', use: { ...devices['Pixel 7'], launchOptions: { executablePath } } },
  ],
});
