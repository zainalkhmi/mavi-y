import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpenText, QrCode, Sparkles } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import scanIllustration from '../assets/zumen_style_scan_illustration.png';
import listIllustration from '../assets/zumen_style_list_illustration.png';

const HomePage = () => {
    return (
        <div className="space-y-4 pb-4">
            <header className="py-2">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-[10px] font-bold tracking-wider text-blue-400 uppercase">
                    <Sparkles size={12} />
                    Fitur Unggulan
                </div>
                <h1 className="m-0 text-3xl font-black tracking-tighter text-white">SOP Reader</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Sistem manajemen panduan kerja terpusat untuk efisiensi lapangan.
                </p>
            </header>

            <main className="grid gap-6 pt-2">
                {!isSupabaseConfigured ? (
                    <div className="rounded-2xl border border-rose-400/35 bg-rose-950/40 p-3 text-sm text-rose-200">
                        Supabase belum dikonfigurasi. Hubungi administrator sistem.
                    </div>
                ) : null}

                {/* Scan QR Card - Zumen Style */}
                <Link
                    to="/scan"
                    className="group relative overflow-hidden rounded-[32px] bg-white pt-2 shadow-xl border border-slate-200/50 transition duration-300 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98]"
                >
                    <div className="absolute left-6 top-6 z-10 flex h-7 items-center rounded-sm bg-[#E31E24] px-3 text-[11px] font-bold text-white shadow-md">
                        NEW
                    </div>
                    <div className="aspect-[16/10] w-full overflow-hidden px-4 pt-4">
                        <img
                            src="/src/assets/zumen_style_scan_illustration.png"
                            alt="Scan QR"
                            className="h-full w-full object-contain transition duration-500 group-hover:scale-110"
                            style={{ filter: 'drop-shadow(0 20px 30px rgba(36, 113, 179, 0.2))' }}
                        />
                    </div>
                    <div className="p-6 pt-2">
                        <h3 className="mb-2 text-xl font-black tracking-tight text-[#2471B3]">
                            Scan QR SOP
                        </h3>
                        <p className="text-sm leading-relaxed text-slate-500">
                            Pahami struktur dan instruksi kerja secara cepat melalui pemindaian QR Code di lapangan.
                        </p>
                    </div>
                </Link>

                {/* List SOP Card - Zumen Style */}
                <Link
                    to="/sop"
                    className="group relative overflow-hidden rounded-[32px] bg-white pt-2 shadow-xl border border-slate-200/50 transition duration-300 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98]"
                >
                    <div className="aspect-[16/10] w-full overflow-hidden px-4 pt-4">
                        <img
                            src="/src/assets/zumen_style_list_illustration.png"
                            alt="Katalog SOP"
                            className="h-full w-full object-contain transition duration-500 group-hover:scale-110"
                            style={{ filter: 'drop-shadow(0 20px 30px rgba(36, 113, 179, 0.2))' }}
                        />
                    </div>
                    <div className="p-6 pt-2">
                        <h3 className="mb-2 text-xl font-black tracking-tight text-[#2471B3]">
                            Manajemen Katalog
                        </h3>
                        <p className="text-sm leading-relaxed text-slate-500">
                            Akses seluruh basis data Standard Operating Procedure secara terstruktur dan intuitif.
                        </p>
                    </div>
                </Link>
            </main>
        </div>
    );
};

export default HomePage;
