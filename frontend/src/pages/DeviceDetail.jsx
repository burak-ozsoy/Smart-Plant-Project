import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

function SensorChart({ title, dataKey, unit, chartData }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "10px",
        padding: "16px",
        backgroundColor: "#fff",
      }}
    >
      <h3 style={{ marginTop: 0 }}>{title}</h3>

      <div style={{ width: "100%", height: "180px" }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} width={40} />
            <Tooltip
              formatter={(value) => [`${value} ${unit}`, title]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DeviceDetail() {
  const { currentUser } = useAuth();

  const [device, setDevice] = useState(null);
  const [latestData, setLatestData] = useState(null);
  const [sensorHistory, setSensorHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const { deviceId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser || !deviceId) {
      return;
    }

    let unsubscribeLatestData = null;
    let unsubscribeHistory = null;
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
            if (!isMounted) {
              return;
            }

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

        const historyQuery = query(
          collection(db, "sensorReadings"),
          where("deviceId", "==", deviceId),
          orderBy("timestamp", "desc"),
          limit(10)
        );

        unsubscribeHistory = onSnapshot(
          historyQuery,
          (snapshot) => {
            if (!isMounted) {
              return;
            }

            const readings = snapshot.docs.map((readingDoc) => ({
              id: readingDoc.id,
              ...readingDoc.data(),
            }));

            setSensorHistory(readings);
          },
          (error) => {
            console.error("Sensor history listener error:", error.message);
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

      if (unsubscribeHistory) {
        unsubscribeHistory();
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

  const formatChartTime = (timestamp, index) => {
    if (timestamp && typeof timestamp.toDate === "function") {
      return timestamp.toDate().toLocaleTimeString();
    }

    return `#${index + 1}`;
  };

  const chartData = [...sensorHistory].reverse().map((reading, index) => ({
    time: formatChartTime(reading.timestamp, index),
    temperature: Number(reading.temperature ?? 0),
    humidity: Number(reading.humidity ?? 0),
    soilMoisture: Number(reading.soilMoisture ?? 0),
    lightLevel: Number(reading.lightLevel ?? 0),
  }));

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
            {formatTimestamp(
              latestData.lastUpdated ||
                latestData.updatedAt ||
                latestData.timestamp
            )}
          </p>
        </div>
      ) : (
        <p>No sensor data found for this device.</p>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2>Sensor History Charts</h2>

      {chartData.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            marginBottom: "30px",
          }}
        >
          <SensorChart
            title="Temperature"
            dataKey="temperature"
            unit="°C"
            chartData={chartData}
          />

          <SensorChart
            title="Humidity"
            dataKey="humidity"
            unit="%"
            chartData={chartData}
          />

          <SensorChart
            title="Soil Moisture"
            dataKey="soilMoisture"
            unit="%"
            chartData={chartData}
          />

          <SensorChart
            title="Light Level"
            dataKey="lightLevel"
            unit=""
            chartData={chartData}
          />
        </div>
      ) : (
        <p>No chart data available.</p>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2>Recent Readings</h2>

      {sensorHistory.length > 0 ? (
        <div>
          {sensorHistory.map((reading) => (
            <div
              key={reading.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "10px",
              }}
            >
              <p>
                <strong>Temperature:</strong> {reading.temperature} °C
              </p>
              <p>
                <strong>Humidity:</strong> {reading.humidity} %
              </p>
              <p>
                <strong>Soil Moisture:</strong> {reading.soilMoisture} %
              </p>
              <p>
                <strong>Light Level:</strong> {reading.lightLevel}
              </p>
              <p>
                <strong>Timestamp:</strong> {formatTimestamp(reading.timestamp)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p>No recent sensor readings found.</p>
      )}
    </div>
  );
}

export default DeviceDetail;