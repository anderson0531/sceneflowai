const { describe, it, expect } = require('vitest');

describe('Example Test Suite', () => {
    it('should return true for true', () => {
        expect(true).toBe(true);
    });

    it('should add numbers correctly', () => {
        expect(1 + 1).toBe(2);
    });
});