
export const mtm1Data = {
    reach: {
        title: 'Reach (R)',
        description: 'Gerakan memindahkan tangan/jari ke suatu tujuan.',
        codes: [
            { code: 'R10A', tmu: 6.1, desc: 'Reach 10cm, Case A (Fixed object)' },
            { code: 'R20A', tmu: 7.8, desc: 'Reach 20cm, Case A (Fixed object)' },
            { code: 'R30A', tmu: 9.5, desc: 'Reach 30cm, Case A (Fixed object)' },
            { code: 'R40A', tmu: 11.3, desc: 'Reach 40cm, Case A (Fixed object)' },
            { code: 'R10B', tmu: 6.3, desc: 'Reach 10cm, Case B (Variable)' },
            { code: 'R20B', tmu: 9.9, desc: 'Reach 20cm, Case B (Variable)' },
            { code: 'R30B', tmu: 12.8, desc: 'Reach 30cm, Case B (Variable)' },
            { code: 'R40B', tmu: 15.6, desc: 'Reach 40cm, Case B (Variable)' },
            { code: 'R10C', tmu: 7.3, desc: 'Reach 10cm, Case C (Jumbled)' },
            { code: 'R20C', tmu: 10.5, desc: 'Reach 20cm, Case C (Jumbled)' },
            { code: 'R30C', tmu: 13.5, desc: 'Reach 30cm, Case C (Jumbled)' },
        ]
    },
    move: {
        title: 'Move (M)',
        description: 'Gerakan memindahkan objek dari satu tempat ke tempat lain.',
        codes: [
            { code: 'M10A', tmu: 6.8, desc: 'Move 10cm, Case A (To other hand)' },
            { code: 'M20A', tmu: 9.7, desc: 'Move 20cm, Case A (To other hand)' },
            { code: 'M30A', tmu: 12.4, desc: 'Move 30cm, Case A (To other hand)' },
            { code: 'M10B', tmu: 8.4, desc: 'Move 10cm, Case B (Approximate)' },
            { code: 'M20B', tmu: 12.0, desc: 'Move 20cm, Case B (Approximate)' },
            { code: 'M30B', tmu: 15.1, desc: 'Move 30cm, Case B (Approximate)' },
            { code: 'M10C', tmu: 9.8, desc: 'Move 10cm, Case C (Exact)' },
        ]
    },
    grasp: {
        title: 'Grasp (G)',
        description: 'Gerakan jari/tangan untuk mendapatkan kontrol atas objek.',
        codes: [
            { code: 'G1A', tmu: 2.0, desc: 'Pickup Grasp (Small/Medium object)' },
            { code: 'G1B', tmu: 3.5, desc: 'Pickup Grasp (Very small object)' },
            { code: 'G1C1', tmu: 7.3, desc: 'Interference Grasp (Disk/Cylinder)' },
            { code: 'G4A', tmu: 7.3, desc: 'Jumbled object > 25mm' },
            { code: 'G4B', tmu: 9.1, desc: 'Jumbled object 6-25mm' },
            { code: 'G5', tmu: 0, desc: 'Contact Grasp (Sliding)' },
        ]
    },
    position: {
        title: 'Position (P)',
        description: 'Gerakan mensejajarkan/memposisikan objek (S/SS/NS).',
        codes: [
            { code: 'P1SE', tmu: 5.6, desc: 'Symmetrical, Easy to handle' },
            { code: 'P1SD', tmu: 11.2, desc: 'Symmetrical, Difficult to handle' },
            { code: 'P1NSE', tmu: 10.4, desc: 'Non-Symmetrical, Easy' },
            { code: 'P1NSD', tmu: 16.0, desc: 'Non-Symmetrical, Difficult' },
        ]
    },
    release: {
        title: 'Release (RL)',
        description: 'Melepaskan kontrol atas objek.',
        codes: [
            { code: 'RL1', tmu: 2.0, desc: 'Normal Release (Open fingers)' },
            { code: 'RL2', tmu: 0, desc: 'Contact Release' },
        ]
    }
};
