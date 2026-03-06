import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpenText, Home, QrCode } from 'lucide-react';

const BottomNav = () => {
    const location = useLocation();

    const isHome = location.pathname === '/';
    const isSop = location.pathname.startsWith('/sop');
    const isScan = location.pathname === '/scan';

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
            <div className="pointer-events-auto mx-auto w-full max-w-md">
                <nav className="relative rounded-3xl border border-white/15 bg-slate-900/90 px-4 py-3 shadow-glass backdrop-blur-xl">
                    <div className="grid grid-cols-2 items-center gap-3">
                        <Link
                            to="/"
                            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${isHome ? 'bg-yellow-400/20 text-yellow-300' : 'text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            <Home size={17} />
                            Home
                        </Link>

                        <Link
                            to="/sop"
                            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${isSop ? 'bg-yellow-400/20 text-yellow-300' : 'text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            <BookOpenText size={17} />
                            SOP
                        </Link>
                    </div>

                    <Link
                        to="/scan"
                        className={`absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-slate-950 shadow-xl transition ${isScan
                                ? 'bg-yellow-300 text-slate-950'
                                : 'bg-gradient-to-br from-yellow-300 to-orange-400 text-slate-950 hover:brightness-105'
                            }`}
                        aria-label="Scan QR"
                    >
                        <QrCode size={26} strokeWidth={2.4} />
                    </Link>
                </nav>
            </div>
        </div>
    );
};

export default BottomNav;
