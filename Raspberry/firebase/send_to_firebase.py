import os
import time
from typing import Any, Dict, Literal, Optional
from dotenv import load_dotenv, find_dotenv
from google.cloud import firestore

class FirebaseClient:

    def __init__(
        self,
        project: Optional[str] = None,
        credentials_path: Optional[str] = None,
        timeout: int = 5,
    ):
        load_dotenv(find_dotenv())
        self.tag = "[send_to_firebase.py]"
        credentials_path = credentials_path or os.getenv("FIRESTORE_CREDENTIALS")
        project = project or os.getenv("FIRESTORE_PROJECT_ID")
        self.timeout = timeout
        self.__devices_collection = os.getenv("COLLECTION1", "devices")

        if credentials_path:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

        if project is not None:
            self.client = firestore.Client(project=project)
        else:
            self.client = firestore.Client()

    def __check_if_exists(self, to_check: Any) -> bool:
        return True if to_check is not None else False

    def __check_if_any_val_is_None(self, to_check: Any) -> tuple[bool , Any]:
        for val in to_check:
            if to_check[val] is None:
                return (True , val)
        return (False , None)

    def __resolve_device_ref(self, data: Dict[str, Any], ts: str):
        mac_addr = data.get("macAddress") if "macAddress" in data else None
        if not self.__check_if_exists(mac_addr):
            return None, {"ok": False, "error": f"{self.tag}: macAddress is required"}

        ip_addr = data.get("ipAddress") if "ipAddress" in data else None
        if not self.__check_if_exists(ip_addr):
            return None, {"ok": False, "error": f"{self.tag}: ipAddress is required"}

        device_ref = self.client.collection(self.__devices_collection).document(mac_addr)
        snapshot = device_ref.get(timeout=self.timeout)

        updates = {
            "macAddress": mac_addr,
            "ipAddress": ip_addr,
            "isActive": True,
            "lastSeen": ts,
        }

        tailscale_ip = data.get("tailscaleIp") if "tailscaleIp" in data else None
        if tailscale_ip:
            updates["tailscaleIp"] = tailscale_ip

        if not snapshot.exists:
            updates["createdAt"] = ts

        device_ref.set(updates, merge=True, timeout=self.timeout)
        return device_ref, {"ok": True, "id": mac_addr}

    def __extract_sensor_data(self, data: Dict[str, Any] , ts: str) -> Optional[Dict[str, Any]]:
        sensor_data_array = data["sensor_data"] if "sensor_data" in data else None

        if not self.__check_if_exists(sensor_data_array) or len(sensor_data_array) != 4:
            return None

        values = {}
        for sensor_data in sensor_data_array:
            values[sensor_data["data"]] = sensor_data["value"]

        sensor_data = {
            "temperature": values["Temperature"],
            "humidity": values["Humidity"],
            "soilMoisture": values["Soil Moisture"],
            "lightLevel": values["Light Level"],
            "readingTime": data.get("received_at") or ts,
        }

        check_sensor_data = self.__check_if_any_val_is_None(sensor_data)
        if check_sensor_data[0]:
            return None
            
        return sensor_data

    def __extract_actuator_states(self, data: Dict[str, Any], ts: str) -> Dict[str, Any]:
        states = {
            "pumpOn": data.get("pumpOn") if "pumpOn" in data else None,
            "growLightOn": data.get("growLightOn") if "growLightOn" in data else None,
            "fanOn": data.get("fanOn") if "fanOn" in data else None,
            "updatedAt": ts,
        }
        return states

    def __update_device_state(self, device_ref, sensor_data: Optional[Dict[str, Any]], actuator_state: Dict[str, Any] , ts) -> Optional[str]:
        updates: Dict[str, Any] = {
            "lastSeen": ts,
            "isActive": True,
            "actuatorState": actuator_state,
        }
        if self.__check_if_exists(sensor_data):
            updates["latestReading"] = sensor_data

        try:
            device_ref.set(updates, merge=True, timeout=self.timeout)
            return None
        except Exception as e:
            return str(e)

    def __store_sensor_data(self, device_ref, sensor_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            doc_ref = device_ref.collection("sensor_readings").document()
            doc_ref.set(sensor_data, timeout=self.timeout)
            return {"ok": True, "id": doc_ref.id}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def send_data_to_firebase(self, data: Dict[str, Any], source: Literal["esp32", "camera"]) -> Dict[str, Any]:
        try:
            if not isinstance(data, dict):
                return {"ok": False, "error": "data must be a dictionary"}

            if source not in ("esp32", "camera"):
                return {"ok": False, "error": f"unsupported source '{source}'"}

            ts = str(time.strftime("%Y-%m-%d - %H-%M-%S"))
            device_ref, resolution = self.__resolve_device_ref(data, ts)
            if not resolution.get("ok"):
                return resolution
            
            sensor_data = self.__extract_sensor_data(data, ts)
            actuator_states = self.__extract_actuator_states(data, ts)

            update_error = self.__update_device_state(device_ref, sensor_data, actuator_states , ts)
            if update_error:
                return {"ok": False, "error": update_error}

            reading_id = None
            if sensor_data is not None:
                write_result = self.__store_sensor_data(device_ref, sensor_data)
                if not write_result.get("ok"):
                    return write_result
                reading_id = write_result.get("id")

            return {"ok": True, "id": reading_id, "deviceId": resolution.get("id")}
        except Exception as e:
            return {"ok": False, "error": str(e)}