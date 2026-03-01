# Mesajlar Modülü - Component Yapısı

Bu modül, uygulamanın mesajlaşma sistemini yönetir ve modüler bir yapıya sahiptir.

## 📁 Klasör Yapısı

```
src/
├── pages/
│   └── Mesajlar.jsx                 # Ana mesaj sayfası (orchestrator)
├── components/Messages/
│   ├── MessageSidebar.jsx           # Sol menü (Gelen, Gönderilen, Yıldızlı, Çöp)
│   ├── MessageHeader.jsx            # Arama ve toplu işlem butonları
│   ├── MessageList.jsx              # Mesaj listesi görünümü
│   ├── MessageDetail.jsx            # Seçili mesaj detayı
│   ├── ComposeModal.jsx             # Yeni mesaj yazma modalı
│   ├── QuoteModal.jsx               # Alıntı ekleme modalı
│   └── FloatingComposeButton.jsx    # Yeni mesaj butonu (sağ alt)
└── hooks/
    ├── useMessages.js               # Mesaj işlemleri custom hook
    └── useQuoteData.js              # Alıntı verileri custom hook
```

## 🎯 Component Sorumlulukları

### 1. **Mesajlar.jsx** (Ana Sayfa)
- **Rol**: Orchestrator - tüm componentleri bir araya getirir
- **Sorumluluklar**:
  - State yönetimi (selectedMessage, showCompose, vb.)
  - Hook'ları kullanarak veri ve işlemleri yönetir
  - Alt componentlere props geçişi

### 2. **MessageSidebar.jsx**
- **Rol**: Navigasyon menüsü
- **Özellikler**:
  - Gelen Kutusu (unread count ile)
  - Gönderilen
  - Yıldızlı
  - Çöp Kutusu
  - Yeni Mesaj butonu

### 3. **MessageHeader.jsx**
- **Rol**: Arama ve toplu işlemler
- **Özellikler**:
  - Arama input'u
  - "Hepsini Seç" butonu
  - "Seçilenleri Sil" butonu

### 4. **MessageList.jsx**
- **Rol**: Mesaj listesi görünümü
- **Özellikler**:
  - Mesajları listeler
  - Checkbox ile seçim
  - Yıldız işareti
  - Okundu/okunmadı durumu
  - Loading state

### 5. **MessageDetail.jsx**
- **Rol**: Seçili mesajın detayları
- **Özellikler**:
  - Mesaj içeriği
  - **Alıntı gösterimi** (tıklanabilir, hover efekti)
  - Geri butonu
  - Yıldız/Sil butonları
  - Yanıtlama formu
  - Yanıt geçmişi

### 6. **ComposeModal.jsx**
- **Rol**: Yeni mesaj yazma
- **Özellikler**:
  - Alıcı seçimi (multi-select)
  - Konu
  - Mesaj içeriği
  - Alıntı ekleme butonu
  - **Alıntı önizlemesi** (tıklanabilir)
  - Gönder/İptal

### 7. **QuoteModal.jsx**
- **Rol**: Alıntı ekleme
- **Özellikler**:
  - Ödeme alıntısı
  - Kredi kartı alıntısı
  - Hatırlatma alıntısı
  - Arama odaklı tasarım
  - Max 10 sonuç
  - İkonlu tab sistemi
  - Devirler otomatik filtreleniyor

### 8. **QuoteDetailModal.jsx** ⭐ YENİ
- **Rol**: Alıntı detaylarını gösterir
- **Özellikler**:
  - Ödeme detayları (tutar, tarih, cari, açıklama)
  - Kredi kartı detayları (kart adı, numara, banka, limit, kullanım oranı)
  - Hatırlatma detayları (başlık, açıklama, tarih)
  - Gradient renkli header
  - İkonlu ve modern tasarım
  - Backdrop blur efekti

### 9. **FloatingComposeButton.jsx**
- **Rol**: Hızlı erişim butonu
- **Özellikler**:
  - Sağ alt köşede sabit
  - Hover animasyonu
  - Modal açıkken gizlenir

## 🔧 Custom Hooks

### useMessages.js
**Amaç**: Tüm mesaj işlemlerini yönetir

**Döndürdüğü değerler**:
- `messages`: Tüm mesajlar
- `users`: Kullanıcı listesi
- `loading`: Yükleme durumu
- `unreadCount`: Okunmamış mesaj sayısı

**Fonksiyonlar**:
- `loadMessages()`: Mesajları yükler
- `handleSendMessage(newMessage)`: Mesaj gönderir (alıntı verileriyle birlikte)
- `handleReply(selectedMessage, replyBody)`: Yanıt gönderir
- `handleDeleteSelected(messageIds)`: Seçili mesajları siler
- `handleDeleteMessage(messageId)`: Tek mesaj siler
- `handleStarMessage(messageId, starred)`: Yıldız ekler/kaldırır
- `handleMarkAsRead(messageId)`: Okundu işaretler
- `getFilteredMessages(searchTerm)`: Filtrelenmiş mesajları döndürür

### useQuoteData.js
**Amaç**: Alıntı için gerekli verileri yükler

**Döndürdüğü değerler**:
- `payments`: Ödemeler
- `creditCards`: Kredi kartları
- `reminders`: Hatırlatmalar

## 🔄 Veri Akışı

```
Mesajlar.jsx (Ana Sayfa)
    ↓
useMessages Hook → Firestore
    ↓
MessageSidebar ← unreadCount
MessageHeader ← filteredMessages
MessageList ← filteredMessages, loading
MessageDetail ← selectedMessage
ComposeModal ← users, handleSendMessage
QuoteModal ← payments, cards, reminders
```

## 📝 Kullanım Örneği

```jsx
// Ana sayfada hook kullanımı
const {
  users,
  loading,
  unreadCount,
  handleSendMessage,
  getFilteredMessages
} = useMessages(user, activeFolder);

// Filtrelenmiş mesajları al
const filteredMessages = getFilteredMessages(searchTerm);

// Component'e geç
<MessageList
  filteredMessages={filteredMessages}
  loading={loading}
  ...
/>
```

## ✨ Avantajlar

1. **Modülerlik**: Her component tek bir sorumluluğa sahip
2. **Yeniden Kullanılabilirlik**: Hook'lar başka sayfalarda da kullanılabilir
3. **Test Edilebilirlik**: Her component bağımsız test edilebilir
4. **Bakım Kolaylığı**: Değişiklikler izole edilmiş
5. **Performans**: Gereksiz re-render'lar önlenir
6. **Okunabilirlik**: Kod daha anlaşılır ve düzenli

## 🚀 Yeni Özellikler (Son Güncelleme)

### ✅ Tıklanabilir Alıntılar
- Mesaj detayında alıntılar renkli kartlar olarak gösterilir
- Alıntı kartlarına tıklanarak detay modalı açılır
- Hover efekti ile kullanıcı deneyimi iyileştirildi
- ComposeModal'daki alıntı önizlemesi de tıklanabilir

### ✅ QuoteDetailModal
- Alıntı türüne göre özel tasarım (gradient renkler)
- Ödeme: Tutar, tarih, cari, açıklama, ödeme türü/şekli
- Kredi Kartı: Kart bilgileri, limit, kullanım oranı (progress bar)
- Hatırlatma: Başlık, açıklama, tarih, tutar
- İkonlu ve modern UI
- Backdrop blur efekti

### ✅ Mesaj Veri Yapısı Güncellemesi
```javascript
{
  // ... diğer alanlar
  quoteType: 'payment' | 'card' | 'reminder' | null,
  quoteData: {
    // Ödeme için
    amount: number,
    payment_date: string,
    cari_name: string,
    description: string,
    payment_type: string,
    payment_method: string,
    
    // Kredi Kartı için
    card_name: string,
    card_number: string,
    bank_name: string,
    card_limit: number,
    used_limit: number,
    
    // Hatırlatma için
    title: string,
    description: string,
    reminder_date: string,
    amount: number
  } | null
}
```

## 🎨 Tasarım Detayları

### Alıntı Renk Şeması
- **Ödeme**: Mor gradient (#667eea → #764ba2)
- **Kredi Kartı**: Pembe gradient (#f093fb → #f5576c)
- **Hatırlatma**: Turuncu-sarı gradient (#fa709a → #fee140)

### Hover Efektleri
- Alıntı kartları üzerine gelindiğinde sağa kayar
- Box shadow artar
- Cursor pointer olur
- Smooth transition (0.2s)

## 🚀 Gelecek İyileştirmeler

- [ ] Mesaj taslakları
- [ ] Dosya ekleme
- [ ] Mesaj etiketleme
- [ ] Gelişmiş arama (tarih, gönderen, vb.)
- [ ] Mesaj arşivleme
- [ ] Toplu işlemler (okundu işaretle, yıldızla)
- [x] ~~Tıklanabilir alıntılar~~ ✅ Tamamlandı
- [x] ~~Alıntı detay modalı~~ ✅ Tamamlandı
