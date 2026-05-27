import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

function DeviceDetail() {
  const { currentUser } = useAuth();

  const [device, setDevice] = useState(null);
  const [latestData, setLatestData] = useState(null);
  const [loading, setLoading] = useState(true);

  const { deviceId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let unsubscribeLatestData = null;
    let isMounted = true;

    const getDeviceDetail = async () => {
      try {
        setLoading(true);

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

        if (!isMounted) {
          return;
        }

        setDevice(deviceData);

        const latestDataRef = doc(db, "latestDeviceState", deviceId);

        unsubscribeLatestData = onSnapshot(
          latestDataRef,
          (latestDataSnap) => {
            if (latestDataSnap.exists()) {
              setLatestData(latestDataSnap.data());
            } else {
              setLatestData(deviceData.latestData || null);
            }
          },
          (error) => {
            console.error("Latest sensor data listener error:", error.message);
          }
        );

        console.log("DEVICE DETAIL:", deviceData);
      } catch (error) {
        console.error("Device detail error:", error.message);
        alert(error.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getDeviceDetail();

    return () => {
      isMounted = false;

      if (unsubscribeLatestData) {
        unsubscribeLatestData();
      }
    };
  }, [currentUser, deviceId, navigate]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) {
      return "N/A";
    }

    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate().toLocaleString();
    }

    return String(timestamp);
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

      {latestData ? (
        <div>
          <p>
            <strong>Temperature:</strong> {latestData.temperature} °C
          </p>
          <p>
            <strong>Humidity:</strong> {latestData.humidity} %
          </p>
          <p>
            <strong>Soil Moisture:</strong> {latestData.soilMoisture} %
          </p>
          <p>
            <strong>Light Level:</strong> {latestData.lightLevel}
          </p>
          <p>
            <strong>Last Updated:</strong>{" "}
            {formatTimestamp(latestData.lastUpdated || latestData.updatedAt)}
          </p>
        </div>
      ) : (
        <p>No sensor data found for this device.</p>
      )}
    </div>
  );
}

export default DeviceDetail;