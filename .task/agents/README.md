# Agents

Bu klasör AI agent tanımlarını içerir.

## Dosya Formatı

Her agent bir `.md` dosyası olarak tanımlanır:

```markdown
---
name: agent-name
description: Agent açıklaması
tools: ["Read", "Write", "Edit", "Bash"]
model: glm | claude
model_override_allowed: true | false
thinking_level: off | think | max
---

Agent system prompt içeriği...
```

## Mevcut Agent'lar

| Agent | Görev | Model | Durum |
|-------|-------|-------|-------|
| orchestrator | Diğer agent'ları koordine eder, CEO rolü | claude | ✅ |
| planner | Projeyi fazlara ayırır, task breakdown | claude | ✅ |
| architect | Sistem tasarımı, mimari kararlar | claude | ✅ |
| implementer | Kod yazar, build/test çalıştırır | glm | ✅ |
| reviewer | Code review yapar | glm | ⏳ Faz 57 |
| tester | Test yazar ve çalıştırır | glm | ⏳ Faz 57 |
| security | Güvenlik analizi | claude | ⏳ Faz 57 |
| debugger | Hata ayıklama | glm | ⏳ Faz 57 |

## Dosya Detayları

### orchestrator.md
- **Model**: claude (override: ❌)
- **Thinking**: max
- **Tools**: Read, Task, Glob, Grep
- CEO rolü, diğer agent'ları yönetir, fallback mekanizması

### planner.md
- **Model**: claude (override: ✅)
- **Thinking**: think
- **Tools**: Read, Glob, Grep
- Roadmap oluşturma, faz bölümleme, görev tanımlama

### architect.md
- **Model**: claude (override: ✅)
- **Thinking**: think
- **Tools**: Read, Glob, Grep
- Mimari kararlar, ADR oluşturma, pattern önerileri

### implementer.md
- **Model**: glm (override: ✅)
- **Thinking**: off
- **Tools**: Read, Write, Edit, Bash, Glob, Grep
- Kod yazma, build, test çalıştırma

## Kullanım

Agent'lar backend tarafından okunur ve CLI subprocess olarak spawn edilir.

```typescript
// Agent dosyasını oku
const agentMd = readFileSync('.task/agents/planner.md', 'utf-8');

// YAML frontmatter parse et
const { name, tools, model } = parseAgentFrontmatter(agentMd);

// CLI subprocess spawn et
const proc = spawn(model === 'claude' ? 'claude' : 'glm', [
  '-p',
  '--system-prompt', agentMd,
  '--output-format', 'stream-json'
], { cwd: projectDir });
```
