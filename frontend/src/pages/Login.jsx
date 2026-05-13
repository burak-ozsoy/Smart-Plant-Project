import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { auth, db } from "../firebase";

function Login({ setCurrentUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

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

      setCurrentUser(user);

      alert("Register successful");
      navigate("/devices");
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

      alert("Login successful");
      navigate("/devices");
    } catch (error) {
      console.error(error.message);
      alert(error.message);
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>Smart Plant Login</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br />
      <br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br />
      <br />

      <button onClick={register}>Register</button>

      <button onClick={login} style={{ marginLeft: "10px" }}>
        Login
      </button>
    </div>
  );
}

export default Login;