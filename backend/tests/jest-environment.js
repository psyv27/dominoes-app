/**
 * Custom Jest test environment that works with Node.js v22+/v25+.
 *
 * Node.js v22+ ships localStorage but throws SecurityError if accessed
 * without --localstorage-file. This environment removes it before Jest
 * can trip over it.
 */

const { TestEnvironment } = require('jest-environment-node');

// Suppress localStorage SecurityError BEFORE class definition
try {
    // Force-access to see if it throws
    void globalThis.localStorage;
} catch {
    // Remove the broken property so Jest's NodeEnvironment won't crash
    delete globalThis.localStorage;
}

class SafeNodeEnvironment extends TestEnvironment {
    constructor(config, context) {
        super(config, context);
    }
}

module.exports = SafeNodeEnvironment;
