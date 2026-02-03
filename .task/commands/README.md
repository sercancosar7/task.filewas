# Commands

Bu klasör slash command tanımlarını içerir.

## Dosya Formatı

Her command bir `.md` dosyası olarak tanımlanır:

```markdown
---
name: command-name
description: Komut açıklaması
aliases: ["/alias1", "/alias2"]
category: planning | development | review | testing
---

Komut prompt içeriği...
```

## Mevcut Komutlar

| Komut | Açıklama | Kategori |
|-------|----------|----------|
| /plan | İmplementasyon planlama | planning |
| /tdd | Test-driven development | development |
| /code-review | Kod inceleme | review |
| /build-fix | Build hatalarını düzelt | development |
| /security-review | Güvenlik taraması | review |
| /e2e | E2E test oluşturma | testing |

## Kullanım

Kullanıcı `/plan` yazdığında:
1. `commands/plan.md` dosyası okunur
2. İçerik prompt'a eklenir
3. Claude'a gönderilir

## Örnek

```
/plan Auth sistemi ekle
```

Bu komut `plan.md` içeriğini yükler ve "Auth sistemi ekle" task'ını planlama modunda işler.
