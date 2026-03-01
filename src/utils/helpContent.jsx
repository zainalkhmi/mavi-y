import React from 'react';

// Help content for each view
export const helpContent = {
    'action-recognition': {
        title: '🤖 Action Recognition - Help',
        content: (
            <>
                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>📌 Fungsi</h3>
                <p>Deteksi otomatis gerakan operator menggunakan AI dan klasifikasi ke dalam Therblig elements.</p>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🚀 Cara Pakai</h3>
                <ol>
                    <li>Upload atau pilih video dari project</li>
                    <li>Klik <strong>Start Detection</strong></li>
                    <li>Tunggu proses selesai (progress bar akan muncul)</li>
                    <li>Review detected actions di panel kanan</li>
                    <li>Klik <strong>Export to Measurements</strong> untuk menambahkan ke element list</li>
                </ol>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🎯 Actions yang Dideteksi</h3>
                <ul>
                    <li><strong>Reach (R)</strong>: Gerakan tangan menuju objek</li>
                    <li><strong>Grasp (G)</strong>: Menggenggam objek</li>
                    <li><strong>Move (M)</strong>: Memindahkan objek</li>
                    <li><strong>Position (P)</strong>: Memposisikan objek dengan presisi</li>
                    <li><strong>Release (RL)</strong>: Melepas objek</li>
                    <li><strong>Hold (H)</strong>: Menahan objek di tempat</li>
                    <li><strong>Inspect (I)</strong>: Memeriksa/mengamati objek</li>
                    <li><strong>Idle (ID)</strong>: Tidak ada aktivitas</li>
                </ul>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>💡 Tips</h3>
                <ul>
                    <li>Pastikan operator terlihat jelas di video</li>
                    <li>Hindari video dengan pencahayaan buruk</li>
                    <li>Confidence score &gt;80% = deteksi akurat</li>
                    <li>Anda bisa manual correction setelah export</li>
                </ul>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>⚙️ Teknologi</h3>
                <p>Menggunakan <strong>TensorFlow.js MoveNet</strong> untuk pose detection dan rule-based classifier untuk Therblig classification.</p>
            </>
        )
    },
    'ml-data': {
        title: '🧠 Machine Learning Data - Help',
        content: (
            <>
                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>📌 Fungsi</h3>
                <p>Analisis konsistensi gerakan operator menggunakan konsep Machine Learning dengan Golden Cycle sebagai referensi standar.</p>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🚀 Cara Pakai</h3>
                <ol>
                    <li><strong>Set Golden Cycle</strong> (Gerakan Referensi):
                        <ul>
                            <li>📹 <strong>Capture Current</strong>: Ambil dari video saat ini</li>
                            <li>📤 <strong>Upload Video</strong>: Upload video gerakan standar</li>
                        </ul>
                    </li>
                    <li>Klik <strong>Start Analysis</strong> untuk mulai deteksi</li>
                    <li>Monitor real-time:
                        <ul>
                            <li><strong>Consistency Score</strong>: % kecocokan dengan Golden Cycle</li>
                            <li><strong>Anomaly Graph</strong>: Tren deviasi dari waktu ke waktu</li>
                            <li><strong>Live Skeleton Feed</strong>: Visualisasi pose detection</li>
                        </ul>
                    </li>
                </ol>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🤖 Teachable Machine</h3>
                <p>Fitur baru untuk menggunakan model custom dari Google Teachable Machine.</p>
                <ul>
                    <li><strong>Online Model</strong>: Paste URL model TM (contoh: <code>https://teachablemachine.withgoogle.com/models/.../</code>)</li>
                    <li><strong>Offline Model</strong>: Upload 3 file model (<code>model.json</code>, <code>metadata.json</code>, <code>weights.bin</code>)</li>
                    <li>Prediksi akan menggantikan logika Golden Cycle standar.</li>
                </ul>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>💡 Tips</h3>
                <ul>
                    <li>Upload video gerakan terbaik sebagai Golden Cycle</li>
                    <li>Threshold 80% = batas minimum konsistensi</li>
                    <li>Anomaly tinggi = perlu retraining operator</li>
                    <li>Gunakan TM untuk deteksi gerakan spesifik yang sulit dideteksi algoritma standar</li>
                </ul>
            </>
        )
    },
    'analysis': {
        title: '📊 Analysis Dashboard - Help',
        content: (
            <>
                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>📌 Fungsi</h3>
                <p>Dashboard visualisasi hasil analisis dengan charts dan summary statistics.</p>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>📊 Metrics</h3>
                <ul>
                    <li><strong>OEE</strong>: Availability × Performance × Quality</li>
                    <li><strong>Efficiency</strong>: Output Actual vs Standard</li>
                    <li><strong>Takt vs Cycle</strong>: Kesesuaian dengan demand</li>
                    <li><strong>Productivity Index</strong>: Indeks performa total</li>
                </ul>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>💡 Tips</h3>
                <ul>
                    <li>Pilih project dari dropdown untuk melihat analisis</li>
                    <li>Export chart sebagai image atau data ke Excel</li>
                    <li>Screenshot dashboard untuk dokumentasi</li>
                </ul>
            </>
        )
    },
    'statistical-analysis': {
        title: '📉 Statistical Analysis - Help',
        content: (
            <>
                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>📌 Fungsi</h3>
                <p>Analisis statistik mendalam untuk variabilitas proses dan kapabilitas sistem.</p>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>📊 Fitur</h3>
                <ul>
                    <li><strong>Summary Stats</strong>: Mean, Median, Std Dev, Min/Max</li>
                    <li><strong>Confidence Interval</strong>: 90%, 95%, 99%</li>
                    <li><strong>Process Capability</strong>: Cp, Cpk, Capable/Not Capable</li>
                    <li><strong>Control Chart</strong>: I-Chart dengan UCL/LCL</li>
                    <li><strong>Histogram</strong>: Distribusi data &amp; Outlier detection</li>
                </ul>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>💡 Tips</h3>
                <ul>
                    <li>Minimal 10 cycles untuk statistik valid</li>
                    <li>Cp/Cpk &gt; 1.33 = Process Capable</li>
                    <li>Export PDF Report untuk dokumentasi</li>
                </ul>
            </>
        )
    },
    'mtm-calculator': {
        title: '⏱️ MTM Calculator - Help',
        content: (
            <>
                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>📌 Fungsi</h3>
                <p>Kalkulasi waktu baku menggunakan metode Methods-Time Measurement (MTM-1).</p>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🚀 Cara Pakai</h3>
                <ol>
                    <li>Pilih <strong>Motion Type</strong> (Reach, Move, Grasp, etc)</li>
                    <li>Input parameter (Jarak, Case, Type)</li>
                    <li>Klik <strong>Add Motion</strong></li>
                    <li>TMU terhitung otomatis</li>
                </ol>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>💡 Konversi</h3>
                <p><strong>1 TMU = 0.036 detik</strong></p>
            </>
        )
    },
    'allowance-calculator': {
        title: '🔧 Allowance Calculator - Help',
        content: (
            <>
                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>📌 Fungsi</h3>
                <p>Menghitung kelonggaran (allowance) untuk penetapan waktu standar.</p>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>📊 Fitur</h3>
                <ul>
                    <li>Input Normal Time</li>
                    <li>Basic Allowances (Personal, Fatigue, Delay)</li>
                    <li>Variable Fatigue (Standing, Lifting, Lighting, etc)</li>
                    <li>Output: Standard Time final</li>
                </ul>
            </>
        )
    },
    'manual-creation': {
        title: '📘 Manual Creation - Help',
        content: (
            <>
                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>📌 Fungsi</h3>
                <p>Membuat, mengelola, dan mendistribusikan dokumen <strong>SOP / Work Instruction (WI)</strong> secara digital — dilengkapi AI, QR Code, Operator Mode, dan approval workflow.</p>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🚀 Cara Pakai</h3>
                <ol>
                    <li>Pilih proyek dari dropdown <strong>Select Project</strong>, atau klik <strong>New Manual</strong> untuk mulai dari awal</li>
                    <li>Isi metadata di tab <strong>Details</strong>: Doc Number, Version, Author, Status, Effective Date</li>
                    <li>Tambah langkah via tombol <strong>+ Add Step</strong> di panel kiri</li>
                    <li>Untuk setiap langkah:
                        <ul>
                            <li>Isi <strong>Step Title</strong> dan instruksi</li>
                            <li>Klik <strong>⚡ Generate</strong> untuk AI auto-generate instruksi dari judul</li>
                            <li>Klik <strong>✨ AI Improve</strong> untuk perbaiki teks yang sudah ditulis</li>
                            <li>Klik <strong>Capture from Video</strong> untuk ambil screenshot dari video</li>
                            <li>Upload <strong>banyak gambar</strong> — ditampilkan sebagai galeri thumbnail</li>
                            <li>Klik <strong>✏️ Markup</strong> pada gambar untuk anotasi (arrow, box, circle)</li>
                            <li>Tambahkan <strong>Notes / Warnings / Cautions</strong> jika perlu</li>
                            <li>Aktifkan <strong>🎙️ Voice Instruction</strong> untuk rekam instruksi suara per langkah</li>
                        </ul>
                    </li>
                    <li>Klik <strong>💾 Save</strong> untuk menyimpan ke database cloud</li>
                    <li>Klik <strong>👁️ Preview</strong> untuk melihat tampilan dokumen akhir</li>
                </ol>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>👷 Operator Mode</h3>
                <ul>
                    <li>Aktifkan tombol <strong>Operator</strong> di toolbar untuk tampilan eksekusi step-by-step</li>
                    <li>Operator bisa checklist setiap langkah dan mengisi data capture form</li>
                    <li>Instruksi <strong>suara diputar otomatis</strong> di setiap langkah (jika sudah direkam)</li>
                    <li>Di akhir sesi tampil <strong>Session Summary</strong> berisi semua data yang diisi operator</li>
                </ul>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>📱 QR Code &amp; Share</h3>
                <ul>
                    <li>Klik ikon <strong>QR (pink)</strong> di toolbar untuk membuka Quick Access QR</li>
                    <li>QR code mengarah langsung ke SOP ini — scan dari HP langsung membuka dokumen yang tepat</li>
                    <li><strong>Save QR Image</strong>: Unduh QR sebagai PNG untuk ditempel di mesin / area kerja</li>
                    <li><strong>Copy Link</strong>: Salin link langsung SOP ini untuk dibagikan ke tim</li>
                    <li>Klik ikon <strong>&lt;/&gt; Embed</strong> untuk mendapatkan kode iframe embed ke website / portal internal</li>
                </ul>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>✅ Approval Workflow</h3>
                <ul>
                    <li>Status dokumen: <strong>Draft → In Review → Approved → Released</strong></li>
                    <li>Atur <strong>Approval Matrix</strong> (Level, Role, Approver) di tab <strong>Management</strong></li>
                    <li>Kirim request approval dan pantau statusnya</li>
                    <li>Hanya role tertentu yang bisa mengubah status (Author, Reviewer, Approver)</li>
                </ul>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🕐 Version History</h3>
                <ul>
                    <li>Klik ikon <strong>Clock / Timeline</strong> di toolbar untuk membuka sidebar riwayat versi</li>
                    <li>Klik <strong>New Snapshot</strong> untuk menyimpan snapshot kondisi dokumen saat ini</li>
                    <li>Klik <strong>RESTORE</strong> pada snapshot lama untuk mengembalikan ke versi tersebut</li>
                </ul>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>📥 Import &amp; Export</h3>
                <ul>
                    <li><strong>📊 Excel</strong>: Import steps dari file Excel (kolom: Title, Instructions, Warning, Note)</li>
                    <li><strong>📝 Word</strong>: Import dari .docx (Heading = Judul Step, Paragraf = Instruksi)</li>
                    <li><strong>📄 PDF</strong>: Export dokumen siap cetak dengan layout pilihan</li>
                    <li><strong>📝 Word (.docx)</strong>: Export editable document</li>
                    <li><strong>📊 PowerPoint (.pptx)</strong>: Export presentation (1 slide per step)</li>
                    <li><strong>Layout PDF</strong>: Pilih Standard (gambar kiri, teks kanan), Compact Table, atau One Per Page</li>
                </ul>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🤖 AI Features</h3>
                <ul>
                    <li><strong>⚡ Generate</strong>: Auto-generate instruksi dari judul step</li>
                    <li><strong>✨ AI Improve</strong>: Perbaiki grammar &amp; clarity teks yang sudah ditulis</li>
                    <li><strong>🎥 AI Analyze Video</strong>: Analisis video penuh dan generate semua steps sekaligus</li>
                    <li><strong>💬 Mavi AI Chat</strong>: Tanya AI tentang konten manual yang sedang dibuat</li>
                    <li>Butuh <strong>API Key</strong> di Settings (Gemini / OpenAI / Custom)</li>
                </ul>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>✏️ Image Markup</h3>
                <ul>
                    <li><strong>↗ Arrow</strong>: Tunjuk area penting</li>
                    <li><strong>⬜ Box</strong>: Highlight area</li>
                    <li><strong>⭕ Circle</strong>: Tandai objek</li>
                    <li>3 warna: Merah, Hijau, Kuning</li>
                    <li><strong>↩ Undo</strong>: Batalkan markup terakhir</li>
                </ul>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>💡 Tips</h3>
                <ul>
                    <li>Gunakan <strong>AI Analyze Video</strong> untuk draft lengkap semua steps dalam sekali klik</li>
                    <li>QR Code cocok ditempel di mesin/area kerja agar operator bisa scan langsung dari HP</li>
                    <li>Gunakan <strong>Operator Mode</strong> untuk uji coba sebelum di-release ke lantai produksi</li>
                    <li>Buat <strong>Snapshot</strong> sebelum melakukan perubahan besar sebagai backup</li>
                    <li>Simpan metadata lengkap (Doc Number, Version, Author) untuk memudahkan document control</li>
                    <li>Compact Table layout cocok untuk quick reference, One Per Page untuk training slides</li>
                </ul>
            </>
        )
    },
    'teachable-machine': {
        title: '🤖 Teachable Machine Studio - Help',
        content: (
            <>
                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>📌 Fungsi</h3>
                <p>Pusat pengelolaan model AI kustom dan pembuatan data latihan untuk Google Teachable Machine.</p>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>✂️ Video Slicer &amp; Image Extraction</h3>
                <ol>
                    <li>Upload video proses kerja</li>
                    <li>Gunakan slider <strong>Start</strong> dan <strong>End</strong> untuk menandai gerakan spesifik</li>
                    <li>Klik <strong>Capture Clip</strong> untuk merekam potongan tersebut</li>
                    <li>Klik tombol 🖼️ (Extract Images) pada clip gallery untuk mengekstrak frame video menjadi file ZIP.</li>
                </ol>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🚀 Trainer: TM vs CVAT.ai</h3>
                <ul>
                    <li><strong>Google Teachable Machine</strong>: Ideal untuk prototipe cepat dan training pose/image sederhana langsung di browser.</li>
                    <li><strong>CVAT.ai (Professional)</strong>: Standar industri untuk anotasi dataset besar. Gunakan file ZIP dari Video Slicer untuk diupload ke CVAT untuk anotasi profesional.</li>
                </ul>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🧪 Load &amp; Test Model</h3>
                <ol>
                    <li>Setelah model siap, copy URL model (untuk TM) atau endpoint model kustom Anda.</li>
                    <li>Pilih tipe (Pose/Image) dan paste URL tersebut di MAVi.</li>
                    <li>Klik <strong>Load Model</strong>.</li>
                    <li>Gunakan model ini di <strong>Studio Model</strong> dengan memilih Rule Type: <strong>Teachable Machine</strong> atau <strong>CVAT / Custom Model</strong>.</li>
                </ol>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>💡 Tips</h3>
                <ul>
                    <li>Gunakan CVAT.ai jika Anda membutuhkan anotasi yang sangat presisi oleh tim industrial engineer.</li>
                    <li>Minimal 20-30 klip per kategori gerak untuk akurasi tinggi.</li>
                </ul>
            </>
        )
    }
};
