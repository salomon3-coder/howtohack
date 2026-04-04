---
title: "Build a Raspberry Pi Home Weather Station and Log Sensor Data to a Spreadsheet"
description: "Learn how to wire a DHT22 sensor to a Raspberry Pi, install the software, and automatically log temperature and humidity data to a CSV file."
pubDate: "2026-04-04T10:01:30.081Z"
category: "Home"
image:
  url: "https://images.unsplash.com/photo-1504608524841-42584120d238?w=1200&auto=format&fit=crop"
  alt: "Stormy sky with dark clouds representing weather monitoring"
  license: "Unsplash License (free for commercial and personal use)"
  source: "https://unsplash.com/photos/time-lapse-photography-of-brown-clouds-tMI2_-r5Nfo"
tags:
  - "Raspberry Pi"
  - "weather station"
  - "DIY electronics"
  - "home automation"
  - "Python"
faq:
  - question: "What hardware do I need to build a basic home weather station with a Raspberry Pi?"
    answer: "You need a Raspberry Pi (any model with GPIO pins, such as the Pi 3 or Pi 4), a DHT22 temperature and humidity sensor, a 10kΩ pull-up resistor, jumper wires, and a breadboard. Optionally, add a BMP280 module for barometric pressure readings."
  - question: "Which Python library is used to read data from a DHT22 sensor?"
    answer: "The most common library is Adafruit's CircuitPython DHT library, installed via pip with 'pip3 install adafruit-circuitpython-dht'. It provides simple functions to read temperature and humidity values directly from the GPIO pin."
  - question: "How do I log weather data automatically on a schedule?"
    answer: "Use a cron job on the Raspberry Pi to run your Python logging script at set intervals. For example, adding '*/10 * * * * python3 /home/pi/weather_log.py' to your crontab will record a new data row every 10 minutes to your CSV file."
  - question: "Can I view my weather station data remotely or on a dashboard?"
    answer: "Yes. You can use tools like Grafana with InfluxDB to create a live dashboard, or simply push your CSV data to Google Sheets using the gspread Python library. Both options let you monitor readings from any device on your network or the internet."
howToSteps:
  - "Connect the DHT22 sensor to your Raspberry Pi GPIO pins: VCC to 3.3V, GND to ground, and the data pin to GPIO4, placing a 10kΩ resistor between VCC and the data pin."
  - "Install the required Python libraries on your Raspberry Pi by running 'sudo apt update && sudo apt install python3-pip' followed by 'pip3 install adafruit-circuitpython-dht board'."
  - "Write a Python script that imports the DHT library, initialises the sensor on GPIO4, reads temperature and humidity in a loop, and appends each reading with a timestamp to a CSV file."
  - "Schedule the script to run automatically every 10 minutes using cron by editing your crontab with 'crontab -e' and adding the appropriate cron expression pointing to your script path."
draft: false
---
# Build a Raspberry Pi Home Weather Station and Log Sensor Data to a Spreadsheet

Setting up your own home weather station is one of the most satisfying beginner electronics projects you can tackle with a Raspberry Pi. Instead of relying on a generic forecast that covers a wide geographic area, you get hyper-local readings from your own backyard, garage, or living room. The data is yours, the hardware is inexpensive, and the skills you pick up transfer directly to dozens of other Pi projects.

In this guide you will wire a DHT22 temperature and humidity sensor to a Raspberry Pi, install the necessary Python libraries, write a short script that polls the sensor on a schedule, and save every reading to a CSV file you can open in any spreadsheet application. No soldering is required, and the total cost of components is typically under twenty dollars.

Whether you are a curious hobbyist, a student learning physical computing, or someone who simply wants to know whether the humidity in their basement is creeping toward mold territory, this walkthrough will get you logging real data within an afternoon.

---

## Quick Answer

- **Hardware needed:** Raspberry Pi (any model with GPIO), DHT22 sensor, 10 kΩ pull-up resistor, breadboard, and jumper wires.
- **Software needed:** Raspberry Pi OS, Python 3, and the `Adafruit_CircuitPython_DHT` library.
- **Wiring:** Connect DHT22 VCC to 3.3 V, GND to ground, and the data pin to GPIO 4 (with a pull-up resistor between VCC and data).
- **Logging:** A simple Python script reads the sensor every 60 seconds and appends a timestamped row to a CSV file.
- **Automation:** Use `cron` to run the script at boot so logging continues even after a power cycle.

---

## What You Need Before You Start

### Hardware Components

| Component | Purpose | Approximate Cost |
|---|---|---|
| Raspberry Pi (Zero W, 3B+, or 4) | Main computer and GPIO controller | $10–$55 |
| DHT22 sensor module | Measures temperature and humidity | $4–$8 |
| 10 kΩ resistor | Pull-up resistor for data line | < $1 |
| Half-size breadboard | Prototyping without soldering | $3–$5 |
| Male-to-female jumper wires | Connect Pi GPIO to breadboard | $2–$4 |
| MicroSD card (8 GB+) | Stores the OS and your data logs | $5–$10 |

If you purchase a DHT22 *module* (the blue PCB version) rather than the bare sensor, it usually has the pull-up resistor already built in, which simplifies wiring.

### Software Prerequisites

- Raspberry Pi OS (Bullseye or Bookworm, 32-bit or 64-bit both work)
- Python 3.7 or newer (included in Raspberry Pi OS)
- Internet connection on the Pi for installing libraries
- SSH access or a keyboard and monitor connected to the Pi

---

## Understanding the DHT22 Sensor

The DHT22 (also sold as the AM2302) is a capacitive humidity sensor combined with a thermistor. It communicates over a single-wire protocol and reports:

- **Temperature range:** −40 °C to +80 °C (±0.5 °C accuracy)
- **Humidity range:** 0 % to 100 % RH (±2–5 % accuracy)
- **Sampling rate:** Once every two seconds maximum

The DHT22 is a step up from the cheaper DHT11, which has lower accuracy and a narrower humidity range. For a home weather station where you want trustworthy readings, the DHT22 is the right choice.

---

## Wiring the DHT22 to the Raspberry Pi

### Pin Layout of the Bare DHT22

Looking at the front of the sensor (the mesh side), the four pins from left to right are:

1. **VCC** – Power (3.3 V or 5 V)
2. **Data** – Signal output
3. **NC** – Not connected
4. **GND** – Ground

### Step-by-Step Wiring

1. Insert the DHT22 into the breadboard so each pin is in its own row.
2. Connect **Pin 1 (VCC)** to the **3.3 V** pin on the Pi (physical pin 1).
3. Connect **Pin 4 (GND)** to any **GND** pin on the Pi (physical pin 6 works well).
4. Connect **Pin 2 (Data)** to **GPIO 4** on the Pi (physical pin 7).
5. Place the **10 kΩ resistor** between the VCC row and the Data row on the breadboard. This is the pull-up resistor that keeps the data line stable.

If you are using a DHT22 module with three pins already labeled VCC, DATA, and GND, simply connect those three wires directly and skip the resistor step.

---

## Installing the Required Software

Open a terminal on your Raspberry Pi and run the following commands one at a time.

**Update the system first:**

```
sudo apt update && sudo apt upgrade -y
```

**Install pip and the virtual environment tool:**

```
sudo apt install python3-pip python3-venv -y
```

**Create a project folder and a virtual environment:**

```
mkdir ~/weather_station
cd ~/weather_station
python3 -m venv venv
source venv/bin/activate
```

**Install the Adafruit DHT library:**

```
pip install adafruit-circuitpython-dht
sudo apt install libgpiod2 -y
```

The `libgpiod2` package is a system dependency that the CircuitPython DHT library needs to talk to the GPIO hardware.

---

## Writing the Data Logging Script

## Pro Tip

Always add a `try/except` block around your sensor read call. The DHT22 occasionally returns `None` or throws a runtime error due to timing issues on the single-wire bus. Catching that error and retrying after a short sleep prevents your script from crashing and losing hours of logged data.

Create a new file called `log_weather.py` inside your project folder:

```
nano log_weather.py
```

Paste the following code:

```python
import time
import csv
import board
import adafruit_dht
from datetime import datetime

# --- Configuration ---
SENSOR_PIN = board.D4      # GPIO 4
LOG_FILE   = "weather_log.csv"
INTERVAL   = 60            # seconds between readings

# Initialise the sensor
dht_device = adafruit_dht.DHT22(SENSOR_PIN)

def read_sensor():
    """Return (temperature_c, humidity) or (None, None) on failure."""
    try:
        temp = dht_device.temperature
        humi = dht_device.humidity
        return temp, humi
    except RuntimeError:
        return None, None

def append_to_csv(timestamp, temp, humi):
    """Append one row to the CSV log file."""
    with open(LOG_FILE, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([timestamp, temp, humi])

def write_header_if_needed():
    """Write column headers if the file does not yet exist."""
    try:
        with open(LOG_FILE, "x", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["timestamp", "temperature_c", "humidity_pct"])
    except FileExistsError:
        pass

if __name__ == "__main__":
    write_header_if_needed()
    print(f"Logging to {LOG_FILE} every {INTERVAL} seconds. Press Ctrl+C to stop.")
    while True:
        temp, humi = read_sensor()
        if temp is not None and humi is not None:
            ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            append_to_csv(ts, round(temp, 1), round(humi, 1))
            print(f"{ts}  Temp: {temp:.1f} °C  Humidity: {humi:.1f} %")
        else:
            print("Sensor read failed, retrying next cycle.")
        time.sleep(INTERVAL)
```

Save and exit with **Ctrl+O**, then **Ctrl+X**.

Run the script to test it:

```
python3 log_weather.py
```

You should see timestamped readings appear in the terminal every 60 seconds. Press **Ctrl+C** to stop, then open `weather_log.csv` to confirm the rows are being written correctly.

---

## Automating the Logger with Cron

Running the script manually is fine for testing, but you want it to start automatically whenever the Pi boots.

Open the cron table for the current user:

```
crontab -e
```

Add this line at the bottom (adjust the path to match your username):

```
@reboot sleep 30 && /home/pi/weather_station/venv/bin/python3 /home/pi/weather_station/log_weather.py >> /home/pi/weather_station/cron.log 2>&1
```

The `sleep 30` gives the Pi time to finish booting before the script tries to access the GPIO. The output is redirected to `cron.log` so you can troubleshoot if something goes wrong.

Reboot the Pi and check that the CSV file is growing after a minute or two:

```
tail -f ~/weather_station/weather_log.csv
```

---

## Opening Your Data in a Spreadsheet

Transfer the CSV file to your main computer using SCP, a USB drive, or a shared network folder. Then:

- **Microsoft Excel:** File → Open → browse to the CSV. Excel auto-detects the comma delimiter.
- **Google Sheets:** File → Import → Upload → select the CSV.
- **LibreOffice Calc:** Open the file directly; the import wizard appears automatically.

Once the data is in a spreadsheet you can create line charts of temperature and humidity over time, calculate daily averages, or set up conditional formatting to highlight readings outside a comfortable range.

---

## How Can I Add More Sensors?

The same script structure works for other common sensors. A BMP280 adds barometric pressure and altitude. A rain gauge or anemometer can be connected to GPIO input pins. Each sensor gets its own read function, and you simply add more columns to the CSV row. The Adafruit CircuitPython library ecosystem covers dozens of environmental sensors with consistent APIs.

## Can I View the Data Remotely in Real Time?

Yes. Once you have a CSV being written, you can serve it over the local network with a lightweight Flask web app, push readings to a free cloud service like Adafruit IO or ThingSpeak, or use Grafana with an InfluxDB backend for a professional-looking dashboard. Those setups are beyond the scope of this article but are natural next steps.

## Is the DHT22 Accurate Enough for Real Weather Monitoring?

For home use, the DHT22 is more than adequate. Its ±0.5 °C temperature accuracy and ±2–5 % humidity accuracy are comparable to many consumer weather stations. For research-grade accuracy you would need a calibrated sensor in a radiation shield mounted outdoors, but for monitoring indoor comfort levels or a greenhouse, the DHT22 performs very well.

---

## FAQ

**Do I need any programming experience to follow this guide?**
Basic familiarity with the Linux terminal and Python is helpful but not strictly required. Each command and code block is provided in full, and the Python script is heavily commented so you can understand what each section does even if you are new to the language.

**Which Raspberry Pi model should I use?**
Any Pi with a 40-pin GPIO header works, including the Pi Zero W, Pi 3B+, Pi 4, and Pi 5. The Pi Zero W is a popular choice for dedicated sensor loggers because it is small and draws very little power, making it easy to run continuously without a large electricity bill.

**What happens to the CSV file if the Pi loses power suddenly?**
Because the script opens the file in append mode and closes it after every write, each completed row is safely on disk. You may lose the reading that was in progress at the moment of the power cut, but all previous rows will be intact.

**Can I log data to Google Sheets directly instead of a CSV?**
Yes. The `gspread` Python library lets you authenticate with a Google service account and write rows directly to a Google Sheet. This is more complex to set up but gives you cloud backup and easy sharing without manually transferring files.

**How much disk space will the log file use?**
Each row is roughly 40–50 bytes. Logging once per minute produces about 21 MB per year, which is negligible even on an 8 GB SD card.

---

## Conclusion

Building a Raspberry Pi home weather station is a project that pays dividends long after the afternoon you spend setting it up. You end up with a continuously growing dataset of real conditions in your home or garden, a working knowledge of GPIO wiring and Python file I/O, and a foundation you can extend in almost any direction — dashboards, alerts, machine learning, or integration with smart home platforms. The DHT22 sensor is reliable, the code is simple enough to modify confidently, and the CSV format means your data is never locked into a proprietary system. Start with the basics here, get comfortable reading the numbers, and then let your curiosity guide the next upgrade.

---

## Internal Links

- [Getting Started with Raspberry Pi GPIO and Python](/blog/raspberry-pi-gpio-python-beginners/)
- [How to Set Up a Raspberry Pi Headlessly with SSH](/blog/raspberry-pi-headless-ssh-setup/)
- [Visualize Sensor Data with Grafana and InfluxDB on a Raspberry Pi](/blog/grafana-influxdb-raspberry-pi-sensor-dashboard/)
