export const modules = [
    {
        id: 'getting-started',
        title: '🚀 Getting Started',
        description: 'Kenalan dengan MAVi dan fitur-fitur dasarnya',
        duration: '15 menit',
        color: '#4CAF50',
        objectives: [
            { text: 'Memahami konsep dan fungsi utama MAVi', level: 'understand' },
            { text: 'Mampu menavigasi aplikasi dengan lancar', level: 'apply' },
            { text: 'Dapat upload dan memutar video untuk analisis', level: 'apply' },
            { text: 'Mampu membuat project baru', level: 'create' }
        ],
        prerequisite: null,
        hasCertificate: true,
        quiz: {
            passingScore: 70,
            xp: 100,
            questions: [
                {
                    id: 'gs-q1',
                    question: 'Apa kepanjangan dari MAVi?',
                    options: [
                        'Motion Analysis Video Intelligence',
                        'Machine Automated Video Inspection',
                        'Manufacturing Automation Visual Interface',
                        'Manual Analysis Video Integration'
                    ],
                    correctAnswer: 0,
                    explanation: 'MAVi = Motion Analysis Video Intelligence, sebuah aplikasi untuk analisis video dalam Industrial Engineering.'
                },
                {
                    id: 'gs-q2',
                    question: 'Di mana lokasi sidebar menu navigasi di MAVi?',
                    options: ['Sebelah kiri', 'Sebelah kanan', 'Di atas', 'Di bawah'],
                    correctAnswer: 1,
                    explanation: 'Sidebar menu terletak di sebelah kanan layar untuk akses cepat ke berbagai fitur.'
                },
                {
                    id: 'gs-q3',
                    question: 'Format video apa saja yang didukung MAVi?',
                    options: ['Hanya MP4', 'MP4 dan AVI', 'MP4, WebM, dan AVI', 'Semua format video'],
                    correctAnswer: 2,
                    explanation: 'MAVi mendukung format MP4, WebM, dan AVI untuk analisis video.'
                }
            ]
        },
        lessons: [
            {
                id: 'gs-1',
                title: 'Apa itu MAVi?',
                type: 'video',
                duration: '3 min',
                xp: 20,
                content: {
                    description: 'MAVi (Motion Analysis Video Intelligence) adalah aplikasi analisis video untuk Industrial Engineering yang membantu menganalisis proses kerja, mengukur waktu, dan mengidentifikasi waste.',
                    keyPoints: [
                        'Analisis video berbasis AI untuk time & motion study',
                        'Terintegrasi dengan metodologi TPS (Toyota Production System)',
                        'Mendukung pembuatan SOP dan Work Instruction otomatis',
                        'Kolaborasi real-time dan knowledge sharing'
                    ],
                    tryIt: null,
                    videoUrl: 'https://www.youtube.com/watch?v=z6_A96_P3F0'
                }
            },
            {
                id: 'gs-2',
                title: 'Navigasi Aplikasi',
                type: 'interactive',
                duration: '5 min',
                xp: 20,
                content: {
                    description: 'Pelajari cara menavigasi menu sidebar, shortcut keyboard, dan layout aplikasi.',
                    keyPoints: [
                        'Sidebar menu di sebelah kanan untuk akses cepat',
                        'Klik icon untuk berpindah antar fitur',
                        'Hover untuk melihat tooltip nama fitur',
                        'Toggle sidebar dengan tombol panah'
                    ],
                    tryIt: '/',
                    videoUrl: 'https://www.youtube.com/watch?v=P7p_e2G1p_8'
                }
            },
            {
                id: 'gs-3',
                title: 'Upload Video Pertama',
                type: 'hands-on',
                duration: '5 min',
                xp: 20,
                content: {
                    description: 'Langkah pertama adalah upload video proses kerja yang akan dianalisis.',
                    keyPoints: [
                        'Klik tombol Upload atau drag & drop video',
                        'Format yang didukung: MP4, WebM, AVI',
                        'Video akan tampil di Video Panel sebelah kiri',
                        'Gunakan kontrol playback untuk navigasi video'
                    ],
                    tryIt: '/',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'gs-4',
                title: 'Membuat Project Baru',
                type: 'hands-on',
                duration: '2 min',
                xp: 20,
                content: {
                    description: 'Organisasi kerja dengan membuat project untuk menyimpan analisis.',
                    keyPoints: [
                        'Klik "New Project" dari menu',
                        'Beri nama project yang deskriptif',
                        'Pilih video yang akan dianalisis',
                        'Project tersimpan otomatis di database lokal'
                    ],
                    tryIt: '/',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            }
        ],
        practice: {
            title: 'Misi 1: Ground Zero 🚀',
            description: 'Ayo mulai dengan setup project pertamamu. Tanpa project, analisis tidak bisa disimpan!',
            tasks: [
                'Upload video demo (apa saja)',
                'Buat project baru dengan nama "Latihan MAVi 1"',
                'Coba buka menu sidebar dan explore minimal 3 fitur'
            ],
            actionLabel: 'Mulai Praktek Sekarang',
            actionLink: '/'
        }
    },
    {
        id: 'time-measurement',
        title: '⏱️ Time & Motion Study',
        description: 'Belajar mengukur waktu dan breakdown elemen kerja',
        duration: '30 menit',
        color: '#2196F3',
        objectives: [
            { text: 'Memahami konsep Time & Motion Study', level: 'understand' },
            { text: 'Mampu mengoperasikan Element Editor', level: 'apply' },
            { text: 'Dapat mengklasifikasikan Therblig', level: 'analyze' },
            { text: 'Mampu menganalisis VA/NVA activities', level: 'analyze' }
        ],
        prerequisite: 'getting-started',
        hasCertificate: true,
        quiz: {
            passingScore: 70,
            xp: 100,
            questions: [
                {
                    id: 'tm-q1',
                    question: 'Apa fungsi utama Element Editor di MAVi?',
                    options: [
                        'Edit video',
                        'Mengukur waktu dan breakdown elemen kerja',
                        'Membuat animasi',
                        'Export data'
                    ],
                    correctAnswer: 1,
                    explanation: 'Element Editor digunakan untuk mengukur waktu dan memecah proses menjadi elemen-elemen kerja.'
                },
                {
                    id: 'tm-q2',
                    question: 'Berapa jumlah gerakan dasar Therblig?',
                    options: ['10', '15', '18', '21'],
                    correctAnswer: 2,
                    explanation: 'Terdapat 18 gerakan dasar Therblig yang dikembangkan oleh Gilbreth.'
                },
                {
                    id: 'tm-q3',
                    question: 'Apa yang dimaksud dengan VA (Value Added)?',
                    options: [
                        'Aktivitas yang menambah biaya',
                        'Aktivitas yang mengubah bentuk/fungsi produk',
                        'Aktivitas menunggu',
                        'Aktivitas transportasi'
                    ],
                    correctAnswer: 1,
                    explanation: 'Value Added adalah aktivitas yang mengubah bentuk atau fungsi produk dari perspektif pelanggan.'
                }
            ]
        },
        lessons: [
            {
                id: 'tm-1',
                title: 'Element Editor Basics',
                type: 'video',
                duration: '5 min',
                content: {
                    description: 'Element Editor adalah tools utama untuk mengukur waktu dan breakdown proses.',
                    keyPoints: [
                        'Klik Start Measurement untuk mulai pengukuran',
                        'Klik End Measurement untuk selesai',
                        'Berikan nama element yang spesifik',
                        'Pilih tipe Therblig yang sesuai'
                    ],
                    tryIt: '/',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'tm-2',
                title: 'Keyboard Shortcuts',
                type: 'interactive',
                duration: '5 min',
                content: {
                    description: 'Gunakan shortcut keyboard untuk efisiensi pengukuran.',
                    keyPoints: [
                        'Tekan "Space" untuk Play/Pause video',
                        'Tekan "Arrow Right/Left" untuk navigasi frame',
                        'Tekan "S" untuk Start Measurement',
                        'Tekan "E" untuk End Measurement'
                    ],
                    tryIt: '/',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },

            {
                id: 'tm-4',
                title: 'Value Added Analysis',
                type: 'hands-on',
                duration: '5 min',
                xp: 25,
                content: {
                    description: 'Identifikasi aktivitas yang memberikan nilai tambah.',
                    keyPoints: [
                        'VA (Value Added) - aktivitas yang mengubah bentuk/fungsi',
                        'NVA (Non-Value Added) - waste yang harus dihilangkan',
                        'NNVA (Necessary NVA) - perlu tapi tidak menambah nilai',
                        'Tandai setiap element dengan klasifikasi yang tepat'
                    ],
                    tryIt: '/',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'tm-5',
                title: 'Cycle Time Analysis',
                type: 'hands-on',
                duration: '7 min',
                xp: 30,
                content: {
                    description: 'Analisis cycle time dan identifikasi bottleneck.',
                    keyPoints: [
                        'Ukur beberapa cycle untuk data yang valid',
                        'Bandingkan cycle time antar operator',
                        'Identifikasi variasi dan penyebabnya',
                        'Gunakan Best/Worst Cycle untuk perbandingan'
                    ],
                    tryIt: '/comparison',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'tm-6',
                title: 'Rearrangement',
                type: 'hands-on',
                duration: '6 min',
                xp: 30,
                content: {
                    description: 'Optimalkan urutan elemen kerja untuk meningkatkan efisiensi.',
                    keyPoints: [
                        'Simulasi urutan kerja baru di Rearrangement dashboard',
                        'Lihat dampak terhadap total lead time',
                        'Identifikasi urutan paling optimal untuk balancing',
                        'Export hasil rearrangement sebagai referensi SOP baru'
                    ],
                    tryIt: '/rearrangement',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            }
        ],
        practice: {
            title: 'Misi 2: Time Master ⏱️',
            description: 'Saatnya mengukur kecepatan kerja! Gunakan Element Editor untuk membedah gerakan.',
            tasks: [
                'Ukur minimal 3 elemen kerja di video',
                'Tandai elemen mana yang VA dan mana yang NVA',
                'Coba gunakan shortcut keyboard S dan E'
            ],
            actionLabel: 'Buka Video Workspace',
            actionLink: '/'
        }
    },
    {
        id: 'ai-features',
        title: '🧠 AI Features',
        description: 'Manfaatkan kekuatan AI untuk analisis otomatis',
        duration: '25 menit',
        color: '#FF9800',
        hasCertificate: true,
        lessons: [
            {
                id: 'ai-1',
                title: 'Studio Model',
                type: 'video',
                duration: '6 min',
                xp: 30,
                content: {
                    description: 'Buat model analisis gerakan dengan aturan dan kondisi.',
                    keyPoints: [
                        'Definisikan rule-based model untuk deteksi gerakan',
                        'Set kondisi dan threshold untuk validasi',
                        'Test model dengan video sample',
                        'Export model untuk digunakan dalam compliance monitoring'
                    ],
                    tryIt: '/studio-model',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'ai-2',
                title: 'Action Recognition',
                type: 'interactive',
                duration: '7 min',
                content: {
                    description: 'AI mengenali aksi dan gerakan secara otomatis.',
                    keyPoints: [
                        'Upload video dan jalankan AI recognition',
                        'AI akan mendeteksi jenis aksi yang dilakukan',
                        'Review dan koreksi hasil deteksi',
                        'Export hasil untuk analisis lanjutan'
                    ],
                    tryIt: '/action-recognition',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'ai-3',
                title: 'Real-time Compliance',
                type: 'hands-on',
                duration: '8 min',
                content: {
                    description: 'Monitor kepatuhan SOP secara real-time dengan AI.',
                    keyPoints: [
                        'Hubungkan kamera live atau IP camera',
                        'AI akan membandingkan dengan standar',
                        'Alert otomatis jika ada penyimpangan',
                        'Log semua anomali untuk review'
                    ],
                    tryIt: '/realtime-compliance',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'ai-4',
                title: 'Video Intelligence',
                type: 'interactive',
                duration: '5 min',
                content: {
                    description: 'Tanya jawab dengan AI tentang isi video.',
                    keyPoints: [
                        'Upload video ke Gemini AI',
                        'Ajukan pertanyaan dalam bahasa natural',
                        'AI akan menganalisis dan menjawab',
                        'Gunakan untuk insight mendalam'
                    ],
                    tryIt: '/studio-model',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'ai-5',
                title: 'AI Accuracy & Calibration',
                type: 'video',
                duration: '10 min',
                xp: 40,
                content: {
                    description: 'Pelajari cara kerja AI dalam mengenali gerakan dan cara mengoptimalkan akurasinya.',
                    keyPoints: [
                        'Memahami Confidence Threshold (Ambang Batas 0.6)',
                        'Akurasi Heuristik: Reach (95%), Grasp (85%), Move (92%)',
                        'Pentingnya kualitas video: Kamera statis dan pencahayaan terang',
                        'Cara kerja koordinat 33 titik sendi tubuh (Pose Estimation)',
                        'Integrasi model kustom via Teachable Machine'
                    ],
                    tryIt: '/action-recognition',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'ai-6',
                title: 'End-to-End AI Deployment',
                type: 'hands-on',
                duration: '15 min',
                xp: 50,
                content: {
                    description: 'Langkah lengkap implementasi AI dari persiapan video hingga pemantauan live kamera.',
                    keyPoints: [
                        'Step 1: Buat Project & Upload video standar (Gold Standard) untuk referensi AI.',
                        'Step 2: Training Model via Studio Model (Logic-based) atau Teachable Machine (Pattern-based).',
                        'Step 3: Upload & Load Model (model.json, metadata.json, weights.bin) ke dalam sistem.',
                        'Step 4: Monitoring via Camera - Hubungkan webcam atau IP Cam untuk deteksi real-time.',
                        'Step 5: Review Dashboard - Pantau output Cycle Time dan Compliance secara otomatis.'
                    ],
                    tryIt: '/realtime-compliance',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'ai-7',
                title: 'Studio Model Masterclass',
                type: 'interactive',
                duration: '20 min',
                xp: 60,
                content: {
                    description: 'Panduan mendalam membuat logika deteksi gerakan kustom menggunakan Studio Model.',
                    keyPoints: [
                        '1. Managing States: Menambah, menghapus, dan mengurutkan langkah kerja (states) dalam sebuah siklus.',
                        '2. Designing Transitions: Menentukan alur perpindahan dari satu state ke state berikutnya.',
                        '3. Rule Logic Builder: Menggunakan fitur "Add Rule" untuk membuat logika IF-THEN tanpa koding.',
                        '4. Tipe Rule: Joint Angle (Sudut sendi), Position (Koordinat XY), dan Velocity (Kecepatan).',
                        '5. Teachable Integration: Menghubungkan class dari model Teachable Machine ke dalam rule logic anda.',
                        '6. Testing & Debugging: Menjalankan video standar untuk memvalidasi apakah AI berpindah state sesuai keinginan.'
                    ],
                    tryIt: '/studio-model',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            }
        ],
        practice: {
            title: 'Misi 3: AI Commander 🧠',
            description: 'Biarkan AI bekerja untukmu. Kita akan mencoba deteksi otomatis.',
            tasks: [
                'Tanya Gemini AI: "Apa saja waste yang terlihat di video ini?"',
                'Upload model kustom Anda ke Action Recognition dashboard',
                'Buat 1 model di Studio Model dengan minimal 3 states dan 3 rules',
                'Hubungkan kamera live dan aktifkan Real-time Compliance monitoring'
            ],
            actionLabel: 'Buka Studio Model',
            actionLink: '/studio-model'
        }
    },
    {
        id: 'tps-tools',
        title: '📊 TPS Tools',
        description: 'Alat-alat Toyota Production System untuk improvement',
        duration: '40 menit',
        color: '#9C27B0',
        hasCertificate: true,
        lessons: [
            {
                id: 'tps-1',
                title: 'Value Stream Mapping',
                type: 'video',
                duration: '10 min',
                xp: 35,
                content: {
                    description: 'Pemetaan alur nilai dari bahan mentah sampai produk jadi.',
                    keyPoints: [
                        'Buat Current State Map terlebih dahulu',
                        'Identifikasi waste di setiap proses',
                        'Hitung lead time dan cycle time',
                        'Design Future State Map yang lebih efisien'
                    ],
                    tryIt: '/value-stream-map',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'tps-2',
                title: 'Yamazumi Chart',
                type: 'hands-on',
                duration: '8 min',
                xp: 35,
                content: {
                    description: 'Visualisasi beban kerja untuk line balancing.',
                    keyPoints: [
                        'Import data dari measurement',
                        'Lihat stack bar per operator/station',
                        'Bandingkan dengan takt time',
                        'Identifikasi bottleneck dan idle time'
                    ],
                    tryIt: '/yamazumi',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'tps-3',
                title: 'Standard Work Combination Sheet',
                type: 'hands-on',
                duration: '10 min',
                xp: 35,
                content: {
                    description: 'Dokumentasi standar kombinasi kerja manusia dan mesin.',
                    keyPoints: [
                        'Buat timeline kerja manual dan mesin',
                        'Visualisasikan walking time',
                        'Set takt time sebagai referensi',
                        'Export untuk dokumentasi SOP'
                    ],
                    tryIt: '/swcs',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'tps-4',
                title: 'Waste Elimination',
                type: 'interactive',
                duration: '7 min',
                xp: 25,
                content: {
                    description: 'Identifikasi dan hilangkan 7 waste (Muda).',
                    keyPoints: [
                        'Transport - perpindahan yang tidak perlu',
                        'Inventory - stok berlebih',
                        'Motion - gerakan yang tidak efisien',
                        'Waiting - menunggu proses lain',
                        'Over-processing - proses berlebihan',
                        'Over-production - produksi berlebih',
                        'Defects - produk cacat'
                    ],
                    tryIt: '/waste-elimination',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'tps-5',
                title: 'Statistical Analysis',
                type: 'video',
                duration: '5 min',
                xp: 30,
                content: {
                    description: 'Analisis statistik untuk validasi data dan keputusan.',
                    keyPoints: [
                        'Hitung rata-rata, standar deviasi, range',
                        'Control chart untuk monitoring proses',
                        'Analisis capability process',
                        'Identifikasi outlier dan penyebabnya'
                    ],
                    tryIt: '/statistical-analysis',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            }
        ],
        practice: {
            title: 'Misi 4: Lean Architect 📊',
            description: 'Visualisasikan data untuk melihat gambaran besar.',
            tasks: [
                'Generate Yamazumi Chart dari data hasil pengukuran',
                'Identifikasi operator mana yang paling sibuk (bottleneck)',
                'Coba buat 1 draft Standard Work Combination Sheet'
            ],
            actionLabel: 'Buka Yamazumi Chart',
            actionLink: '/yamazumi'
        }
    },
    {
        id: 'documentation',
        title: '📘 Documentation',
        description: 'Buat SOP dan Work Instruction profesional',
        duration: '20 menit',
        color: '#00BCD4',
        hasCertificate: true,
        lessons: [
            {
                id: 'doc-1',
                title: 'Manual Creation',
                type: 'video',
                duration: '8 min',
                xp: 30,
                content: {
                    description: 'Buat work instruction visual dengan mudah.',
                    keyPoints: [
                        'Capture frame dari video sebagai langkah',
                        'Tambahkan deskripsi dan anotasi',
                        'Gunakan AI untuk generate instruksi',
                        'Export ke PDF, Word, atau PowerPoint'
                    ],
                    tryIt: '/manual-creation',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'doc-2',
                title: 'AI-Generated Instructions',
                type: 'interactive',
                duration: '5 min',
                xp: 25,
                content: {
                    description: 'Biarkan AI membantu menulis instruksi.',
                    keyPoints: [
                        'Pilih frame yang akan dijelaskan',
                        'AI akan menganalisis gambar',
                        'Generate deskripsi langkah kerja',
                        'Edit dan sesuaikan sesuai kebutuhan'
                    ],
                    tryIt: '/manual-creation',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'doc-3',
                title: 'Knowledge Base',
                type: 'hands-on',
                duration: '7 min',
                xp: 30,
                content: {
                    description: 'Simpan dan bagikan best practices.',
                    keyPoints: [
                        'Upload manual ke Knowledge Base',
                        'Tambahkan tags untuk pencarian',
                        'Rate dan review dari pengguna lain',
                        'Download template untuk project baru'
                    ],
                    tryIt: '/knowledge-base',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            }
        ],
        practice: {
            title: 'Misi 5: SOP Director 📘',
            description: 'Ubah video menjadi panduan kerja standar.',
            tasks: [
                'Capture 3 frame kunci dari video',
                'Gunakan AI Generate untuk membuat deskripsi langkah',
                'Export hasil SOP menjadi file PDF atau Word'
            ],
            actionLabel: 'Buka Manual Creation',
            actionLink: '/manual-creation'
        }
    },
    {
        id: 'advanced',
        title: '⚡ Advanced Features',
        description: 'Fitur lanjutan untuk power users',
        duration: '30 menit',
        color: '#F44336',
        lessons: [
            {
                id: 'adv-2',
                title: 'VR Training Mode',
                type: 'interactive',
                duration: '7 min',
                xp: 40,
                content: {
                    description: 'Simulasi training dengan VR/AR.',
                    keyPoints: [
                        'Interactive 3D training environment',
                        'Practice mode untuk latihan',
                        'Assessment mode untuk evaluasi',
                        'Tracking progress trainee'
                    ],
                    tryIt: '/vr-training',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'adv-3',
                title: 'Broadcast & Collaboration',
                type: 'hands-on',
                duration: '8 min',
                xp: 35,
                content: {
                    description: 'Share dan kolaborasi real-time.',
                    keyPoints: [
                        'Broadcast video ke multiple viewer',
                        'Real-time cursor sharing',
                        'Chat dan collaboration tools',
                        'Remote training dan review'
                    ],
                    tryIt: '/broadcast',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'adv-4',
                title: 'Multi-Axial Analysis',
                type: 'video',
                duration: '10 min',
                xp: 40,
                content: {
                    description: 'Bandingkan garis waktu beberapa proyek sekaligus.',
                    keyPoints: [
                        'Pilih multiple projects dari File Explorer',
                        'Bandingkan performa antar cycle atau antar operator secara visual',
                        'Identifikasi variasi pada skala yang lebih besar',
                        'Gunakan untuk audit multi-proses'
                    ],
                    tryIt: '/multi-axial',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
        ],
        practice: {
            title: 'Misi 7: Future Engineer ⚡',
            description: 'Eksperimen dengan fitur tercanggih MAVi.',
            tasks: [
                'Coba fitur Motion Laboratory',
                'Buka Video Workspace and coba Collaborate dengan viewer',
                'Explore mode VR Training jika memiliki device'
            ],
            actionLabel: 'Buka Video Workspace',
            actionLink: '/'
        }
    },
    {
        id: 'study-cases',
        title: '📂 Study Cases',
        description: 'Implementasi nyata MAVi di berbagai industri',
        duration: '45 menit',
        color: '#FFD700',
        hasCertificate: true,
        lessons: [
            {
                id: 'sc-1',
                title: 'Automotive: Line Balancing',
                type: 'video',
                duration: '12 min',
                xp: 25,
                content: {
                    description: 'Studi kasus optimasi lini perakitan mesin di pabrik otomotif ternama.',
                    keyPoints: [
                        'Identifikasi bottleneck menggunakan Yamazumi Chart',
                        'Redistribusi elemen kerja antar operator',
                        'Peningkatan throughput sebesar 15%',
                        'Eliminasi waiting time pada station kritis'
                    ],
                    tryIt: '/yamazumi',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'sc-2',
                title: 'Textile: Waste Elimination',
                type: 'interactive',
                duration: '10 min',
                xp: 25,
                content: {
                    description: 'Mengurangi pemborosan gerakan (Motion Waste) pada proses penjahitan.',
                    keyPoints: [
                        'Analisis Therblig untuk gerakan tangan operator',
                        'Rearrangement tata letak material (Layout)',
                        'Pengurangan cycle time sebesar 20%',
                        'Peningkatan ergonomi dan kenyamanan kerja'
                    ],
                    tryIt: '/waste-elimination',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'sc-3',
                title: 'Logistics: VSM Optimization',
                type: 'hands-on',
                duration: '15 min',
                xp: 35,
                content: {
                    description: 'Optimasi alur dokumen dan barang di pusat distribusi regional.',
                    keyPoints: [
                        'Pemetaan Current State Map (VSM)',
                        'Identifikasi Information Flow yang terputus',
                        'Lead time reduction dari 2 hari menjadi 4 jam',
                        'Implementasi Kan-ban untuk replenishment'
                    ],
                    tryIt: '/value-stream-map',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'sc-4',
                title: 'Electronics: AI Compliance',
                type: 'interactive',
                duration: '8 min',
                xp: 25,
                content: {
                    description: 'Monitoring kepatuhan pemasangan komponen presisi tinggi.',
                    keyPoints: [
                        'Setting standar gerakan dengan Video Intelligence',
                        'Deteksi anomali pemasangan secara real-time',
                        'Penurunan tingkat defect (rework) hingga 90%',
                        'Audit otomatis tanpa mengganggu produksi'
                    ],
                    tryIt: '/realtime-compliance',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            }
        ],
        practice: {
            title: 'Misi 8: Case Solver 📂',
            description: 'Terapkan ilmu pada kasus dunia nyata.',
            tasks: [
                'Pilih salah satu studi kasus di atas',
                'Coba replikasi analisis di Video Workspace',
                'Tulis 3 usulan improvement untuk kasus tersebut'
            ],
            actionLabel: 'Buka Workspace',
            actionLink: '/'
        }
    },
    {
        id: 'line-balancing',
        title: '⚖️ Line Balancing & Digital Twin',
        description: 'Optimasi aliran produksi dengan Simulasi & Digital Twin.',
        duration: '40 menit',
        color: '#ff9800',
        objectives: [
            'Memahami konsep Line Balancing & Takt Time',
            'Menggunakan Yamazumi Chart untuk visualisasi beban',
            'Analisa risiko dengan Stochastic Modelling',
            'Menjalankan Digital Twin untuk simulasi real-time'
        ],
        prerequisite: 'pmts-standard-data',
        hasCertificate: true,
        quiz: {
            passingScore: 80,
            questions: [
                {
                    id: 'lb-q1',
                    question: 'Apa tujuan utama dari Line Balancing?',
                    options: [
                        'Membuat semua orang sibuk',
                        'Menyeimbangkan beban kerja antar stasiun kerja (meet Takt Time)',
                        'Menghilangkan semua operator',
                        'Meningkatkan inventory'
                    ],
                    correctAnswer: 1
                },
                {
                    id: 'lb-q2',
                    question: 'Dalam mode Stochastic, apa arti zona merah pada stasiun?',
                    options: [
                        'Stasiun rusak',
                        'Stasiun memiliki risiko tinggi (>50%) gagal memenuhi Takt Time',
                        'Operator sedang istirahat',
                        'Kualitas produk buruk'
                    ],
                    correctAnswer: 1
                },
                {
                    id: 'lb-q3',
                    question: 'Apa fungsi Digital Twin di MAVi?',
                    options: [
                        'Hanya untuk backup data',
                        'Simulasi visual real-time untuk melihat flow & bottleneck',
                        'Membuat kembaran operator',
                        'Game untuk hiburan'
                    ],
                    correctAnswer: 1
                }
            ]
        },
        lessons: [
            {
                id: 'lb-1',
                title: 'Konsep Line Balancing',
                type: 'video',
                duration: '8 min',
                xp: 30,
                content: {
                    description: 'Dasar-dasar penyeimbangan lini produksi.',
                    keyPoints: [
                        'Takt Time: Irama permintaan pelanggan',
                        'Cycle Time: Waktu proses aktual',
                        'Bottleneck: Proses terlama yang menghambat flow',
                        'Efficiency: Ratio output vs input'
                    ],
                    tryIt: '/line-balancing',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'lb-2',
                title: 'Stochastic & Risk Analysis',
                type: 'interactive',
                duration: '12 min',
                xp: 45,
                content: {
                    description: 'Mengelola variabilitas dalam produksi.',
                    keyPoints: [
                        'Manusia tidak stabil (ada variasi waktu)',
                        'Gunakan Standard Deviation (±) di MAVi',
                        'Monte Carlo Sim: Jalankan 1000 iterasi',
                        'Lihat % Reliability untuk prediksi kegagalan'
                    ],
                    tryIt: '/line-balancing',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'lb-3',
                title: 'Digital Twin Simulation',
                type: 'hands-on',
                duration: '15 min',
                xp: 60,
                content: {
                    description: 'Pabrik virtual yang hidup di layar Anda.',
                    keyPoints: [
                        'Ubah view dari Board ke Digital Twin',
                        'Monitor status: Busy vs Blocked vs Starved',
                        'Lihat tumpukan barang (Buffer) secara visual',
                        'Percepat waktu (20x) untuk melihat efek jangka panjang'
                    ],
                    tryIt: '/line-balancing',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            }
        ],
        practice: {
            title: 'Misi 10: The Digital Factory 🏭',
            description: 'Selamatkan pabrik macet dengan simulasi Digital Twin.',
            tasks: [
                'Buka Line Balancing & Nyalakan Stochastic Mode',
                'Set Std Dev (±) di stasiun kritis',
                'Jalankan "Digital Twin" dan identifikasi stasiun yang sering "Blocked"',
                'Pindahkan tugas sampai aliran lancar (tidak ada merah)'
            ],
            actionLabel: 'Buka Digital Twin',
            actionLink: '/line-balancing'
        }
    },
    {
        id: 'studio-model',
        title: '🎬 Studio Model & Compliance',
        description: 'Buat model AI kustom dan monitor compliance real-time',
        duration: '35 menit',
        color: '#667eea',
        hasCertificate: true,
        lessons: [
            {
                id: 'sm-1',
                title: 'Pengenalan Studio Model',
                type: 'video',
                duration: '5 min',
                xp: 20,
                content: {
                    description: 'Studio Model memungkinkan Anda membuat model AI kustom untuk mendeteksi gerakan dan state spesifik tanpa coding.',
                    keyPoints: [
                        'Buat model berdasarkan video referensi Anda sendiri',
                        'Definisikan states (kondisi) yang ingin dideteksi',
                        'Atur rules (aturan) untuk transisi antar state',
                        'Gunakan untuk compliance monitoring real-time'
                    ],
                    tryIt: '/studio-model',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'sm-2',
                title: 'Membuat Model Baru',
                type: 'hands-on',
                duration: '8 min',
                xp: 30,
                content: {
                    description: 'Step-by-step membuat Studio Model pertama Anda.',
                    keyPoints: [
                        'Klik "Create New Model" di Studio Model page',
                        'Beri nama model yang deskriptif (contoh: "Assembly Process")',
                        'Pilih coordinate system: Body-Centric atau Screen-Based',
                        'Tambahkan deskripsi untuk dokumentasi'
                    ],
                    tryIt: '/studio-model',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'sm-3',
                title: 'Definisi States',
                type: 'hands-on',
                duration: '7 min',
                xp: 30,
                content: {
                    description: 'Buat states untuk setiap kondisi yang ingin dideteksi.',
                    keyPoints: [
                        'State = kondisi/posisi tertentu (contoh: "Idle", "Reaching", "Holding")',
                        'Capture reference pose dari video untuk setiap state',
                        'Definisikan ROI (Region of Interest) jika diperlukan',
                        'Set minimum duration untuk stabilitas deteksi'
                    ],
                    tryIt: '/studio-model',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'sm-4',
                title: 'Rule Configuration',
                type: 'interactive',
                duration: '10 min',
                xp: 35,
                content: {
                    description: 'Atur aturan transisi antar state menggunakan Rule Builder.',
                    keyPoints: [
                        'Joint Angle: Sudut sendi tubuh (Contoh: Siku < 90°)',
                        'Pose Relation: Posisi relatif terhadap titik lain (Contoh: Tangan di atas Hidung)',
                        'Pose Velocity: Kecepatan gerakan (Contoh: Mendeteksi gerak tiba-tiba)',
                        'Object Proximity: Jarak ke objek AI (Contoh: Tangan menyentuh alat)',
                        'Golden Pose: Kecocokan dengan pose referensi ideal yang direkam',
                        'Logic Operator: Gunakan AND/OR untuk menggabungkan banyak aturan'
                    ],
                    tryIt: '/studio-model',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'sm-5',
                title: 'Teachable Machine Studio',
                type: 'hands-on',
                duration: '5 min',
                xp: 30,
                content: {
                    description: 'Pelajari cara menggunakan TM Studio untuk membuat dataset video dan menguji model custom Anda.',
                    keyPoints: [
                        'Gunakan Video Slicer untuk memotong video panjang menjadi klip latihan',
                        'Review dataset dan pastikan representatif',
                        'Integrasikan dataset dengan rules di Studio Model',
                        'Gunakan model AI untuk deteksi state yang lebih kompleks'
                    ],
                    tryIt: '/studio-model',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'sm-6',
                title: 'Test Mode & Validation',
                type: 'hands-on',
                duration: '5 min',
                xp: 30,
                content: {
                    description: 'Test model Anda dengan video sebelum deployment.',
                    keyPoints: [
                        'Upload test video di Test Mode',
                        'Lihat timeline events untuk validasi',
                        'Check apakah state transitions sudah benar',
                        'Adjust rules jika ada false positive/negative'
                    ],
                    tryIt: '/studio-model',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'sm-7',
                title: 'Real-time Compliance Setup',
                type: 'hands-on',
                duration: '8 min',
                xp: 35,
                content: {
                    description: 'Deploy model untuk monitoring compliance real-time.',
                    keyPoints: [
                        'Buka Real-time Compliance dashboard',
                        'Klik "Add Camera" untuk setup station baru',
                        'Pilih Studio Model dari dropdown',
                        'Pilih webcam atau masukkan IP camera URL',
                        'Klik "Start Monitoring" untuk mulai'
                    ],
                    tryIt: '/realtime-compliance',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'sm-8',
                title: 'Timeline Events Analysis',
                type: 'interactive',
                duration: '5 min',
                xp: 25,
                content: {
                    description: 'Analisis timeline events untuk performance monitoring.',
                    keyPoints: [
                        'Timeline Events panel menampilkan riwayat state transitions',
                        'Lihat timestamp dan duration setiap state',
                        'Warna hijau = cepat (<5s), merah = lambat (>5s)',
                        'Identifikasi bottleneck dari state yang lama',
                        'Export data untuk analisis lebih lanjut'
                    ],
                    tryIt: '/realtime-compliance',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            }
        ],
        practice: {
            title: 'Misi 9: Model Master 🎬',
            description: 'Latih AI punyamu sendiri!',
            tasks: [
                'Buat 1 Studio Model baru',
                'Definisikan minimal 2 states (contoh: Kerja vs Istirahat)',
                'Test model tersebut di Test Mode dengan video'
            ],
            actionLabel: 'Buka Studio Model',
            actionLink: '/studio-model'
        }
    },
    {
        id: 'ai-settings',
        title: '⚙️ AI Settings & Configuration',
        description: 'Panduan lengkap setup dan konfigurasi AI untuk hasil optimal',
        duration: '25 menit',
        color: '#E91E63',
        hasCertificate: true,
        lessons: [
            {
                id: 'ais-1',
                title: 'Mendapatkan Gemini API Key',
                type: 'hands-on',
                duration: '5 min',
                xp: 20,
                content: {
                    description: 'Langkah-langkah mendapatkan API Key dari Google AI Studio untuk mengaktifkan fitur AI.',
                    keyPoints: [
                        'Kunjungi https://aistudio.google.com/',
                        'Login dengan akun Google Anda',
                        'Klik "Get API Key" → "Create API Key"',
                        'Copy API Key dan paste di MAVi Settings',
                        'Gratis untuk penggunaan standar (60 request/menit)'
                    ],
                    tryIt: null,
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'ais-2',
                title: 'Konfigurasi API Key di MAVi',
                type: 'hands-on',
                duration: '3 min',
                xp: 20,
                content: {
                    description: 'Cara memasukkan dan menyimpan API Key di aplikasi MAVi.',
                    keyPoints: [
                        'Buka Settings → AI Configuration',
                        'Paste API Key di field yang tersedia',
                        'Klik "Test Connection" untuk verifikasi',
                        'Status hijau = koneksi berhasil',
                        'API Key tersimpan di browser (localStorage)'
                    ],
                    tryIt: null,
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'ais-3',
                title: 'Pose Detection Settings',
                type: 'interactive',
                duration: '7 min',
                xp: 25,
                content: {
                    description: 'Konfigurasi MediaPipe Pose Detection untuk akurasi optimal.',
                    keyPoints: [
                        'Model Complexity: Lite (cepat) vs Full (akurat)',
                        'Detection Confidence: threshold deteksi pose (0.5-0.9)',
                        'Tracking Confidence: smoothness tracking (0.5-0.9)',
                        'Semakin tinggi confidence = lebih akurat tapi lebih berat',
                        'Rekomendasi: 0.7 untuk keseimbangan speed & accuracy'
                    ],
                    tryIt: null,
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'ais-4',
                title: 'Setup Teachable Machine Model',
                type: 'hands-on',
                duration: '7 min',
                xp: 30,
                content: {
                    description: 'Tutorial lengkap menggunakan Google Teachable Machine untuk custom model.',
                    keyPoints: [
                        'Gunakan Video Slicer di Studio Model untuk mengumpulkan sample',
                        'Klasifikasikan gerakan menjadi states yang bermakna',
                        'Latih rule detection menggunakan kondisi yang sudah dipelajari',
                        'Gunakan URL model global untuk sinkronisasi antar station',
                        'Model dapat di-update kapan saja jika proses berubah'
                    ],
                    tryIt: '/studio-model',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'ais-5',
                title: 'Troubleshooting AI Errors',
                type: 'interactive',
                duration: '5 min',
                xp: 25,
                content: {
                    description: 'Cara mengatasi error umum pada fitur AI.',
                    keyPoints: [
                        'Error 401: API Key tidak valid → regenerate key',
                        'Error 429: Rate limit → tunggu 1 menit atau upgrade plan',
                        'Pose tidak terdeteksi: pastikan pencahayaan cukup',
                        'Model lambat: turunkan model complexity',
                        'Check System Diagnostics untuk status lengkap'
                    ],
                    tryIt: null,
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            }
        ],
        practice: {
            title: 'Misi 10: SysAdmin AI ⚙️',
            description: 'Pastikan mesin AI berjalan mulus.',
            tasks: [
                'Cek status API Key di Settings',
                'Coba ubah Pose Detection Confidence ke 0.8',
                'Jalankan System Diagnostics'
            ],
            actionLabel: 'Buka Settings',
            actionLink: '/settings'
        }
    },
    {
        id: 'ui-tutorial',
        title: '🖥️ User Interface Deep Dive',
        description: 'Panduan lengkap antarmuka dan customization',
        duration: '20 menit',
        color: '#3F51B5',
        lessons: [
            {
                id: 'ui-1',
                title: 'Layout Overview',
                type: 'video',
                duration: '5 min',
                content: {
                    description: 'Memahami tata letak aplikasi MAVi secara keseluruhan.',
                    keyPoints: [
                        'Video Panel (kiri): area playback dan analisis video',
                        'Element Panel (kanan): daftar element dan pengukuran',
                        'Timeline (bawah): navigasi video dan markers',
                        'Sidebar (paling kanan): menu navigasi antar fitur',
                        'Semua panel dapat di-resize dengan drag divider'
                    ],
                    tryIt: '/',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'ui-2',
                title: 'Keyboard Shortcuts',
                type: 'interactive',
                duration: '5 min',
                content: {
                    description: 'Shortcut keyboard untuk produktivitas maksimal.',
                    keyPoints: [
                        'Space: Play/Pause video',
                        'Arrow Left/Right: Frame by frame navigation',
                        'S: Start measurement',
                        'E: End measurement',
                        'Ctrl+S: Save project',
                        'F: Toggle fullscreen video'
                    ],
                    tryIt: '/',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'ui-3',
                title: 'Theme & Display Settings',
                type: 'hands-on',
                duration: '3 min',
                content: {
                    description: 'Customize tampilan aplikasi sesuai preferensi.',
                    keyPoints: [
                        'Dark Mode: default, nyaman untuk penggunaan lama',
                        'Language: Indonesia, English, 日本語',
                        'Font Size: sesuaikan untuk kenyamanan membaca',
                        'Skeleton Overlay: toggle tampilan pose skeleton',
                        'Settings tersimpan otomatis'
                    ],
                    tryIt: null,
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'ui-4',
                title: 'Panel Customization',
                type: 'hands-on',
                duration: '4 min',
                content: {
                    description: 'Sesuaikan tata letak panel untuk workflow Anda.',
                    keyPoints: [
                        'Drag divider untuk resize panel',
                        'Collapse sidebar dengan tombol panah',
                        'Element Panel bisa di-expand/collapse',
                        'Timeline height bisa disesuaikan',
                        'Layout tersimpan untuk penggunaan berikutnya'
                    ],
                    tryIt: '/',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'ui-5',
                title: 'Video Controls Mastery',
                type: 'interactive',
                duration: '3 min',
                content: {
                    description: 'Kuasai kontrol video untuk analisis presisi.',
                    keyPoints: [
                        'Speed Control: 0.25x sampai 2x playback',
                        'Frame Counter: lihat posisi frame saat ini',
                        'Zoom Controls: perbesar area tertentu',
                        'Loop Region: putar secara berulang area tertentu',
                        'Seek Bar: klik langsung ke posisi video'
                    ],
                    tryIt: '/',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            }
        ],
        practice: {
            title: 'Misi 11: UI Pro 🖥️',
            description: 'Jadi master navigasi aplikasi.',
            tasks: [
                'Gunakan shortcut Space dan S saat mengukur',
                'Coba ganti bahasa aplikasi ke English/Jepang',
                'Resize Video Panel dan Element Panel'
            ],
            actionLabel: 'Buka Workspace',
            actionLink: '/'
        }
    },
    {
        id: 'export-integration',
        title: '📤 Data Export & Integration',
        description: 'Export hasil analisis dan integrasi dengan sistem lain',
        duration: '25 menit',
        color: '#009688',
        lessons: [
            {
                id: 'exp-1',
                title: 'Export ke Excel',
                type: 'hands-on',
                duration: '5 min',
                content: {
                    description: 'Export data pengukuran ke format Excel untuk analisis lanjutan.',
                    keyPoints: [
                        'Klik tombol Export di Element Panel',
                        'Pilih format: Excel (.xlsx) atau CSV',
                        'Data termasuk: nama element, durasi, tipe, timestamp',
                        'Kolom tambahan: therblig classification, VA/NVA',
                        'File otomatis terdownload ke folder Downloads'
                    ],
                    tryIt: '/',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'exp-2',
                title: 'Export Work Instruction',
                type: 'hands-on',
                duration: '7 min',
                content: {
                    description: 'Export manual dan SOP ke berbagai format.',
                    keyPoints: [
                        'PDF: format standar untuk distribusi',
                        'Word (.docx): untuk editing lanjutan',
                        'PowerPoint: untuk training presentation',
                        'Include images, langkah kerja, dan catatan',
                        'Custom header dengan logo perusahaan'
                    ],
                    tryIt: '/manual-creation',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'exp-4',
                title: 'Project Backup & Restore',
                type: 'interactive',
                duration: '4 min',
                content: {
                    description: 'Backup dan restore project untuk keamanan data.',
                    keyPoints: [
                        'Export Project: simpan sebagai file JSON',
                        'Include semua elements, measurements, settings',
                        'Import Project: restore dari backup',
                        'Gunakan untuk migrasi data antar komputer',
                        'Simpan backup secara berkala'
                    ],
                    tryIt: '/files',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            }
        ],
        practice: {
            title: 'Misi 12: Data Scientist 📤',
            description: 'Bawa data MAVi ke jenjang selanjutnya.',
            tasks: [
                'Export hasil pengukuran ke file Excel',
                'Export project sebagai file JSON (Backup)',
                'Coba buka file Excel hasil export di komputer'
            ],
            actionLabel: 'Buka File Explorer',
            actionLink: '/files'
        }
    },
    {
        id: 'pose-ergonomics',
        title: '🔍 Pose Detection & Ergonomics',
        description: 'Analisis pose tubuh dan penilaian ergonomi',
        duration: '35 menit',
        color: '#795548',
        lessons: [
            {
                id: 'pe-1',
                title: 'Cara Kerja Pose Detection',
                type: 'video',
                duration: '7 min',
                content: {
                    description: 'Memahami teknologi MediaPipe Pose Detection di balik MAVi.',
                    keyPoints: [
                        'MediaPipe mendeteksi 33 landmark tubuh',
                        'Landmark meliputi: wajah, bahu, siku, tangan, pinggul, lutut, kaki',
                        'Setiap landmark memiliki koordinat x, y, z',
                        'Visibility score menunjukkan kepercayaan deteksi',
                        'Proses berjalan real-time di browser (WebGL)'
                    ],
                    tryIt: '/',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'pe-2',
                title: 'Joint Angle Analysis',
                type: 'interactive',
                duration: '7 min',
                content: {
                    description: 'Mengukur sudut sendi untuk analisis postur.',
                    keyPoints: [
                        'Sudut siku: mengukur fleksi lengan',
                        'Sudut lutut: analisis postur jongkok/berdiri',
                        'Sudut bahu: deteksi angkat tangan',
                        'Sudut punggung: evaluasi postur membungkuk',
                        'Data sudut digunakan untuk rules di Studio Model'
                    ],
                    tryIt: '/studio-model',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'pe-3',
                title: 'REBA Assessment',
                type: 'hands-on',
                duration: '10 min',
                content: {
                    description: 'Rapid Entire Body Assessment untuk evaluasi risiko ergonomi.',
                    keyPoints: [
                        'REBA menganalisis postur seluruh tubuh',
                        'Score 1-3: Low risk (Acceptable)',
                        'Score 4-7: Medium risk (Investigate)',
                        'Score 8-10: High risk (Investigate soon)',
                        'Score 11+: Very high risk (Implement change)'
                    ],
                    tryIt: '/',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'pe-4',
                title: 'Fatigue Analysis',
                type: 'interactive',
                duration: '6 min',
                content: {
                    description: 'Deteksi dan prediksi kelelahan pekerja dari pola gerakan.',
                    keyPoints: [
                        'Analisis variasi cycle time sebagai indikator fatigue',
                        'Deteksi perlambatan gerakan dari waktu ke waktu',
                        'Alert ketika pola menunjukkan kelelahan',
                        'Rekomendasi waktu istirahat optimal',
                        'Integrasi dengan compliance monitoring'
                    ],
                    tryIt: '/',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            },
            {
                id: 'pe-5',
                title: 'Ergonomic Improvement',
                type: 'hands-on',
                duration: '5 min',
                content: {
                    description: 'Menggunakan data untuk improvement ergonomi.',
                    keyPoints: [
                        'Identifikasi postur berisiko tinggi',
                        'Bandingkan sebelum vs sesudah improvement',
                        'Dokumentasikan perubahan workstation',
                        'Track improvement score dari waktu ke waktu',
                        'Generate laporan untuk manajemen'
                    ],
                    tryIt: '/statistical-analysis',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                }
            }
        ],
        practice: {
            title: 'Misi 6: Ergo Guardian 🔍',
            description: 'Pastikan keselamatan kerja dengan analisis postur.',
            tasks: [
                'Aktifkan Skeleton View di video player',
                'Lihat grafik sudut siku atau punggung',
                'Identifikasi momen dengan REBA score tinggi (>7)'
            ],
            actionLabel: 'Buka Video Workspace',
            actionLink: '/'
        }
    },
];
