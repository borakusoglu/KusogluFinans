# Kuşoğlu Finans - Tauri Updater Bilgileri

## 🔐 Signing Keys

### Public Key (tauri.conf.json'da kullanılıyor)
```
dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEM2MDExNURCQkFEREZBNDMKUldSRCt0MjYyeFVCeHA2azRTakJLeFEzTWZRdjJWWUZnMWZNMFdHUXJGWFZTNHJKUS9ITS9xSmIK
```

### Private Key (Build yaparken kullanılacak)
```
dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXUlRZMEl5NVNzQnBlMzh4L214UUg5NzN3WFEyUlpKV3BSbTZONHZRUXN6SzNWUUpaNEFBQkFBQUFBQUFBQUFBQUlBQUFBQWh5eVptbHBXYldEeElDc3BxSDNWalp5TDNHSmd4ZDBrUkdGS3YwbjZmYkVkY1RRR2loWkF0cTRRK3FYTEtWN2JEQWRKZE14cVlvNkFQclBiQnJUaUVSTTh2ZVRUd2pzMVF3K1VwaGdzM09VeU50c2NlSmN3VTVyM0o5ZGJzREVFUDlERW5iRXJsc0U9Cg==
```

---

## 📦 Build Komutu

### Windows'ta Build
```bash
set TAURI_SIGNING_PRIVATE_KEY=dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXUlRZMEl5NVNzQnBlMzh4L214UUg5NzN3WFEyUlpKV3BSbTZONHZRUXN6SzNWUUpaNEFBQkFBQUFBQUFBQUFBQUlBQUFBQWh5eVptbHBXYldEeElDc3BxSDNWalp5TDNHSmd4ZDBrUkdGS3YwbjZmYkVkY1RRR2loWkF0cTRRK3FYTEtWN2JEQWRKZE14cVlvNkFQclBiQnJUaUVSTTh2ZVRUd2pzMVF3K1VwaGdzM09VeU50c2NlSmN3VTVyM0o5ZGJzREVFUDlERW5iRXJsc0U9Cg==
set TAURI_SIGNING_PRIVATE_KEY_PASSWORD=BURAYA_ŞİFRENİ_YAZ
npm run tauri build
```

---

## 🚀 GitHub Release Adımları

1. **Build Yap** (yukarıdaki komutla)

2. **GitHub'da Release Oluştur**
   - Repo: https://github.com/borakusoglu/KusogluFinans
   - Tag: v1.0.4 (veya yeni versiyon)
   - Title: Kuşoğlu Finans v1.0.4

3. **Dosyaları Yükle** (src-tauri/target/release/bundle/ altında)
   - `*.msi` (installer)
   - `*.msi.zip` (zip)
   - `*.msi.zip.sig` (signature - ÖNEMLİ!)

4. **Publish Release**

---

## 🔑 GitHub Token (Private Repo İçin)

### Token Oluşturma
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Scope: `repo` (tüm repo erişimi)
4. Token'ı kopyala

### Token'ı Ekle
`src/components/VersionChecker.jsx` dosyasında:
```javascript
const GITHUB_TOKEN = 'ghp_BURAYA_TOKEN_YAPISTIR';
```

---

## ⚠️ ÖNEMLİ NOTLAR

- **Private Key'i asla GitHub'a yükleme!**
- **Şifreyi güvenli yerde sakla!**
- **Her release'de `.sig` dosyalarını eklemeyi unutma!**
- **Token'ı kodda bırakma, production'da environment variable kullan!**

---

## 📋 Checklist

- [x] Public key tauri.conf.json'a eklendi
- [x] Private key kaydedildi
- [ ] GitHub token oluşturuldu
- [ ] Token VersionChecker.jsx'e eklendi
- [ ] Build yapıldı
- [ ] Release oluşturuldu
- [ ] Signature dosyaları yüklendi

---

## 🔄 Güncelleme Sistemi

Uygulama her açılışta otomatik olarak GitHub'dan yeni versiyon kontrolü yapar.
Yeni versiyon varsa kullanıcıya modal gösterilir ve tek tıkla güncelleme yapılır.

**Donanım Kilidi:** Uygulama ilk açıldığı cihaza kilitlenir, başka PC'ye kopyalanamaz.
