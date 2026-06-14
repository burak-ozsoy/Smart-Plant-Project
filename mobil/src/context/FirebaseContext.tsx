import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, doc, onSnapshot, updateDoc, getDoc, getDocs, setDoc, query, orderBy, limit, where } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../config/firebase';

interface SensorData {
  temperature: number;
  humidity: number;
  lightLevel: number;
  soilMoisture: number;
  readingTime?: any;
}

interface ControlData {
  pumpOn: boolean;
  growLightOn: boolean;
  fanOn: boolean;
  updatedAt?: any;
}

interface FirebaseContextType {
  user: User | null;
  userDoc: { name: string; email: string } | null;
  deviceId: string | null;
  ipAddress: string | null;
  devicesList: { macAddress: string; deviceName: string }[];
  sensors: SensorData | null;
  controls: ControlData | null;
  historicalData: SensorData[];
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  selectDevice: (macAddress: string) => Promise<void>;
  addDevice: (deviceName: string, macAddress: string) => Promise<void>;
  removeDevice: (macAddress: string) => Promise<void>;
  updateControl: (key: keyof ControlData, value: boolean) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<{ name: string; email: string } | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [ipAddress, setIpAddress] = useState<string | null>(null);
  const [devicesList, setDevicesList] = useState<{ macAddress: string; deviceName: string }[]>([]);
  const [sensors, setSensors] = useState<SensorData | null>(null);
  const [controls, setControls] = useState<ControlData | null>(null);
  const [historicalData, setHistoricalData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // 1. Firebase Auth State Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserDoc(null);
        setDeviceId(null);
        setIpAddress(null);
        setDevicesList([]);
        setSensors(null);
        setControls(null);
        setHistoricalData([]);
        setLoading(false);
      }
    }, (err) => {
      console.error("Auth state change error:", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Load active device once when user logs in
  useEffect(() => {
    if (!user) return;
    const loadSavedActiveDevice = async () => {
      try {
        const saved = await AsyncStorage.getItem('active_mac_address');
        if (saved) {
          setDeviceId(saved);
        }
      } catch (err) {
        console.error("Error loading active device from storage:", err);
      }
    };
    loadSavedActiveDevice();
  }, [user]);

  // 3. Load User Profile and Query Owned Devices
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Subscribe to User profile document
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserDoc({
          name: data.name || '',
          email: data.email || '',
        });
      }
    }, (err) => {
      console.error("Error subscribing to user doc:", err);
    });

    // Subscribe/Query all Devices where ownerId == user.uid
    const devicesQuery = query(
      collection(db, 'devices'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribeDevices = onSnapshot(devicesQuery, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const list = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            macAddress: docSnap.id,
            deviceName: data.deviceName || docSnap.id,
          };
        }).sort((a, b) => a.macAddress.localeCompare(b.macAddress));

        // Optimization: Only update state if the device list has structurally changed
        setDevicesList((prevList) => {
          const isSame = prevList.length === list.length &&
            prevList.every((item, i) => item.macAddress === list[i].macAddress && item.deviceName === list[i].deviceName);
          return isSame ? prevList : list;
        });

        // If no active device is set yet, or the current selected device is no longer in their list
        setDeviceId((prev) => {
          if (prev && list.some(d => d.macAddress === prev)) {
            return prev;
          }
          const firstMac = list[0].macAddress;
          AsyncStorage.setItem('active_mac_address', firstMac);
          return firstMac;
        });
      } else {
        setDevicesList([]);
        setDeviceId(null);
        setSensors(null);
        setControls(null);
        setHistoricalData([]);
        setLoading(false);
      }
    }, (err) => {
      console.error("Error querying user devices:", err);
      setError("Failed to query devices: " + err.message);
      setLoading(false);
    });

    return () => {
      unsubscribeUserDoc();
      unsubscribeDevices();
    };
  }, [user]);

  // 4. Real-time Subscription to Firestore Device Doc and sensor_readings
  useEffect(() => {
    if (!deviceId) return;

    setLoading(true);
    setSensors(null);
    setControls(null);
    setHistoricalData([]);
    setIpAddress(null);

    const docRef = doc(db, 'devices', deviceId);

    const unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const ip = data.ipAddress || data.ipadress || data.ipaddress || null;
        setIpAddress(ip);
        const lr = data.latestReading || {};
        
        // Helper to resolve sensor values with robust key fallbacks (checking both latestReading and root)
        const getSensorValue = (keys: string[]): number => {
          // 1. Check inside latestReading
          for (const key of keys) {
            if (lr[key] !== undefined) {
              const val = lr[key];
              if (typeof val === 'number') return val;
              if (typeof val === 'string') {
                const parsed = parseFloat(val);
                if (!isNaN(parsed)) return parsed;
              }
            }
          }
          // 2. Check at document root
          for (const key of keys) {
            if (data[key] !== undefined) {
              const val = data[key];
              if (typeof val === 'number') return val;
              if (typeof val === 'string') {
                const parsed = parseFloat(val);
                if (!isNaN(parsed)) return parsed;
              }
            }
          }
          return 0;
        };

        setSensors({
          temperature: getSensorValue(['temperature', 'temp', 't']),
          humidity: getSensorValue(['humidity', 'hum', 'h']),
          lightLevel: getSensorValue(['lightLevel', 'lightIntensity', 'light', 'ldr', 'l']),
          soilMoisture: getSensorValue(['soilMoisture', 'soil_moisture', 'moisture', 'soil', 'sm']),
          readingTime: lr.reading_time || lr.readingTime || data.reading_time || data.readingTime || null,
        });

        // Helper to resolve control state with fallbacks (checking both actuatorState and root)
        const ac = data.actuatorState || {};
        const getControlValue = (keys: string[]): boolean => {
          for (const key of keys) {
            if (ac[key] !== undefined) return !!ac[key];
          }
          for (const key of keys) {
            if (data[key] !== undefined) return !!data[key];
          }
          return false;
        };

        // Initialize controls once from Firestore if they are currently null (first load or device switch)
        setControls(prev => {
          if (prev === null) {
            return {
              pumpOn: getControlValue(['pumpOn', 'pump']),
              growLightOn: getControlValue(['growLightOn', 'growLight', 'light']),
              fanOn: getControlValue(['fanOn', 'fan']),
              updatedAt: ac.updatedAt || data.updatedAt || null,
            };
          }
          return prev;
        });

        setError(null);
      } else {
        setError("Device document not found on server.");
      }
      setLoading(false);
    }, (err) => {
      console.error("Firestore device sub error:", err);
      setError("Device sync error: " + err.message);
      setLoading(false);
    });

    // Subscribe to sensor_readings subcollection for historical graphs
    const historyQuery = query(
      collection(db, 'devices', deviceId, 'sensor_readings'),
      orderBy('readingTime', 'desc'),
      limit(600)
    );

    const unsubscribeHistory = onSnapshot(historyQuery, (snapshot) => {
      const readings = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        
        const getVal = (keys: string[]): number => {
          // 1. Check root level
          for (const key of keys) {
            if (data[key] !== undefined) {
              const val = data[key];
              if (typeof val === 'number') return val;
              if (typeof val === 'string') {
                const parsed = parseFloat(val);
                if (!isNaN(parsed)) return parsed;
              }
            }
          }
          // 2. Check inside latestReading
          if (data.latestReading) {
            for (const key of keys) {
              if (data.latestReading[key] !== undefined) {
                const val = data.latestReading[key];
                if (typeof val === 'number') return val;
                if (typeof val === 'string') {
                  const parsed = parseFloat(val);
                  if (!isNaN(parsed)) return parsed;
                }
              }
            }
          }
          // 3. Check inside sensors
          if (data.sensors) {
            for (const key of keys) {
              if (data.sensors[key] !== undefined) {
                const val = data.sensors[key];
                if (typeof val === 'number') return val;
                if (typeof val === 'string') {
                  const parsed = parseFloat(val);
                  if (!isNaN(parsed)) return parsed;
                }
              }
            }
          }
          // 4. Check inside sensorData
          if (data.sensorData) {
            for (const key of keys) {
              if (data.sensorData[key] !== undefined) {
                const val = data.sensorData[key];
                if (typeof val === 'number') return val;
                if (typeof val === 'string') {
                  const parsed = parseFloat(val);
                  if (!isNaN(parsed)) return parsed;
                }
              }
            }
          }
          return 0;
        };

        return {
          temperature: getVal(['temperature', 'temp', 't']),
          humidity: getVal(['humidity', 'hum', 'h']),
          lightLevel: getVal(['lightLevel', 'lightIntensity', 'light', 'ldr', 'l']),
          soilMoisture: getVal(['soilMoisture', 'soil_moisture', 'moisture', 'soil', 'sm']),
          readingTime: data.reading_time || 
                       data.readingTime || 
                       (data.latestReading && data.latestReading.readingTime) || 
                       data.timestamp || 
                       data.time || 
                       data.createdAt || 
                       null,
        };
      });
      setHistoricalData(readings.reverse());
    }, (err) => {
      console.error("Firestore history sub error:", err);
    });

    return () => {
      unsubscribeDoc();
      unsubscribeHistory();
    };
  }, [deviceId]);

  // 5. Persistent Two-Way WebSocket Connection
  useEffect(() => {
    if (!ipAddress) {
      // Cleanup if IP address is removed
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    let isComponentActive = true;
    const wsUrl = `ws://${ipAddress}:8766`;

    const connectWebSocket = () => {
      if (!isComponentActive) return;

      console.log(`🔌 [WebSocket] Connecting to ${wsUrl}...`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isComponentActive) {
          ws.close();
          return;
        }
        console.log(`✅ [WebSocket] Connection established to ${wsUrl}`);
        console.log("baglantı gerceklestirildi");
        console.log("baglantı getceklestirildi");
      };

      ws.onmessage = (event) => {
        if (!isComponentActive) return;
        try {
          console.log(`📥 [WebSocket] Message received:`, event.data);
          const data = JSON.parse(event.data);
          const source = data.payload || data;
          
          // Only update if actuator properties exist in the message to avoid resetting state on empty heartbeats
          if (source.pumpOn !== undefined || source.growLightOn !== undefined || source.fanOn !== undefined) {
            setControls(prev => ({
              pumpOn: source.pumpOn !== undefined ? !!source.pumpOn : (prev?.pumpOn ?? false),
              growLightOn: source.growLightOn !== undefined ? !!source.growLightOn : (prev?.growLightOn ?? false),
              fanOn: source.fanOn !== undefined ? !!source.fanOn : (prev?.fanOn ?? false),
              updatedAt: new Date()
            }));
          }
        } catch (err) {
          console.warn(`❌ [WebSocket] Failed to parse message:`, err);
        }
      };

      ws.onclose = (e) => {
        if (!isComponentActive) return;
        console.log(`🔌 [WebSocket] Connection closed for ${wsUrl}. Reconnecting in 5 seconds...`, e.reason);
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (err) => {
        if (!isComponentActive) return;
        console.log(`❌ [WebSocket] Connection error for ${wsUrl}:`, err);
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      isComponentActive = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [ipAddress]);

  // Login Method
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Login failed.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign Up Method
  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Create user profile
      await setDoc(doc(db, 'users', cred.user.uid), {
        name,
        email,
        createdAt: new Date(),
      });
    } catch (err: any) {
      console.error("Sign up error:", err);
      setError(err.message || "Sign up failed.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout Method
  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Logout error:", err);
      setError(err.message || "Logout failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Send Password Reset Email Method
  const sendPasswordReset = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      
      // 1. Verify that user exists in Firestore users collection
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', cleanEmail), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error("This email address is not registered in our system.");
      }

      // 2. If exists, send password reset link
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err.message || "Failed to send password reset email.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Switch Active Device Method
  const selectDevice = useCallback(async (macAddress: string) => {
    try {
      await AsyncStorage.setItem('active_mac_address', macAddress);
      setDeviceId(macAddress);
      setError(null);
    } catch (err: any) {
      console.error("Failed to select device:", err);
      setError("Failed to select device: " + err.message);
    }
  }, []);

  // Add/Link Device Method
  const addDevice = useCallback(async (deviceName: string, macAddress: string) => {
    if (!user) {
      throw new Error("You must be logged in to add a device.");
    }
    const cleanMac = macAddress.trim().toUpperCase();
    const cleanName = deviceName.trim();

    if (!cleanMac) {
      throw new Error("MAC Address is required.");
    }
    
    const macRegex = /^([0-9A-F]{2}[:]){5}([0-9A-F]{2})$/;
    if (!macRegex.test(cleanMac)) {
      throw new Error("Invalid MAC Address format. Please use XX:XX:XX:XX:XX:XX format.");
    }

    if (!cleanName) {
      throw new Error("Device Name is required.");
    }

    try {
      setLoading(true);
      const docRefUpper = doc(db, 'devices', cleanMac);
      const docRefLower = doc(db, 'devices', cleanMac.toLowerCase());
      
      const [snapUpper, snapLower] = await Promise.all([
        getDoc(docRefUpper),
        getDoc(docRefLower)
      ]);

      if (!snapUpper.exists() && !snapLower.exists()) {
        throw new Error("This device is not defined. Please check the MAC address.");
      }

      if (snapUpper.exists()) {
        const existingData = snapUpper.data();
        if (existingData.ownerId && existingData.ownerId !== user.uid) {
          throw new Error("This device is already registered to another user.");
        }
      }

      if (snapLower.exists()) {
        const existingData = snapLower.data();
        if (existingData.ownerId && existingData.ownerId !== user.uid) {
          throw new Error("This device is already registered to another user.");
        }
      }

      await setDoc(docRefUpper, {
        ownerId: user.uid,
        deviceName: cleanName,
        macAddress: cleanMac,
        createdAt: snapUpper.exists() ? (snapUpper.data().createdAt || new Date()) : new Date(),
      }, { merge: true });

      console.log(`✅ Device ${cleanMac} successfully linked to owner ${user.uid}`);
      
      // Auto-select the newly added device
      await AsyncStorage.setItem('active_mac_address', cleanMac);
      setDeviceId(cleanMac);

      setError(null);
    } catch (err: any) {
      console.error("Error in addDevice:", err);
      setError(err.message || "Failed to add device.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Remove/Unlink Device Method
  const removeDevice = useCallback(async (macAddress: string) => {
    if (!user) {
      throw new Error("You must be logged in to remove a device.");
    }
    const cleanMac = macAddress.trim().toUpperCase();
    if (!cleanMac) {
      throw new Error("MAC Address is required.");
    }

    try {
      setLoading(true);
      const docRef = doc(db, 'devices', cleanMac);
      
      // Update the document to sever user ownership
      await updateDoc(docRef, {
        ownerId: null
      });

      console.log(`✅ Device ${cleanMac} successfully unlinked from owner ${user.uid}`);

      // If the unlinked device was currently selected, clear local storage active state
      if (deviceId === cleanMac) {
        await AsyncStorage.removeItem('active_mac_address');
      }
      setError(null);
    } catch (err: any) {
      console.error("Error in removeDevice:", err);
      setError(err.message || "Failed to remove device.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, deviceId]);

  // Update Actuators via WebSocket only
  const updateControl = useCallback(async (key: keyof ControlData, value: boolean) => {
    if (!deviceId) return;

    // 1. Calculate the next control state incorporating the toggled value
    const newControls = {
      pumpOn: key === 'pumpOn' ? value : (controls?.pumpOn ?? false),
      growLightOn: key === 'growLightOn' ? value : (controls?.growLightOn ?? false),
      fanOn: key === 'fanOn' ? value : (controls?.fanOn ?? false),
    };

    // 2. Connect and send via WebSocket if ipAddress is available (Firestore DB is ignored/skipped)
    if (ipAddress) {
      const payload = {
        topic: `actuator_data/${ipAddress}`,
        payload: newControls,
        ...newControls
      };

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify(payload));
          console.log(`✅ WebSocket control sent successfully via persistent socket to ws://${ipAddress}:8766`);
          setControls(newControls);
        } catch (wsErr) {
          console.warn(`❌ Failed to send via persistent WebSocket:`, wsErr);
        }
      } else {
        // Fallback: socket is closed or reconnecting, open a quick temp one to send this command
        const wsUrl = `ws://${ipAddress}:8766`;
        console.warn(`⚠️ Persistent WebSocket not open (readyState: ${wsRef.current ? wsRef.current.readyState : 'null'}). Using fallback connection...`);
        try {
          const tempWs = new WebSocket(wsUrl);
          tempWs.onopen = () => {
            tempWs.send(JSON.stringify(payload));
            tempWs.close();
            console.log(`✅ WebSocket control sent successfully via fallback temp connection`);
            setControls(newControls);
          };
          tempWs.onerror = (err) => {
            console.warn(`❌ Fallback WebSocket connection failed:`, err);
          };
        } catch (fallbackErr) {
          console.warn(`❌ Fallback WebSocket trigger failed:`, fallbackErr);
        }
      }
    } else {
      console.warn(`⚠️ WebSocket command not sent: No IP address available for device ${deviceId}`);
    }
  }, [deviceId, ipAddress, controls]);

  const value = useMemo(() => ({
    user,
    userDoc,
    deviceId,
    ipAddress,
    devicesList,
    sensors,
    controls,
    historicalData,
    login,
    signUp,
    logout,
    sendPasswordReset,
    selectDevice,
    addDevice,
    removeDevice,
    updateControl,
    loading,
    error
  }), [
    user,
    userDoc,
    deviceId,
    ipAddress,
    devicesList,
    sensors,
    controls,
    historicalData,
    login,
    signUp,
    logout,
    sendPasswordReset,
    selectDevice,
    addDevice,
    removeDevice,
    updateControl,
    loading,
    error
  ]);

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
