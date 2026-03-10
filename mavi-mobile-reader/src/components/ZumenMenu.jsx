import React from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronRight, Globe } from 'lucide-react';

const ZumenMenu = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const menuItems = [
        { label: 'Home', path: '/' },
        { label: 'List SOP', path: '/sop' },
        { label: 'Scan QR', path: '/scan' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#2471B3] text-white animate-in fade-in slide-in-from-top duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-6">
                <div className="text-xl font-black italic tracking-tighter">MAVI</div>
                <button
                    onClick={onClose}
                    className="rounded-full p-2 transition hover:bg-white/10"
                    aria-label="Close menu"
                >
                    <X size={32} strokeWidth={2.5} />
                </button>
            </div>

            {/* Links */}
            <nav className="flex flex-1 flex-col items-center justify-center gap-8 pb-20">
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className="text-2xl font-bold transition hover:opacity-80"
                    >
                        {item.label}
                    </Link>
                ))}

                <div className="mt-8 flex flex-col gap-4 w-full max-w-[280px]">
                    <button className="flex items-center justify-center gap-2 rounded-full bg-[#FFD100] py-4 font-bold text-[#2471B3] shadow-lg transition active:scale-95">
                        Minta Dokumen
                        <ChevronRight size={18} strokeWidth={3} />
                    </button>

                    <button className="flex items-center justify-center gap-2 rounded-full bg-[#F5F5F7] py-4 font-bold text-[#2471B3] shadow-lg transition active:scale-95">
                        Hubungi Kami
                        <ChevronRight size={18} strokeWidth={3} />
                    </button>

                    <button className="flex items-center justify-center gap-2 rounded-full bg-[#F5F5F7] py-3 text-sm font-bold text-[#2471B3] shadow-lg transition active:scale-95 mt-2">
                        Language
                        <Globe size={16} />
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default ZumenMenu;
