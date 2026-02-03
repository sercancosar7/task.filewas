---
name: tdd-workflow
category: workflow
description: Test-driven development workflow. Test-first yaklaşımı, %80+ coverage hedefi, unit/integration/E2E test katmanları.
---

# Test-Driven Development Workflow

Bu skill, tüm kod geliştirmenin TDD prensiplerine uygun yapılmasını sağlar.

## Ne Zaman Aktif Olur

- Yeni özellik veya fonksiyonellik yazarken
- Bug fix yaparken
- Mevcut kodu refactor ederken
- API endpoint eklerken
- Yeni component oluştururken

## Temel Prensipler

### 1. Test ÖNCE Yazılır
Her zaman önce test yaz, sonra testi geçirecek kodu implement et.

### 2. Coverage Gereksinimleri
- Minimum **%80 coverage** (unit + integration + E2E)
- Tüm edge case'ler kapsanmalı
- Hata senaryoları test edilmeli
- Boundary condition'lar doğrulanmalı

### 3. Test Katmanları

#### Unit Tests (Vitest)
- Bireysel fonksiyonlar ve utility'ler
- Component mantığı
- Pure fonksiyonlar
- Helper ve yardımcı fonksiyonlar

#### Integration Tests
- API endpoint'leri
- Database operasyonları
- Servis etkileşimleri
- External API çağrıları

#### E2E Tests (Playwright)
- Kritik kullanıcı akışları
- Tam workflow'lar
- Browser otomasyonu
- UI etkileşimleri

## TDD Döngüsü

```
RED → GREEN → REFACTOR → REPEAT

RED:      Başarısız olacak test yaz
GREEN:    Testi geçirecek minimum kodu yaz
REFACTOR: Testler yeşilken kodu iyileştir
REPEAT:   Sonraki özellik/senaryo
```

## TDD Adımları

### Adım 1: User Journey Tanımla
```
[Rol] olarak, [aksiyon] yapmak istiyorum, böylece [fayda] elde edeyim.

Örnek:
Kullanıcı olarak, projeleri arayabilmek istiyorum,
böylece aradığım projeyi hızlıca bulabileyim.
```

### Adım 2: Test Case'leri Oluştur
```typescript
describe('Proje Arama', () => {
  it('arama sonuçlarını döndürür', async () => {
    // Test implementasyonu
  })

  it('boş sorgu durumunu yönetir', async () => {
    // Edge case test
  })

  it('sonuçları benzerlik skoruna göre sıralar', async () => {
    // Sıralama mantığı testi
  })
})
```

### Adım 3: Testleri Çalıştır (BAŞARISIZ OLMALI)
```bash
npm test
# Testler başarısız olmalı - henüz kod yazmadık
```

### Adım 4: Kodu Implement Et
```typescript
// Testler tarafından yönlendirilen implementasyon
export async function searchProjects(query: string) {
  // Minimum implementasyon
}
```

### Adım 5: Testleri Tekrar Çalıştır
```bash
npm test
# Testler şimdi geçmeli
```

### Adım 6: Refactor Et
Testler yeşilken kod kalitesini iyileştir:
- Tekrarı kaldır
- İsimlendirmeyi iyileştir
- Performansı optimize et
- Okunabilirliği artır

### Adım 7: Coverage'ı Doğrula
```bash
npm run test:coverage
# %80+ coverage hedefini doğrula
```

## Test Pattern'leri

### Unit Test Pattern (Vitest)
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button Component', () => {
  it('doğru text ile render edilir', () => {
    render(<Button>Tıkla</Button>)
    expect(screen.getByText('Tıkla')).toBeInTheDocument()
  })

  it('tıklandığında onClick çağırılır', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Tıkla</Button>)

    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('disabled prop true olduğunda devre dışı kalır', () => {
    render(<Button disabled>Tıkla</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### API Integration Test Pattern
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('GET /api/projects', () => {
  it('projeleri başarıyla döndürür', async () => {
    const response = await fetch('http://localhost:3001/api/projects')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('query parametrelerini doğrular', async () => {
    const response = await fetch('http://localhost:3001/api/projects?limit=invalid')

    expect(response.status).toBe(400)
  })

  it('database hatalarını zarif şekilde yönetir', async () => {
    // Database hatası mock'la
    // Hata yönetimini test et
  })
})
```

### E2E Test Pattern (Playwright)
```typescript
import { test, expect } from '@playwright/test'

test('kullanıcı proje arayabilir ve filtreleyebilir', async ({ page }) => {
  // Projeler sayfasına git
  await page.goto('/projects')

  // Sayfa yüklendiğini doğrula
  await expect(page.locator('h1')).toContainText('Projeler')

  // Proje ara
  await page.fill('input[placeholder="Proje ara..."]', 'e-commerce')

  // Debounce ve sonuçları bekle
  await page.waitForTimeout(600)

  // Arama sonuçlarının gösterildiğini doğrula
  const results = page.locator('[data-testid="project-card"]')
  await expect(results).toHaveCount(3, { timeout: 5000 })

  // Sonuçların arama terimini içerdiğini doğrula
  const firstResult = results.first()
  await expect(firstResult).toContainText('e-commerce', { ignoreCase: true })
})
```

## Test Dosyası Organizasyonu

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── Button.test.tsx          # Unit testler
│   └── ProjectCard/
│       ├── ProjectCard.tsx
│       └── ProjectCard.test.tsx
├── services/
│   └── projects/
│       ├── projects.ts
│       └── projects.test.ts          # Integration testler
└── e2e/
    ├── projects.spec.ts              # E2E testler
    ├── sessions.spec.ts
    └── auth.spec.ts
```

## Mock Pattern'leri

### Service Mock
```typescript
import { vi } from 'vitest'

vi.mock('@/services/projects', () => ({
  getProjects: vi.fn(() => Promise.resolve([
    { id: '1', name: 'Test Project' }
  ])),
  createProject: vi.fn(() => Promise.resolve({ id: '2', name: 'New Project' }))
}))
```

### API Mock
```typescript
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('/api/projects', (req, res, ctx) => {
    return res(ctx.json({ success: true, data: [] }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## Coverage Doğrulama

### Coverage Raporu Çalıştır
```bash
npm run test:coverage
```

### Coverage Eşikleri
```json
{
  "vitest": {
    "coverage": {
      "thresholds": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## Yaygın Hatalardan Kaçınma

### ❌ YANLIŞ: Implementasyon Detaylarını Test Etme
```typescript
// Internal state'i test etme
expect(component.state.count).toBe(5)
```

### ✅ DOĞRU: Kullanıcıya Görünür Davranışı Test Et
```typescript
// Kullanıcının ne gördüğünü test et
expect(screen.getByText('Sayı: 5')).toBeInTheDocument()
```

### ❌ YANLIŞ: Kırılgan Seçiciler
```typescript
// Kolayca kırılır
await page.click('.css-class-xyz')
```

### ✅ DOĞRU: Semantik Seçiciler
```typescript
// Değişikliklere dayanıklı
await page.click('button:has-text("Gönder")')
await page.click('[data-testid="submit-button"]')
```

### ❌ YANLIŞ: Test İzolasyonu Yok
```typescript
// Testler birbirine bağımlı
test('kullanıcı oluşturur', () => { /* ... */ })
test('aynı kullanıcıyı günceller', () => { /* önceki teste bağımlı */ })
```

### ✅ DOĞRU: Bağımsız Testler
```typescript
// Her test kendi verisini oluşturur
test('kullanıcı oluşturur', () => {
  const user = createTestUser()
  // Test mantığı
})

test('kullanıcı günceller', () => {
  const user = createTestUser()
  // Güncelleme mantığı
})
```

## En İyi Pratikler

1. **Önce Test Yaz** - Her zaman TDD
2. **Test Başına Tek Assert** - Tek davranışa odaklan
3. **Açıklayıcı Test İsimleri** - Ne test edildiğini açıkla
4. **Arrange-Act-Assert** - Net test yapısı
5. **Harici Bağımlılıkları Mock'la** - Unit testleri izole et
6. **Edge Case'leri Test Et** - Null, undefined, boş, büyük
7. **Hata Yollarını Test Et** - Sadece happy path değil
8. **Testleri Hızlı Tut** - Unit testler < 50ms
9. **Testlerden Sonra Temizle** - Yan etki yok
10. **Coverage Raporlarını İncele** - Boşlukları belirle

## Başarı Metrikleri

- %80+ kod coverage elde edildi
- Tüm testler geçiyor (yeşil)
- Atlanan veya devre dışı test yok
- Hızlı test çalışması (unit testler < 30s)
- E2E testler kritik kullanıcı akışlarını kapsıyor
- Testler production'dan önce bug'ları yakalıyor

---

**Unutma**: Testler opsiyonel değil. Güvenli refactoring, hızlı geliştirme ve production güvenilirliği için güvenlik ağıdır.
