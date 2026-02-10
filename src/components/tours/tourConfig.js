import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const TOUR_STEPS = {
    'global-intro': [
        {
            element: '#sidebar-nav',
            popover: {
                title: 'Main Navigation',
                description: 'Use this sidebar to access all MAVi features like Video Workspace, VSM, and Analysis.',
                side: "right",
                align: 'start'
            }
        },
        {
            element: '#header-tools',
            popover: {
                title: 'Quick Tools',
                description: 'Access global settings, project selection, and user profile here.',
                side: "bottom",
                align: 'end'
            }
        }
    ],
    'vsm-tour': [
        {
            element: '#vsm-toolbox',
            popover: {
                title: 'VSM Toolbox',
                description: 'Drag and drop standard VSM symbols from here onto the canvas.',
                side: "right",
                align: 'start'
            }
        },
        {
            element: '#vsm-canvas',
            popover: {
                title: 'Canvas',
                description: 'This is your workspace. Connect nodes to map your value stream.',
                side: "top",
                align: 'center'
            }
        },
        {
            element: '#vsm-metrics-bar',
            popover: {
                title: 'Metrics Bar',
                description: 'Monitor key metrics like Lead Time and Cycle Time in real-time as you build.',
                side: "top",
                align: 'center'
            }
        }
    ],
    'video-workspace-tour': [
        {
            element: '#video-panel',
            popover: {
                title: 'Video Player',
                description: 'Upload your process video here. Use shortcuts (Space, S, E) to control playback.',
                side: "right",
                align: 'start'
            }
        },
        {
            element: '#element-editor',
            popover: {
                title: 'Element Editor',
                description: 'Break down the process into elements. Define VA/NVA status for each step.',
                side: "left",
                align: 'start'
            }
        }
    ]
};
