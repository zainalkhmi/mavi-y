import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { parseManualIdFromQrText } from '../lib/manualApi';

const ScanPage = () => {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const controlsRef = useRef(null);
    const [error, setError] = useState('');
    const [isStarting, setIsStarting] = useState(false);
    const [rawValue, setRawValue] = useState('');

    useEffect(() => {
        let isActive = true;

        const startScanner = async () => {
            setError('');
            setIsStarting(true);

            try {
                const codeReader = new BrowserMultiFormatReader();
                const controls = await codeReader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
                    if (!isActive) return;
                    if (result) {
                        const text = result.getText();
                        const manualId = parseManualIdFromQrText(text);
                        if (manualId) {
                            controls?.stop();
                            navigate(`/sop/${encodeURIComponent(manualId)}`);
                        } else {
                            setError('QR terdeteksi, tapi format manualId tidak valid.');
                        }
                    } else if (err && !String(err?.name || '').includes('NotFoundException')) {
                        setError('Gagal membaca QR, coba arahkan kamera lebih dekat.');
                    }
                });
                controlsRef.current = controls;
            } catch (scanError) {
                setError('Kamera tidak bisa diakses. Pastikan izin kamera diberikan.');
                // eslint-disable-next-line no-console
                console.error('Scanner init error:', scanError);
            } finally {
                setIsStarting(false);
            }
        };

        startScanner();

        return () => {
            isActive = false;
            controlsRef.current?.stop();
        };
    }, [navigate]);

    const handleManualOpen = () => {
        const manualId = parseManualIdFromQrText(rawValue);
        if (!manualId) {
            setError('Input tidak valid. Tempel URL QR atau UUID manualId.');
            return;
        }
        navigate(`/sop/${encodeURIComponent(manualId)}`);
    };

    return (
        <div className="page shell">
            <header className="topbar">
                <h1>Scan QR SOP</h1>
                <p>Arahkan kamera ke QR SOP dari mavi-y.</p>
            </header>

            <div className="camera-wrap">
                <video ref={videoRef} className="camera-view" muted autoPlay playsInline />
                {isStarting && <div className="overlay-note">Menyalakan kamera...</div>}
            </div>

            <div className="panel">
                <label htmlFor="manualInput">Fallback manual input (link atau manualId)</label>
                <input
                    id="manualInput"
                    type="text"
                    value={rawValue}
                    onChange={(e) => setRawValue(e.target.value)}
                    placeholder="Contoh: https://domain/#/manual/{id}"
                />
                <button className="btn primary" onClick={handleManualOpen}>Buka SOP</button>
                {error ? <p className="error-text">{error}</p> : null}
            </div>

            <div className="footer-actions">
                <Link to="/" className="btn ghost">Kembali</Link>
                <Link to="/sop" className="btn ghost">Lihat List SOP</Link>
            </div>
        </div>
    );
};

export default ScanPage;
