import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpenText, Home, QrCode, Zap } from 'lucide-react';

const BottomNav = () => {
    const location = useLocation();

    const isHome = location.pathname === '/';
    const isSop = location.pathname.startsWith('/sop');
    const isScan = location.pathname === '/scan';
    const isLive = location.pathname === '/live';

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
            <div className="pointer-events-auto mx-auto w-full max-w-md">
                <nav className="relative rounded-3xl border border-white/15 bg-slate-900/90 px-4 py-3 shadow-glass backdrop-blur-xl">
                    <div className="grid grid-cols-3 items-center gap-2 pr-10">
                        <Link
                            to="/"
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-bold uppercase tracking-wider transition ${isHome ? 'text-yellow-300' : 'text-slate-500'
                                }`}
                        >
                            <Home size={18} />
                            Home
                        </Link>

                        <Link
                            to="/live"
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-bold uppercase tracking-wider transition ${isLive ? 'text-yellow-300' : 'text-slate-500'
                                }`}
                        >
                            <Zap size={18} className={isLive ? 'animate-pulse' : ''} />
                            Live
                        </Link>

                        <Link
                            to="/sop"
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-bold uppercase tracking-wider transition ${isSop ? 'text-yellow-300' : 'text-slate-500'
                                }`}
                        >
                            <BookOpenText size={18} />
                            Docs
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
