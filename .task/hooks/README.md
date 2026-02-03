# Hooks

Bu klasör event-based otomasyon hook'larını içerir.

## Ana Dosya

`hooks.json` - Tüm hook tanımları bu dosyada saklanır.

## Hook Tipleri

| Tip | Tetikleme Zamanı |
|-----|------------------|
| PreToolUse | Tool çalıştırılmadan önce |
| PostToolUse | Tool çalıştırıldıktan sonra |
| SessionStart | Session başladığında |
| SessionEnd | Session bittiğinde |
| PreCompact | Compaction öncesi |
| Stop | Session sonlandırıldığında |

## hooks.json Formatı

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "name": "hook-name",
        "description": "Hook açıklaması",
        "tools": ["Bash", "Edit"],
        "action": "warn | block | modify",
        "condition": "condition expression",
        "message": "Kullanıcıya gösterilecek mesaj"
      }
    ],
    "PostToolUse": [...],
    "SessionStart": [...],
    "SessionEnd": [...],
    "Stop": [...]
  }
}
```

## Örnek Hook'lar

### Git Push Uyarısı (PreToolUse)
```json
{
  "name": "git-push-review",
  "description": "Push öncesi review uyarısı",
  "tools": ["Bash"],
  "condition": "command.includes('git push')",
  "action": "warn",
  "message": "Push yapmadan önce değişiklikleri review ettiniz mi?"
}
```

### Console.log Kontrolü (PostToolUse)
```json
{
  "name": "console-log-warning",
  "description": "Düzenlenen dosyada console.log varsa uyar",
  "tools": ["Edit", "Write"],
  "condition": "fileContent.includes('console.log')",
  "action": "warn",
  "message": "Dosyada console.log bulunuyor, kaldırmayı düşünün."
}
```

## Kullanım

Hook'lar backend tarafından okunur ve ilgili tool çağrılarında otomatik tetiklenir.
