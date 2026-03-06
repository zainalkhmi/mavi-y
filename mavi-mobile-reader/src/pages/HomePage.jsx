import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
    return (
        <div className="page shell">
            <header className="topbar">
                <h1>MAVI Reader</h1>
                <p>Scan QR atau buka daftar SOP yang sudah dipublish.</p>
            </header>

            <main className="grid-actions">
                <Link className="card-action" to="/scan">
                    <span className="card-icon">📷</span>
                    <strong>Scan QR SOP</strong>
                    <small>Arahkan kamera ke barcode/QR SOP.</small>
                </Link>

                <Link className="card-action" to="/sop">
                    <span className="card-icon">📚</span>
                    <strong>List SOP</strong>
                    <small>Lihat SOP PUBLISHED dan buka detail.</small>
                </Link>
            </main>
        </div>
    );
};

export default HomePage;
