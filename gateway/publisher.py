import json
import random
import time
from datetime import datetime
import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883
TOPIC = "plant/plant1/sensors"

def generate_fake_sensor_data():
    return {
        "plant_id": "plant_1",
        "temperature": round(random.uniform(20, 30), 1),
        "humidity": round(random.uniform(40, 70), 1),
        "soil_moisture": random.randint(30, 80),
        "light_level": random.randint(200, 900),
        "timestamp": datetime.now().isoformat()
    }

client = mqtt.Client()
client.connect(BROKER, PORT, 60)

while True:
    data = generate_fake_sensor_data()
    payload = json.dumps(data)

    client.publish(TOPIC, payload)

    print("\nVeri gonderildi:")
    print(payload)

    time.sleep(5)