# Smart Plant Frontend

This is the React + Vite frontend for the Smart Indoor Plant Monitoring System.

## Current Status

- Firebase Authentication is implemented with email/password login and register.
- Auth state is managed globally using `AuthContext` and `onAuthStateChanged`.
- Protected routes are used for authenticated pages.
- Logged-in users can view their assigned devices.
- Users can open a device detail page and view the latest sensor data.
- Page refresh keeps the user logged in.

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
