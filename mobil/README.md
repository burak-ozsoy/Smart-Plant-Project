# 🌱 Smart Plant Mobile App

## 🛠️ Prerequisites
- **Node.js** (v18 or newer)
- **Expo Go** (to test on a physical device)

## 📦 Installation
Install the required packages in the project directory:
```bash
npm install
```

## ⚙️ Configuration
Create a `.env` file in the root directory and define your Firebase credentials:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 🚀 Running

**If your phone and computer are on the same network (Wi-Fi):**
```bash
npx expo start
```

**If you are on a different network (e.g. Tailscale):**
```bash
npx expo start --tunnel
```

In the menu that opens:
- Press **`a`** to run on an Android emulator
- Press **`i`** to run on an iOS simulator
- Scan the QR code with your phone's camera (iOS) or the **Expo Go** app (Android) to test on a physical device
