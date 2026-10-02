// Keep the media session separate from ticket verification/check-in requests.
export function createQrCamera({ getStream, getVideo, createDetector, onCode, onActive, schedule = setInterval, cancel = clearInterval }) {
    let generation = 0, stream = null, timer = null, starting = false;
    let paused = false, lastCode = '', emptyFrames = 0;
    const stop = () => {
        generation++;
        starting = false;
        if (timer !== null) cancel(timer);
        timer = null;
        stream?.getTracks().forEach(track => track.stop());
        stream = null;
        const video = getVideo();
        if (video) video.srcObject = null;
        onActive(false);
    };
    return {
        pause() { paused = true; },
        resume() { paused = false; },
        stop,
        async start() {
            if (starting || stream) return;
            starting = true;
            const epoch = ++generation;
            try {
                const acquired = await getStream();
                if (epoch !== generation) {
                    acquired.getTracks().forEach(track => track.stop());
                    return;
                }
                stream = acquired;
                const video = getVideo();
                if (!video) { stop(); return; }
                video.srcObject = stream;
                await video.play();
                if (epoch !== generation) return;
                const detector = createDetector();
                let busy = false;
                lastCode = ''; emptyFrames = 0;
                onActive(true);
                timer = schedule(async () => {
                    if (busy || paused || epoch !== generation || video.readyState < 2) return;
                    busy = true;
                    try {
                        const codes = await detector.detect(video);
                        if (epoch !== generation || paused) return;
                        const code = codes?.[0]?.rawValue;
                        if (!code) {
                            if (++emptyFrames >= 3) lastCode = '';
                            return;
                        }
                        emptyFrames = 0;
                        if (code === lastCode) return;
                        lastCode = code;
                        await onCode(code);
                    } catch { /* A failed frame must not close the stream. */ }
                    finally { busy = false; }
                }, 450);
            } catch (error) {
                if (epoch !== generation) return;
                stop();
                throw error;
            } finally {
                if (epoch === generation) starting = false;
            }
        }
    };
}
