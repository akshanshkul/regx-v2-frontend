import React, { useEffect, useRef, useState } from 'react';
import { CameraOff, Flashlight, Loader2, RefreshCw, RotateCcw, X } from 'lucide-react';

/** The same code seen again within this long is the camera re-reading it, not a new scan. */
const REPEAT_MS = 4000;

/** Errors that mean "this camera cannot be used" — so another one is tried. */
const TRY_ANOTHER = ['NotReadableError', 'OverconstrainedError', 'AbortError', 'TrackStartError'];

/**
 * Infrared cameras (Windows Hello) and virtual cameras are listed like any
 * other but cannot show a picture worth scanning: tried last.
 */
const unlikely = (label) => /\b(ir|infrared|virtual|obs)\b/i.test(label ?? '');

const messageFor = (name) =>
    name === 'NotAllowedError'
        ? 'Camera permission was refused. Allow the camera for this site in the browser settings, then try again.'
        : name === 'NotFoundError'
          ? 'No camera was found on this device.'
          : TRY_ANOTHER.includes(name)
            ? 'No camera could be started. Close any other app or browser tab using the camera (including the browser’s own camera preview), then try again.'
            : 'The camera could not be started.';

/**
 * The phone's (or laptop's) camera as the scanner: point it at the winner's ID
 * card QR or barcode and the code is handed to onCode, exactly as if a
 * hardware scanner had typed it.
 *
 * Starts with the back camera where there is one. If that camera cannot be
 * opened — on many laptops the second "camera" is the infrared one used for
 * face sign-in — every other camera is tried in turn. With several cameras a
 * picker lets the desk choose.
 *
 * Uses ZXing, loaded only when the camera opens. While `paused` (a result
 * saving, a match to choose) codes are ignored, so one card held in view is
 * one scan. The camera needs a secure page — https, or localhost.
 */
const CameraScanner = ({ onCode, paused, onClose }) => {
    const video = useRef(null);
    const controls = useRef(null);
    const lastSeen = useRef({ text: '', at: 0 });
    const pausedRef = useRef(paused);
    const onCodeRef = useRef(onCode);

    const [state, setState] = useState({ status: 'starting', error: null });
    const [devices, setDevices] = useState([]); // video inputs, once permission is given
    const [deviceId, setDeviceId] = useState(null); // null = back camera, then whatever works
    const [attempt, setAttempt] = useState(0); // bumped by "Try again"
    const [torch, setTorch] = useState(false);
    const [flash, setFlash] = useState(false);

    pausedRef.current = paused;
    onCodeRef.current = onCode;

    useEffect(() => {
        let cancelled = false;

        const onResult = (result) => {
            if (!result || pausedRef.current) return;

            const text = result.getText().trim();
            const now = Date.now();

            if (!text || (text === lastSeen.current.text && now - lastSeen.current.at < REPEAT_MS)) return;

            lastSeen.current = { text, at: now };
            setFlash(true);
            setTimeout(() => setFlash(false), 350);
            onCodeRef.current(text);
        };

        const start = async () => {
            setState({ status: 'starting', error: null });

            if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
                setState({ status: 'error', error: 'The camera only works on a secure page (https). Open RegX over https on this device.' });
                return;
            }

            const { BrowserMultiFormatReader } = await import('@zxing/browser');
            const reader = new BrowserMultiFormatReader();

            const open = (constraints) => reader.decodeFromConstraints(
                { video: { ...constraints, width: { ideal: 1280 }, height: { ideal: 720 } } },
                video.current,
                onResult
            );

            const keep = async (scanner, id) => {
                if (cancelled) {
                    scanner.stop();
                    return true;
                }

                controls.current = scanner;
                setState({ status: 'live', error: null });

                // Names are only readable once a camera is allowed; the picker
                // shows the one actually in use.
                const list = await BrowserMultiFormatReader.listVideoInputDevices().catch(() => []);
                const active = id ?? video.current?.srcObject?.getVideoTracks?.()[0]?.getSettings?.().deviceId ?? null;

                if (!cancelled) {
                    setDevices(list);
                    if (active) setDeviceId(active);
                }

                return true;
            };

            let lastError = null;

            // 1. The chosen camera, or the back camera.
            try {
                const scanner = await open(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } });
                await keep(scanner, deviceId);
                return;
            } catch (error) {
                lastError = error;

                if (!TRY_ANOTHER.includes(error?.name)) {
                    if (!cancelled) setState({ status: 'error', error: messageFor(error?.name) });
                    return;
                }
            }

            // 2. That camera cannot be opened: every other one, likeliest first.
            const list = await BrowserMultiFormatReader.listVideoInputDevices().catch(() => []);
            const others = list
                .filter((d) => d.deviceId && d.deviceId !== deviceId)
                .sort((a, b) => Number(unlikely(a.label)) - Number(unlikely(b.label)));

            if (!cancelled) setDevices(list);

            for (const device of others) {
                if (cancelled) return;

                try {
                    const scanner = await open({ deviceId: { exact: device.deviceId } });
                    await keep(scanner, device.deviceId);
                    return;
                } catch (error) {
                    lastError = error;
                }
            }

            if (!cancelled) setState({ status: 'error', error: messageFor(lastError?.name) });
        };

        start().catch(() => {
            if (!cancelled) setState({ status: 'error', error: 'The camera could not be started.' });
        });

        return () => {
            cancelled = true;
            controls.current?.stop();
            controls.current = null;
            setTorch(false);
        };
        // deviceId is read for the first try only; changing it through the picker restarts via `attempt`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt]);

    const choose = (id) => {
        setDeviceId(id);
        setAttempt((n) => n + 1);
    };

    const toggleTorch = async () => {
        try {
            await controls.current?.switchTorch?.(!torch);
            setTorch((on) => !on);
        } catch {
            // Not every camera has a light; the button is a nicety.
        }
    };

    const nextCamera = () => {
        if (devices.length < 2) return;
        const index = devices.findIndex((d) => d.deviceId === deviceId);
        choose(devices[(index + 1) % devices.length].deviceId);
    };

    return (
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-black">
            <div className="relative aspect-[4/3] sm:aspect-video bg-black">
                <video ref={video} className="absolute inset-0 w-full h-full object-cover" muted playsInline />

                {/* Where to hold the code. */}
                {state.status === 'live' && (
                    <div className="absolute inset-0 grid place-items-center pointer-events-none">
                        <div className={`w-3/5 max-w-xs aspect-square rounded-2xl border-4 transition-colors ${flash ? 'border-green-400' : paused ? 'border-amber-400' : 'border-white/80'}`} />
                    </div>
                )}

                {state.status === 'starting' && (
                    <div className="absolute inset-0 grid place-items-center text-white/80"><Loader2 className="w-8 h-8 animate-spin" /></div>
                )}

                {state.status === 'error' && (
                    <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
                        <div>
                            <CameraOff className="w-8 h-8 mx-auto mb-2 text-white/70" />
                            <p className="text-sm max-w-sm">{state.error}</p>
                            <button
                                type="button"
                                onClick={() => setAttempt((n) => n + 1)}
                                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25"
                            >
                                <RotateCcw className="w-4 h-4" /> Try again
                            </button>
                        </div>
                    </div>
                )}

                <div className="absolute top-2 right-2 flex gap-2">
                    {state.status === 'live' && controls.current?.switchTorch && (
                        <button type="button" onClick={toggleTorch} className={`p-2 rounded-full ${torch ? 'bg-yellow-400 text-gray-900' : 'bg-black/60 text-white'}`} aria-label={torch ? 'Light off' : 'Light on'}>
                            <Flashlight className="w-5 h-5" />
                        </button>
                    )}
                    {devices.length > 1 && (
                        <button type="button" onClick={nextCamera} className="p-2 rounded-full bg-black/60 text-white" aria-label="Next camera" title="Switch to the next camera">
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    )}
                    <button type="button" onClick={onClose} className="p-2 rounded-full bg-black/60 text-white" aria-label="Close camera">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="px-3 py-2 bg-gray-900 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-300">
                <span className="text-center">
                    {state.status === 'starting'
                        ? 'Starting the camera…'
                        : state.status === 'error'
                          ? 'Camera not available.'
                          : paused
                            ? 'Hold on — finish the step above, then scan the next card.'
                            : 'Hold the winner’s ID card QR or barcode inside the square.'}
                </span>

                {/* Several cameras: choose by name (front, back, external…). */}
                {devices.length > 1 && (
                    <select
                        value={deviceId ?? ''}
                        onChange={(e) => e.target.value && choose(e.target.value)}
                        className="max-w-[16rem] rounded-md bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-100 outline-none"
                        aria-label="Camera"
                    >
                        {!deviceId && <option value="">Choose a camera…</option>}
                        {devices.map((d, i) => (
                            <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>
                        ))}
                    </select>
                )}
            </div>
        </div>
    );
};

export default CameraScanner;
