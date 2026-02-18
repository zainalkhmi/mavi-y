import React, { useState } from 'react';

function Help() {
    const [activeSection, setActiveSection] = useState('intro');

    const sections = {
        intro: {
            title: '🎯 Pengenalan MAVi',
            content: `
**MAVi (Motion Analysis & Visualization)** adalah aplikasi analisis gerakan berbasis web untuk:

✅ Menganalisis video kerja/operasi
✅ Mengukur waktu setiap elemen gerakan  
✅ Mengklasifikasikan aktivitas (Value-added, Non value-added, Waste)
✅ Menghitung standard time & productivity metrics
✅ Membandingkan sesi recording
✅ Simulasi improvement
            `
        },
        quick: {
            title: '⚡ Quick Start',
            content: `
**Workflow Dasar:**

1️⃣ **Upload Video** - Klik 🎬 Video, upload file video
2️⃣ **Mulai Pengukuran** - Tekan S (Start) dan E (End) saat video play
3️⃣ **Input Data** - Masukkan nama elemen & kategori (VA/NVA/Waste)
4️⃣ **Simpan** - Klik icon 💾 untuk save ke database
5️⃣ **Analisis** - Klik 📊 Analysis untuk lihat hasil

**Keyboard Shortcuts:**
• Space - Play/Pause
• S - Start measurement
• E - End measurement  
• ← / → - Previous/Next frame
            `
        },
        features: {
            title: '🎬 Fitur Utama',
            content: `
**Navigation Icons:**

🎬 **Video** - Workspace analisis video utama
📊 **Analysis** - Dashboard charts, OEE, & summary
🔄 **Rearrange** - Simulasi penyusunan ulang elemen
📈 **Cycle Analysis** - Analisis waktu cycle individual
Σ **Aggregation** - Agregasi cycle time dari multiple projects
⏱️ **Std Time** - Kalkulasi standard time dengan rating & allowance
🗑️ **Waste** - Simulasi eliminasi waste
📍 **Therblig** - Therblig flow diagram & layout analysis
📉 **Statistical** - Analisis statistik (Cp, Cpk, Control Chart)
⏱️ **MTM Calc** - Kalkulasi waktu baku metode MTM-1
🔧 **Allowance** - Kalkulasi kelonggaran & fatigue
🏆 **Best/Worst** - Analisis cycle terbaik vs terburuk
🎥 **Compare** - Video side-by-side comparison
📑 **Multi-Axial** - Analisis multi-project (Man-Machine/Two-Hand)
📘 **Manual** - Pembuatan manual kerja (Work Instruction)
🧠 **ML Data** - Machine Learning Consistency Check
📦 **Object Tracking** - Deteksi objek otomatis & flow analysis
🔮 **Predictive Maint** - Prediksi fatigue operator (AI)
📹 **Multi-Camera** - Analisis 3D Fusion dari 2 sudut pandang
🥽 **VR Training** - Mode pelatihan immersive untuk operator baru
📚 **Knowledge Base** - Repository templates & best practices
🗺️ **VSM Pro** - Value Stream Mapping dengan fitur TPS lanjut
🏭 **Layout Optimizer** - Optimasi tata letak area/fasilitas berbasis aliran material
❓ **Help** - Panduan penggunaan aplikasi

**Advanced TPS Tools:**

📊 **Yamazumi** - Visualisasi beban kerja (Work Balancing) vs Takt Time
🔄 **EPEI** - Every Part Every Interval (Analisis fleksibilitas)
🎯 **Pitch** - Heartbeat produksi (Takt Time x Pack Size)
🚛 **Milk Run** - Analisis logistik frekuensi & kapasitas truck
🪜 **Timeline Ladder** - Visualisasi otomatis Lead Time vs VA Time di VSM
📈 **OEE Metrics** - Monitoring Performance, Availability, & Quality pada proses

**Element Editor Tools:**

💾 - Simpan ke database
📊 - Export ke Excel
🔍 - Cari elemen
▲/▼ - Pindah urutan
✎ - Edit nama & kategori
✂️ - Split elemen
🗑 - Hapus elemen
            `
        },
        categories: {
            title: '🏷️ Kategorisasi',
            content: `
**Value-Added (VA):**
Aktivitas yang mengubah bentuk/fungsi produk dan customer mau bayar.
Contoh: Memasang komponen, mengelas, merakit

**Non Value-Added (NVA):**  
Aktivitas perlu tapi tidak menambah nilai langsung.
Contoh: Setup mesin, inspeksi, handling material

**Waste:**
Pemborosan yang bisa & harus dieliminasi.
Contoh: Menunggu, mencari alat, transport berlebihan, rework
            `
        },
        rating: {
            title: '⭐ Rating & Speed',
            content: `
**Rating Performance:**

⭐⭐⭐⭐⭐ (100%) - Operator sangat cepat & terampil
⭐⭐⭐⭐ (80%) - Operator di atas rata-rata
⭐⭐⭐ (60%) - Operator normal/standard
⭐⭐ (40%) - Operator di bawah rata-rata  
⭐ (20%) - Operator sangat lambat

**Rating Speed Playback:**
Jika elemen memiliki rating, toggle "⭐ Rating Speed" akan tersedia di playback controls. Video akan play dengan kecepatan sesuai average rating.

Contoh: Rating 80% → Speed 0.8x
            `
        },
        split: {
            title: '✂️ Element Split',
            content: `
**Kapan Digunakan:**
• Elemen terlalu panjang perlu detail breakdown
• Ingin analisis lebih granular

**Cara Menggunakan:**

1. Klik tombol ✂️ pada elemen di tabel
2. Masukkan waktu split (dalam detik)
   Contoh: Element 2.5s - 5.0s, split di 3.5s
3. Hasil: 2 elemen baru
   • "Nama Elemen (1)" : 2.5s - 3.5s (1.0s)
   • "Nama Elemen (2)" : 3.5s - 5.0s (1.5s)

Durasi otomatis dihitung ulang!
            `
        },
        video: {
            title: '🎬 Video Workspace',
            content: `
**Fungsi:**
Workspace utama untuk analisis video dan pengukuran waktu elemen kerja.

**Cara Pakai:**

1. Upload video dengan klik tombol "Upload Video"
2. Play video dan gunakan keyboard shortcuts:
   • Space - Play/Pause
   • S - Start measurement
   • E - End measurement
   • ← / → - Frame by frame
3. Input nama elemen dan kategori (VA/NVA/Waste)
4. Ulangi untuk semua elemen
5. Save ke database dengan tombol 💾

**Fitur:**
• Timeline measurement dengan visual markers
• Playback speed control (0.25x - 2x)
• Frame-by-frame navigation
• Element editor dengan drag & drop

**Tips:**
• Gunakan slow motion untuk gerakan cepat
• Frame-by-frame untuk presisi tinggi
• Zoom in untuk detail gerakan
            `
        },
        analysis: {
            title: '📊 Analysis Dashboard',
            content: `
**Fungsi:**
Dashboard visualisasi hasil analisis dengan charts dan summary statistics.

**Cara Pakai:**

1. Klik icon 📊 di header
2. Pilih project dari dropdown
3. Review charts dan metrics:
   • Pie chart - Distribusi VA/NVA/Waste
   • Bar chart - Durasi per elemen
   • Timeline - Sequence visualization
   • Summary stats - Total time, cycle time, dll

**Metrics Baru:**
• **OEE**: Availability x Performance x Quality
• **Efficiency**: Output Actual vs Standard
• **Takt vs Cycle**: Kesesuaian dengan demand
• **Productivity Index**: Indeks performa total

**Export:**
• Screenshot dashboard
• Export data ke Excel
• Export chart sebagai image
            `
        },
        statistical: {
            title: '📉 Statistical Analysis',
            content: `
**Fungsi:**
Analisis statistik mendalam untuk variabilitas proses dan kapabilitas sistem.

**Fitur:**
1. **Summary Stats**: Mean, Median, Std Dev, Min/Max
2. **Confidence Interval**: 90%, 95%, 99%
3. **Process Capability**: Cp, Cpk, Capable/Not Capable
4. **Control Chart**: I-Chart dengan UCL/LCL
5. **Histogram**: Distribusi data & Outlier detection

**Cara Pakai:**
1. Klik icon 📉 di header
2. Review statistik otomatis dari data pengukuran
3. Export PDF Report untuk dokumentasi
            `
        },
        mtm: {
            title: '⏱️ MTM Calculator',
            content: `
**Fungsi:**
Kalkulasi waktu baku menggunakan metode Methods-Time Measurement (MTM-1).

**Cara Pakai:**
1. Klik icon ⏱️ (MTM) di header
2. Pilih Motion Type (Reach, Move, Grasp, etc)
3. Input parameter (Jarak, Case)
4. Add Motion -> TMU terhitung otomatis

**Konversi:**
1 TMU = 0.036 detik
            `
        },
        allowance: {
            title: '🔧 Allowance Calculator',
            content: `
**Fungsi:**
Menghitung kelonggaran (allowance) untuk penetapan waktu standar.

**Fitur:**
• Input Normal Time
• Basic Allowances (Personal, Fatigue, Delay)
• Variable Fatigue (Standing, Lifting, Lighting, etc)
• Output: Standard Time final
            `
        },
        rearrange: {
            title: '🔄 Rearrange & Simulate',
            content: `
**Fungsi:**
Simulasi penyusunan ulang urutan elemen untuk optimasi cycle time.

**Cara Pakai:**

1. Klik icon 🔄 di header
2. Pilih project dari dropdown
3. Drag & drop elemen untuk ubah urutan
4. Lihat perubahan cycle time secara real-time
5. Compare before vs after
6. Save arrangement baru jika lebih baik

**Use Case:**
• Optimasi sequence kerja
• Eliminasi backtracking
• Grouping aktivitas sejenis
• Reduce setup/changeover time
• Improve flow efficiency

**Tips:**
• Group elemen VA bersamaan
• Minimize perpindahan antar workstation
• Eliminate unnecessary NVA
            `
        },
        cycleanalysis: {
            title: '📈 Cycle Time Analysis',
            content: `
**Fungsi:**
Analisis detail waktu cycle individual dengan breakdown per elemen.

**Cara Pakai:**

1. Klik icon 📈 di header
2. Pilih project dari dropdown
3. Review breakdown:
   • Cycle time total
   • Time per elemen
   • Percentage contribution
   • Kategori distribution

**Analisis:**
• Identifikasi elemen terlama
• Cari opportunity improvement
• Validasi balance antar elemen
• Track performance metrics

**Output:**
• Detailed time breakdown table
• Visual charts
• Export ke Excel
            `
        },
        aggregation: {
            title: 'Σ Cycle Time Aggregation',
            content: `
**Fungsi:**
Agregasi data cycle time dari multiple projects untuk analisis statistik.

**Cara Pakai:**

1. Klik icon Σ di header
2. Pilih multiple projects (min 2)
3. Review agregasi:
   • Average time per elemen
   • Min/Max/Std deviation
   • Frequency distribution
   • Outlier detection

**Metrics:**
• Mean cycle time
• Standard deviation
• Coefficient of variation
• Process capability

**Use Case:**
• Validasi consistency
• Identify variation
• Set standard time
• Process improvement tracking

**Tips:**
• Minimal 10 cycles untuk statistik valid
• Remove outliers jika ada special cause
• Track trend over time
            `
        },
        bestworst: {
            title: '🏆 Best/Worst Analysis',
            content: `
**Fungsi:**
Identifikasi cycle tercepat (best) dan terlambat (worst) dari multiple proyek.

**Cara Pakai:**

1. Klik icon 🏆 di header
2. Pilih minimal 2 proyek dari list
3. Review hasil:
   • 🏆 Best Cycle (tercepat)
   • 📉 Worst Cycle (terlambat)
   • ⚡ Potential Savings
   • 📊 Ranking semua cycle
   • 📋 Element comparison table

**Insight:**
Lihat element mana yang punya variasi waktu terbesar untuk fokus improvement.
            `
        },
        comparison: {
            title: '🎥 Video Comparison',
            content: `
**Fungsi:**
Bandingkan 2 video secara side-by-side dengan playback synchron.

**Cara Pakai:**

1. Klik icon 🎥 di header
2. Pilih Left Video & Right Video dari dropdown
3. Toggle 🔗 Synchronized Playback (on/off)
4. Control:
   • ▶/⏸ Play/Pause both videos
   • Speed: 0.5x, 1x, 1.5x, 2x
5. Lihat stats comparison di bawah

**Use Case:**
• Before vs After improvement
• Operator A vs Operator B
• Method 1 vs Method 2
            `
        },
        therblig: {
            title: '📍 Therblig Analysis',
            content: `
**Fungsi:**
Visualisasi Therblig flow diagram untuk analisis gerakan dan layout workstation.

**Cara Pakai:**

1. Klik icon 📍 di header
2. Pilih project dari dropdown
3. Chart otomatis generate dengan:
   • Therblig icons untuk setiap elemen
   • Flow lines menunjukkan urutan gerakan
   • Colors sesuai kategori (VA/NVA/Waste)

**Interaksi:**
• 🖱️ Drag icons untuk arrange layout
• 📏 Lihat sequence dan flow pattern
• 🎨 Warna garis sesuai kategori elemen

**Interpretasi:**
🔵 Blue Line = Value-added movement
🟡 Yellow Line = Non value-added movement
🔴 Red Line = Waste movement

**Analisis:**
✅ Identifikasi waste movement
✅ Optimasi sequence gerakan
✅ Improve workstation layout
✅ Reduce unnecessary motion
✅ Standardize work method

**Tips:**
• Banyak garis merah = banyak waste
• Crossing lines = layout kurang optimal
• Sequence panjang = perlu simplifikasi
            `
        },
        layoutoptimizer: {
            title: '🏭 Facility Layout Optimizer',
            content: `
**Fungsi:**
Merancang dan mengoptimasi tata letak area produksi/fasilitas berdasarkan aliran material, jarak perpindahan, biaya transport, serta constraint proses.

**Tujuan Utama:**
• Menurunkan total biaya perpindahan material (transport cost)
• Mengurangi jarak perpindahan antar area (total distance)
• Meminimalkan overlap dan pelanggaran jarak minimum
• Menyeimbangkan flow control (Push/Pull/FIFO/Kanban/CONWIP)
• Menjaga target lead time proses

**Struktur Tampilan (3 Panel):**

1️⃣ **Panel Kiri (Setup & Kontrol)**
• Pilih project
• Add Area / Add Flow
• Optimize / Save
• Mode interaksi: Select / Pan
• Zoom + / Zoom - / Reset View
• Scale & Snap (Grid px, Unit/Grid, satuan m/ft/px, Snap ON/OFF)
• Lead Time Constraint
• Import referensi: Image dan CAD (DWG/DXF)

2️⃣ **Panel Tengah (Canvas Layout)**
• Area kerja layout dengan ruler, grid, zoom, pan
• Drag-drop area untuk ubah posisi
• Visual flow antar area dengan panah berwarna sesuai control type
• Mode optimasi:
   - Calculate for Network Structure
   - Calculate for Line Structure

3️⃣ **Panel Kanan (Analisis & Detail)**
• KPI utama: Total Cost, Flow Cost, Total Distance, Lead Time, penalties
• Flow Control summary
• Editor detail flow matrix
• Daftar skenario hasil optimasi
• Properti area terpilih (nama, ukuran, lock/unlock)
• Pengaturan ukuran canvas & opacity background

**Workflow Rekomendasi (Step-by-step):**

1. Pilih Project
2. Tambahkan Area kerja sesuai workstation/departemen
3. Tambahkan Flow antar area (from-to)
4. Isi parameter flow:
   • Frequency
   • Unit Cost
   • Control Type
   • Buffer Limit, Reorder Point
   • Base Lead Time, Handling Time
   • Transport Speed, Signal Qty
5. Atur skala layout (grid dan unit nyata)
6. Aktifkan Snap untuk positioning presisi
7. Jalankan **Optimize**
8. Bandingkan skenario yang dihasilkan
9. Pilih skenario terbaik berdasarkan KPI
10. **Save** ke project

**Penjelasan KPI:**
• **Total Cost**: indikator utama objective function
• **Flow Cost**: akumulasi biaya aliran antar area
• **Total Distance**: total jarak perpindahan berbobot frekuensi
• **Average/Total Lead Time**: estimasi waktu aliran sistem
• **Overlap Penalty**: penalti area saling tumpang tindih
• **Spacing Penalty**: penalti jika jarak area kurang dari batas minimum
• **Flow Control Penalty**: penalti dari pengaturan control tidak ideal
• **Structure Penalty**: penalti ketidaksesuaian mode optimasi dengan pola layout
• **Lead Time Penalty**: penalti jika melewati target lead time

**Mode Struktur (Line vs Network):**
• Sistem akan mendeteksi struktur layout secara otomatis (Detected Structure)
• **Line** cocok untuk aliran searah minim backflow
• **Network** cocok untuk aliran bercabang/kompleks
• Jika mode optimasi tidak cocok dengan struktur terdeteksi, warning akan muncul

**Flow Control Types:**
• **Push**: produksi dorong berdasarkan jadwal
• **Pull / Supermarket**: produksi tarik berbasis kebutuhan downstream
• **FIFO Lane**: aliran first-in-first-out
• **Kanban Signal**: replenishment berbasis sinyal
• **CONWIP**: kontrol WIP total pada sistem

**Fitur CAD & Background:**
• Import **Image** untuk floorplan referensi visual
• Import **DWG/DXF** sebagai metadata referensi awal
• Opacity background dapat diatur agar area dan flow tetap terbaca

**Tips Praktis:**
• Mulai dari layout baseline aktual, lalu optimize bertahap
• Lock area yang tidak boleh dipindah (mesin fixed/utilitas)
• Pastikan skala grid sesuai kondisi lapangan
• Gunakan frequency berdasarkan data historis, bukan asumsi kasar
• Evaluasi trade-off biaya vs lead time, bukan hanya satu KPI
• Simpan setiap iterasi penting untuk pembandingan

**Troubleshooting:**
• **Optimize tidak menghasilkan perbaikan signifikan:**
  Cek kelengkapan flow, frequency, unit cost, dan constraint
• **Layout terasa tidak realistis:**
  Aktifkan Snap, sesuaikan grid scale, lock area fixed
• **Flow line membingungkan:**
  Kurangi flow yang tidak relevan atau pisahkan per value stream
• **Save gagal:**
  Pastikan project sudah dipilih sebelum menyimpan

**Best Practice Implementasi di Lapangan:**
• Validasi hasil optimasi dengan tim IE, produksi, dan material handling
• Uji skenario di area pilot sebelum deployment penuh
• Dokumentasikan perubahan layout dan dampaknya (cost, distance, lead time)
• Lakukan review berkala setelah volume/varian produk berubah
            `
        },

        stdtime: {
            title: '⏱️ Standard Time',
            content: `
**Formula:**
Standard Time = Normal Time × (1 + Allowances)

**Langkah:**

1. Rekam minimal 10 cycles
2. Beri rating setiap elemen (1-5 bintang)
3. Klik ⏱️ Std Time
4. Select projects dengan rating
5. Set allowances:
   • Personal (5-10%)
   • Fatigue (5-15%)
   • Delay (5-10%)
6. Review & export hasil

**Output:**
• Observed Time (rata-rata actual)
• Normal Time (adjusted by rating)
• Standard Time (final)
            `
        },
        tips: {
            title: '💡 Tips & Best Practices',
            content: `
**Pengukuran Akurat:**
✅ Gunakan frame-by-frame (← →) untuk presisi
✅ Zoom in untuk gerakan detail
✅ Gunakan slow motion (0.25x - 0.5x)

**Data Quality:**
✅ Rekam minimal 10 cycles untuk statistik
✅ Fokus 1 operasi per sesi  
✅ Pastikan lighting & angle video bagus
✅ Selalu export data untuk backup

**Workflow Optimization:**
✅ Gunakan Aggregation untuk validasi data
✅ Best/Worst analysis untuk cek variasi
✅ Comparison untuk track improvement
✅ Standard time untuk work standardization
            `
        },
        troubleshooting: {
            title: '🔧 Troubleshooting',
            content: `
**Video tidak muncul:**
✅ Cek format: MP4, WebM, Ogg supported
✅ Cek ukuran file (max ~500MB)
✅ Klik tombol Refresh di sidebar (ikon 🔄)

**Data hilang setelah refresh:**
⚠️ Data belum disimpan ke database
✅ Selalu klik 💾 sebelum close tab

**Performance lambat:**
✅ Kurangi zoom level
✅ Close tab browser lain
✅ Gunakan Chrome/Edge (recommended)

**Split tidak bekerja:**
✅ Pastikan waktu split berada di range element
✅ Format: angka desimal (contoh: 3.5)
            `
        },
        multiaxial: {
            title: '📑 Multi-Axial Analysis',
            content: `
**Fungsi:**
Analisis dan perbandingan multi-proyek dalam satu timeline (Gantt Chart). Ideal untuk Man-Machine Chart atau Two-Hand Process Chart.

**Cara Pakai:**
1. Klik icon 📑 di header
2. Pilih beberapa proyek sekaligus dari dropdown
3. Analisis visualisasi lane yang terpisah untuk setiap proyek
4. Gunakan zoom slider untuk detail waktu

**Use Case:**
• Membandingkan aktivitas Operator vs Mesin
• Analisis gerakan Tangan Kiri vs Tangan Kanan
• Membandingkan dua operator yang bekerja paralel
            `
        },
        manualcreation: {
            title: '📘 Manual Creation',
            content: `
**Fungsi:**
Membuat dokumen Instruksi Kerja (Work Instruction/SOP) visual dengan mengambil gambar langsung dari video.

**Cara Pakai:**
1. Klik icon 📘 di header
2. Pilih proyek dengan video
3. Untuk setiap langkah kerja:
   • Play/Seek video ke posisi yang tepat
   • Klik tombol **📸 Capture**
   • Isi Deskripsi, Key Points, dan Safety Notes
4. Klik **Export PDF** untuk mengunduh dokumen

**Fitur:**
• Auto-capture frame video resolusi tinggi
• Format tabel standar industri
• Export PDF siap cetak
            `
        },
        mldata: {
            title: '🧠 Machine Learning Data',
            content: `
**Fungsi:**
Analisis konsistensi gerakan operator menggunakan konsep Machine Learning dengan Golden Cycle sebagai referensi standar.

**Cara Pakai:**

1. Klik icon 🧠 di header
2. **Set Golden Cycle** (Gerakan Referensi):
   • **Capture Current**: Ambil dari video saat ini
   • **Upload Video**: Upload video gerakan standar
3. Klik **Start Analysis** untuk mulai deteksi
4. Monitor real-time:
   • Consistency Score (% kecocokan)
   • Anomaly Graph (tren deviasi)
   • Live Skeleton Feed (visualisasi)

**Fitur:**
• **Golden Cycle**: Gerakan referensi "sempurna" sebagai standar
• **Consistency Gauge**: Indikator % kecocokan real-time
• **Anomaly Detection**: Deteksi penyimpangan otomatis
• **Trend Graph**: Grafik konsistensi dari waktu ke waktu
• **Live Visualization**: Canvas overlay untuk pose detection

**Use Case:**
• Validasi konsistensi gerakan operator
• Training operator baru dengan standar
• Quality control gerakan kerja
• Identifikasi variasi yang tidak sesuai SOP

**Tips:**
• Upload video gerakan terbaik sebagai Golden Cycle
• Threshold 80% = batas minimum konsistensi
• Anomaly tinggi = perlu retraining operator
            `
        },
        multicamera: {
            title: '📹 Multi-Camera 3D Fusion',
            content: `
**Fungsi:**
Analisis ergonomi RULA/REBA yang lebih akurat dengan menggabungkan data dari 2 sudut pandang kamera (Front & Side View).

**Cara Pakai:**

1. Klik icon 📹 di header
2. **Pilih Video:**
   • FRONT VIEW (X-Axis): Video tampak depan
   • SIDE VIEW (Z-Axis): Video tampak samping
3. **Sinkronisasi:**
   • Kedua video diputar bersamaan
   • Kontrol Play/Pause, Speed, Zoom
4. **Mulai Analisis:**
   • Klik "Start 3D Fusion Analysis"
   • Skeleton overlay muncul pada kedua video
5. **Lihat Hasil:**
   • RULA/REBA scores di panel kanan
   • Skor real-time saat video berjalan

**Keunggulan:**
✅ Trunk Flexion lebih akurat (Side View Z-axis)
✅ Shoulder Abduction lebih akurat (Front View X-axis)
✅ Presisi tinggi dari kombinasi 2 view

**Tips:**
• Kedua video harus merekam aktivitas yang sama
• Posisikan kamera tegak lurus (90°)
• Gunakan slow speed (0.5x) untuk detail
            `
        },
        vrtraining: {
            title: '🥽 VR Training Mode',
            content: `
**Fungsi:**
Mode pelatihan immersive untuk operator baru dengan instruksi step-by-step yang disinkronkan dengan video Standard Work.

**Cara Pakai:**

1. Klik icon 🥽 di header
2. **Persiapan:**
   • Project harus punya measurements
   • Video sudah di-load
3. **Mulai Training:**
   • Klik Play atau tekan Spacebar
   • HUD menampilkan step saat ini otomatis
4. **Navigasi:**
   • Previous/Next atau arrow keys
   • "Enter VR" untuk fullscreen
5. **Drawing (Opsional):**
   • Klik "🖊 Drawing Tools"
   • Pilih tool (pen, arrow, circle, dll)
   • Gambar di video untuk highlight

**Fitur:**
• Immersive Video Player dengan zoom 50%-300%
• HUD: Current Step, Next Step, Progress Bar
• Drawing Tools: Pen, Line, Arrow, Rectangle, Circle, Text
• 6 Colors: Cyan, Red, Green, Yellow, Magenta, White

**Keyboard Shortcuts:**
• Space: Play/Pause
• ← →: Previous/Next Step
• F: Toggle Fullscreen

**Use Case:**
• Training operator baru
• Refresher training
• Quality control training
• Safety procedure training
            `
        },
        knowledgebase: {
            title: '📚 Knowledge Base & Best Practices',
            content: `
**Fungsi:**
Repository of standard work dan best practices untuk standardisasi metode kerja across plants/lines.

**Cara Pakai:**

**Menambah Item:**
1. Klik icon 📚 di header
2. Klik "+ Add New Item"
3. Isi title, description, type
4. Upload video (jika type = video)
5. Pilih category dan industry
6. Add tags
7. Save

**Browse & Search:**
1. Search bar untuk text search
2. Filters untuk Type/Category/Industry
3. Sort by: Newest, Most Used, Highest Rated
4. Grid/List view toggle
5. Klik item untuk detail

**Rating:**
1. Buka item detail
2. Klik "Rate This Item"
3. Pilih 1-5 stars
4. Add feedback (optional)
5. Submit

**Use Template:**
1. Find template
2. Open detail
3. Click "Use This Template"
4. New project created

**Fitur:**
• Template library (save & reuse projects)
• Video best practices (upload & share)
• Search & filter (Type, Category, Industry)
• Rating system (5-star + feedback)
• Tag organization
• Usage tracking
• View modes (Grid/List)

**Database:**
• SQLite (local storage)
• Auto-save
• Persistent data

**Use Case:**
• Standardization across plants
• Share best practices
• Training materials
• Template reuse
• Knowledge retention
            `
        },
        objecttracking: {
            title: '📦 Object Detection & Tracking',
            content: `
**Fungsi:**
Mendeteksi dan melacak pergerakan objek (tools, parts, hands) secara otomatis menggunakan AI untuk analisis flow.

**Cara Pakai:**
1. Klik icon 📦 di header
2. Video akan diproses otomatis
3. Filter objek: person, bottle, cell phone, dll
4. Toggle "Show Trails" untuk melihat jejak pergerakan

**Output:**
• Jumlah objek terdeteksi
• Visual bounding boxes & trails
• Koordinat pergerakan

**Use Case:**
• Hitung frekuensi pengambilan part
• Analisis layout (spaghetti diagram)
• Safety monitoring
            `
        },
        predictivemaintenance: {
            title: '🔮 Predictive Maintenance AI',
            content: `
**Fungsi:**
Prediksi kelelahan operator (fatigue) berdasarkan analisis tren cycle time.

**Cara Pakai:**
1. Klik icon 🔮
2. Lakukan pengukuran cycle time (min 3 cycles)
3. Monitor Gauge & Grafik

**Indikator:**
🟢 **Green**: Stabil & Fresh (Energy > 70%)
🟡 **Yellow**: Warning/Slowing Down (Energy 40-70%)
🔴 **Red**: Critical Fatigue (Energy < 40%)

**Analisis:**
• **Trend**: Stable, Declining, Improving
• **Variability**: Konsistensi gerakan
• **Prediction**: Estimasi performa 10 cycle ke depan

**Recommendation:**
Sistem akan menyarankan "Micro-break" jika fatigue terdeteksi untuk menjaga kualitas dan safety.
            `
        },
        tpsadv: {
            title: '🚀 Fitur TPS Lanjutan',
            content: `
**Yamazumi Chart:**
Visualisasi beban kerja setiap operator dibandingkan dengan Takt Time. Membantu identifikasi bottleneck atau operator yang idle (mura).
✅ Fitur: Takt Time Line, Bar chart per process, Save image.

**EPEI Analysis:**
Every Part Every Interval. Menghitung seberapa fleksibel lini produksi Anda dalam melakukan changeover produk.
✅ Fitur: Flexibility status (Healthy/Warning), SMED recommendations.

**Pitch & Takt Time:**
Menghitung Heartbeat (Pitch) produksi berdasarkan Takt Time dan standar Pack Size Customer.
✅ Fitur: Display di metrics bar bawah VSM, input pack size di Customer node.

**Milk Run Logistics:**
Analisis pengiriman material dengan frekuensi dan kapasitas truck yang terintegrasi.
✅ Fitur: Logistics data table di Truck symbol, Lead Time impact.

**Timeline Ladder:**
Tangga waktu otomatis di bagian bawah VSM yang memisahkan Lead Time (inventory) dan Value-Added Time (process).
            `
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', gap: '20px', padding: '20px', backgroundColor: 'var(--bg-secondary)' }}>
            {/* Sidebar Navigation */}
            <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '5px', overflowY: 'auto', borderRight: '1px solid #444', paddingRight: '15px' }}>
                <h2 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)', fontSize: '1.3rem' }}>📚 Panduan</h2>
                {Object.entries(sections).map(([key, section]) => (
                    <button
                        key={key}
                        onClick={() => setActiveSection(key)}
                        style={{
                            padding: '10px 15px',
                            backgroundColor: activeSection === key ? 'var(--accent-blue)' : '#2a2a2a',
                            border: '1px solid #444',
                            borderRadius: '6px',
                            color: '#fff',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (activeSection !== key) e.target.style.backgroundColor = '#333';
                        }}
                        onMouseLeave={(e) => {
                            if (activeSection !== key) e.target.style.backgroundColor = '#2a2a2a';
                        }}
                    >
                        {section.title}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px' }}>
                <div style={{ backgroundColor: '#1a1a1a', padding: '30px', borderRadius: '8px', border: '1px solid #333' }}>
                    <h1 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)', fontSize: '2rem' }}>
                        {sections[activeSection].title}
                    </h1>
                    <div style={{
                        color: '#ddd',
                        fontSize: '1rem',
                        lineHeight: '1.8',
                        whiteSpace: 'pre-line'
                    }}>
                        {sections[activeSection].content.split('\n').map((line, idx) => {
                            // Handle bold text
                            if (line.startsWith('**') && line.endsWith('**')) {
                                return <div key={idx} style={{ fontWeight: 'bold', color: '#4da6ff', marginTop: '15px', fontSize: '1.1rem' }}>{line.replace(/\*\*/g, '')}</div>;
                            }
                            // Handle bullet points
                            if (line.trim().startsWith('•') || line.trim().startsWith('✅') || line.trim().startsWith('⚠️')) {
                                return <div key={idx} style={{ marginLeft: '20px', marginTop: '8px' }}>{line}</div>;
                            }
                            // Handle numbered lists
                            if (/^\d+[️⃣]/.test(line.trim())) {
                                return <div key={idx} style={{ marginLeft: '20px', marginTop: '10px', fontWeight: 'bold', color: '#0a5' }}>{line}</div>;
                            }
                            // Regular text
                            return line.trim() ? <div key={idx} style={{ marginTop: '8px' }}>{line}</div> : <div key={idx} style={{ height: '10px' }}></div>;
                        })}
                    </div>
                </div>

                {/* Quick Links */}
                <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#4da6ff' }}>🔗 Quick Links</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '0.85rem' }}>
                        <div style={{ padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '4px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setActiveSection('quick')}>
                            ⚡ Quick Start
                        </div>
                        <div style={{ padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '4px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setActiveSection('features')}>
                            🎬 Fitur Utama
                        </div>
                        <div style={{ padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '4px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setActiveSection('layoutoptimizer')}>
                            🏭 Layout Optimizer
                        </div>
                        <div style={{ padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '4px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setActiveSection('tips')}>
                            💡 Tips
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', padding: '10px' }}>
                    <p>MAVi v2.3 - Motion Analysis & Visualization</p>
                    <p>Untuk panduan lengkap, lihat file: <code style={{ backgroundColor: '#2a2a2a', padding: '2px 6px', borderRadius: '3px' }}>PANDUAN_PENGGUNAAN.md</code></p>
                </div>
            </div>
        </div>
    );
}

export default Help;
