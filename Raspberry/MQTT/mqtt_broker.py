import sys
import paho.mqtt.client as mqtt
import os
import json
import threading
import time
import asyncio
import socket
import subprocess
import websockets
from dotenv import load_dotenv , find_dotenv
from uuid import getnode
from Raspberry.firebase.send_to_firebase import FirebaseClient

class MQTT_Broker:
   
    def __init__(self, mode="BOTH"):

        load_dotenv(find_dotenv())

        self.__mac_addr = ':'.join(['{:02X}'.format((getnode() >> ele) & 0xff)
                                for ele in range(0, 8*6, 8)][::-1])
        self._lock = threading.RLock()
        self.tag = "[mqtt_broker.py]"
        self._raspberry_ip = self._get_local_ip()
        self._tailscale_ip = self._get_tailscale_ip()
        self._root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        os.makedirs(os.path.join(self._root_dir, "json_from_esp32"), exist_ok=True)
        os.makedirs(os.path.join(self._root_dir, "json_to_esp32"), exist_ok=True)
        os.makedirs(os.path.join(self._root_dir, "logs", "json_logs_from_esp32"), exist_ok=True)
        os.makedirs(os.path.join(self._root_dir, "logs", "json_logs_from_web"), exist_ok=True)

        self._mqtt_client = mqtt.Client()
        self._mqtt_host = "127.0.0.1"
        self._mqtt_port = 1883
        ws_host = os.getenv("WS_HOST", "").strip()
        self._ws_bind_host = os.getenv("WS_BIND_HOST", "0.0.0.0").strip() or "0.0.0.0"
        self._ws_host = ws_host if ws_host else self._raspberry_ip
        self._ws_port = int(os.getenv("WS_PORT", "8766"))
        self._ws_start_error = None

        if not self._mqtt_host:
            raise ValueError(f"{self.tag} MQTT_HOST is not set. Please define it in the .env file.")

        self._firebase_client = FirebaseClient()

        self._sensor_data = None
        self._actuator_data = None

        self._mode = mode
        self._listening = self._mode in ("LISTENING" , "BOTH")
        self._sending = self._mode in ("SENDING" , "BOTH")

        self._mqtt_client.on_connect = self.on_connect
        self._mqtt_client.on_message = self.on_message

        self._mqtt_client.connect(self._mqtt_host, self._mqtt_port)
        self._mqtt_client.loop_start()

        self._sensor_buffer = []
        self._avg_interval = 60
        self._start_avg_thread()

    def _get_local_ip(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
        except Exception:
            return "127.0.0.1"
        finally:
            sock.close()

    def _get_tailscale_ip(self):
        try:
            result = subprocess.run(
                ["tailscale", "ip", "-4"],
                capture_output=True, text=True, timeout=3
            )
            ip = result.stdout.strip()
            if ip:
                return ip
        except Exception:
            pass
        # Fallback: scan for 100.64.x.x – 100.127.x.x (Tailscale CGNAT range)
        try:
            for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
                ip = info[4][0]
                parts = ip.split(".")
                if len(parts) == 4 and int(parts[0]) == 100 and 64 <= int(parts[1]) <= 127:
                    print(f"{self.tag}: Tailscale IP detected (fallback): {ip}")
                    return ip
        except Exception:
            pass
        print(f"{self.tag}: No Tailscale IP found, remote access via Tailscale won't be available")
        return None

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"{self.tag}: Connected to MQTT broker {self._mqtt_host}:{self._mqtt_port}")
            if self._listening:
                self._mqtt_client.subscribe("sensor_data_from/#")
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

            with self._lock:
                if "macAddress" not in parsed:
                    parsed["macAddress"] = self.__mac_addr

                # Refresh IPs each message so network changes (hotspot toggle etc.) are reflected immediately.
                self._raspberry_ip = self._get_local_ip()
                ts_ip = self._get_tailscale_ip()
                if ts_ip:
                    self._tailscale_ip = ts_ip
                parsed["ipAddress"] = self._raspberry_ip
                parsed["gatewayIpAddress"] = self._raspberry_ip
                if self._tailscale_ip:
                    parsed["tailscaleIp"] = self._tailscale_ip
                parsed["received_at"] = time.strftime("%Y-%m-%d - %H-%M-%S")
                self._sensor_data = parsed
                self._sensor_buffer.append(parsed.copy())
                is_new = self.different_from_latest_json("ESP32")
                if is_new:
                    self.log_json("ESP32")
                    return True
                else:
                    self._sensor_data = None
                    return False
        else:
            return False
    
    def _start_avg_thread(self):
        def _loop():
            while True:
                time.sleep(self._avg_interval)
                self._flush_average()
        t = threading.Thread(target=_loop, daemon=True)
        t.start()

    def _calculate_average(self, buffer):
        sensor_sums = {}
        sensor_counts = {}
        sensor_meta = {}

        for entry in buffer:
            for item in entry.get("sensor_data", []):
                name = item.get("data")
                value = item.get("value")
                if name and value is not None:
                    try:
                        sensor_sums[name] = sensor_sums.get(name, 0.0) + float(value)
                        sensor_counts[name] = sensor_counts.get(name, 0) + 1
                        sensor_meta[name] = item
                    except (ValueError, TypeError):
                        pass

        result = buffer[-1].copy()
        result["sensor_data"] = [
            {**sensor_meta[name], "value": str(round(sensor_sums[name] / sensor_counts[name], 2))}
            for name in sensor_sums
        ]
        result["received_at"] = time.strftime("%Y-%m-%d - %H-%M-%S")
        return result

    def _refresh_ips(self):
        fresh_local = self._get_local_ip()
        if fresh_local != self._raspberry_ip:
            print(f"{self.tag}: Local IP changed: {self._raspberry_ip} → {fresh_local}")
            self._raspberry_ip = fresh_local
        fresh_tailscale = self._get_tailscale_ip()
        if fresh_tailscale != self._tailscale_ip:
            print(f"{self.tag}: Tailscale IP changed: {self._tailscale_ip} → {fresh_tailscale}")
            self._tailscale_ip = fresh_tailscale

    def _flush_average(self):
        self._refresh_ips()

        with self._lock:
            if not self._sensor_buffer:
                return
            sample_count = len(self._sensor_buffer)
            averaged = self._calculate_average(self._sensor_buffer)
            self._sensor_buffer.clear()

        averaged["ipAddress"] = self._raspberry_ip
        averaged["gatewayIpAddress"] = self._raspberry_ip
        if self._tailscale_ip:
            averaged["tailscaleIp"] = self._tailscale_ip

        try:
            res = self._firebase_client.send_data_to_firebase(averaged, source="esp32")
            if res.get('ok'):
                print(f"{self.tag}: Averaged data ({sample_count} samples) sent to Firestore. ID: {res.get('id')}")
            else:
                print(f"{self.tag}: Firestore error - {res.get('error')}")
        except Exception as e:
            print(f"{self.tag}: Firebase send failed - {e}")

    def different_from_latest_json(self , publisher) -> bool:
        dir_path = None
        check = None
        if publisher == "ESP32":
            dir_path = os.path.join(self._root_dir , "json_from_esp32")
            check = self._sensor_data
        elif publisher == "RASPBERRY":
            dir_path = os.path.join(self._root_dir , "json_to_esp32")
            check = self._actuator_data
        else:
            return False
        
        if check is None:
            return False

        os.makedirs(dir_path, exist_ok=True)
        latest_path = os.path.join(dir_path, "latest.json")

        dont_check = {"generated_at", "ts", "iso", "macAddress"}
        def _strip(d):
            return {k: v for k, v in d.items() if k not in dont_check} if isinstance(d, dict) else d

        with self._lock:
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
            logs_dir = os.path.join(self._root_dir , "logs" , "json_logs_from_esp32")
            json_to_write = data if data is not None else self._sensor_data
        elif publisher == "RASPBERRY":
            logs_dir = os.path.join(self._root_dir , "logs" , "json_logs_from_web")
            json_to_write = data if data is not None else self._actuator_data
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
    
    def publish_data_to_esp32(self, payload, topic):
        if not self._sending:
            print(f"{self.tag}: Sending mode is disabled")
            return False

        if not topic.startswith("actuator_data/"):
            print(f"{self.tag}: Invalid topic '{topic}'")
            return False

        if not isinstance(payload, dict):
            print(f"{self.tag}: Unsupported payload type {type(payload)}")
            return False

        json_to_esp32 = json.dumps(payload, ensure_ascii=False)
        res = self._mqtt_client.publish(topic, json_to_esp32)

        if res.rc != mqtt.MQTT_ERR_SUCCESS:
            print(f"{self.tag}: Failed to publish actuator data to '{topic}'")
            return False

        print(f"{self.tag}: Published actuator command to '{topic}'")
        with self._lock:
            self._actuator_data = {
                "topic": topic,
                "payload": payload,
                "received_at": time.strftime("%Y-%m-%d - %H-%M-%S"),
            }
            self.different_from_latest_json("RASPBERRY")
            self.log_json("RASPBERRY", self._actuator_data)
        return True

    async def _ws_handler(self, websocket, path=None):
        print(f"{self.tag}: WS client connected")
        try:
            async for msg in websocket:
                try:
                    obj = json.loads(msg)
                    topic = obj.get("topic")
                    payload = obj.get("payload")
                except Exception:
                    await websocket.send(json.dumps({"ok": False, "error": "invalid JSON"}))
                    continue

                if not topic or not isinstance(payload, dict):
                    await websocket.send(json.dumps({"ok": False, "error": "topic and payload(dict) are required"}))
                    continue

                ok = self.publish_data_to_esp32(payload, topic)
                await websocket.send(json.dumps({"ok": ok, "topic": topic}))
        except websockets.exceptions.ConnectionClosed:
            print(f"{self.tag}: WS client disconnected")

    def start_websocket_server(self, bind_host, port):
        async def _serve_forever():
            async with websockets.serve(
                self._ws_handler,
                bind_host,
                port,
                compression=None,
                ping_interval=20,
                ping_timeout=20,
            ):
                print(f"{self.tag}: WebSocket server started on ws://{self._ws_host}:{port} (bind: {bind_host})")
                await asyncio.Future()

        def run_ws():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(_serve_forever())
            except OSError as e:
                self._ws_start_error = e
                print(f"{self.tag}: WebSocket bind failed on {bind_host}:{port} - {e}")
            except Exception as e:
                self._ws_start_error = e
                print(f"{self.tag}: WebSocket server failed - {e}")
            finally:
                loop.close()

        t = threading.Thread(target=run_ws, daemon=True)
        t.start()
        return t

    def run(self):
        self.start_websocket_server(bind_host=self._ws_bind_host, port=self._ws_port)

        time.sleep(0.3)
        if self._ws_start_error is not None:
            self._mqtt_client.loop_stop()
            self._mqtt_client.disconnect()
            return

        print(f"{self.tag}: MQTT broker helper running. Subscribed to 'sensor_data_from/#'. Ready to publish website messages to 'actuator_data/{self._raspberry_ip}'.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print(f"{self.tag}: Shutting down...")
            self._mqtt_client.loop_stop()
            self._mqtt_client.disconnect()


if __name__ == "__main__":

    broker = MQTT_Broker()
    broker.run()