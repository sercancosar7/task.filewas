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

| Agent | Görev | Model |
|-------|-------|-------|
| orchestrator | Diğer agent'ları koordine eder | claude |
| planner | Projeyi fazlara ayırır | claude |
| architect | Sistem tasarımı, mimari kararlar | claude |
| implementer | Kod yazar | glm |
| reviewer | Code review yapar | glm |
| tester | Test yazar ve çalıştırır | glm |
| security | Güvenlik analizi | claude |
| debugger | Hata ayıklama | glm |

## Kullanım

Agent'lar backend tarafından okunur ve CLI subprocess olarak spawn edilir.
