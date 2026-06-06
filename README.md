# ioBroker.becker-antrieb-becker-centronic--usb

[![NPM version](https://img.shields.io/npm/v/iobroker.becker-antrieb-becker-centronic--usb.svg)](https://www.npmjs.com/package/iobroker.becker-antrieb-becker-centronic--usb)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Control Becker Centronic RF roller shutters locally using a compatible Becker USB Serial Stick (868.3 MHz).

Steuerung von Becker Centronic RF Rollläden lokal über einen kompatiblen Becker USB-Seriell-Stick (868,3 MHz).

---

## Configuration / Konfiguration

### 1. Serial Port / Serielle Schnittstelle
Specify your Becker USB Stick serial port (e.g. `COM3` on Windows or `/dev/ttyUSB0` on Linux).
Geben Sie die serielle Schnittstelle des Sticks an (z. B. `COM3` unter Windows oder `/dev/ttyUSB0` unter Linux).

### 2. Units / Fernbedienungen
Define virtual remotes (Units) in the table:
- **Name**: e.g., "Living Room Shutter"
- **Unit ID**: A unique 5-character hex code (e.g., `1737b`)
- **Increment**: Starting value for the rolling code (default `0`)

Definieren Sie virtuelle Fernbedienungen (Units) in der Tabelle:
- **Name**: z. B. "Rolllade Wohnzimmer"
- **Unit ID**: Ein eindeutiger 5-stelliger Hex-Code (z. B. `1737b`)
- **Increment**: Startwert für den Rolling-Code (Standard `0`)

---

## Data Points / Datenpunkte

For each Unit (e.g., `1737b`), the adapter creates channels `ch1` to `ch7` with these states:
Für jede Unit (z. B. `1737b`) erstellt der Adapter die Kanäle `ch1` bis `ch7` mit folgenden Datenpunkten:

- `up` (Button): Move shutter up / Rolllade hochfahren
- `down` (Button): Move shutter down / Rolllade herunterfahren
- `halt` (Button): Stop movement / Fahrt stoppen
- `pair` (Button): Pair/Train virtual remote channel to motor / Kanal an Motor anlernen
- `up_ip` (Button): Move to upper intermediate position / Obere Zwischenposition anfahren
- `down_ip` (Button): Move to lower intermediate position (sun protection) / Untere Zwischenposition (Sonnenschutz) anfahren
- `level` (Number, 0-100%): Position control / Positionssteuerung:
  - `100` = UP
  - `0` = DOWN
  - `1-99` = DOWN_IP (sun protection)

---

## Pairing Instructions / Anlernen an den Motor

1. Put the Becker shutter motor into **pairing mode** by pressing the programming button on your *original physical master remote* for 3 seconds until the motor clacks once.
2. In ioBroker, set the state `becker-antrieb-becker-centronic--usb.0.units.<id>.ch<channel>.pair` to `true`.
3. The motor will clack twice to confirm successful pairing.

1. Versetzen Sie den Becker-Rollladenmotor in den **Anlernmodus**, indem Sie den Programmierknopf auf der Rückseite Ihrer *physischen Original-Fernbedienung* für 3 Sekunden gedrückt halten, bis der Motor kurz klackt.
2. Setzen Sie in ioBroker den Datenpunkt `becker-antrieb-becker-centronic--usb.0.units.<id>.ch<channel>.pair` auf `true`.
3. Der Motor klackt zweimal, um das erfolgreiche Anlernen zu bestätigen.

---

## License / Lizenz
MIT License. Copyright (c) Apfelwurm1.
