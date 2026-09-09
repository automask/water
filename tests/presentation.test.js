import test from 'node:test';
import assert from 'node:assert/strict';
import { Entity, Vec3 } from 'playcanvas';
import { Birds } from '../demo/props.js';
import { ShotTransition } from '../demo/ShotTransition.js';

test('gull forward direction follows its flight tangent and visibility hides the whole prop', () => {
    const root = new Entity();
    const scene = new Entity();
    scene._enabledInHierarchy = true;
    scene.addChild(root);
    const bird = { root, wings: [], centre: [0, 0], radius: 50, height: 20, speed: 0.1, phase: 0.7, flap: 2 };
    const flock = Object.assign(Object.create(Birds.prototype), { items: [bird], time: 0 });
    flock.update(0.1);
    const a = 0.71;
    const tangent = new Vec3(-Math.sin(a), Math.cos(a * 2.3) * 5.75 / 50, Math.cos(a)).normalize();
    assert.ok(root.forward.dot(tangent) > 0.999);
    flock.visible = false;
    assert.equal(root.enabled, false);
    flock.visible = true;
    assert.equal(root.enabled, true);
});

test('rapid study switches stay covered until fresh lighting has rendered consecutive complete frames', () => {
    const classes = new Set();
    const transition = new ShotTransition({ classList: { add: x => classes.add(x), remove: x => classes.delete(x) } });
    transition.begin();
    for (let i = 0; i < 20; i++) transition.frame(1 / 60, false);
    assert.ok(classes.has('covered'));
    transition.frame(1 / 60, true);
    transition.begin();
    for (let i = 0; i < 12; i++) transition.frame(1 / 60, false);
    transition.frame(1 / 60, true);
    transition.frame(1 / 60, true);
    assert.ok(classes.has('covered'));
    transition.frame(1 / 60, true);
    assert.equal(classes.has('covered'), false);
});
