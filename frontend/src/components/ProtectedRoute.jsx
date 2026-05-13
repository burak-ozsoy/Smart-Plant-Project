import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children }) {
  const { currentUser, authLoading } = useAuth();

  if (authLoading) {
    return <p style={{ padding: "40px" }}>Loading...</p>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;