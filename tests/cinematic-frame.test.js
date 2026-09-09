import test from 'node:test';
import assert from 'node:assert/strict';
import { waterFocusDepth } from '../demo/CinematicFrame.js';

test('water focus uses camera-forward depth, keeping a nearer opaque subject sharp', () => {
    // Camera 2m above sea, an unnormalized ray falling 0.2m per metre of forward depth.
    assert.equal(waterFocusDepth(100, 2, -0.2), 10);
    assert.equal(waterFocusDepth(6, 2, -0.2), 6);
    assert.equal(waterFocusDepth(100, 7, -0.2, 5), 10);
});

test('water focus preserves opaque depth underwater, above the horizon and before the near plane', () => {
    assert.equal(waterFocusDepth(100, -2, -0.2), 100);
    assert.equal(waterFocusDepth(100, 2, 0.2), 100);
    assert.equal(waterFocusDepth(100, 2, 0), 100);
    assert.equal(waterFocusDepth(100, 0.01, -1, 0, 0.1), 100);
});
