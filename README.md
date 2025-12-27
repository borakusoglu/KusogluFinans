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
