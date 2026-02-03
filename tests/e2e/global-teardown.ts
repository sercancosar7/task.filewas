import type { FullConfig } from '@playwright/test';

/**
 * Global E2E Test Teardown
 * Testlerden sonra calisir
 */
async function globalTeardown(_config: FullConfig) {
  // TODO: Test database temizleme
  // TODO: Gecici dosyalari silme
  // TODO: Test sonu raporlama

  console.log('🧹 E2E Test Teardown tamamlandi...');
}

export default globalTeardown;
