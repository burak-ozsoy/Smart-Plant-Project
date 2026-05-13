import { Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";

import Login from "./pages/Login";
import DeviceList from "./pages/DeviceList";
import DeviceDetail from "./pages/DeviceDetail";

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />

      <Route
        path="/login"
        element={<Login setCurrentUser={setCurrentUser} />}
      />

      <Route
        path="/devices"
        element={<DeviceList currentUser={currentUser} setCurrentUser={setCurrentUser} />}
      />

      <Route
        path="/devices/:deviceId"
        element={<DeviceDetail currentUser={currentUser} />}
      />
    </Routes>
  );
}

export default App;