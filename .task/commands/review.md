---
name: review
description: Kapsamlı kod inceleme. Güvenlik taraması, kalite kontrolü ve yapıcı geri bildirim. Commit öncesi veya sonrası kullanılır.
aliases: ["/code-review", "/cr"]
category: review
---

# Review Komutu

Bu komut, commit edilmemiş veya son değişikliklerin kapsamlı incelemesi için **reviewer** agent'ı çağırır.

## Bu Komut Ne Yapar

1. **Değişiklikleri Analiz Et** - Değişen dosyaları ve içeriklerini incele
2. **Güvenlik Tarama** - Kritik güvenlik açıklarını tespit et
3. **Kalite Kontrol** - Kod kalitesi standartlarını kontrol et
4. **Geri Bildirim** - Yapıcı önerilerle rapor oluştur

## Ne Zaman Kullanılır

`/review` kullan:
- Commit yapmadan önce
- Pull request oluşturmadan önce
- Faz tamamlandıktan sonra
- Refactoring sonrası doğrulama için
- Manuel kod inceleme gerektiğinde

## Nasıl Çalışır

Reviewer agent:

1. **Değişen dosyaları bulur**: `git diff --name-only HEAD`
2. **Her dosyayı inceler** - güvenlik, kalite, best practice
3. **Sorunları kategorize eder** - CRITICAL, HIGH, MEDIUM, LOW
4. **Rapor oluşturur** - dosya konumu, satır numarası, öneri
5. **Skor belirler** - 1-10 arası kalite puanı

## Kontrol Edilen Alanlar

### 🔴 Güvenlik (CRITICAL)
- Hardcoded credentials, API key, token
- SQL injection açıkları
- XSS açıkları
- Eksik input validation
- Güvensiz dependency'ler
- Path traversal riskleri

### 🟠 Kod Kalitesi (HIGH)
- 50 satırdan uzun fonksiyonlar
- 300 satırdan uzun dosyalar
- 4 seviyeden derin nesting
- Eksik error handling
- console.log statements
- TODO/FIXME yorumları
- Public API'lerde eksik JSDoc

### 🟡 Best Practices (MEDIUM)
- Mutation pattern'leri (immutable kullan)
- Yeni kod için eksik testler
- Accessibility (a11y) sorunları
- Type safety ihlalleri
- DRY ihlalleri

### 🟢 Style (LOW)
- Import sırası
- Whitespace/formatting
- Naming convention
- Minor refactoring önerileri

## Örnek Kullanım

```
User: /review

Agent (reviewer):
## Code Review: Session Servisi Güncellemeleri

### Özet
3 dosyada 127 satır değişiklik incelendi.
- backend/src/services/session.ts (+85 -12)
- backend/src/routes/phase.ts (+32 -5)
- frontend/src/hooks/useSession.ts (+10 -3)

### 🔴 CRITICAL Issues
Yok ✓

### 🟠 HIGH Issues
1. **backend/src/services/session.ts:145**
   Error handling eksik - async fonksiyonda try-catch yok
   ```typescript
   // Öneri:
   try {
     const result = await startSession(options)
     return result
   } catch (error) {
     logger.error('Session start failed:', error)
     throw new SessionError('Failed to start session', { cause: error })
   }
   ```

2. **backend/src/services/session.ts:178**
   Fonksiyon 67 satır - 50 satır limitini aşıyor
   Öneri: Helper fonksiyonlara böl

### 🟡 MEDIUM Issues
1. **frontend/src/hooks/useSession.ts:23**
   Magic number: `5000` timeout değeri
   Öneri: `const SESSION_TIMEOUT = 5000` sabiti tanımla

2. **backend/src/routes/phase.ts:45**
   Input validation eksik - request body doğrulanmıyor
   Öneri: Zod schema ile validate et

### 🟢 LOW Issues
1. Import'lar alfabetik sıralı değil (session.ts:1-8)

### ✅ İyi Yapılmış
- TypeScript tip tanımları kapsamlı
- JSDoc yorumları açıklayıcı
- Error mesajları kullanıcı dostu
- Naming convention tutarlı

### Skor: 7/10
Güvenlik açığı yok, ancak error handling ve fonksiyon boyutu iyileştirilmeli.

### Sonraki Adımlar
1. HIGH sorunları düzelt
2. MEDIUM sorunları değerlendir
3. Testleri çalıştır
4. Tekrar review yap
```

## Review Rapor Formatı

```markdown
## Code Review: [Dosya/Feature Adı]

### Özet
[Değişikliklerin kısa özeti]

### 🔴 CRITICAL Issues
- [Varsa listele, yoksa "Yok ✓"]

### 🟠 HIGH Issues
- [Dosya:satır] - Sorun açıklaması
  Öneri: [Çözüm kodu veya açıklama]

### 🟡 MEDIUM Issues
- [Listele]

### 🟢 LOW Issues
- [Listele]

### ✅ İyi Yapılmış
- [Pozitif geri bildirim]

### Skor: X/10
[Genel değerlendirme]
```

## Otomatik Review

Şu durumlarda otomatik tetiklenir:
- Her faz tamamlandığında
- Commit öncesi (pre-commit hook)
- PR oluşturulduğunda

## Diğer Komutlarla Entegrasyon

Review öncesi:
- `/plan` ile implementasyon planla
- `/tdd` ile test-first geliştir

Review sonrası:
- Sorunları düzelt
- Testleri çalıştır
- Tekrar `/review` yap

## İlgili Agent

Bu komut şu agent'ı çağırır:
`.task/agents/reviewer.md`

## Kritik Kurallar

- **ASLA** kod değiştirme - sadece review yap ve öner
- **ASLA** CRITICAL issue'yu görmezden gelme
- **HER ZAMAN** yapıcı geri bildirim ver
- **HER ZAMAN** örnek kod öner
- Pozitif yönleri de belirt
- Önceliklendirme yap (Critical > High > Medium > Low)

## Skor Kriterleri

| Skor | Açıklama |
|------|----------|
| 10/10 | Mükemmel - hiçbir sorun yok |
| 8-9 | Çok iyi - sadece minor sorunlar |
| 6-7 | İyi - birkaç düzeltme gerekli |
| 4-5 | Orta - önemli iyileştirmeler gerekli |
| 1-3 | Zayıf - ciddi sorunlar var |
| 0 | CRITICAL güvenlik açığı - commit engellenmeli |

---

**Unutma**: CRITICAL veya HIGH güvenlik açığı varsa asla onaylama!
