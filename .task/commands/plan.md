---
name: plan
description: Gereksinimleri analiz et, riskleri değerlendir ve adım adım implementasyon planı oluştur. Kod yazmadan ÖNCE kullanıcı onayı al.
aliases: ["/planner", "/planning"]
category: planning
---

# Plan Komutu

Bu komut, herhangi bir kod yazmadan önce kapsamlı implementasyon planı oluşturmak için **planner** agent'ı çağırır.

## Bu Komut Ne Yapar

1. **Gereksinimleri Netleştir** - Ne yapılması gerektiğini açıkça belirt
2. **Riskleri Belirle** - Potansiyel sorunları ve engelleri yüzeye çıkar
3. **Faz Planı Oluştur** - İmplementasyonu fazlara böl
4. **Onay Bekle** - Devam etmeden ÖNCE kullanıcı onayı al

## Ne Zaman Kullanılır

`/plan` kullan:
- Yeni bir özellik başlatırken
- Önemli mimari değişiklikler yaparken
- Karmaşık refactoring çalışmalarında
- Birden fazla dosya/component etkilenecekse
- Gereksinimler belirsiz veya muğlaksa

## Nasıl Çalışır

Planner agent:

1. **İsteği analiz eder** ve gereksinimleri net terimlerle ifade eder
2. **Fazlara böler** - spesifik, aksiyona dönüştürülebilir adımlarla
3. **Bağımlılıkları belirler** - component'ler arası ilişkileri
4. **Riskleri değerlendirir** - potansiyel engelleri
5. **Karmaşıklığı tahmin eder** (Yüksek/Orta/Düşük)
6. **Planı sunar** ve açık onay için BEKLER

## Örnek Kullanım

```
User: /plan Session sistemi için realtime WebSocket desteği ekle

Agent (planner):
# Implementation Plan: Realtime WebSocket Desteği

## Gereksinim Özeti
- Session'lar çalışırken realtime güncelleme göster
- Agent çıktılarını anlık stream et
- Token kullanımını canlı güncelle
- Hata ve uyarıları anlık göster

## Implementasyon Fazları

### Faz 1: WebSocket Altyapısı
- Socket.io entegrasyonu
- Event tipleri tanımlama (shared/types)
- Connection yönetimi
- Reconnection mantığı

### Faz 2: Backend Integration
- Claude CLI output streaming
- Event broadcast servisi
- Session state senkronizasyonu
- Error event handling

### Faz 3: Frontend Integration
- useWebSocket hook
- Event listener'lar
- State güncellemeleri
- Connection status göstergesi

### Faz 4: UI Components
- StreamingIndicator component
- RealtimeOutput component
- ConnectionStatus badge
- Toast notifications

## Bağımlılıklar
- Socket.io (server + client)
- Mevcut session servisi
- Claude CLI output parser

## Riskler
- YÜKSEK: Connection stability (reconnection gerekli)
- ORTA: Event flood (throttling gerekli)
- DÜŞÜK: State tutarsızlığı (optimistic updates)

## Tahmini Karmaşıklık: ORTA
- Backend: 3-4 saat
- Frontend: 3-4 saat
- Test: 2 saat
- Toplam: 8-10 saat

**ONAY BEKLENİYOR**: Bu plan ile devam edilsin mi? (evet/hayır/değiştir)
```

## Önemli Notlar

**KRİTİK**: Planner agent, siz açıkça "evet" veya "devam" gibi onay verene kadar **HİÇBİR** kod yazmayacaktır.

Değişiklik istiyorsanız:
- "değiştir: [değişiklikleriniz]"
- "farklı yaklaşım: [alternatif]"
- "faz 2'yi atla, önce faz 3 yap"

## Plan Formatı

```markdown
# Implementation Plan: [Özellik Adı]

## Gereksinim Özeti
[2-3 cümle açıklama]

## Tech Stack
- Frontend: [framework]
- Backend: [framework]
- Database: [db]
- Diğer: [...]

## Fazlar

### Faz 1: [Faz Adı] (Tahmini: X saat)
**Açıklama:** [...]
**Görevler:**
1. [Görev 1]
2. [Görev 2]
**Kabul Kriterleri:**
- [ ] Kriter 1
- [ ] Kriter 2
**Riskler:** [varsa]

### Faz 2: ...

## Bağımlılık Grafiği
Faz 1 → Faz 2 → Faz 3
       ↘ Faz 4 → Faz 5

## Risk Matrisi
| Risk | Etki | Olasılık | Azaltma |
|------|------|----------|---------|
| ... | ... | ... | ... |

## Milestone'lar
1. **MVP** (Faz 1-3): Temel işlevsellik
2. **Beta** (Faz 4-6): Tam özellik seti
3. **Release** (Faz 7-8): Polish ve deploy
```

## Diğer Komutlarla Entegrasyon

Planlama sonrası:
- `/tdd` ile test-driven development
- `/review` ile kod inceleme
- `/build-fix` ile build hataları düzeltme

## İlgili Agent

Bu komut şu agent'ı çağırır:
`.task/agents/planner.md`

## Best Practices

### Faz Boyutu
- ✅ 2-4 saat tamamlanabilir
- ✅ Tek commit ile sonuçlanır
- ✅ Bağımsız test edilebilir
- ❌ 1 günden uzun fazlar
- ❌ Çok fazla bağımlılık

### Görev Detayı
- ✅ Net, spesifik eylemler
- ✅ Dosya yolları belirli
- ✅ Kabul kriterleri ölçülebilir
- ❌ Belirsiz ifadeler ("iyileştir", "düzelt")
- ❌ Çok genel görevler

---

**Unutma**: Kod yazmadan ÖNCE planla. İyi bir plan, başarılı implementasyonun temelidir.
