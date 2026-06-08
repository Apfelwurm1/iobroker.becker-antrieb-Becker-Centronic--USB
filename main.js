/**
 * ioBroker.becker-centronic-usb
 *
 * Control Becker Centronic RF roller shutters using a USB Serial Stick
 */

'use strict';

const utils = require('@iobroker/adapter-core');
const becker = require('./lib/becker');
let SerialPort;
try {
  SerialPort = require('serialport').SerialPort;
} catch (e) {
  // Will be mocked or loaded dynamically
}

class BeckerCentronicUsb extends utils.Adapter {
  /**
   * @param {Partial<utils.AdapterOptions>} [options]
   */
   constructor(options) {
     super({
       ...options,
       name: 'becker-centronic-usb',
     });
    this.on('ready', this.onReady.bind(this));
    this.on('stateChange', this.onStateChange.bind(this));
    this.on('unload', this.onUnload.bind(this));
    this.on('message', this.onMessage.bind(this));

    this.port = null;
    this.reconnectTimeout = null;
    this.isClosing = false;
    this.portPath = '';
  }

  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    this.log.info('Starting Becker Centronic USB adapter...');

    // Resolve port path (dropdown select or manual input)
    this.portPath = this.config.manualMode ? this.config.serialPortManual : this.config.serialPort;

    // 1. Initialize objects/states
    await this.initUnits();

    // 2. Open serial connection
    if (this.portPath) {
      this.openSerialPort();
    } else {
      this.log.warn('No serial port configured. Please configure a serial port in the adapter settings.');
    }

    // 3. Subscribe to all state changes
    this.subscribeStates('*');
  }

  /**
   * Create units and channels dynamically based on adapter config
   */
  async initUnits() {
    if (!this.config.units || this.config.units.length === 0) {
      this.log.info('No Becker units configured in adapter settings.');
      return;
    }

    for (const unit of this.config.units) {
      if (!unit.id || !unit.name) continue;

      const unitId = unit.id.trim().toLowerCase();
      // Validate 5 hex characters
      if (!/^[0-9a-f]{5}$/.test(unitId)) {
        this.log.error(`Invalid unit ID "${unit.id}". Unit ID must be exactly 5 hex characters (e.g. 1737b).`);
        continue;
      }

      // Create unit channel
      await this.extendObjectAsync(`units.${unitId}`, {
        type: 'channel',
        common: {
          name: unit.name
        },
        native: {
          id: unitId
        }
      });

      // Create increment state if it doesn't exist
      const incDefault = parseInt(unit.increment, 10) || 0;
      await this.extendObjectAsync(`units.${unitId}.increment`, {
        type: 'state',
        common: {
          name: 'Rolling Code Increment',
          type: 'number',
          role: 'value',
          read: true,
          write: true,
          def: incDefault
        },
        native: {}
      });

      // Create channels 1 to 7
      for (let ch = 1; ch <= 7; ch++) {
        await this.extendObjectAsync(`units.${unitId}.ch${ch}`, {
          type: 'channel',
          common: {
            name: `Channel ${ch}`
          },
          native: {
            channel: ch
          }
        });

        // Add control buttons and level state
        const controls = [
          { name: 'up', role: 'button', type: 'boolean', def: false },
          { name: 'down', role: 'button', type: 'boolean', def: false },
          { name: 'halt', role: 'button', type: 'boolean', def: false },
          { name: 'pair', role: 'button', type: 'boolean', def: false },
          { name: 'up_ip', role: 'button', type: 'boolean', def: false },
          { name: 'down_ip', role: 'button', type: 'boolean', def: false }
        ];

        for (const ctrl of controls) {
          await this.extendObjectAsync(`units.${unitId}.ch${ch}.${ctrl.name}`, {
            type: 'state',
            common: {
              name: `Trigger ${ctrl.name.toUpperCase()}`,
              type: ctrl.type,
              role: ctrl.role,
              read: false,
              write: true,
              def: ctrl.def
            },
            native: {}
          });
        }

        // Add Level Slider State
        await this.extendObjectAsync(`units.${unitId}.ch${ch}.level`, {
          type: 'state',
          common: {
            name: 'Position Level',
            type: 'number',
            role: 'level',
            min: 0,
            max: 100,
            unit: '%',
            read: true,
            write: true,
            def: 100
          },
          native: {}
        });
      }
    }
  }

  /**
   * Connect to the Becker USB Stick via serial port
   */
  openSerialPort() {
    if (this.port) {
      try {
        this.port.close();
      } catch (err) {
        // ignore
      }
    }

    this.log.info(`Connecting to Becker USB stick on ${this.portPath} (115200 Baud)...`);
    
    if (!SerialPort) {
      this.log.error('serialport module could not be loaded.');
      this.setState('info.connection', false, true);
      return;
    }

    try {
      this.port = new SerialPort({
        path: this.portPath,
        baudRate: 115200,
        autoOpen: false
      });

      this.port.on('open', () => {
        this.log.info(`Serial port ${this.portPath} opened successfully.`);
        this.setState('info.connection', true, true);
      });

      this.port.on('error', (err) => {
        this.log.error(`Serial port error: ${err.message}`);
        this.setState('info.connection', false, true);
        this.scheduleReconnect();
      });

      this.port.on('close', () => {
        this.log.info('Serial port closed.');
        this.setState('info.connection', false, true);
        if (!this.isClosing) {
          this.scheduleReconnect();
        }
      });

      this.port.open((err) => {
        if (err) {
          this.log.error(`Failed to open serial port: ${err.message}`);
          this.setState('info.connection', false, true);
          this.scheduleReconnect();
        }
      });

    } catch (err) {
      this.log.error(`Error initializing serial port: ${err.message}`);
      this.setState('info.connection', false, true);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule serial connection retry
   */
  scheduleReconnect() {
    if (this.reconnectTimeout || this.isClosing) return;

    this.log.info('Scheduling serial reconnect in 10 seconds...');
    this.reconnectTimeout = this.setTimeout(() => {
      this.reconnectTimeout = null;
      this.openSerialPort();
    }, 10000);
  }

  /**
   * Send command packet to Becker USB Stick
   * @param {string} unitId 5-char hex
   * @param {number} channel 1-7
   * @param {number} cmdCode command hex code
   */
  async sendBeckerCommand(unitId, channel, cmdCode) {
    // 1. Get current increment
    const stateId = `units.${unitId}.increment`;
    const incState = await this.getStateAsync(stateId);
    let increment = incState ? parseInt(incState.val, 10) : 0;
    if (isNaN(increment)) increment = 0;

    // 2. Generate packet
    let codeStr;
    try {
      codeStr = becker.generateCode(unitId, channel, cmdCode, increment);
    } catch (err) {
      this.log.error(`Failed to generate Becker packet: ${err.message}`);
      return;
    }

    const packet = becker.finalizeCode(codeStr);
    this.log.info(`Sending Becker RF Centronic command: Unit ${unitId}, Channel ${channel}, Cmd ${cmdCode} (Inc: ${increment}) -> Hex packet: ${codeStr}`);

    // 3. Write to serial port
    if (this.port && this.port.isOpen) {
      this.port.write(packet, (err) => {
        if (err) {
          this.log.error(`Failed to write to serial port: ${err.message}`);
        } else {
          this.log.debug('Packet written to serial port.');
        }
      });
    } else {
      this.log.error(`Cannot send command: Serial port is not open (Device: ${this.portPath})`);
    }

    // 4. Increment and save
    await this.setStateAsync(stateId, increment + 1, true);
  }

  /**
   * Is called if a subscribed state changes
   * @param {string} id
   * @param {ioBroker.State | null | undefined} state
   */
  async onStateChange(id, state) {
    if (!state || state.ack) {
      // State was deleted or change is already acknowledged
      return;
    }

    this.log.debug(`State change requested: ${id} = ${state.val}`);

    // Expecting: becker-centronic-usb.0.units.<unitId>.ch<channel>.<stateName>
    const parts = id.split('.');
    if (parts.length < 6 || parts[2] !== 'units') return;

    const unitId = parts[3];
    const chStr = parts[4]; // e.g. "ch1"
    const stateName = parts[5]; // e.g. "up", "level"

    const channel = parseInt(chStr.replace('ch', ''), 10);
    if (isNaN(channel) || channel < 1 || channel > 7) return;

    if (stateName === 'level') {
      const levelVal = parseInt(state.val, 10);
      if (isNaN(levelVal) || levelVal < 0 || levelVal > 100) return;

      let cmdCode;
      if (levelVal === 100) {
        cmdCode = becker.COMMANDS.UP;
      } else if (levelVal === 0) {
        cmdCode = becker.COMMANDS.DOWN;
      } else {
        cmdCode = becker.COMMANDS.DOWN_IP; // sun protection position
      }

      await this.sendBeckerCommand(unitId, channel, cmdCode);
      await this.setStateAsync(id, levelVal, true); // Ack level change
    } else {
      // Button commands
      if (state.val === true) {
        let cmdCode = null;
        switch (stateName) {
          case 'up':
            cmdCode = becker.COMMANDS.UP;
            break;
          case 'down':
            cmdCode = becker.COMMANDS.DOWN;
            break;
          case 'halt':
            cmdCode = becker.COMMANDS.HALT;
            break;
          case 'pair':
            cmdCode = becker.COMMANDS.PAIR;
            break;
          case 'up_ip':
            cmdCode = becker.COMMANDS.UP_IP;
            break;
          case 'down_ip':
            cmdCode = becker.COMMANDS.DOWN_IP;
            break;
        }

        if (cmdCode !== null) {
          await this.sendBeckerCommand(unitId, channel, cmdCode);
        }

        // Reset button with ack=true
        await this.setStateAsync(id, false, true);
      }
    }
  }

  /**
   * Some message was sent to this instance over message box
   * @param {ioBroker.Message} obj
   */
  async onMessage(obj) {
    this.log.info(`Received message command: ${obj ? obj.command : 'undefined'}`);
    if (obj && obj.command === 'getSerialPorts' && obj.callback) {
      const options = [];
      let currentVal = '';
      try {
        const instanceConfig = await this.getForeignObjectAsync(`system.adapter.${this.namespace}`);
        if (instanceConfig && instanceConfig.native) {
          currentVal = instanceConfig.native.serialPort;
        }
      } catch (err) {
        // ignore
      }

      try {
        const { SerialPort } = require('serialport');
        const ports = await SerialPort.list();
        let currentValFound = false;
        for (const port of ports) {
          options.push({
            value: port.path,
            label: `${port.path}${port.friendlyName ? ` (${port.friendlyName})` : ''}`
          });
          if (port.path === currentVal) {
            currentValFound = true;
          }
        }
        if (currentVal && !currentValFound) {
          options.push({
            value: currentVal,
            label: `${currentVal} (Aktuell konfiguriert - nicht verbunden)`
          });
        }
      } catch (err) {
        this.log.error(`Failed to list serial ports: ${err.message}`);
        if (currentVal) {
          options.push({
            value: currentVal,
            label: `${currentVal} (Aktuell konfiguriert)`
          });
        }
      }
      this.sendTo(obj.from, obj.command, options, obj.callback);
    }
  }

  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   * @param {() => void} callback
   */
  onUnload(callback) {
    try {
      this.isClosing = true;
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      if (this.port && this.port.isOpen) {
        this.port.close(() => {
          this.log.info('Closed serial port connection during unloading.');
          callback();
        });
      } else {
        callback();
      }
    } catch (e) {
      callback();
    }
  }
}

if (require.main !== module) {
  // Export the constructor in compact mode
  /**
   * @param {Partial<utils.AdapterOptions>} [options]
   */
  module.exports = (options) => new BeckerCentronicUsb(options);
} else {
  // otherwise start the instance directly
  new BeckerCentronicUsb();
}
