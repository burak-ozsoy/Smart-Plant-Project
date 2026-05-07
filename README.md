# 🌱 Smart Plant App

A modern, intuitive, and dynamic mobile application for monitoring and managing your smart plant system. Built with **React Native** and **Expo**, this app provides real-time sensor data, historical analytics, and actionable insights to keep your plants healthy.

## ✨ Features

- **Real-Time Dashboard**: Monitor live sensor data including temperature, soil moisture, light levels, and humidity.
- **Dynamic Glassmorphism UI**: A premium, iOS-inspired frosted glass aesthetic using `expo-blur`.
- **Theme-Aware Design**: Seamlessly adapts to your system's Light and Dark mode preferences.
- **Analytics & Charts**: Visualize your plant's historical data trends using beautiful interactive charts (`react-native-chart-kit`).
- **Plant Insights**: Receive smart suggestions and health indicators based on sensor readings.
- **Camera Integration**: Keep a visual log of your plant's growth or scan plants for identification.

## 🛠 Tech Stack

- **Framework**: React Native & Expo
- **Navigation**: React Navigation (Native & Material Top Tabs)
- **UI & Animations**: `expo-blur`, React Native Reanimated, React Native Gesture Handler
- **Data Visualization**: React Native Chart Kit
- **Language**: TypeScript

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

- Node.js (v18 or newer recommended)
- npm or yarn
- Expo Go app installed on your iOS or Android device (for physical device testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/burak-ozsoy/Smart-Plant-Project.git
   cd Smart-Plant-Project
   git checkout mobil/front-end/gokdeniz
   cd smart-plant-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

### Running the App

Start the Expo development server:

```bash
npx expo start
```

- Press **`a`** to open on an Android emulator.
- Press **`i`** to open on an iOS simulator.
- **Scan the QR code** with your phone's camera (iOS) or the Expo Go app (Android) to test on a physical device.

## 📱 Screens

- **Dashboard (`DashboardScreen.tsx`)**: Your plant's current vitals at a glance.
- **Analytics (`AnalyticsScreen.tsx`)**: In-depth graphs and historical trends.
- **Insights (`InsightsScreen.tsx`)**: AI-driven tips and alerts for optimal plant care.
- **Camera (`CameraScreen.tsx`)**: Visual tracking and plant photography.

## 🤝 Contributing

This project is part of a Capstone Project. Changes and contributions should be directed to the respective branches.

---
*Designed with ♥ for healthier plants.*
