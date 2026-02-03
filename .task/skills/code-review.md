---
name: code-review
category: workflow
description: Kod inceleme best practice'leri. Kalite kontrol, güvenlik tarama, performans analizi ve yapıcı geri bildirim.
---

# Code Review Skill

Bu skill, kaliteli, güvenli ve sürdürülebilir kod için kapsamlı review yapılmasını sağlar.

## Ne Zaman Aktif Olur

- Commit sonrası otomatik review
- Pull request incelemesi
- Faz tamamlandığında kalite kontrolü
- Refactoring sonrası doğrulama
- Security audit gerektiğinde

## Review Süreci

### 1. Değişiklikleri Anla

```bash
# Değişen dosyaları bul
git diff --name-only HEAD~1

# Değişiklikleri incele
git diff HEAD~1 -- src/

# Commit mesajını oku
git log -1 --pretty=format:"%s%n%n%b"
```

### 2. Statik Analiz

```bash
# TypeScript hataları
npm run build

# Lint kontrolü
npm run lint

# Type coverage
npx type-coverage
```

### 3. Kod Kalitesi Kontrolü

Her dosya için şunları kontrol et:

| Kontrol | Açıklama |
|---------|----------|
| Naming | Değişken/fonksiyon isimleri anlamlı mı? |
| Types | Açık tip tanımları var mı? `any` kullanımı? |
| Error Handling | Try-catch, null check var mı? |
| Immutability | Mutation var mı? |
| DRY | Tekrar eden kod var mı? |
| KISS | Gereksiz karmaşıklık var mı? |
| Docs | Karmaşık logic için yorum var mı? |

## Review Kategorileri

### 🔴 CRITICAL (Engelleyici)
- Güvenlik açığı (XSS, injection, vb.)
- Veri kaybı riski
- Runtime crash
- Memory leak
- Hardcoded credentials

### 🟠 HIGH (Önemli)
- Performans sorunu
- Error handling eksik
- Type safety ihlali
- Test coverage düşük
- N+1 query problemi

### 🟡 MEDIUM (Orta)
- Kod tekrarı
- Naming convention ihlali
- Magic number/string
- Eksik documentation
- Gereksiz complexity

### 🟢 LOW (Düşük)
- Code style
- Import sırası
- Whitespace/formatting
- Minor refactoring önerisi

## Review Template

```markdown
## Code Review: [Dosya/Feature Adı]

### Özet
[Değişikliklerin kısa özeti]

### 🔴 CRITICAL Issues
- [Varsa listele, yoksa "Yok"]

### 🟠 HIGH Issues
- [Varsa listele, yoksa "Yok"]

### 🟡 MEDIUM Issues
- [Varsa listele]

### 🟢 LOW Issues
- [Varsa listele]

### ✅ İyi Yapılmış
- [Pozitif geri bildirim]

### Skor: X/10
```

## Kalite Metrikleri

### TypeScript
- `any` kullanımı: **0** olmalı
- Strict mode: **aktif** olmalı
- Type coverage: **%90+** olmalı

### Test Coverage
- Unit test: **%80+**
- Integration test: gerektiğinde
- E2E test: kritik akışlar için

### Kod Karmaşıklığı
- Fonksiyon uzunluğu: **<50 satır**
- Dosya uzunluğu: **<300 satır**
- Nesting derinliği: **<4 seviye**
- Cyclomatic complexity: **<10**

## Yaygın Sorunlar ve Çözümleri

### 1. Error Handling Eksik

```typescript
// ❌ KÖTÜ
const data = await fetch(url).then(r => r.json())

// ✅ İYİ
try {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const data = await response.json()
  return data
} catch (error) {
  console.error('Fetch failed:', error)
  throw error
}
```

### 2. Type Safety İhlali

```typescript
// ❌ KÖTÜ
function process(data: any) { ... }

// ✅ İYİ
interface ProcessInput {
  id: string
  value: number
}
function process(data: ProcessInput) { ... }
```

### 3. Mutation

```typescript
// ❌ KÖTÜ
function addItem(arr: string[], item: string) {
  arr.push(item)
  return arr
}

// ✅ İYİ
function addItem(arr: string[], item: string) {
  return [...arr, item]
}
```

### 4. Magic Values

```typescript
// ❌ KÖTÜ
if (status === 3) { ... }

// ✅ İYİ
const STATUS = {
  PENDING: 1,
  ACTIVE: 2,
  COMPLETED: 3
} as const

if (status === STATUS.COMPLETED) { ... }
```

### 5. Hardcoded Secrets

```typescript
// ❌ KRİTİK - GÜVENLİK AÇIĞI
const apiKey = "sk-proj-xxxxx"

// ✅ İYİ
const apiKey = process.env.API_KEY
if (!apiKey) {
  throw new Error('API_KEY not configured')
}
```

### 6. SQL Injection

```typescript
// ❌ KRİTİK - GÜVENLİK AÇIĞI
db.query(`SELECT * FROM users WHERE id = '${userId}'`)

// ✅ İYİ
db.query('SELECT * FROM users WHERE id = ?', [userId])
```

### 7. XSS Vulnerability

```typescript
// ❌ KRİTİK - GÜVENLİK AÇIĞI
element.innerHTML = userInput

// ✅ İYİ
element.textContent = userInput
// veya sanitize et
element.innerHTML = DOMPurify.sanitize(userInput)
```

## Performans Kontrolleri

### React/Frontend
- [ ] Gereksiz re-render yok
- [ ] useMemo/useCallback uygun kullanım
- [ ] Key prop doğru
- [ ] Large list virtualization
- [ ] Image optimization

### API/Backend
- [ ] N+1 query yok
- [ ] Proper caching
- [ ] Pagination mevcut
- [ ] Request batching
- [ ] Database indexing

### Memory
- [ ] Event listener cleanup
- [ ] Interval/timeout cleanup
- [ ] Large object reference release
- [ ] useEffect cleanup

## Güvenlik Kontrolleri

### Input Validation
- [ ] Tüm user input'lar validate ediliyor
- [ ] Zod/Yup schema kullanılıyor
- [ ] Server-side validation mevcut

### Authentication/Authorization
- [ ] Auth check'ler doğru
- [ ] Token expiry kontrol ediliyor
- [ ] Role-based access control

### Data Protection
- [ ] Sensitive data loglanmıyor
- [ ] PII maskeleniyor
- [ ] HTTPS kullanılıyor

## Review Checklist

Review tamamlamadan önce:

- [ ] Tüm dosyalar incelendi
- [ ] Build başarılı
- [ ] Lint hataları yok
- [ ] Testler geçiyor
- [ ] Güvenlik açığı yok
- [ ] Performans sorunu yok
- [ ] Documentation güncel
- [ ] Skor belirlendi

## Best Practices

### Yapıcı Geri Bildirim

```markdown
// ❌ KÖTÜ
"Bu kod çok kötü"

// ✅ İYİ
"Bu fonksiyon 80 satır uzunluğunda. 50 satırın altına
indirmek için helper fonksiyonlara bölmeyi öneriyorum.
Örnek:

function validateInput(data) { ... }
function processData(data) { ... }
function formatOutput(result) { ... }
"
```

### Öneri ile Birlikte Sorun

```markdown
// ❌ KÖTÜ
"Error handling eksik"

// ✅ İYİ
"Bu async fonksiyonda error handling eksik.
try-catch ekleyerek hataları yakalamayı öneriyorum:

```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  logger.error('Operation failed:', error)
  throw new AppError('İşlem başarısız', { cause: error })
}
```"
```

### Pozitif Geri Bildirim

```markdown
// İyi yapılmış şeyleri de belirt
"✅ Dependency injection pattern'i çok iyi kullanılmış,
test edilebilirliği artırıyor."

"✅ Error handling kapsamlı ve tutarlı."

"✅ Type tanımları çok açık ve anlaşılır."
```

## Kritik Kurallar

- **ASLA** kod değiştirme - sadece review yap
- **ASLA** CRITICAL issue'yu görmezden gelme
- **HER ZAMAN** yapıcı geri bildirim ver
- **HER ZAMAN** örnek kod öner
- Pozitif yönleri de belirt
- Önceliklendirme yap (Critical > High > Medium > Low)

---

**Unutma**: İyi review, kaliteli yazılımın temelidir. Sert ama yapıcı ol.
