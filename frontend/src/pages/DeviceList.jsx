import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { signOut } from "firebase/auth";

import { auth, db } from "../firebase";

function DeviceList({ currentUser, setCurrentUser }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    getUserDevices(currentUser.uid);
  }, [currentUser]);

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
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);

      setCurrentUser(null);
      setDevices([]);

      alert("Logout successful");
      navigate("/login");
    } catch (error) {
      console.error(error.message);
    }
  };

  if (loading) {
    return <p style={{ padding: "40px" }}>Loading devices...</p>;
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>My Devices</h1>

      <button onClick={logout}>Logout</button>

      <hr style={{ margin: "30px 0" }} />

      <h2>Logged in user</h2>
      <p>
        <strong>UID:</strong> {currentUser.uid}
      </p>
      <p>
        <strong>Email:</strong> {currentUser.email}
      </p>

      <h2>User Devices</h2>

      {devices.length === 0 ? (
        <p>No devices found.</p>
      ) : (
        <ul>
          {devices.map((device) => (
            <li
              key={device.id}
              onClick={() => navigate(`/devices/${device.id}`)}
              style={{
                marginBottom: "20px",
                cursor: "pointer",
                border: "1px solid #ddd",
                padding: "15px",
                borderRadius: "8px",
                maxWidth: "400px",
              }}
            >
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

export default DeviceList;