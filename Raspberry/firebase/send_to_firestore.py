# ...existing code...
import os
import time
import datetime
from typing import Any, Dict, Optional
from dotenv import load_dotenv, find_dotenv
from google.cloud import firestore

class FirebaseClient:

    def __init__(
        self,
        project: Optional[str] = None,
        credentials_path: Optional[str] = None,
        base_path: Optional[str] = None,
        timeout: int = 5,
    ):
        self.tag = "send_to_firestore.py"
        load_dotenv(find_dotenv())
        credentials_path = os.getenv("FIRESTORE_CREDENTIALS")
        project = project or os.getenv("FIRESTORE_PROJECT_ID")
        self.base_path = (base_path or os.getenv("FIRESTORE_BASE_PATH") or "esp32").strip("/")
        self.timeout = timeout

        if credentials_path:
            # set environment variable so google client kullanabilir
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

        # init client (project optional)
        if project:
            self.client = firestore.Client(project=project)
        else:
            self.client = firestore.Client()

    def _collection(self) -> "firestore.CollectionReference":
        # top-level collection to store readings
        return self.client.collection(self.base_path)

    def send_sensor_data_to_firestore(self, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if not isinstance(data, dict):
                return {"ok": False, "error": "data must be a dict"}

            timestamp = time.time()

            # ESP32 sensor readings are inside the "sensor_data" array in a format of:
            # [{"data": "Temperature", "value": "25.3", "type": "float", "unit": "C"}, ...]
            sensor_array = data.get("sensor_data", [])
            if isinstance(sensor_array, list):
                for item in sensor_array:
                    sensor_name = item.get("data")
                    sensor_value = item.get("value")
                    if sensor_name and sensor_value is not None:
                        self.set_last_value(sensor_name, sensor_value, timestamp)

            # Actuator states
            for key in ("fanOn", "growLightOn", "pumpOn"):
                if key in data:
                    self.set_last_value(key, data[key], timestamp)

            payload = data.copy()
            payload["ts"] = int(timestamp)
            payload["iso"] = datetime.datetime.fromtimestamp(timestamp).isoformat() + "Z"

            col = self._collection()
            doc_ref = col.add(payload, timeout=self.timeout)
            doc_id = doc_ref[1].id if doc_ref else None

            return {"ok": True, "id": doc_id}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def set_last_value(self, sensor: str, value: Any, timestamp: Optional[float] = None) -> Dict[str, Any]:
        
        try:
            if timestamp is None:
                timestamp = time.time()
            payload = {"value": value, "ts": int(timestamp), "iso": datetime.datetime.fromtimestamp(timestamp).isoformat() + "Z"}
            last_col = self.client.collection(f"{self.base_path}_last")
            last_col.document(sensor).set(payload, timeout=self.timeout)
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "error": str(e)}