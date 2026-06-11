'use strict';

const STX = '\x02';
const ETX = '\x03';

const CODE_PREFIX = '0000000002010B';
const CODE_SUFFIX = '000000';
const CODE_21 = '021';
const CODE_REMOTE = '01';

// Commands
const COMMANDS = {
  UP: 0x20,
  DOWN: 0x40,
  HALT: 0x10,
  PAIR: 0x81,       // Train/Pair command (held 3s)
  RELEASE: 0x00,    // Button release command
  UP_IP: 0x24,      // intermediate position "up"
  DOWN_IP: 0x41,    // intermediate position "down" (sun protection)
  CLEAR_POS: 0x90   // clear positions
};

/**
 * Convert number to 2-digit uppercase hex string
 * @param {number} n
 * @returns {string}
 */
function hex2(n) {
  const s = (n & 0xFF).toString(16).toUpperCase();
  return s.padStart(2, '0');
}

/**
 * Convert number to 4-digit uppercase hex string
 * @param {number} n
 * @returns {string}
 */
function hex4(n) {
  const s = (n & 0xFFFF).toString(16).toUpperCase();
  return s.padStart(4, '0');
}

/**
 * Calculate the Becker 8-bit checksum and append to code
 * @param {string} code 40-character hex code
 * @returns {string} 42-character hex code (code + checksum)
 */
function calculateChecksum(code) {
  if (code.length !== 40) {
    throw new Error('Becker code must be exactly 40 characters long (excluding checksum)');
  }
  let codeSum = 0;
  for (let i = 0; i < code.length; i += 2) {
    const hexByte = code.substring(i, i + 2);
    codeSum += parseInt(hexByte, 16);
  }
  // Checksum is (0x03 - sum) & 0xFF
  const checksumByte = (0x03 - codeSum) & 0xFF;
  return code.toUpperCase() + hex2(checksumByte);
}

/**
 * Generate the 42-character hex code for a command
 * @param {string} unitId 5-character hex ID (e.g., '1737b')
 * @param {number} channel Channel number (0 to 15, standard 1-7)
 * @param {number} cmdCode Command code (e.g. 0x10)
 * @param {number} increment Rolling code increment value
 * @returns {string}
 */
function generateCode(unitId, channel, cmdCode, increment) {
  // Ensure unitId is lowercase, 5 characters
  const cleanUnitId = unitId.toLowerCase().substring(0, 5).padStart(5, '0');
  
  let code;
  if (channel === 0) {
    code = CODE_PREFIX + hex4(increment) + CODE_SUFFIX + cleanUnitId + CODE_21 + '00' + hex2(channel) + '00' + hex2(cmdCode);
  } else {
    code = CODE_PREFIX + hex4(increment) + CODE_SUFFIX + cleanUnitId + CODE_21 + CODE_REMOTE + hex2(channel) + '00' + hex2(cmdCode);
  }
  
  return calculateChecksum(code);
}

/**
 * Wrap code in STX and ETX bytes for serial transmission
 * @param {string} code 42-character hex code
 * @returns {Buffer} Buffer to write to the serial port
 */
function finalizeCode(code) {
  return Buffer.concat([
    Buffer.from([0x02]),
    Buffer.from(code, 'ascii'),
    Buffer.from([0x03])
  ]);
}

module.exports = {
  COMMANDS,
  generateCode,
  finalizeCode,
  calculateChecksum
};
