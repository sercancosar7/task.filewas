# Skills

Bu klasör workflow ve domain bilgisi şablonlarını içerir.

## Dosya Formatı

Skill'ler `.md` dosyaları olarak organize edilir:

```
skills/
├── coding-standards/
│   ├── typescript.md
│   ├── react.md
│   └── nodejs.md
├── backend-patterns/
│   ├── api-design.md
│   └── database.md
├── frontend-patterns/
│   ├── components.md
│   └── state-management.md
└── tdd-workflow/
    └── test-first.md
```

## Örnek Skill Formatı

```markdown
---
name: skill-name
category: coding-standards | backend-patterns | frontend-patterns | workflow
description: Skill açıklaması
---

Skill içeriği (best practices, patterns, guidelines...)
```

## Mevcut Kategoriler

| Kategori | Açıklama |
|----------|----------|
| coding-standards | TypeScript/JS best practices |
| backend-patterns | API, database, caching patterns |
| frontend-patterns | React, Next.js patterns |
| tdd-workflow | Test-driven development |
| security-review | Güvenlik checklist |

## Kullanım

Skill'ler agent prompt'larına inject edilir veya `/skill-name` komutu ile çağrılır.
