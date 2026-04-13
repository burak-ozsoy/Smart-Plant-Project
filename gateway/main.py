import json
import random
from datetime import datetime
from pathlib import Path

DATA_FILE = Path("../data/latest_reading.json")

def generate_fake_sensor_data():
    return {
        "plant_id": "plant_1",
        "temperature": round(random.uniform(20, 30), 1),
        "humidity": round(random.uniform(40, 70), 1),
        "soil_moisture": random.randint(30, 80),
        "light_level": random.randint(200, 900),
        "timestamp": datetime.now().isoformat()
    }

def save_data(data):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def main():
    sensor_data = generate_fake_sensor_data()
    print("Yeni veri alındı:")
    print(json.dumps(sensor_data, indent=2, ensure_ascii=False))
    save_data(sensor_data)
    print("\nVeri kaydedildi:", DATA_FILE)

if __name__ == "__main__":
    main()