
FIREBASE ERİŞİMİ İÇİN MESAJ ATIN

# Smart Plant Frontend

React + Vite frontend for the Smart Indoor Plant Multi-Sensor System.

Current features:

- Firebase Authentication
- Register / Login / Logout
- Firestore user creation after register
- Fetching devices connected to the logged-in user

---

## Setup

Go to the frontend folder:

```bash
cd frontend

Install dependencies:

npm install

Create a .env file in the frontend folder.

You can copy the example file:

cp .env.example .env

On Windows, if cp does not work, create .env manually and copy the contents of .env.example.

Then fill the Firebase values:

VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here

Run the project:

npm run dev

Open the local URL shown in the terminal.

Usually:

http://localhost:5173
Notes

The real .env file is not pushed to GitHub.

Only .env.example is included so other developers know which Firebase variables are required.

Do not push:

node_modules/
.env
dist/
Firestore Usage

After register, the app creates a user document in Firestore:

users/{firebaseAuthUID}

Devices are currently added manually in Firestore.

For a device to appear after login, its ownerId must match the logged-in user's Firebase UID.

Example device document:

{
  "deviceName": "Salon Bitkisi",
  "location": "Living Room",
  "ownerId": "firebase_user_uid"
}
Current Status

Completed:

Firebase Auth connected
Register / Login / Logout working
Firestore user document creation working
Logged-in user's devices can be fetched and displayed

Next steps:

Add device pairing / add device screen
Display latest sensor values
Build basic dashboard