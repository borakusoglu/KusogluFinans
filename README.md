# Finans Defteri - Ödeme Programı

Modern masaüstü ödeme takip uygulaması.

## Geliştirme

```bash
# Bağımlılıkları yükle
npm install

# React dev server'ı başlat (Terminal 1)
npm run dev

# Electron'u başlat (Terminal 2)
npm run electron:dev
```

## Build Alma

```bash
# Windows .exe oluştur
npm run electron:build
```

Build dosyası `dist` klasöründe oluşacak.

## Özellikler

- ✅ Kullanıcı girişi
- ✅ Aylık ödeme ajandası
- ✅ Kredi kartı takibi
- ✅ Cari ödeme yönetimi
- ✅ Banka hesabı tanımlamaları
- ✅ Ödeme kategorileri
- ✅ SQLite veritabanı

## Teknolojiler

- Electron
- React + Vite
- TailwindCSS
- SQLite (better-sqlite3)
- date-fns

# Plasiyer Tahsilat Kuyrugu

`Plasiyer Tah.` sekmesi K-Depo mobil uygulamasindan gelen tahsilatlari merkezi
kuyruktan listeler. Yalnizca admin ve superadmin kullanicilari bekleyen kayitlari
goruntuleyebilir, duzenleyebilir, neden girerek silebilir, plasiyer bazli cikti
alabilir ve yazdirilmis kayitlari Netsis'e manuel aktarabilir. Netsis aktarimi
yazdirma tamamlanmadan acilmaz.

Windows uygulamasi admin veya superadmin oturumuyla acik oldugunda, saat 07:30'da
o gun henuz yazdirilmamis bekleyen kayitlari varsayilan yaziciya plasiyer bazinda
otomatik gonderir. Uygulama acilisinda otomatik yazdirma baslatilmaz.

Sunucu baglantisi icin `src-tauri/.env.example` dosyasini `src-tauri/.env`
olarak kopyalayip gercek `KDEPO_WS_KEY` ve `KDEPO_APP_KEY` degerlerini girin.
Bu dosya Git'e dahil edilmez. Ayni makinede K-Depo Yonetim kaynak klasoru
bulunuyorsa mevcut `Kdepo-Yonetim/src-tauri/.env` dosyasi da otomatik okunur.
