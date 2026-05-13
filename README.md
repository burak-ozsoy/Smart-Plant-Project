# Smart Plant Frontend

This is the React + Vite frontend for the Smart Indoor Plant Monitoring System.

## Current Features

- Firebase Authentication with email/password
- User registration and login
- Firestore user document creation after registration
- Device listing based on the logged-in user's `uid`
- Device detail page
- Latest sensor data display:
  - Temperature
  - Humidity
  - Soil moisture
  - Light level
- React Router page navigation

## Project Structure

```text
src/
├── App.jsx
├── firebase.js
├── main.jsx
└── pages/
    ├── Login.jsx
    ├── DeviceList.jsx
    └── DeviceDetail.jsx
Setup

Install dependencies:

npm install

Create a .env file in the frontend folder and add Firebase config values.

Run the project:

npm run dev
