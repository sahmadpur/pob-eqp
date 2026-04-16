'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onClose: () => void;
  onScan: (orderId: string) => void;
}

const CONTAINER_ID = 'pob-qr-scanner';

// Module-level promise chain: each scanner instance awaits the previous one's
// full teardown before starting. This handles React StrictMode's double-invoke.
let prevDone: Promise<void> = Promise.resolve();

export default function QrScannerModal({ onClose, onScan }: Props) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let active = true;

    // Each effect gets a promise it controls; the next effect awaits it.
    let signalDone!: () => void;
    const thisDone = new Promise<void>((res) => { signalDone = res; });
    const waitFor = prevDone;
    prevDone = thisDone;

    // Holds the scanner once it's created, so cleanup can stop it.
    let scanner: { stop: () => Promise<void> } | null = null;

    const run = async () => {
      await waitFor;                    // wait for previous scanner to fully release
      if (!active) { signalDone(); return; }

      const { Html5Qrcode } = await import('html5-qrcode');
      if (!active) { signalDone(); return; }

      scanner = new Html5Qrcode(CONTAINER_ID);

      if (!active) {
        scanner.stop().catch(() => {}).finally(signalDone);
        return;
      }

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text: string) => {
            if (!active) return;
            active = false;
            scanner!.stop().catch(() => {});
            onScanRef.current(text.trim());
          },
          () => {},                     // per-frame decode noise — ignore
        );
      } catch {
        if (active) setCameraError('Camera access denied or unavailable. Enter the order ID manually below.');
        signalDone();
      }
    };

    run();

    return () => {
      active = false;
      if (scanner) {
        scanner.stop()
          .catch(() => {})
          .finally(() => {
            const el = document.getElementById(CONTAINER_ID);
            if (el) el.innerHTML = '';
            signalDone();
          });
      }
      // If scanner not yet created, run() will call signalDone() itself.
    };
  }, []);

  const handleManual = () => {
    const id = manualId.trim().toUpperCase();
    if (id) onScanRef.current(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Scan Order QR</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {!cameraError && <div id={CONTAINER_ID} className="w-full bg-black" />}

        {cameraError && (
          <div className="px-5 pt-5">
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {cameraError}
            </p>
          </div>
        )}

        <div className="px-5 py-4 space-y-2">
          <p className="text-xs text-gray-500">Or enter the order ID manually:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManual()}
              placeholder="POB-ORD-..."
              autoComplete="off"
              spellCheck={false}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pob-blue"
            />
            <button
              onClick={handleManual}
              disabled={!manualId.trim()}
              className="px-4 py-2 bg-pob-blue text-white text-sm font-medium rounded-lg hover:bg-pob-blue-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Open
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
