'use strict';

const assert = require('assert');
const becker = require('../lib/becker');

console.log('Running Becker Centronic Protocol Verification Tests...');

try {
  // Test case 1: Validate checksum calculation
  // Known packet from FHEM/pybecker trace:
  // Code prefix/body: "0000000002010B008A0000001737B02101010010"
  // Expected checksum: "3A"
  // Full code: "0000000002010B008A0000001737B021010100103A"
  
  const codeBody = '0000000002010B008A0000001737B02101010010';
  const fullCode = becker.calculateChecksum(codeBody);
  assert.strictEqual(fullCode, '0000000002010B008A0000001737B021010100103A');
  console.log('✓ Test Case 1 passed: Checksum matches expected "3A"');

  // Test case 2: generateCode output
  const generated = becker.generateCode('1737b', 1, becker.COMMANDS.HALT, 138);
  assert.strictEqual(generated, '0000000002010B008A0000001737B021010100103A');
  console.log('✓ Test Case 2 passed: generateCode matches known reference packet');

  // Test case 3: finalizeCode framing
  const finalized = becker.finalizeCode(generated);
  assert.strictEqual(finalized[0], 0x02); // STX
  assert.strictEqual(finalized[finalized.length - 1], 0x03); // ETX
  assert.strictEqual(finalized.toString('ascii', 1, finalized.length - 1), '0000000002010B008A0000001737B021010100103A');
  console.log('✓ Test Case 3 passed: finalizeCode wraps packet correctly with STX and ETX');

  // Test case 4: Checksum with different command (e.g. UP = 0x20)
  // Let's verify sum change: HALT (0x10) to UP (0x20) is +16 (0x10)
  // Sum = 457 + 16 = 473 (0x1D9)
  // Checksum = (0x03 - 473) = -470
  // -470 & 0xFF = 42 (0x2A)
  const generatedUp = becker.generateCode('1737b', 1, becker.COMMANDS.UP, 138);
  assert.strictEqual(generatedUp, '0000000002010B008A0000001737B021010100202A');
  console.log('✓ Test Case 4 passed: Checksum adjusts correctly for UP command');

  console.log('\nAll Becker Centronic Protocol tests passed successfully!');
  process.exit(0);
} catch (err) {
  console.error('\n✗ Test verification failed:');
  console.error(err);
  process.exit(1);
}
