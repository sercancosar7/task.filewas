# Task.filewas

> **Otonom AI Proje Geliştirme Platformu**

Proje fikrini anlat, gerisini AI halletsin. Task.filewas, yapay zeka destekli proje geliştirme platformudur.

## Özellikler

| Kategori | Özellik |
|----------|---------|
| **AI Odaklı** | Çoklu agent (Claude, GLM), otomatik roadmap, faz bazlı geliştirme |
| **UI/UX** | 3 panel layout (Craft Agents tarzı), session inbox, toast bildirimleri |
| **Git Entegrasyonu** | GitHub repo oluşturma, import, otomatik commit/push |
| **Memory MCP** | Proje hafızası, karar geçmişi, otomatik pattern öğrenme |
| **Test** | Playwright E2E testleri, self-healing (fail → fix → retry) |

## Teknoloji Stack

### Backend
- **Runtime:** Node.js 22+
- **Framework:** Express 4.x
- **Language:** TypeScript 5.9+
- **Storage:** File-based (JSONL/JSON)
- **Auth:** JWT (password-based)
- **WebSocket:** Socket.IO (realtime updates)

### Frontend
- **Framework:** React 18.x
- **Build:** Vite 7.x
- **Routing:** React Router v6
- **Styling:** Tailwind CSS 3.x
- **UI Components:** Radix UI
- **State:** Zustand 4.x
- **Animation:** Framer Motion
- **Code Viewer:** Shiki (syntax highlighting)
- **Markdown:** Marked

## Kurulum

### Gereksinimler

```bash
Node.js 22+
npm 10+
Claude CLI (auth yapılış)
GitHub CLI (gh) - opsiyonel
Playwright - testler için
```

### Adımlar

```bash
# Repo klonla
git clone https://github.com/your-org/task.filewas.git
cd task.filewas

# Bağımlılıkları yükle
npm install

# .env oluştur
cp .env.example .env
# .env dosyasını düzenle (API_PASSWORD, JWT_SECRET)

# Build
npm run build

# Backend başlat
npm run dev:backend

# Frontend başlat (farklı terminal)
npm run dev:frontend
```

## Kullanım

### 1. Login

```
POST /api/auth/login
{ "password": "şifreniz" }
→ { "token": "jwt...", "expiresAt": "..." }
```

### 2. Proje Oluştur

```bash
# Yeni boş proje
POST /api/projects
{
  "name": "my-app",
  "type": "web",
  "description": "My awesome app"
}

# GitHub repo oluştur
POST /api/projects/create-repo
{
  "name": "my-app",
  "description": "...",
  "visibility": "private"
}

# Mevcut repo import et
POST /api/projects/import
{
  "url": "https://github.com/owner/repo"
}
```

### 3. Session Başlat

```bash
POST /api/sessions
{
  "projectId": "proj-id",
  "title": "Auth sistemi ekle",
  "mode": "autonomous",
  "permissionMode": "auto"
}
```

## Proje Yapısı

```
task.filewas/
├── .task/              # ECC (Everything Claude Code) dosyaları
│   ├── agents/         # Agent tanımları
│   ├── skills/         # Skill tanımları
│   ├── hooks/          # Hook ayarları
│   └── commands/       # Slash komutları
│
├── backend/            # Express API backend
│   └── src/
│       ├── routes/     # API endpoint'leri
│       ├── services/   # Business logic
│       ├── storage/    # File-based storage
│       └── orchestrator/ # AI koordinasyonu
│
├── frontend/           # React frontend
│   └── src/
│       ├── components/ # UI component'leri
│       ├── pages/      # Sayfa component'leri
│       ├── stores/     # Zustand state stores
│       └── hooks/      # Custom hooks
│
├── shared/             # Shared TypeScript types
│   └── src/types/      # Ortak type tanımları
│
├── projects/           # Kullanıcı projeleri
│   └── proje-adi/
│       ├── .task/      # ECC kopyası
│       └── docs/       # Proje dokümantasyonu
│
└── docs/               # Platform dokümantasyonu
    ├── roadmaps/       # Roadmap JSONL dosyaları
    └── changelogs/     # Changelog JSONL dosyaları
```

## NPM Scripts

```bash
# Development
npm run dev            # Tüm workspace'leri başlat
npm run dev:backend    # Sadece backend
npm run dev:frontend   # Sadece frontend

# Build
npm run build          # Tüm workspace'leri
npm run build:backend  # Sadece backend
npm run build:frontend # Sadece frontend

# Lint & Format
npm run lint           # ESLint kontrol
npm run lint:fix       # ESLint düzelt
npm run format         # Prettier format
npm run format:check   # Format kontrol

# Test
npm run test           # Tüm testler
npm run test:backend   # Backend testleri
npm run test:frontend  # Frontend testler
```

## API Endpoint'leri

### Auth
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/auth/login` | POST | Login, JWT token al |
| `/api/auth/verify` | GET | Token doğrula |
| `/api/auth/refresh` | POST | Yeni token al |
| `/api/auth/validate` | POST | Token validasyonu |

### Projects
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/projects` | GET | Proje listesi (filtre + pagination) |
| `/api/projects` | POST | Yeni proje oluştur |
| `/api/projects/:id` | GET | Proje detayı |
| `/api/projects/:id` | PATCH | Proje güncelle |
| `/api/projects/:id` | DELETE | Proje sil (soft delete) |
| `/api/projects/:id/archive` | POST | Proje arşivle |
| `/api/projects/:id/restore` | POST | Proje geri yükle |
| `/api/projects/create-repo` | POST | GitHub repo oluştur |
| `/api/projects/import` | POST | GitHub repo import et |

### Sessions
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/sessions` | GET | Session listesi |
| `/api/sessions` | POST | Yeni session oluştur |
| `/api/sessions/:id` | GET | Session detayı |
| `/api/sessions/:id` | PATCH | Session güncelle |
| `/api/sessions/:id` | DELETE | Session sil |
| `/api/sessions/:id/flag` | POST | Flag toggle |

### Settings
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/settings` | GET | Platform ayarları |
| `/api/settings` | PATCH | Ayarları güncelle |
| `/api/settings/reset` | POST | Ayarları sıfırla |

### Health
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/health` | GET | Sistem durumu |
| `/api/health/detailed` | GET | Detaylı sağlık kontrolü |

### Files
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/projects/:id/files` | GET | Proje dosya listesi |
| `/api/projects/:id/files/content` | GET | Dosya içeriği |
| `/api/projects/:id/docs` | GET | Proje dokümanları |

### Roadmap
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/projects/:id/roadmap` | GET | Roadmap |
| `/api/projects/:id/roadmap/progress` | GET | İlerleme durumu |
| `/api/projects/:id/roadmap/milestones` | GET | Milestone listesi |
| `/api/projects/:id/roadmap/phases/:phaseId` | GET | Faz detayı |

### Changelog
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/projects/:id/changelog` | GET | Changelog |
| `/api/projects/:id/changelog/versions` | GET | Versiyon listesi |

### Agents & Skills
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/agents` | GET | Agent listesi |
| `/api/agents/:id` | GET | Agent detayı |
| `/api/skills` | GET | Skill listesi |
| `/api/skills/:id` | GET | Skill detayı |

### Sources & Logs
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/sources` | GET | Kaynak listesi (MCP, API, Local) |
| `/api/logs` | GET | Sistem logları |
| `/api/logs/stats` | GET | Log istatistikleri |

## Çalışma Modları

### Permission Modes
| Mod | Davranış |
|-----|----------|
| **Safe** | Salt okunur, plan onayı gerektirir |
| **Ask** | Her işlemde onay sorar |
| **Auto** | Tam otonom yürütme |

### Thinking Levels
| Level | Açıklama |
|-------|----------|
| **Off** | Normal yanıt |
| **Think** | Extended thinking |
| **Max** | Ultrathink (maksimum reasoning) |

## Lisans

UNLICENSED

## Destek

- Issues: https://github.com/your-org/task.filewas/issues
- Dokümantasyon: https://docs.task.filewas.com
