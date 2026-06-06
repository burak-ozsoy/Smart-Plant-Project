import sys
import paho.mqtt.client as mqtt
import os
import json
import threading
import time
# import asyncio    # WebSocket devre dışı
# import websockets  # WebSocket devre dışı
#from dotenv import load_dotenv , find_dotenv
from uuid import getnode
from firebase.send_to_firestore import FirebaseClient

class MQTT_Broker:
   
    def __init__(self, mode="BOTH"):

        load_dotenv(find_dotenv())

        self.device = ':'.join(['{:02x}'.format((getnode() >> ele) & 0xff)
                                for ele in range(0, 8*6, 8)][::-1])

        self.lock = threading.RLock()
        self.tag = "[mqtt_broker.py]"
        self.root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        os.makedirs(os.path.join(self.root_dir, "json_from_esp32"), exist_ok=True)
        os.makedirs(os.path.join(self.root_dir, "json_to_esp32"), exist_ok=True)
        os.makedirs(os.path.join(self.root_dir, "logs", "json_logs_from_esp32"), exist_ok=True)
        os.makedirs(os.path.join(self.root_dir, "logs", "json_logs_from_web"), exist_ok=True)

        self.mqtt_client = mqtt.Client()
        self.mqtt_host = "127.0.0.1"
        self.mqtt_port = 1883

        if not self.mqtt_host:
            raise ValueError(f"{self.tag} MQTT_HOST is not set. Please define it in the .env file.")

        self.firebase_client = FirebaseClient()

        self.sensor_data = None
        self.actuator_data = None

        self.mode = mode
        self._listening = self.mode in ("LISTENING" , "BOTH")
        self._sending = self.mode in ("SENDING" , "BOTH")

        self.mqtt_client.on_connect = self.on_connect
        self.mqtt_client.on_message = self.on_message

        self.mqtt_client.connect(self.mqtt_host, self.mqtt_port)
        self.mqtt_client.loop_start()

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"{self.tag}: Connected to MQTT broker {self.mqtt_host}:{self.mqtt_port}")
            if self._listening:
                self.mqtt_client.subscribe("sensor_data_from/#")
        else:
            error_codes = {
                1: "incorrect protocol version",
                2: "invalid client id",
                3: "unavailable server",
                4: "bad username or password",
                5: "not being authorized",
            }
            if(rc in error_codes.keys()):
                print(f"{self.tag}: Connection failed due to {error_codes[rc]}")
            else:
                print(f"{self.tag}: Connection failed due to unknown error")

    def on_message(self, client, userdata, message):
        try:
            self.is_received_new_json(client, userdata, message)
        except Exception as e:
            print(f"{self.tag}: Error - {e} in on_message method")

    def is_received_new_json(self, client, userdata, message) -> bool:
        if not self._listening:
            return False

        topic = message.topic
        raw = message.payload.decode("utf-8", errors="replace")
        if topic.startswith("sensor_data_from/"):
            try:
                parsed = json.loads(raw)
            except Exception as e:
                print(f"{self.tag}: JSON parse error - {e} on is_received_new_json method")
                return False

            with self.lock:
                parsed["device"] = self.device
                parsed["received_at"] = time.strftime("%Y-%m-%d - %H-%M-%S")
                self.sensor_data = parsed
                is_new = self.different_from_latest_json("ESP32")
                if is_new:
                    try:
                        res = self.firebase_client.send_sensor_data_to_firestore(parsed)
                        if res.get('ok'):
                            print(f"{self.tag}: The data is transferred to Firestore. ID: {res.get('id')}")
                        else:
                            print(f"{self.tag} Error: {res.get('error')}")
                    except Exception as e:
                        print(f"{self.tag}: Firebase send failed - {e} on is_received_new_json method"); time.sleep(10);
                    self.log_json("ESP32")
                    return True
                else:
                    self.sensor_data = None
                    return False
        else:
            return False
    
    def different_from_latest_json(self , publisher) -> bool:
        dir_path = None
        check = None
        if publisher == "ESP32":
            dir_path = os.path.join(self.root_dir , "json_from_esp32")
            check = self.sensor_data
        elif publisher == "RASPBERRY":
            dir_path = os.path.join(self.root_dir , "json_to_esp32")
            check = self.actuator_data
        else:
            return False
        
        if check is None:
            return False

        os.makedirs(dir_path, exist_ok=True)
        latest_path = os.path.join(dir_path, "latest.json")

        # Exclude volatile metadata fields before comparing
        dont_check = {"generated_at", "ts", "iso", "device"}
        def _strip(d):
            return {k: v for k, v in d.items() if k not in dont_check} if isinstance(d, dict) else d

        with self.lock:
            latest_json = None
            if os.path.exists(latest_path):
                try:
                    with open(latest_path, "r", encoding="utf-8") as j:
                        latest_json = json.load(j)
                except Exception:
                    print(f"{self.tag}: Could not able to read latest.json on directory {latest_path}")
        
            if _strip(latest_json) != _strip(check):
                try:
                    with open(latest_path, "w", encoding="utf-8") as j:
                        json.dump(check, j, ensure_ascii=False, indent=4)
                    return True
                except Exception:
                    print(f"{self.tag}: Could not able to write to latest.json")
                    return False
            else:
                return False
    
    def log_json(self , publisher , data=None) -> bool:
        
        if publisher == "ESP32":
            logs_dir = os.path.join(self.root_dir , "logs" , "json_logs_from_esp32")
            json_to_write = data if data is not None else self.sensor_data
        elif publisher == "RASPBERRY":
            logs_dir = os.path.join(self.root_dir , "logs" , "json_logs_from_web")
            json_to_write = data if data is not None else self.actuator_data
        else:
            return False

        if json_to_write is None:
            return False

        timestamp = time.strftime("%H_%M_%S")
        date = time.strftime("%d_%b_%Y")
        if not os.path.exists(os.path.join(logs_dir , date)):
            os.makedirs(os.path.join(logs_dir , date), exist_ok=True)
        filename = f"{timestamp}.json"
        filepath = os.path.join(logs_dir, date, filename)
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(json_to_write, f, ensure_ascii=False, indent=4)
            return True
        except Exception:
            return False
    
    
    # --- WebSocket & web publish devre dışı ---
    # def publish_data_from_website(self, payload, topic="actuator_data"):
    #     if not self._sending:
    #         print(f"{self.tag}: Sending mode is disabled")
    #         return None
    #     if isinstance(payload, (dict, list)):
    #         json_to_esp32 = json.dumps(payload)
    #     elif isinstance(payload , str):
    #         try:
    #             json.loads(payload)
    #             json_to_esp32 = payload
    #         except Exception:
    #             return None
    #     else:
    #         print(f"{self.tag}: Unsupported payload type {type(payload)}")
    #         return None
    #     res = self.mqtt_client.publish(topic , json_to_esp32)
    #     print(f"{self.tag}: Published to {topic}")
    #     with self.lock:
    #         self.actuator_data = json.loads(json_to_esp32)
    #         self.different_from_latest_json("RASPBERRY")
    #         self.log_json("RASPBERRY", self.actuator_data)
    #         self.actuator_data = None
    #     return res

    # def start_websocket_server(self, host, port):
    #     async def handler(ws):
    #         print(f"{self.tag}: WS client connected.")
    #         try:
    #             async for msg in ws:
    #                 try:
    #                     obj = json.loads(msg)
    #                     topic = obj.get("topic", "actuator_data")
    #                     payload = obj.get("payload", obj)
    #                 except Exception:
    #                     topic = "actuator_data"
    #                     payload = msg
    #                 self.publish_data_from_website(payload, topic=topic)
    #                 try:
    #                     await ws.send(json.dumps({"status": "published", "topic": topic}))
    #                 except Exception:
    #                     pass
    #         except websockets.exceptions.ConnectionClosed as e:
    #             print(f"{self.tag}: WS client disconnected - {e}")
    #     def run_ws():
    #         loop = asyncio.new_event_loop()
    #         asyncio.set_event_loop(loop)
    #         self._ws_loop = loop
    #         start_server = websockets.serve(handler, host, port)
    #         loop.run_until_complete(start_server)
    #         print(f"{self.tag}: WebSocket server started on ws://{host}:{port}")
    #         loop.run_forever()
    #     t = threading.Thread(target=run_ws, daemon=True)
    #     t.start()
    #     return t
    # --- WebSocket & web publish devre dışı ---

    def run(self):
        
        # --- WebSocket devre dışı ---
        # ws_host = os.getenv("WS_HOST")
        # ws_port = int(os.getenv("WS_PORT" , 8765))
        # self.start_websocket_server(host=ws_host, port=ws_port)
        # --- WebSocket devre dışı ---

        print(f"{self.tag}: MQTT broker helper running. Subscribed to 'sensor_data_from/#'. Ready to publish website messages to 'actuator_data'.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print(f"{self.tag}: Shutting down...")
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()


if __name__ == "__main__":

    broker = MQTT_Broker()
    broker.run()