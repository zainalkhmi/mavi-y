import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import ZumenMenu from './ZumenMenu';
import { Menu } from 'lucide-react';

const MobileLayout = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black pb-28">
            <div className="mx-auto min-h-screen w-full max-w-md bg-slate-950/85 px-4 pb-28 text-slate-100 shadow-2xl backdrop-blur-xl">
                {/* Zumen-style Header */}
                <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-slate-950/50 py-4 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2471B3] text-[10px] font-black italic text-white shadow-lg">
                            MV
                        </div>
                        <span className="text-lg font-bold tracking-tight">MAVI READER</span>
                    </div>
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="rounded-xl p-2 transition hover:bg-white/5"
                        aria-label="Open menu"
                    >
                        <Menu size={24} />
                    </button>
                </header>

                <main className="pt-4">
                    <Outlet />
                </main>
            </div>

            <ZumenMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
            <BottomNav />
        </div>
    );
};

export default MobileLayout;
