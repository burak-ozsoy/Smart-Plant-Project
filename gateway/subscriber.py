import json
import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883
TOPIC = "plant/plant1/sensors"

def on_connect(client, userdata, flags, rc):
    print("MQTT baglandi. Kod:", rc)
    client.subscribe(TOPIC)
    print("Dinlenen topic:", TOPIC)

def on_message(client, userdata, msg):
    print("\nYeni veri alindi:")

    payload = msg.payload.decode()
    data = json.loads(payload)

    print(json.dumps(data, indent=2))

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

client.connect(BROKER, PORT, 60)
client.loop_forever()