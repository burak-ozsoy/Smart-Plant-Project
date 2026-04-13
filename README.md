# Smart Plant MQTT Setup (Phase 1)

## Kurulum

1. Python 3 yüklü olmalı
2. Gerekli paket:

```bash
pip install paho-mqtt
```

3. Mosquitto indir ve kur:
   https://mosquitto.org/download/

---

## Çalıştırma

### 1. MQTT Broker başlat

```bash
mosquitto -v
```

---

### 2. Subscriber (Gateway)

```bash
cd gateway
python subscriber.py
```

---

### 3. Publisher (Fake Sensor)

Yeni terminal aç:

```bash
cd gateway
python publisher.py
```

---

## Beklenen

* Her 5 saniyede bir veri gönderilir
* Subscriber terminalinde görünür
* `data/` klasöründe JSON dosyaları oluşur

---

## Topic

```
plant/plant1/sensors
```
