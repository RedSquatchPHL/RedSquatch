'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ScanLine } from 'lucide-react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { API } from '@/lib/api';
import type { BarcodeLookupResult } from './types';

// Barcode formats actually printed on grocery/pantry packaging — narrowing
// away from every format ZXing supports (QR, PDF417, Aztec, ...) keeps each
// decode pass faster, which matters since this runs on every video frame.
const PRODUCT_BARCODE_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
];

export type ScanOutcome =
  | { status: 'found'; result: BarcodeLookupResult }
  | { status: 'not-found'; barcode: string };

interface Props {
  onDetected: (outcome: ScanOutcome) => void;
  onClose: () => void;
}

export default function CocinaScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'looking-up' | 'error'>('starting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, PRODUCT_BARCODE_FORMATS);
    const reader = new BrowserMultiFormatReader(hints);

    async function handleDecoded(code: string) {
      controlsRef.current?.stop();
      setStatus('looking-up');
      try {
        const res = await fetch(`${API}/api/client/cocina/barcode/${encodeURIComponent(code)}`, { credentials: 'include' });
        if (res.ok) {
          const result: BarcodeLookupResult = await res.json();
          onDetected({ status: 'found', result });
        } else {
          onDetected({ status: 'not-found', barcode: code });
        }
      } catch {
        onDetected({ status: 'not-found', barcode: code });
      }
    }

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current ?? undefined,
        (result, error) => {
          if (cancelled) return;
          if (result) {
            handleDecoded(result.getText());
            return;
          }
          // Zxing calls this once per frame with a "not found this frame"
          // error, which is the normal idle state, not a real failure.
          if (error && error.name !== 'NotFoundException') {
            // eslint-disable-next-line no-console
            console.debug('Cocina scanner decode error:', error.message);
          }
        }
      )
      .then(controls => {
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStatus('scanning');
      })
      .catch(err => {
        if (cancelled) return;
        setErrorMessage(
          err?.name === 'NotAllowedError'
            ? 'Camera access was denied. Allow camera permission and try again.'
            : 'Could not start the camera on this device.'
        );
        setStatus('error');
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [onDetected]);

  return (
    <div className="cocina-scanner-backdrop" onClick={onClose}>
      <div className="cocina-scanner-panel" onClick={e => e.stopPropagation()}>
        <div className="cocina-scanner-header">
          <span className="flex items-center gap-2">
            <ScanLine size={18} /> Scan a barcode
          </span>
          <button onClick={onClose} aria-label="Close scanner">
            <X size={20} />
          </button>
        </div>

        <div className="cocina-scanner-viewport">
          <video ref={videoRef} className="cocina-scanner-video" muted playsInline autoPlay />
          {status === 'scanning' && <div className="cocina-scanner-reticle" />}
          {status === 'looking-up' && (
            <div className="cocina-scanner-overlay-text">Looking up product…</div>
          )}
          {status === 'error' && (
            <div className="cocina-scanner-overlay-text">{errorMessage}</div>
          )}
        </div>

        <p className="cocina-scanner-hint">
          Point the camera at a package barcode. No barcode? Close this and add it by hand instead.
        </p>
      </div>
    </div>
  );
}
