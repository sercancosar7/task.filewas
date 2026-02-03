# Task.filewas API Reference

> **Version:** 0.1.0
> **Base URL:** `https://task.filewas.com/api`
> **Content-Type:** `application/json`

## Authentication

Tüm endpoint'ler JWT token ile korunmaktadır (kullanım durumuna göre).

```bash
# Login
curl -X POST https://task.filewas.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-password"}'

# Response
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2026-02-10T10:00:00.000Z"
  }
}

# Authenticated request
curl https://task.filewas.com/api/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Response Format

Tüm API yanıtları şu formatta döner:

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  fieldErrors?: Array<{ field: string; message: string }>
}
```

### Hata Kodları

| Kod | Açıklama |
|-----|----------|
| 200 | Başarılı |
| 201 | Oluşturuldu |
| 204 | İçerik yok (başarılı silme) |
| 400 | Geçersiz istek |
| 401 | Kimlik doğrulama hatası |
| 403 | Yetkisiz |
| 404 | Bulunamadı |
| 409 | Çakışma (zaten mevcut) |
| 500 | Sunucu hatası |

---

## Endpoints

### Health

#### GET /health

Sistem sağlık durumunu kontrol eder.

**Auth:** Gerekli değil

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "0.1.0",
    "uptime": 3600,
    "timestamp": "2026-02-03T10:00:00.000Z"
  }
}
```

#### GET /health/detailed

Detaylı servis kontrolü.

**Auth:** Gerekli değil

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "0.1.0",
    "uptime": 3600,
    "timestamp": "2026-02-03T10:00:00.000Z",
    "services": [
      {
        "name": "data-storage",
        "status": "healthy",
        "responseTime": 5,
        "lastCheck": "2026-02-03T10:00:00.000Z"
      }
    ]
  }
}
```

---

### Auth

#### POST /auth/login

Şifre ile kimlik doğrulama, JWT token alır.

**Request Body:**
```json
{
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2026-02-10T10:00:00.000Z"
  }
}
```

#### GET /auth/verify

Mevcut token'ı doğrular.

**Auth:** Gerekli

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "payload": {
      "iat": 1738593600,
      "exp": 1739198400
    }
  }
}
```

#### POST /auth/refresh

Yeni token alır (fresh expiry).

**Auth:** Gerekli

**Response:** Login ile aynı formatta.

#### POST /auth/validate

Token doğrulama (auth header gerektirmez).

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** Verify ile aynı formatta.

---

### Projects

#### GET /projects

Proje listesi. Filtreleme ve sayfalama destekler.

**Auth:** Gerekli

**Query Parameters:**
| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| page | string | Sayfa numarası (varsayılan: 1) |
| limit | string | Sayfa başı item (varsayılan: 20, max: 100) |
| offset | string | Atlanacak item (page alternatifi) |
| status | string \| string[] | Durum filtresi (virgülle ayrılır) |
| type | string \| string[] | Tip filtresi |
| tags | string \| string[] | Etiket filtresi |
| search | string | İsim/açıklamada arama |
| sortBy | string | Sıralama alanı |
| sortOrder | string | Sıralama yönü (asc, desc) |

**Status Values:** `active`, `archived`, `deleted`

**Type Values:** `web`, `backend`, `fullstack`, `mobile`, `cli`, `library`, `monorepo`, `other`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "proj-123",
      "name": "my-app",
      "type": "web",
      "status": "active",
      "activeVersion": "v0.1.0",
      "sessionCount": 5,
      "description": "My awesome app",
      "lastActivityAt": "2026-02-03T09:00:00.000Z",
      "icon": "🚀",
      "color": "#6366F1",
      "tags": ["react", "typescript"]
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

#### POST /projects

Yeni proje oluşturur.

**Auth:** Gerekli

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "type": "string (optional)",
  "path": "string (optional)",
  "githubUrl": "string (optional)",
  "techStack": {
    "languages": ["string"],
    "frameworks": ["string"],
    "databases": ["string"],
    "uiLibraries": ["string"],
    "buildTools": ["string"],
    "testingFrameworks": ["string"],
    "other": ["string"]
  },
  "settings": {
    "defaultModel": "auto | claude | glm",
    "defaultPermissionMode": "safe | ask | auto",
    "defaultThinkingLevel": "off | think | max",
    "autoCommit": "boolean",
    "autoPush": "boolean",
    "customLabels": ["string"],
    "customStatuses": ["string"]
  },
  "icon": "string (optional)",
  "color": "string (optional)",
  "tags": ["string"]
}
```

**Response:** Oluşturulan proje objesi (201 status).

#### GET /projects/:id

Proje detayını getirir.

**Auth:** Gerekli

**Response:** Tam proje objesi.

#### PATCH /projects/:id

Proje günceller.

**Auth:** Gerekli

**Request Body:** POST ile aynı, tüm alanlar opsiyonel.

#### DELETE /projects/:id

Proje siler (soft delete, status = deleted).

**Auth:** Gerekli

**Query Parameters:**
| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| hard | string | `true` ise kalıcı silme |

**Response:** 204 No Content (hard delete) veya success mesajı.

#### POST /projects/create-repo

GitHub repo oluşturur ve local proje başlatır.

**Auth:** Gerekli

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "visibility": "public | private (optional)",
  "type": "string (optional)",
  "icon": "string (optional)",
  "color": "string (optional)",
  "tags": ["string"]
}
```

#### POST /projects/import

Mevcut GitHub repo'yu import eder.

**Auth:** Gerekli

**Request Body:**
```json
{
  "url": "string (required, GitHub URL)",
  "name": "string (optional, varsayılan: repo adı)",
  "description": "string (optional)",
  "type": "string (optional)",
  "icon": "string (optional)",
  "color": "string (optional)",
  "tags": ["string"]
}
```

#### POST /projects/:id/archive

Proje arşivler (status = archived).

**Auth:** Gerekli

#### POST /projects/:id/restore

Arşivlenmiş/silinmiş projeyi geri yükler (status = active).

**Auth:** Gerekli

---

### Sessions

#### GET /sessions

Session listesi. Filtreleme ve sayfalama destekler.

**Auth:** Gerekli

**Query Parameters:**
| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| page, limit, offset | - | Pagination |
| projectId | string | Proje ID filtresi |
| status | string \| string[] | Durum filtresi |
| mode | string \| string[] | Mod filtresi |
| labelIds | string \| string[] | Etiket ID filtresi |
| isFlagged | string | Bayraklı filtresi (true/false) |
| hasUnread | string | Okunmamış filtresi |
| version | string | Versiyon filtresi |
| search | string | Başlıkta arama |
| fromDate, toDate | string | Tarih aralığı |
| sortBy | string | Sıralama: createdAt, updatedAt, title, status, messageCount |
| sortOrder | string | asc, desc |

**Status Values:** `todo`, `in-progress`, `needs-review`, `done`, `cancelled`

**Mode Values:** `quick-chat`, `planning`, `tdd`, `debug`, `code-review`, `autonomous`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "sess-123",
      "projectId": "proj-123",
      "title": "Auth sistemi ekle",
      "status": "in-progress",
      "mode": "autonomous",
      "processingState": "idle",
      "modelProvider": "claude",
      "permissionMode": "auto",
      "labels": ["backend"],
      "isFlagged": true,
      "hasUnread": false,
      "hasPlan": true,
      "messageCount": 15,
      "phaseProgress": { "current": 3, "total": 12 },
      "createdAt": "2026-02-03T08:00:00.000Z",
      "updatedAt": "2026-02-03T10:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20 }
}
```

#### POST /sessions

Yeni session oluşturur.

**Auth:** Gerekli

**Request Body:**
```json
{
  "projectId": "string (required)",
  "title": "string (required)",
  "description": "string (optional)",
  "mode": "string (optional, default: quick-chat)",
  "permissionMode": "string (optional, default: safe)",
  "thinkingLevel": "string (optional, default: off)",
  "modelProvider": "string (optional, default: auto)",
  "version": "string (optional)",
  "labels": ["string"],
  "isFlagged": "boolean (optional)"
}
```

#### GET /sessions/:id

Session detayını getirir.

**Auth:** Gerekli

#### PATCH /sessions/:id

Session günceller.

**Auth:** Gerekli

**Request Body:** Tüm alanlar opsiyonel.

#### DELETE /sessions/:id

Session siler (soft delete, status = cancelled).

**Auth:** Gerekli

**Query Parameters:** `hard=true` kalıcı silme.

#### POST /sessions/:id/flag

Flag durumunu toggle eder.

**Auth:** Gerekli

---

### Settings

#### GET /settings

Platform ayarlarını getirir.

**Auth:** Gerekli

**Response:**
```json
{
  "success": true,
  "data": {
    "defaultModel": "auto",
    "defaultPermission": "safe",
    "defaultThinking": "off",
    "fallbackEnabled": true,
    "fallbackOrder": ["claude", "glm"],
    "autoCommit": true,
    "autoPush": false,
    "autoNextPhase": true
  }
}
```

#### PATCH /settings

Ayarları günceller (partial update).

**Auth:** Gerekli

**Request Body:**
```json
{
  "defaultModel": "auto | claude | glm",
  "defaultPermission": "safe | ask | auto",
  "defaultThinking": "off | think | max",
  "fallbackEnabled": "boolean",
  "fallbackOrder": ["claude", "glm"],
  "autoCommit": "boolean",
  "autoPush": "boolean",
  "autoNextPhase": "boolean"
}
```

#### POST /settings/reset

Ayarları varsayılanlara sıfırlar.

**Auth:** Gerekli

---

### Files

#### GET /projects/:id/files

Proje dosya listesini getirir (tree view).

**Auth:** Gerekli

**Query Parameters:**
| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| depth | number | Derinlik (varsayılan: 1) |
| includeHidden | boolean | Gizli dosyaları dahil et |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "src",
      "path": "src",
      "type": "directory",
      "depth": 0,
      "children": [
        {
          "name": "index.ts",
          "path": "src/index.ts",
          "type": "file",
          "size": 1024,
          "mtime": "2026-02-03T10:00:00.000Z",
          "extension": "ts",
          "language": "typescript",
          "depth": 1
        }
      ]
    }
  ]
}
```

#### GET /projects/:id/files/content

Dosya içeriğini getirir.

**Auth:** Gerekli

**Query Parameters:**
| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| path | string | Dosya yolu (required) |

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "src/index.ts",
    "name": "index.ts",
    "content": "export function hello() {...}",
    "size": 1024,
    "encoding": "utf8",
    "language": "typescript",
    "isBinary": false
  }
}
```

---

### Roadmap

#### GET /projects/:id/roadmap

Proje roadmap'ını getirir.

**Auth:** Gerekli

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "0.1.0",
    "currentPhase": 5,
    "totalPhases": 12,
    "phases": [
      {
        "id": 1,
        "name": "Proje kurulumu",
        "status": "completed",
        "description": "...",
        "milestoneId": 1
      }
    ],
    "milestones": [
      {
        "id": 1,
        "name": "Altyapı",
        "phases": [1, 2, 3],
        "color": "#6366F1"
      }
    ]
  }
}
```

#### GET /projects/:id/roadmap/progress

İlerleme durumunu getirir.

**Auth:** Gerekli

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 12,
    "completed": 3,
    "inProgress": 1,
    "pending": 8,
    "percentage": 25
  }
}
```

#### GET /projects/:id/roadmap/milestones

Milestone listesini getirir.

**Auth:** Gerekli

#### GET /projects/:id/roadmap/phases/:phaseId

Faz detayını getirir.

**Auth:** Gerekli

---

### Changelog

#### GET /projects/:id/changelog

Changelog listesini getirir.

**Auth:** Gerekli

**Query Parameters:**
| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| version | string | Versiyon filtresi |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "phase": 5,
      "date": "2026-02-03",
      "title": "Auth API",
      "changes": [
        "Login endpoint eklendi",
        "JWT middleware oluşturuldu"
      ],
      "files": [
        "backend/src/routes/auth.ts",
        "backend/src/middleware/auth.ts"
      ]
    }
  ]
}
```

#### GET /projects/:id/changelog/versions

Kullanılabilir versiyon listesini getirir.

**Auth:** Gerekli

---

### Agents

#### GET /agents

ECC agent listesini getirir.

**Auth:** Gerekli

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "planner",
      "name": "Planner",
      "description": "Faz planlama agent'i",
      "tools": ["Read", "Glob", "Grep"],
      "model": "claude",
      "modelOverrideAllowed": true,
      "thinkingLevel": "think"
    }
  ]
}
```

#### GET /agents/:id

Agent detayını ve içeriğini getirir.

**Auth:** Gerekli

---

### Skills

#### GET /skills

ECC skill listesini getirir.

**Auth:** Gerekli

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "tdd-workflow",
      "name": "TDD Workflow",
      "category": "testing",
      "description": "Test-driven development akışı"
    }
  ]
}
```

#### GET /skills/:id

Skill detayını ve içeriğini getirir.

**Auth:** Gerekli

---

### Sources

#### GET /sources

MCP, API ve Local kaynak listesini getirir.

**Auth:** Gerekli

**Response:**
```json
{
  "success": true,
  "data": {
    "mcp": [
      {
        "id": "memory",
        "name": "Memory MCP",
        "status": "connected"
      }
    ],
    "api": [],
    "local": [
      {
        "id": "docs",
        "name": "Documentation",
        "path": "/path/to/docs"
      }
    ]
  }
}
```

---

### Logs

#### GET /logs

Sistem loglarını getirir.

**Auth:** Gerekli

**Query Parameters:**
| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| type | string | api, agent, error, session, system |
| level | string | info, warn, error |
| search | string | Mesajda arama |
| limit | number | Max item sayısı |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "log-123",
      "type": "api",
      "level": "info",
      "message": "GET /api/projects - 200",
      "timestamp": "2026-02-03T10:00:00.000Z",
      "metadata": {
        "method": "GET",
        "path": "/api/projects",
        "status": 200
      }
    }
  ]
}
```

#### GET /logs/stats

Log istatistiklerini getirir.

**Auth:** Gerekli

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 1234,
    "api": 800,
    "agent": 300,
    "error": 34,
    "session": 100
  }
}
```

---

## WebSocket Events

Realtime güncellemeler için WebSocket bağlantısı.

**URL:** `wss://task.filewas.com`

### Client → Server

| Event | Payload | Açıklama |
|-------|---------|----------|
| `auth` | `{ token: string }` | Kimlik doğrulama |
| `subscribe:project` | `{ projectId: string }` | Proje aboneliği |
| `unsubscribe:project` | `{ projectId: string }` | Abonelik iptal |

### Server → Client

| Event | Payload | Açıklama |
|-------|---------|----------|
| `project:updated` | `{ projectId, changes }` | Proje güncellendi |
| `session:created` | `{ sessionId, projectId }` | Session oluşturuldu |
| `session:updated` | `{ sessionId, status, ... }` | Session durumu değişti |
| `session:deleted` | `{ sessionId }` | Session silindi |
| `message:new` | `{ messageId, content, role }` | Yeni mesaj |
| `message:chunk` | `{ messageId, chunk }` | Streaming mesaj parçası |
| `agent:started` | `{ agentId, type, model }` | Agent başladı |
| `agent:progress` | `{ agentId, progress, status }` | Agent ilerlemesi |
| `agent:completed` | `{ agentId, result }` | Agent tamamlandı |
| `tool:called` | `{ toolName, params }` | Tool çağrıldı |
| `tool:result` | `{ toolName, result }` | Tool sonucu |
| `phase:started` | `{ phaseId, name }` | Faz başladı |
| `phase:completed` | `{ phaseId, result }` | Faz tamamlandı |
| `log:new` | `{ log }` | Yeni log kaydı |

---

## Types

### ProjectStatus
```typescript
type ProjectStatus = 'active' | 'archived' | 'deleted'
```

### ProjectType
```typescript
type ProjectType = 'web' | 'backend' | 'fullstack' | 'mobile' | 'cli' | 'library' | 'monorepo' | 'other'
```

### SessionStatus
```typescript
type SessionStatus = 'todo' | 'in-progress' | 'needs-review' | 'done' | 'cancelled'
```

### SessionMode
```typescript
type SessionMode = 'quick-chat' | 'planning' | 'tdd' | 'debug' | 'code-review' | 'autonomous'
```

### PermissionMode
```typescript
type PermissionMode = 'safe' | 'ask' | 'auto'
```

### ThinkingLevel
```typescript
type ThinkingLevel = 'off' | 'think' | 'max'
```

---

## Rate Limiting

Şu an için rate limiting yok (tek kullanıcı).

---

## SDK / Client Libraries

Resmi SDK henüz yok. TypeScript/JavaScript client hazırlanıyor.

---

## Support

- API Issues: https://github.com/your-org/task.filewas/issues
- Email: support@task.filewas.com
