import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublishedManualSummaries } from '../lib/manualApi';

const SopListPage = () => {
    const [search, setSearch] = useState('');
    const [manuals, setManuals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setError('');
            try {
                const rows = await listPublishedManualSummaries(search);
                if (!cancelled) setManuals(rows);
            } catch (err) {
                if (!cancelled) {
                    setError('Gagal memuat SOP. Periksa koneksi atau Supabase config.');
                }
                // eslint-disable-next-line no-console
                console.error('List SOP error:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        const timer = setTimeout(load, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [search]);

    const totalText = useMemo(() => `${manuals.length} SOP ditemukan`, [manuals.length]);

    return (
        <div className="page shell">
            <header className="topbar">
                <h1>Daftar SOP</h1>
                <p>Hanya SOP dengan status PUBLISHED yang ditampilkan.</p>
            </header>

            <div className="panel">
                <label htmlFor="searchSop">Cari judul / nomor dokumen</label>
                <input
                    id="searchSop"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Contoh: Assembly / WI-001"
                />
                <small className="muted-text">{totalText}</small>
            </div>

            {isLoading ? <div className="panel">Memuat SOP...</div> : null}
            {error ? <div className="panel error-text">{error}</div> : null}

            {!isLoading && !error ? (
                <div className="list-wrap">
                    {manuals.map((manual) => (
                        <Link key={manual.id} className="list-item" to={`/sop/${encodeURIComponent(manual.id)}`}>
                            <div>
                                <strong>{manual.title || 'Untitled SOP'}</strong>
                                <p>{manual.summary || 'Tanpa ringkasan'}</p>
                            </div>
                            <div className="meta-right">
                                <span>{manual.documentNumber || '-'}</span>
                                <span>v{manual.version || '1.0'}</span>
                            </div>
                        </Link>
                    ))}

                    {!manuals.length ? (
                        <div className="panel">Tidak ada SOP published yang cocok dengan pencarian.</div>
                    ) : null}
                </div>
            ) : null}

            <div className="footer-actions">
                <Link to="/" className="btn ghost">Kembali</Link>
                <Link to="/scan" className="btn ghost">Scan QR</Link>
            </div>
        </div>
    );
};

export default SopListPage;
