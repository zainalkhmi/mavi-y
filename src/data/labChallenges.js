export const labChallenges = [
    {
        id: 'challenge_001',
        name: 'Basic Assembly: Pickup',
        difficulty: 'Easy',
        description: 'Deteksi gerakan operator saat mengambil komponen dari kotak.',
        target: 'Pindah ke state "Pickup" saat tangan kanan mendekati area kotak.',
        videoSrc: 'https://storage.googleapis.com/mavi-assets/videos/demo-assembly.mp4', // Example URL
        initialModel: {
            id: 'lab_model_001',
            name: 'Lab: Pickup Detection',
            statesList: [
                { id: 's_start', name: 'Start' },
                { id: 's_pickup', name: 'Pickup' }
            ],
            transitions: [],
            rules: []
        },
        tasks: [
            { id: 'task_1', text: 'Buat transisi dari Start ke Pickup', completed: false },
            { id: 'task_2', text: 'Tambahkan Rule: Right Wrist Y < 0.5', completed: false },
            { id: 'task_3', text: 'Validasi model dengan video', completed: false }
        ]
    },
    {
        id: 'challenge_002',
        name: 'Quality Inspection: Posture',
        difficulty: 'Medium',
        description: 'Pastikan operator menunduk dengan benar saat melakukan inspeksi produk.',
        target: 'Gunakan sudut leher (Neck Angle) untuk mendeteksi inspeksi.',
        videoSrc: 'https://storage.googleapis.com/mavi-assets/videos/demo-inspection.mp4',
        initialModel: {
            id: 'lab_model_002',
            name: 'Lab: Posture Check',
            statesList: [
                { id: 's_idle', name: 'Idle' },
                { id: 's_inspect', name: 'Inspecting' }
            ],
            transitions: [],
            rules: []
        },
        tasks: [
            { id: 'task_1', text: 'Gunakan Joint Angle untuk Rule', completed: false },
            { id: 'task_2', text: 'Set Neck Angle < 150 derajat', completed: false },
            { id: 'task_3', text: 'Dapatkan hasil validasi > 85%', completed: false }
        ]
    }
];
