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
                    <li><strong>Histogram</strong>: Distribusi data & Outlier detection</li>
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
                <p>Membuat dokumen Instruksi Kerja (Work Instruction/SOP) visual dengan AI, dan multiple export formats.</p>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🚀 Cara Pakai</h3>
                <ol>
                    <li>Pilih proyek dengan video dari dropdown</li>
                    <li>Klik <strong>+ Add Step</strong> untuk menambah langkah</li>
                    <li>Untuk setiap langkah:
                        <ul>
                            <li>Isi <strong>Step Title</strong></li>
                            <li>Klik <strong>⚡ Generate</strong> untuk AI auto-generate instructions</li>
                            <li>Atau tulis manual, lalu klik <strong>✨ AI Improve</strong> untuk perbaikan grammar</li>
                            <li>Klik <strong>Capture from Video</strong> untuk ambil screenshot</li>
                            <li>Klik <strong>✏️ Markup</strong> pada gambar untuk annotasi (arrow, box, circle)</li>
                            <li>Tambahkan Notes/Warnings/Cautions jika perlu</li>
                        </ul>
                    </li>
                    <li>Pilih <strong>Layout Template</strong>:
                        <ul>
                            <li><strong>📐 Standard</strong>: Side-by-side (gambar kiri, text kanan)</li>
                            <li><strong>📋 Compact Table</strong>: Semua steps dalam tabel</li>
                            <li><strong>📄 One Per Page</strong>: 1 step per halaman</li>
                        </ul>
                    </li>
                    <li><strong>📥 Import Data</strong>:
                        <ul>
                            <li><strong>📊 Import Excel</strong>: Import steps dari Excel (Columns: Title, Instructions, Warning, Note)</li>
                            <li><strong>📝 Import Word</strong>: Import steps dari Word (Headings = Titles, Text = Instructions)</li>
                        </ul>
                    </li>
                    <li>Klik <strong>👁️ Preview Mode</strong> untuk melihat hasil</li>
                    <li>Export via <strong>📥 Export As...</strong>:
                        <ul>
                            <li><strong>📄 PDF</strong>: Dokumen siap print</li>
                            <li><strong>📝 Word (.docx)</strong>: Editable document</li>
                            <li><strong>📊 PowerPoint (.pptx)</strong>: Presentation slides</li>
                        </ul>
                    </li>
                </ol>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🤖 AI Features</h3>
                <ul>
                    <li><strong>⚡ Generate</strong>: Auto-generate instructions dari step title</li>
                    <li><strong>✨ AI Improve</strong>: Perbaiki grammar & clarity tanpa ubah meaning</li>
                    <li>Butuh API Key di Settings (Gemini/OpenAI/Custom)</li>
                </ul>


                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>✏️ Image Markup</h3>
                <ul>
                    <li><strong>↗ Arrow</strong>: Tunjuk area penting</li>
                    <li><strong>⬜ Box</strong>: Highlight area</li>
                    <li><strong>⭕ Circle</strong>: Tandai objek</li>
                    <li>3 warna: Merah, Hijau, Kuning</li>
                    <li><strong>↩ Undo</strong> untuk batalkan markup terakhir</li>
                </ul>

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>💡 Tips</h3>
                <ul>
                    <li>Gunakan <strong>AI Generate</strong> untuk draft cepat, lalu edit manual</li>
                    <li>Compact Table layout cocok untuk quick reference</li>
                    <li>One Per Page layout cocok untuk training slides</li>
                    <li>PowerPoint export otomatis 1 slide per step</li>
                    <li>Simpan metadata (Doc Number, Version, Author) untuk tracking</li>
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

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>✂️ Video Slicer & Image Extraction</h3>
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

                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🧪 Load & Test Model</h3>
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
