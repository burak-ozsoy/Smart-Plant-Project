import { useState } from "react";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth, db } from "./firebase";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [currentUser, setCurrentUser] = useState(null);
  const [devices, setDevices] = useState([]);

  const register = async () => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      role: "owner",
      createdAt: serverTimestamp(),
    });

    console.log("REGISTER UID:", user.uid);
    alert("Register successful");
  } catch (error) {
    console.error(error.message);
    alert(error.message);
  }
};

  const login = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      console.log("LOGIN UID:", user.uid);

      const token = await user.getIdToken();
      console.log("TOKEN:", token);

      setCurrentUser(user);

      await getUserDevices(user.uid);

      alert("Login successful");
    } catch (error) {
      console.error(error.message);
      alert(error.message);
    }
  };

  const getUserDevices = async (uid) => {
    try {
      const devicesRef = collection(db, "devices");

      const q = query(devicesRef, where("ownerId", "==", uid));

      const querySnapshot = await getDocs(q);

      const deviceList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setDevices(deviceList);

      console.log("USER DEVICES:", deviceList);
    } catch (error) {
      console.error("Device fetch error:", error.message);
      alert(error.message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);

      setCurrentUser(null);
      setDevices([]);

      alert("Logout successful");
    } catch (error) {
      console.error(error.message);
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>Smart Plant Auth Test</h1>

      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <br />
      <br />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <br />
      <br />

      <button onClick={register}>Register</button>

      <button onClick={login} style={{ marginLeft: "10px" }}>
        Login
      </button>

      <button onClick={logout} style={{ marginLeft: "10px" }}>
        Logout
      </button>

      <hr style={{ margin: "30px 0" }} />

      {currentUser && (
        <div>
          <h2>Logged in user</h2>
          <p>
            <strong>UID:</strong> {currentUser.uid}
          </p>
          <p>
            <strong>Email:</strong> {currentUser.email}
          </p>
        </div>
      )}

      <h2>User Devices</h2>

      {devices.length === 0 ? (
        <p>No devices found.</p>
      ) : (
        <ul>
          {devices.map((device) => (
            <li key={device.id}>
              <strong>{device.deviceName}</strong> - {device.location}
              <br />
              Device ID: {device.id}
              <br />
              Owner ID: {device.ownerId}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;