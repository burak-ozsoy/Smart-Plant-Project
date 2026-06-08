import os
import time
import datetime
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
        credentials_path = os.getenv("FIRESTORE_CREDENTIALS")
        project = project or os.getenv("FIRESTORE_PROJECT_ID")
        self.timeout = timeout

        if credentials_path:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

        if project:
            self.client = firestore.Client(project=project)
        else:
            self.client = firestore.Client()

    def send_data_to_firebase(self, data: Dict[str, Any], source: Literal["esp32", "camera"]) -> Dict[str, Any]:
        try:
            if not isinstance(data, dict):
                return {"ok": False, "error": "data must be a dict"}

            timestamp = time.time()

            if source == "esp32":
                sensor_array = data.get("sensor_data", [])
                if isinstance(sensor_array, list):
                    for item in sensor_array:
                        sensor_name = item.get("data")
                        sensor_value = item.get("value")
                        if sensor_name and sensor_value is not None:
                            self.set_last_value(sensor_name, sensor_value, timestamp, collection_prefix=source)
                for key in ("fanOn", "growLightOn", "pumpOn"):
                    if key in data:
                        self.set_last_value(key, data[key], timestamp, collection_prefix=source)

            elif source == "camera":
                skip_keys = {"ts", "iso"}
                for key, value in data.items():
                    if key not in skip_keys and value is not None:
                        self.set_last_value(key, value, timestamp, collection_prefix=source)

            payload = data.copy()
            payload["ts"] = int(timestamp)
            payload["iso"] = datetime.datetime.fromtimestamp(timestamp).isoformat() + "Z"

            col = self.client.collection(source)
            doc_ref = col.add(payload, timeout=self.timeout)
            doc_id = doc_ref[1].id if doc_ref else None

            return {"ok": True, "id": doc_id}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def set_last_value(self, sensor: str, value: Any, timestamp: Optional[float] = None, collection_prefix: str = "") -> Dict[str, Any]:
        
        try:
            if timestamp is None:
                timestamp = time.time()
            payload = {"value": value, "ts": int(timestamp), "iso": datetime.datetime.fromtimestamp(timestamp).isoformat() + "Z"}
            last_col = self.client.collection(f"{collection_prefix}_last")
            last_col.document(sensor).set(payload, timeout=self.timeout)
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "error": str(e)}