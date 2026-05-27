// scripts/mockSensorData.js

import "dotenv/config";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const deviceId = process.argv[2] || "device_001";

function generateMockSensorData() {
  return {
    deviceId,
    temperature: Number((22 + Math.random() * 6).toFixed(1)),
    humidity: Math.floor(45 + Math.random() * 25),
    soilMoisture: Math.floor(30 + Math.random() * 40),
    lightLevel: Math.floor(300 + Math.random() * 600),
    timestamp: serverTimestamp(),
  };
}

async function sendMockData() {
  try {
    const data = generateMockSensorData();

    await setDoc(doc(db, "latestDeviceState", deviceId), {
      ...data,
      lastUpdated: serverTimestamp(),
    });

    await addDoc(collection(db, "sensorReadings"), data);

    console.log("Mock sensor data sent:", data);
  } catch (error) {
    console.error("Error sending mock sensor data:", error);
  }
}

setInterval(sendMockData, 15000);

sendMockData();