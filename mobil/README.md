# 🌱 Smart Plant Mobile App

## 🛠️ Gereksinimler (Prerequisites)
- **Node.js** (v18 veya daha yeni bir sürüm)
- **Expo Go** (Uygulamayı fiziksel bir telefonda test etmek için)

## 📦 Kurulum (Installation)
Gerekli paketleri/kütüphaneleri yüklemek için proje dizininde şu komutu çalıştırın:
```bash
npm install
```

## ⚙️ Yapılandırma (Configuration)
Projenin kök (root) dizininde `.env` isimli bir dosya oluşturun ve Firebase kimlik bilgilerinizi tanımlayın:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 🚀 Başlatma (Running)
Uygulamayı yerel geliştirme sunucusunda başlatmak için:
```bash
npx expo start
```
Açılan menüde:
- **`a`** tuşuna basarak Android emülatöründe,
- **`i`** tuşuna basarak iOS simülatöründe çalıştırabilir,
- Veya telefonunuzun kamerası (iOS) ya da **Expo Go** uygulaması (Android) ile QR kodu okutarak uygulamayı telefonunuzda canlı olarak test edebilirsiniz.
