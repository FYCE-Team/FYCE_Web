import test from 'node:test';
import assert from 'node:assert/strict';
import { createQrCamera } from '../src/pages/admin/checkin/qrCamera.js';

function setup(overrides = {}) {
    let tick, stopped = 0, raw = 'ticket-A', requests = 0, cancelled = 0;
    const calls = [], active = [];
    const stream = { getTracks: () => [{ stop() { stopped++; } }] };
    const video = { readyState: 4, play: async () => {} };
    const camera = createQrCamera({
        getStream: async () => { requests++; return stream; }, getVideo: () => video,
        createDetector: () => ({ detect: async () => raw ? [{ rawValue: raw }] : [] }),
        onCode: async code => { calls.push(code); camera.pause(); },
        onActive: value => active.push(value),
        schedule: callback => { tick = callback; return 1; }, cancel: () => { cancelled++; },
        ...overrides
    });
    return { camera, stream, video, calls, active, tick: () => tick(), setRaw: value => { raw = value; }, stats: () => ({ stopped, requests, cancelled }) };
}

test('verification pauses detection but keeps camera alive; next ticket scans without reopening', async () => {
    const q = setup();
    await q.camera.start(); await q.tick();
    assert.deepEqual(q.calls, ['ticket-A']);
    q.setRaw('ticket-B'); await q.tick();
    assert.equal(q.calls.length, 1);
    assert.equal(q.video.srcObject, q.stream);
    assert.equal(q.stats().stopped, 0);
    q.camera.resume(); await q.tick();
    assert.deepEqual(q.calls, ['ticket-A', 'ticket-B']);
    await q.camera.start();
    assert.equal(q.stats().requests, 1);
    q.camera.stop(); q.camera.stop();
    assert.deepEqual(q.stats(), { stopped: 1, requests: 1, cancelled: 1 });
    assert.equal(q.video.srcObject, null);
});

test('same QR held in frame is suppressed after check-in, accepted after leaving frame', async () => {
    const q = setup(); await q.camera.start(); await q.tick(); q.camera.resume();
    await q.tick(); await q.tick(); assert.equal(q.calls.length, 1);
    q.setRaw(''); await q.tick(); await q.tick(); await q.tick();
    q.setRaw('ticket-A'); await q.tick(); assert.equal(q.calls.length, 2);
    q.camera.stop();
});

test('stop/unmount while permission is pending releases late stream and starts no detector', async () => {
    let resolve;
    const q = setup({ getStream: () => new Promise(done => { resolve = done; }) });
    const pending = q.camera.start(); q.camera.stop(); resolve(q.stream); await pending;
    assert.equal(q.stats().stopped, 1); assert.equal(q.video.srcObject, null);
    assert.deepEqual(q.active, [false]);
});

test('in-flight detector cannot deliver a ticket after camera is stopped', async () => {
    let resolve;
    const q = setup({ createDetector: () => ({ detect: () => new Promise(done => { resolve = done; }) }) });
    await q.camera.start(); const pending = q.tick(); await q.tick();
    q.camera.stop(); resolve([{ rawValue: 'ticket-A' }]); await pending;
    assert.equal(q.calls.length, 0);
});
