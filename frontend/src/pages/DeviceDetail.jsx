import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";

import { db } from "../firebase";

function DeviceDetail({ currentUser }) {
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);

  const { deviceId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    getDeviceDetail();
  }, [currentUser, deviceId]);

  const getDeviceDetail = async () => {
    try {
      const deviceRef = doc(db, "devices", deviceId);
      const deviceSnap = await getDoc(deviceRef);

      if (!deviceSnap.exists()) {
        alert("Device not found");
        navigate("/devices");
        return;
      }

      const deviceData = {
        id: deviceSnap.id,
        ...deviceSnap.data(),
      };

      if (deviceData.ownerId !== currentUser.uid) {
        alert("You do not have permission to view this device");
        navigate("/devices");
        return;
      }

      setDevice(deviceData);
      console.log("DEVICE DETAIL:", deviceData);
    } catch (error) {
      console.error("Device detail error:", error.message);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p style={{ padding: "40px" }}>Loading device detail...</p>;
  }

  if (!device) {
    return <p style={{ padding: "40px" }}>No device found.</p>;
  }

  return (
    <div style={{ padding: "40px" }}>
      <button onClick={() => navigate("/devices")}>Back to Devices</button>

      <h1>{device.deviceName}</h1>

      <p>
        <strong>Location:</strong> {device.location}
      </p>

      <p>
        <strong>Device ID:</strong> {device.id}
      </p>

      <hr style={{ margin: "30px 0" }} />

      <h2>Latest Sensor Data</h2>

      {device.latestData ? (
        <div>
          <p>
            <strong>Temperature:</strong> {device.latestData.temperature} °C
          </p>
          <p>
            <strong>Humidity:</strong> {device.latestData.humidity} %
          </p>
          <p>
            <strong>Soil Moisture:</strong> {device.latestData.soilMoisture} %
          </p>
          <p>
            <strong>Light Level:</strong> {device.latestData.lightLevel}
          </p>
        </div>
      ) : (
        <p>No sensor data found for this device.</p>
      )}
    </div>
  );
}

export default DeviceDetail;