/**
 * Standard Industrial Motion Templates
 * These templates provide pre-configured State Machines for common tasks.
 */
export const MODEL_TEMPLATES = [
    {
        id: 'tpl_pick_place',
        name: 'Pick & Place (Simple)',
        description: 'Standard 3-step cycle: Reach -> Grasp -> Retract.',
        states: [
            { id: 's_reach', name: 'Reach Target', minDuration: 0.5, isVA: true },
            { id: 's_grasp', name: 'Grasp Object', minDuration: 0.2, isVA: false },
            { id: 's_retract', name: 'Retract/Move', minDuration: 0.5, isVA: true }
        ],
        transitions: [
            {
                id: 't_reach_grasp',
                from: 's_reach',
                to: 's_grasp',
                condition: {
                    rules: [
                        { id: 'r_near', type: 'OBJECT_PROXIMITY', params: { joint: 'right_wrist', distance: 0.1, objectClass: 'target' } }
                    ]
                }
            },
            {
                id: 't_grasp_retract',
                from: 's_grasp',
                to: 's_retract',
                condition: {
                    rules: [
                        { id: 'r_closed', type: 'POSE_ANGLE', params: { jointA: 'right_thumb', jointB: 'right_index', value: 30, operator: '<' } }
                    ]
                }
            },
            {
                id: 't_retract_reach',
                from: 's_retract',
                to: 's_reach',
                condition: {
                    rules: [
                        { id: 'r_home', type: 'POSE_RELATION', params: { jointA: 'right_wrist', component: 'y', operator: '>', targetType: 'VALUE', value: 0.5 } }
                    ]
                }
            }
        ]
    },
    {
        id: 'tpl_safety_zone',
        name: 'Safety Zone Monitor',
        description: 'Continues monitoring. Triggers alert state if hand enters ROI.',
        states: [
            { id: 's_monitor', name: 'Monitoring Safe', minDuration: 0, isVA: false },
            { id: 's_alert', name: 'VIOLATION DETECTED', minDuration: 1, isVA: false }
        ],
        transitions: [
            {
                id: 't_violation',
                from: 's_monitor',
                to: 's_alert',
                condition: {
                    rules: [
                        { id: 'r_roi', type: 'OBJECT_IN_ROI', params: { objectClass: 'person', roiId: 'danger_zone' } }
                    ]
                }
            },
            {
                id: 't_reset',
                from: 's_alert',
                to: 's_monitor',
                condition: {
                    rules: [
                        { id: 'r_safe', type: 'OBJECT_IN_ROI', params: { objectClass: 'person', roiId: 'danger_zone' }, invert: true }
                    ],
                    holdTime: 2.0
                }
            }
        ]
    },
    {
        id: 'tpl_empty',
        name: 'Empty Project',
        description: 'Start from scratch with a clean slate.',
        states: [{ id: 's_start', name: 'Start' }],
        transitions: []
    }
];

export const getTemplateById = (id) => MODEL_TEMPLATES.find(t => t.id === id);
