import { useEffect, useRef, useState } from "react";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteField,
  collection,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { db } from "./firebase";
import { auth } from "./firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import "./index.css";


export default function App() {
  const [darkMode, setDarkMode] = useState(true);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const [deviceMac, setDeviceMac] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [deviceIp, setDeviceIp] = useState("");

  const [deviceMessage, setDeviceMessage] = useState("");
  const [isDeviceSuccess, setIsDeviceSuccess] = useState(false);
  const [controlMessage, setControlMessage] = useState("");
  const [isControlSuccess, setIsControlSuccess] = useState(false);

  const [loginError, setLoginError] = useState("");
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [chartData, setChartData] = useState([]);
  const [sensorValues, setSensorValues] = useState({
    temperature: "--",
    humidity: "--",
    soilMoisture: "--",
    light: "--",
  });

  const [fanOn, setFanOn] = useState(false);
  const [lightsOn, setLightsOn] = useState(false);

  const [fanCooldown, setFanCooldown] = useState(false);
  const [lightsCooldown, setLightsCooldown] = useState(false);
  const [watering, setWatering] = useState(false);
  const [cameraFrameUrl, setCameraFrameUrl] = useState("");
  const [cameraStatus, setCameraStatus] = useState("idle");
  const actuatorSocketRef = useRef(null);

  useEffect(() => {
  if (!selectedDevice) {
    setSensorValues({
      temperature: "--",
      humidity: "--",
      soilMoisture: "--",
      light: "--",
    });
    return;
  }

  const deviceRef = doc(db, "devices", selectedDevice);

  const unsubscribe = onSnapshot(deviceRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const latest = data.latestReading;
      const actuator = data.actuatorState;

      setSensorValues({
        temperature: latest?.temperature ?? "--",
        humidity: latest?.humidity ?? "--",
        soilMoisture: latest?.soilMoisture ?? "--",
        light: latest?.lightLevel ?? "--",
      });
      setDeviceIp(data?.ipAddress ?? "");
      setFanOn(actuator?.fanOn ?? false);
      setLightsOn(actuator?.growLightOn ?? false);
    } else {
    setSensorValues({
    temperature: "--",
    humidity: "--",
    soilMoisture: "--",
    light: "--",
  });

  setFanOn(false);
  setLightsOn(false);
  setDeviceIp("");
}
  });

  return () => unsubscribe();
  }, [selectedDevice]
  );

  useEffect(() => {
  if (!selectedDevice) {
    setChartData([]);
    return;
  }

  const readingsRef = collection(
    db,
    "devices",
    selectedDevice,
    "sensor_readings"
  );

  const readingsQuery = query(
    readingsRef,
    orderBy("readingTime", "desc"),
    limit(20)
  );

  const unsubscribe = onSnapshot(readingsQuery, (snapshot) => {
    const data = snapshot.docs
      .map((doc) => {
        const reading = doc.data();

        return {
          time: reading.readingTime
      ? reading.readingTime.split("-").slice(3).join(":")
       : "",
          temperature: reading.temperature ?? 0,
          humidity: reading.humidity ?? 0,
        };
      })
      .reverse();

    setChartData(data);
  });

  return () => unsubscribe();
 }, [selectedDevice]);

  useEffect(() => {
  if (!deviceMessage) return;

  const timer = setTimeout(() => {
    setDeviceMessage("");
  }, 3000);

  return () => clearTimeout(timer);
 }, [deviceMessage]);

 useEffect(() => {
  if (!loginError) return;

  const timer = setTimeout(() => {
    setLoginError("");
  }, 3000);

  return () => clearTimeout(timer);
 }, [loginError]);

  useEffect(() => {
    if (!isLoggedIn) {
      setCameraFrameUrl("");
      setCameraStatus("idle");
      return;
    }
    const resolvedDeviceIp = String(deviceIp || "").trim();
    if (!resolvedDeviceIp) {
      if (actuatorSocketRef.current && actuatorSocketRef.current.readyState < 2) {
        actuatorSocketRef.current.close();
      }
      actuatorSocketRef.current = null;
      return;
    }
    const wsUrl = `ws://${resolvedDeviceIp}:8000/ws/camera`;
    let socket;
    let reconnectTimer;
    let isActive = true;
    let frameObjectUrl = "";

    const cleanupFrameUrl = () => {
      if (frameObjectUrl) {
        URL.revokeObjectURL(frameObjectUrl);
        frameObjectUrl = "";
      }
    };

    const connect = () => {
      if (!isActive) return;

      setCameraStatus("connecting");
      socket = new WebSocket(wsUrl);
      socket.binaryType = "arraybuffer";

      socket.onopen = () => {
        setCameraStatus("live");
      };

      socket.onmessage = (event) => {
        cleanupFrameUrl();

        const blob = new Blob([event.data], { type: "image/jpeg" });
        frameObjectUrl = URL.createObjectURL(blob);
        setCameraFrameUrl(frameObjectUrl);
      };

      socket.onclose = () => {
        if (!isActive) return;

        setCameraStatus("offline");
        reconnectTimer = window.setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        setCameraStatus("offline");
        socket.close();
      };
    };

    connect();

    return () => {
      isActive = false;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      if (socket && socket.readyState < 2) {
        socket.close();
      }
      cleanupFrameUrl();
    };
  }, [isLoggedIn , deviceIp]);

  useEffect(() => {
    if (!isLoggedIn) {
      if (actuatorSocketRef.current && actuatorSocketRef.current.readyState < 2) {
        actuatorSocketRef.current.close();
      }
      actuatorSocketRef.current = null;
      return;
    }
    const resolvedDeviceIp = String(deviceIp || "").trim();
    if (!resolvedDeviceIp) {
      if (actuatorSocketRef.current && actuatorSocketRef.current.readyState < 2) {
        actuatorSocketRef.current.close();
      }
      actuatorSocketRef.current = null;
      return;
    }
    const actuatorWsPort = import.meta.env.VITE_ACTUATOR_WS_PORT || "8766";
    const wsUrl = `ws://${resolvedDeviceIp}:${actuatorWsPort}`;
    let socket;
    let reconnectTimer;
    let isActive = true;

    const connect = () => {
      if (!isActive) return;

      socket = new WebSocket(wsUrl);
      actuatorSocketRef.current = socket;

      socket.onclose = () => {
        if (!isActive) return;
        reconnectTimer = window.setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      isActive = false;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      if (socket && socket.readyState < 2) {
        socket.close();
      }
      actuatorSocketRef.current = null;
    };
  }, [isLoggedIn, deviceIp]);

  const sendActuatorCommand = (payload) => {
    if (!selectedDevice) {
      setIsDeviceSuccess(false);
      setDeviceMessage("Connect a device first");
      return false;
    }

    if (!deviceIp) {
      setIsDeviceSuccess(false);
      setDeviceMessage("Device IP not ready yet. Wait for sensor data.");
      return false;
    }

    const socket = actuatorSocketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setIsDeviceSuccess(false);
      setDeviceMessage("CONTROL: Actuator gateway is offline");
      return false;
    }

    const topic = `actuator_data/${String(deviceIp).trim()}`;
    socket.send(JSON.stringify({ topic, payload }));
    return true;
  };

  const handleFanToggle = async () => {
  if (!selectedDevice || fanCooldown) return;

  const newFanState = !fanOn;

  const sent = sendActuatorCommand({ fanOn: newFanState });
  if (!sent) return;

  setFanOn(newFanState);
  setFanCooldown(true);

  updateDoc(doc(db, "devices", selectedDevice), {
    "actuatorState.fanOn": newFanState,
  }).catch((error) => {
    console.warn("Fan mirror update failed:", error);
  });

  setTimeout(() => {
    setFanCooldown(false);
    }, 2000);
  };

  const handleLightsToggle = async () => {
  if (!selectedDevice || lightsCooldown) return;

  const newLightState = !lightsOn;

  const sent = sendActuatorCommand({ growLightOn: newLightState });
  if (!sent) return;

  setLightsOn(newLightState);
  setLightsCooldown(true);

  updateDoc(doc(db, "devices", selectedDevice), {
    "actuatorState.growLightOn": newLightState,
  }).catch((error) => {
    console.warn("Light mirror update failed:", error);
  });

  setTimeout(() => {
    setLightsCooldown(false);
   }, 2000);
    };

  const handleGiveWater = async () => {
  if (!selectedDevice || watering) return;

  const sent = sendActuatorCommand({ pumpOn: true });
  if (!sent) return;

  setWatering(true);

  updateDoc(doc(db, "devices", selectedDevice), {
    "actuatorState.pumpOn": true,
  }).catch((error) => {
    console.warn("Pump mirror update failed:", error);
  });

  setTimeout(() => {
    sendActuatorCommand({ pumpOn: false });
    updateDoc(doc(db, "devices", selectedDevice), {
      "actuatorState.pumpOn": false,
    }).catch((error) => {
      console.warn("Pump mirror update failed:", error);
    });
  }, 5000);

  setTimeout(() => {
    setWatering(false);
  }, 7000);
  };

  const handleLogin = async () => {
  try {
    setLoginError("");
    setIsSuccessMessage(false);

     const userCredential = await signInWithEmailAndPassword(auth, email, password);

     const user = userCredential.user;
     const userSnap = await getDoc(doc(db, "users", user.uid));

  if (userSnap.exists() && userSnap.data().macAddress) {
  setSelectedDevice(userSnap.data().macAddress);
  setDeviceMac(userSnap.data().macAddress);
   }

    setIsLoggedIn(true);
  } 
  catch (error) {
  setIsSuccessMessage(false);
  setLoginError("Wrong username or password");
  } 
  };

  const handleAddUser = async () => {
  try {
    setLoginError("");

    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    setIsSuccessMessage(true);
    setLoginError("User added successfully");
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      setIsSuccessMessage(false);
      setLoginError("User already exists");
    } else {
      setIsSuccessMessage(false);
      setLoginError("Could not add user");
    }
  }
  };

  const handlePasswordReset = async () => {
  if (!email.trim()) {
    setLoginError("Please enter your email address");
    setIsSuccessMessage(false);
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);

    setLoginError("Password reset email sent");
    setIsSuccessMessage(true);
  } catch (error) {
    setLoginError("Failed to send reset email");
    setIsSuccessMessage(false);
  }
 };

  const handleConnectDevice = async () => {
  setDeviceMessage("");

  if (!deviceMac.trim()) {
    setIsDeviceSuccess(false);
    setDeviceMessage("Please enter a MAC address");
    return;
  }

  if (selectedDevice) {
  setIsDeviceSuccess(false);
  setDeviceMessage("A device is already connected. Please disconnect it first.");
  return;
}

  try {
    const deviceRef = doc(db, "devices", deviceMac.trim());
    const deviceSnap = await getDoc(deviceRef);

    if (!deviceSnap.exists()) {
      setIsDeviceSuccess(false);
      setDeviceMessage("Device not found");
      return;
    }

 const user = auth.currentUser;

   if (user) {
    await setDoc(
     doc(db, "users", user.uid),
    {
      email: user.email,
      macAddress: deviceMac.trim(),
    },
    { merge: true }
     );
   }

    setSelectedDevice(deviceMac.trim());

    setIsDeviceSuccess(true);
    setDeviceMessage("Device connected successfully");
  } catch (error) {
    setIsDeviceSuccess(false);
    setDeviceMessage("Connection failed");
  }
  };

  const handleDisconnectDevice = async () => {
  const user = auth.currentUser;

  if (user) {
    await updateDoc(doc(db, "users", user.uid), {
      macAddress: deleteField(),
    });
  }

  setSelectedDevice("");
  setDeviceMac("");
  setDeviceIp("");
  setDeviceMessage("");
  setIsDeviceSuccess(false);

  setSensorValues({
    temperature: "--",
    humidity: "--",
    soilMoisture: "--",
    light: "--",
  });
 };

  const handleLogout = async () => {
  await signOut(auth);

  setIsLoggedIn(false);
  setEmail("");
  setPassword("");
  setLoginError("");
  setIsSuccessMessage(false);
  };

  const theme = {
    bg: darkMode ? "#070b14" : "#f8fafc",
    card: darkMode ? "#111827" : "#ffffff",
    text: darkMode ? "#f8fafc" : "#0f172a",
    muted: darkMode ? "#94a3b8" : "#64748b",
    border: darkMode ? "#263244" : "#e2e8f0",
  };

  if (!isLoggedIn) {
  return (
    <div
      className="app"
      style={{
        background: "#070b14",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "#111827",
          padding: "40px",
          borderRadius: "16px",
          width: "350px",
          textAlign: "center",
          border: "1px solid #263244",
        }}
      >
        <div style={{ fontSize: "60px", marginBottom: "15px" }}>👤</div>

        <h2 style={{ color: "#f8fafc", marginBottom: "25px" }}>
          {isForgotPassword ? "Forgot Password" : "Smart Plant System"}
        </h2>

        <input
          type="email"
          placeholder={isForgotPassword ? "Email Address" : "Username"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "12px",
            borderRadius: "8px",
            border: "1px solid #334155",
            background: "#0f172a",
            color: "#fff",
          }}
        />

        {!isForgotPassword && (
          <div
            style={{
              position: "relative",
              marginBottom: "12px",
            }}
          >
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#fff",
              }}
            />

            <span
              onMouseDown={() => setShowPassword(true)}
              onMouseUp={() => setShowPassword(false)}
              onMouseLeave={() => setShowPassword(false)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              👁️
            </span>
          </div>
        )}

        {loginError && (
          <p
            style={{
              color: isSuccessMessage ? "#22c55e" : "#ef4444",
              marginBottom: "12px",
              fontWeight: "bold",
            }}
          >
            {loginError}
          </p>
        )}

        {isForgotPassword ? (
          <>
            <button
              onClick={handlePasswordReset}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Send Reset Link
            </button>

            <button
              onClick={() => {
                setIsForgotPassword(false);
                setLoginError("");
                setIsSuccessMessage(false);
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #334155",
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "10px",
                background: "#0f172a",
                color: "#f8fafc",
              }}
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleLogin}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Login
            </button>

            <button
              onClick={handleAddUser}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #334155",
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "10px",
                background: "#0f172a",
                color: "#f8fafc",
              }}
            >
              Add User
            </button>

            <p
              onClick={() => {
                setIsForgotPassword(true);
                setLoginError("");
                setIsSuccessMessage(false);
              }}
              style={{
                cursor: "pointer",
                marginTop: "10px",
                textAlign: "center",
                textDecoration: "underline",
                color: "#94a3b8",
              }}
            >
              Forgot Password?
            </p>
          </>
        )}
      </div>
    </div>
  );
 }

  return (
    <div className="app" style={{ background: theme.bg, color: theme.text }}>
      <header className="header">
        <div className="brand">
          <div className="logo">🌱</div>

          <div>
            <h1>Smart Plant System</h1>
            <p style={{ color: theme.muted }}>Live monitoring dashboard</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>

<div
  style={{
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
  }}
>
  <div style={{ display: "flex", flexDirection: "column" }}>
    <input
      type="text"
      placeholder="MAC Address"
      value={deviceMac}
      onChange={(e) => {
        const value = e.target.value.toUpperCase();

        if (/^[0-9A-F:]*$/.test(value)) {
          setDeviceMac(value);
        }
      }}
      style={{
        padding: "10px",
        borderRadius: "8px",
        border: "1px solid #334155",
        background: "#0f172a",
        color: "#fff",
        width: "220px",
      }}
    />

    {deviceMessage && !deviceMessage.startsWith("CONTROL:") && (
      <p
        style={{
          color: isDeviceSuccess ? "#22c55e" : "#ef4444",
          fontSize: "13px",
          fontWeight: "bold",
          marginTop: "6px",
          textAlign: "center",
          maxWidth: "220px",
        }}
      >
        {deviceMessage}
      </p>
    )}
  </div>

  <button
    className="iconBtn"
    onClick={handleConnectDevice}
    title="Connect Device"
  >
    🔗
  </button>

  {selectedDevice && (
    <button
      className="iconBtn"
      onClick={handleDisconnectDevice}
      title="Disconnect Device"
    >
      ❌
    </button>
  )}
 </div>

  <button
    className="iconBtn"
    onClick={() => setDarkMode(!darkMode)}
  >
    {darkMode ? "☀️" : "🌙"}
  </button>

  <button
    className="iconBtn"
    onClick={handleLogout}
    title="Logout"
  >
    🚪
  </button>
  </div>
      </header>

      <main className="container">
        <section className="stats">
          <StatCard
            title="Temperature"
            value={sensorValues.temperature}
            unit="°C"
            icon="🌡️"
            color="#ff4d6d"
            theme={theme}
          />
          <StatCard
           title="Humidity"
           value={sensorValues.humidity}
           unit="%"
           icon="🌫️"
           color="#22c55e"
           theme={theme}
          />
          <StatCard
            title="Soil Moisture"
            value={sensorValues.soilMoisture}
            unit="%"
            icon="💧"
            color="#3b82f6"
            theme={theme}
          />

          <StatCard
            title="Light Level"
            value={sensorValues.light}
            unit="%"
            icon="☀️"
            color="#fbbf24"
            theme={theme}
          />
        </section>

        <section className="charts">
   <div
    className="chartCard"
    style={{ background: theme.card, borderColor: theme.border }}
  >
    <h2>Temperature History (°C)</h2>

    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis domain={[0, 50]} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="temperature"
          stroke="#ff4d6d"
          strokeWidth={3}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>

  <div
    className="chartCard"
    style={{ background: theme.card, borderColor: theme.border }}
  >
    <h2>Humidity History (%)</h2>

    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="humidity"
          stroke="#22c55e"
          strokeWidth={3}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
 </section>

        <section
          className="cameraSection"
          style={{ background: theme.card, borderColor: theme.border }}
        >
          <div className="cameraHeader">
            <div>
              <h2>Camera View</h2>
              <p style={{ color: theme.muted }}>
                Latest captured plant image
              </p>
            </div>

            <div className={`cameraDot ${cameraStatus}`}></div>
          </div>

          {cameraFrameUrl ? (
            <div className="cameraFeed">
              <img src={cameraFrameUrl} alt="Latest captured plant image" />
            </div>
          ) : (
            <div className="cameraPlaceholder">
              📷
              <span>
                {cameraStatus === "connecting"
                  ? "Connecting to camera..."
                  : "No camera feed"}
              </span>
            </div>
          )}
        </section>

        <section className="controls" style={{ borderColor: theme.border }}>
          <ControlCard
            title="Fan"
            desc="Turn fan on or off"
            icon="🌀"
            active={fanOn}
            onToggle={handleFanToggle}
            disabled={!selectedDevice || fanCooldown}
            theme={theme}
          />

          <div
            className="controlCard"
            style={{ background: theme.card, borderColor: theme.border }}
          >
            <div className="controlIcon blue">💧</div>

            <div>
              <h3>Give Water</h3>
              <p style={{ color: theme.muted }}>Manually water the plant</p>
            </div>

            <button
              className="waterBtn"
              onClick={handleGiveWater}
              disabled={!selectedDevice || watering}
            >
              {watering ? "Watering..." : "Give Water"}
            </button>
          </div>

          <ControlCard
            title="Lights"
            desc="Turn lights on or off"
            icon="💡"
            active={lightsOn}
            onToggle={handleLightsToggle}
            disabled={!selectedDevice || lightsCooldown}
            theme={theme}
            yellow
          />
        </section>
  

 {deviceMessage?.startsWith("CONTROL:") && (
  <p
    style={{
      color: "#ef4444",
      fontSize: "13px",
      fontWeight: "bold",
      textAlign: "center",
      marginTop: "8px",
    }}
  >
    {deviceMessage.replace("CONTROL: ", "")}
  </p>
 )}
      </main>
    </div>
  );
}

function StatCard({ title, value, unit, icon, color, theme }) {
  return (
    <div
      className="card statCard"
      style={{ background: theme.card, borderColor: theme.border }}
    >
      <div className="statTop">
        <div className="statIcon" style={{ color, background: `${color}22` }}>
          {icon}
        </div>

        <h3 style={{ color: theme.muted }}>{title}</h3>
      </div>

      <div className="value">
        {value} <span style={{ color: theme.muted }}>{unit}</span>
      </div>
    </div>
  );
}

function ChartCard({ title, color, theme, yLabels }) {
  const xLabels = ["12:00", "12:10", "12:20", "12:30", "12:40", "12:50"];

  return (
    <div
      className="card chartCard"
      style={{ background: theme.card, borderColor: theme.border }}
    >
      <h2>{title}</h2>

      <div className="chartWrap">
        <div className="yAxis">
          {yLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="chartArea">
          <svg viewBox="0 0 600 240" className="chart">
            {[20, 60, 100, 140, 180, 220].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="600"
                y2={y}
                stroke={theme.border}
                strokeDasharray="6"
              />
            ))}

            <polyline
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="0,120 80,80 150,115 230,60 310,110 380,170 460,200 540,180 600,220"
            />
          </svg>

          <div className="xAxis">
            {xLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlCard({
  title,
  desc,
  icon,
  active,
  onToggle,
  disabled,
  theme,
  yellow,
}) {
  return (
    <div
      className="controlCard"
      style={{ background: theme.card, borderColor: theme.border }}
    >
      <div className={yellow ? "controlIcon yellow" : "controlIcon green"}>
        {icon}
      </div>

      <div>
        <h3>{title}</h3>
        <p style={{ color: theme.muted }}>{desc}</p>
      </div>

      <button
        className={`toggle ${active ? "on" : ""} ${
          yellow ? "yellowToggle" : ""
        }`}
        onClick={onToggle}
        disabled={disabled}
      >
        <span></span>
      </button>
    </div>
  );
}