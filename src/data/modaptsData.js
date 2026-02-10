
export const modaptsData = {
    movement: {
        title: 'Move Class (M)',
        description: 'Gerakan anggota tubuh (Finger to Body)',
        codes: [
            { code: 'M1', tmu: 1, desc: 'Finger movement (fail)' },
            { code: 'M2', tmu: 2, desc: 'Hand movement (wrist)' },
            { code: 'M3', tmu: 3, desc: 'Forearm movement (elbow)' },
            { code: 'M4', tmu: 4, desc: 'Arm movement (shoulder)' },
            { code: 'M5', tmu: 5, desc: 'Extended arm / Shoulder assistance' },
            { code: 'M7', tmu: 7, desc: 'Trunk movement (bending/standing)' }
        ]
    },
    terminal: {
        title: 'Terminal Class (G, P)',
        description: 'Aktivitas di akhir gerakan (Get, Put)',
        codes: [
            { code: 'G0', tmu: 0, desc: 'Contact Grasp (Touch)' },
            { code: 'G1', tmu: 1, desc: 'Simple Grasp' },
            { code: 'G3', tmu: 3, desc: 'Complex Grasp (Interference)' },
            { code: 'P0', tmu: 0, desc: 'Place without control (Drop)' },
            { code: 'P2', tmu: 2, desc: 'Place with eye control' },
            { code: 'P5', tmu: 5, desc: 'Place with positioning' }
        ]
    },
    auxiliary: {
        title: 'Auxiliary (L, E, R, D, F, W)',
        description: 'Gerakan tambahan (Load, Eye, Regrasp, etc)',
        codes: [
            { code: 'L1', tmu: 1, desc: 'Load Factor (per 4kg)' },
            { code: 'E2', tmu: 2, desc: 'Eye travel / Eye focus' },
            { code: 'R2', tmu: 2, desc: 'Regrasp' },
            { code: 'D3', tmu: 3, desc: 'Decide / React' },
            { code: 'F3', tmu: 3, desc: 'Foot pedal action' },
            { code: 'W5', tmu: 5, desc: 'Walk (per pace)' },
            { code: 'B17', tmu: 17, desc: 'Bend and Arise' },
            { code: 'S30', tmu: 30, desc: 'Sit and Stand' }
        ]
    }
};
