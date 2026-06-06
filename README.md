# ioBroker.becker-antrieb-becker-centronic--usb

Lokale und cloudfreie Steuerung von Becker Centronic RF Rollläden und Motoren über einen kompatiblen Becker USB-Seriell-Stick (868,3 MHz).

---

## Konfiguration

### 1. Serielle Schnittstelle
Tragen Sie den Pfad zur seriellen Schnittstelle Ihres Becker USB-Sticks ein (z. B. `COM3` unter Windows oder `/dev/ttyUSB0` unter Linux).

### 2. Fernbedienungen (Units)
Definieren Sie Ihre virtuellen Fernbedienungen (Units) in der Tabelle:
- **Name**: Ein frei wählbarer Name (z. B. "Wohnzimmer links")
- **Unit ID**: Ein eindeutiger 5-stelliger Hex-Code (z. B. `1737b`). Dieser Code dient als ID der virtuellen Fernbedienung.
- **Increment**: Der aktuelle Zählerwert für den Rolling Code (Standard `0`).

---

## Datenpunkte (States)

Für jede angelegte Unit (z. B. `1737b`) erzeugt der Adapter automatisch die Kanäle `ch1` bis `ch7` mit folgenden Datenpunkten:

- `up` (Button): Rolllade hochfahren
- `down` (Button): Rolllade herunterfahren
- `halt` (Button): Fahrt stoppen
- `pair` (Button): Virtuellen Kanal an den Rollladenmotor anlernen
- `up_ip` (Button): Obere Zwischenposition anfahren
- `down_ip` (Button): Untere Zwischenposition (Sonnenschutz) anfahren
- `level` (Zahl, 0-100%): Positionssteuerung:
  - `100` = Fährt hoch (UP)
  - `0` = Fährt runter (DOWN)
  - `1-99` = Fährt Sonnenschutzposition an (DOWN_IP)

---

## Anleitung zum Anlernen (Pairing)

1. Versetzen Sie den Becker-Rollladenmotor in den **Anlernmodus**, indem Sie den Programmierknopf auf der Rückseite Ihrer *bereits angelernten physischen Original-Fernbedienung* für 3 Sekunden gedrückt halten, bis der Motor kurz klackt.
2. Setzen Sie in ioBroker den Datenpunkt `becker-antrieb-becker-centronic--usb.0.units.<id>.ch<channel>.pair` auf `true`.
3. Der Motor bestätigt das erfolgreiche Anlernen durch ein zweifaches Klacken. Der virtuelle Kanal ist nun angelernt.

---

## Lizenz
MIT Lizenz. 
