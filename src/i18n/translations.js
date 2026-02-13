export const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' }
];

export const translations = {
    en: {
        // English
        app: {
            title: 'MAVi - Motion Analysis & Visualization',
            welcome: 'Welcome to MAVi'
        },
        header: {
            mainMenu: 'Main Menu',
            maviClass: 'MAVi Class',
            studioModel: 'Studio Model',
            teachableMachine: 'Teachable Machine Studio',
            swcs: 'Standard Work Sheet (Dhyo-hyo-ka)',
            multiAxial: 'Multi-Axial Analysis',
            video: 'Video',
            aiProcess: 'AI Process',
            realtimeCompliance: 'Real-time Compliance',
            analysis: 'Analysis',
            rearrange: 'Rearrange',
            cycleAnalysis: 'Cycle Analysis',
            aggregation: 'Aggregation',
            standardTime: 'Standard Time',
            waste: 'Muda Elimination (Waste)',
            therblig: 'Therblig Analysis',
            bestWorst: 'Best vs Worst',
            comparison: 'Comparison',
            help: 'Help',
            uploadLogo: 'Upload Logo/Watermark',
            screenshot: 'Capture Screenshot',
            exportData: 'Export Data (JSON)',
            sessions: 'Genba Project Management',
            workflowGuide: 'Workflow Guide',
            statisticalAnalysis: 'Statistical Analysis',
            yamazumi: 'Yamazumi (Work Balance)',
            manualCreation: 'Manual Creation',
            valueStreamMap: 'MIFH (Material & Info Flow)',
            multiCamera: 'Multi-Camera 3D Fusion',
            vrTraining: 'VR Training Mode',
            knowledgeBase: 'Kaizen Standards Library',
            broadcast: 'Broadcast',
            actionRecognition: 'Action Recognition',
            files: 'File Explorer',
            diagnostics: 'System Diagnostics',
            pitchDeck: 'Pitch Deck',
            standardWorkLayout: 'Spaghetti Chart (Motion)',
            ergoCopilot: 'Ergo Copilot'
        },
        complianceDashboard: {
            title: 'Real-time Compliance Dashboard',
            activeStations: 'Active Stations',
            mismatchDetected: 'SEQUENCE MISMATCH DETECTED',
            standby: 'Standby',
            currentStep: 'Current Step',
            standardTime: 'Standard Time',
            actualTime: 'Actual Time',
            ng: 'NG',
            ok: 'OK',
            sequenceMismatchLabel: 'Sequence Mismatch',
            processCompliant: 'Process Compliant',
            cycleCount: 'Cycle Count',
            recentEvents: 'Recent Events',
            duration: 'Duration',
            workSequence: 'Work Sequence',
            stopMonitoring: 'Stop Monitoring',
            startMonitoring: 'Start Monitoring',
            backToGrid: 'Back to Grid',
            addNewStation: 'Add New Station',
            configureCamera: 'Configure IP Camera or Stream',
            overlayOn: 'Overlay ON',
            overlayOff: 'Overlay OFF',
            initializing: 'Initializing...',
            loadingEngine: 'Loading Multi-Camera Engine...',
            hideOverlay: 'Hide Overlay',
            showOverlay: 'Show Overlay',
            switchFocus: 'Switch to Focus View',
            switchGrid: 'Switch to Grid View',
            addCamera: 'Add Camera',
            configureStation: 'Configure Station',
            stationName: 'Station Name',
            stationNamePlaceholder: 'e.g. Assembly Line 1',
            cameraType: 'Camera Type',
            mjpegOption: 'IP camera / Stream (MJPEG/HTTP)',
            streamUrl: 'Stream URL',
            streamUrlPlaceholder: 'http://192.168.1.50/mjpeg',
            complianceModel: 'Compliance Model',
            selectModel: '-- Select Model --',
            saveConfiguration: 'Save Configuration',
            configuredStations: 'Configured Stations',
            deleteStation: 'Delete Station'
        },
        ergoCopilot: {
            title: 'Ergo Copilot',
            uploadVideo: 'Upload Video',
            analysisMode: 'Analysis Mode',
            ergoStressTimeline: 'Ergonomic Stress Timeline',
            digitalTwinAnalysis: '3D Digital Twin Analysis',
            riskConfidence: 'Risk Confidence',
            finalScore: 'Final {0} Score',
            riskLevel: 'Risk Level',
            targetRwl: 'Target RWL',
            liftingParameters: 'Lifting Parameters',
            loadWeight: 'Load Weight (kg)',
            frequency: 'Frequency (lifts/min)',
            hDistance: 'H Distance (cm)',
            vDistance: 'V Distance (cm)',
            improvementPlan: 'Improvement Plan',
            generateReport: 'Generate Full Report',
            uploadPrompt: 'Upload worker video to start analysis',
            highStressAt: 'High Stress @ {0}s',
            standby: 'Standby',
            engineering: 'Engineering',
            ergonomic: 'Ergonomic',
            administrative: 'Administrative',
            recom1: 'Reduce torso twisting by rearranging parts layout.',
            recom2: 'Install height-adjustable chair for lower trunk stress.',
            recom3: 'Implement worker rotation every 2 hours.',
            negligible: 'Negligible',
            acceptable: 'Acceptable',
            nominal: 'Nominal',
            'low risk': 'Low Risk',
            increased: 'Increased',
            'medium risk': 'Medium Risk',
            high: 'High',
            'high risk': 'High Risk',
            'very high': 'Very High',
            'very high risk': 'Very High Risk'
        },
        spaghettiChart: {
            title: 'Spaghetti Chart Analysis',
            subtitle: 'Workflow simulation & movement waste identification',
            projects: 'Select Project...',
            saveProject: 'Save Analysis',
            header: {
                partName: 'Part Name',
                partNo: 'Part No',
                machine: 'Machine',
                author: 'Author',
                date: 'Date'
            },
            toolbox: {
                station: 'Operator Station',
                material: 'Inventory Control',
                machine: 'Processing Unit',
                qc: 'Quality Inspection',
                parts: 'Buffer Storage',
                clear: 'Clear Canvas'
            },
            simulation: {
                run: 'Run Simulation',
                reset: 'Reset Simulation',
                speed: 'Speed',
                distance: 'Total Distance',
                cycleTime: 'Cycle Time',
                efficiency: 'Efficiency',
                aiOptimize: 'AI Optimize',
                optimizing: 'Optimizing...',
                scanComplete: 'Scan Complete',
                wasteDetected: 'Waste Detected',
                taktTime: 'Takt Time',
                manualTime: 'Manual Time',
                machineTime: 'Machine Time',
                walkingTime: 'Walking Time',
                breakdown: 'Breakdown',
                taktViolation: 'Takt Violation!',
                uShapeOptimize: 'U-Shape Optimizer',
                applyingUShape: 'Applying U-Shape Layout...',
                uShapeRecommendation: 'U-Shape Recommendation'
            },
            helpGuide: {
                title: 'Spaghetti Chart Guide',
                subtitle: 'How to use the Lean optimization system',
                step1: 'Drag & Drop tools from the left toolbox to the canvas.',
                step2: 'Connect nodes to create a work sequence.',
                step3: 'Use AI Optimize to minimize walking distance.',
                step4: 'Use U-Shape for the best manufacturing cell.',
                step5: 'Click nodes to edit Manual/Machine times.'
            },
            aiChat: {
                title: 'Mavi Lean Assistant',
                subtitle: 'Toyota Production System Expert',
                placeholder: 'Ask about layout optimization...',
                systemPrompt: 'You are an expert in Toyota Production System (TPS). Help the user optimize their spaghetti diagram. Provide advice on reducing walking, operator balance, and cell layout.'
            },
            empty: {
                title: 'No Spaghetti data',
                desc: 'Select a project to start spaghetti diagram analysis.'
            }
        },
        common: {
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            edit: 'Edit',
            close: 'Close',
            upload: 'Upload',
            export: 'Export',
            import: 'Import',
            search: 'Search',
            filter: 'Filter',
            loading: 'Loading...',
            noData: 'No data',
            confirm: 'Confirm',
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            open: 'Open',
            select: 'Select',
            preview: 'Preview',
            saveAs: 'Save As...',
            exportZip: 'Export Project (.zip)',
            importZip: 'Import Project (.zip)',
            selectProject: 'Select Project',
            steps: 'STEPS',
            none: 'None',
            comingSoon: 'Feature coming soon!',
            undo: 'Undo',
            redo: 'Redo',
            pan: 'Pan',
            alignLeft: 'Align Left',
            alignTop: 'Align Top',
            exportAsPng: 'Export as PNG',
            color: 'Color',
            normal: 'Normal'
        },
        categories: {
            valueAdded: 'Value-Added',
            nonValueAdded: 'Non Value-Added',
            waste: 'Waste'
        },
        project: {
            newProject: 'New Project',
            openProject: 'Open Project',
            projectName: 'Project Name',
            selectProject: 'Select Project',
            noProjects: 'No projects saved',
            createNew: 'Create New Project',
            createProject: 'Create Project',
            enterName: 'Enter project name',
            videoFile: 'Video File *',
            selectVideo: 'Select Video...',
            videoSelected: 'Video Selected',
            lastModified: 'Last Modified',
            cancel: 'Cancel',
            errProjectName: 'Project name is required',
            errVideo: 'Video file is required',
            folderOptional: 'Folder (Optional)',
            rootNoFolder: 'Root (No Folder)',
            errors: {
                nameRequired: 'Project name cannot be empty',
                videoRequired: 'Please select a video file',
                nameExists: 'Project name already exists',
                notFound: 'Project not found'
            }
        },
        allowance: {
            title: 'Margin Rate Settings',
            calculatorTitle: 'Allowance Calculator',
            subtitle: 'Calculate standard time with personal, fatigue, delay, and special allowances',
            normalTime: 'Normal Time',
            normalTimeMinutes: 'Normal Time (minutes)',
            basicAllowances: 'Basic Allowances',
            personal: 'Personal Allowance (%)',
            basicFatigue: 'Basic Fatigue Allowance (%)',
            delay: 'Delay Allowance (%)',
            special: 'Special Allowance (%)',
            total: 'Total Allowance',
            done: 'Done',
            typicalPersonal: 'Typical: 5-7% (rest breaks, personal needs)',
            typicalFatigue: 'Typical: 4% (basic physical/mental fatigue)',
            typicalDelay: 'Typical: 2-5% (unavoidable delays)',
            specialDesc: 'For special circumstances',
            variableFatigue: 'Variable Fatigue Allowances',
            results: 'Results',
            standardTime: 'Standard Time',
            formula: 'Formula'
        },

        ipCamera: {
            title: 'IP Camera Connection',
            preset: 'Preset',
            streamType: 'Stream Type',
            streamUrl: 'Stream URL',
            connect: 'Connect to Stream',
            connecting: 'Connecting...',
            disconnect: 'Disconnect',
            connected: 'Connected',
            tips: {
                title: 'Tips',
                tip1: 'URL must be a direct link to the video file (not a webpage).',
                tip2: 'For RTSP, use a conversion server (like FFmpeg/VLC) to HTTP/HLS.',
                tip3: 'Look for URLs ending in .m3u8 or .mp4.'
            },
            errors: {
                missingUrl: 'Enter stream URL',
                videoUnavailable: 'Video element not available',
                connectionFailed: 'Failed to connect. Ensure the URL is a direct stream (e.g. .m3u8, .mp4, or MJPEG), not a webpage.',
                generic: 'Failed to connect to stream'
            }
        },
        measurement: {
            startMeasurement: 'Start Measurement',
            endMeasurement: 'End Measurement',
            elementName: 'Element Name',
            category: 'Category',
            duration: 'Duration',
            startTime: 'Start Time',
            endTime: 'End Time'
        },
        landing: {
            nav: {
                features: 'Features',
                solutions: 'Solutions',
                login: 'Log In',
                startDemo: 'Start Demo'
            },
            hero: {
                newBadge: '✨ New: AI Manual Generation',
                title: 'Optimize Motion with',
                highlight: 'Intelligent Analysis',
                subtitle: 'Mavi uses advanced computer vision to analyze workflows, calculating standard times and identifying waste automatically. Increase productivity by up to 40%.',
                ctaPrimary: 'Start Free Demo',
                ctaSecondary: 'Learn More'
            },
            solutions: {
                title: 'Why choose Mavi?',
                oldWay: 'The Old Way',
                maviWay: 'The Mavi Solution',
                old: {
                    stopwatch: {
                        title: 'Manual Stopwatch',
                        desc: 'Inaccurate timing dependent on human reaction speed.'
                    },
                    paper: {
                        title: 'Paper & Clipboard',
                        desc: 'Data is trapped on paper, requiring manual entry into Excel later.'
                    },
                    subjective: {
                        title: 'Subjective Analysis',
                        desc: 'Different engineers produce different results for the same task.'
                    }
                },
                mavi: {
                    video: {
                        title: 'AI Video Analysis',
                        desc: 'Frame-perfect timing automatically extracted from video footage.'
                    },
                    digital: {
                        title: 'Digital & Instant',
                        desc: 'Data is digitized immediately. Generate reports and manuals in one click.'
                    },
                    standardized: {
                        title: 'Standardized & Accurate',
                        desc: 'Consistent analysis every time, eliminating human error and bias.'
                    },
                    cta: 'Switch to Mavi Today'
                }
            },
            features: {
                title: 'More powerful features',
                manual: {
                    title: 'Manual Creator',
                    desc: 'Turn analysis into training manuals. Import from Excel/Word or generate from video steps.'
                },
                workflow: {
                    title: 'Drag & Drop Workflow',
                    desc: 'Rearrange process elements visually to test new layouts without disrupting the line.'
                },
                cloud: {
                    title: 'Cloud Sync',
                    desc: 'Collaborate with your team in real-time. Sync projects and manuals across devices securely.'
                }
            },

            allowance: {
                title: 'Allowance Settings',
                personal: 'Personal (%)',
                basicFatigue: 'Basic Fatigue (%)',
                delay: 'Delay (%)',
                total: 'Total Allowance:',
                done: 'Done'
            },
            studioModel: {
                title: 'Studio Model',
                subtitle: 'Design and build motion analysis models',
                createButton: 'Create New Model',
                helpButton: 'Help',
                searchPlaceholder: 'Search models...',
                noModels: 'No models found',
                createFirst: 'Create your first model',
                deleteConfirm: 'Are you sure you want to delete this model?',
                renamePrompt: 'Enter new name for this model:',
                descPrompt: 'Enter new description:',
                openEditor: 'Open Editor',
                delete: 'Delete Model',
                clickRename: 'Click to rename',
                clickDesc: 'Click to change description',
                states: 'States',
                rules: 'Rules',
                helpModal: {
                    title: 'Studio Model Guide (Motion Rules)',
                    intro: 'This system is designed to create **"Motion Rules"** without coding, using **Finite State Machine (FSM)** logic.',
                    concepts: {
                        title: '1. Basic Concepts (Logic)',
                        state: 'State (Status): Operator condition (e.g., Waiting, Grasping, Assembling).',
                        transition: 'Transition: Moving from one State to another.',
                        rule: 'Rule: Condition for transition (e.g., If Right Hand > Table, move to \'Grasping\').'
                    },
                    workflow: {
                        title: '2. Model Creation Workflow',
                        step1: 'Upload Video: Input standard operator video.',
                        step2: 'Define States: List activities (work steps).',
                        step3: 'Create Transitions & Rules: Connect states with auto-detection logic.',
                        step4: 'Validation: Test with other videos to ensure accuracy.'
                    },
                    navigation: {
                        title: '3. Editor Navigation',
                        tabStates: 'States Tab: Add/Edit work steps.',
                        tabRules: 'Rules Tab: Create logic "When to move steps".',
                        tabTest: 'Test/Debug Tab: View real-time detection results.'
                    },
                    aiIntegration: {
                        title: '2. AI Integration (Roboflow)',
                        desc: 'Detect PPE, components, or tools using custom AI models.',
                        config: 'Config: Go to Settings -> Roboflow Models. Enter API Key and Project ID.',
                        demo: 'Demo: Click "Try Demo" to simulate detection.',
                        rule: 'Rule: Use "Roboflow Detection" rule type, type object name (e.g. helmet), and threshold.'
                    },
                    testRun: {
                        title: '3. Test Run',
                        desc: 'Test your logic with video or webcam.',
                        panel: 'Left Panel: Visualization (Video, Skeleton, Bounding Box).',
                        console: 'Live Console: Monitor real-time logs.',
                        timeline: 'Visual Timeline: Shows when transitions occur.',
                        analytics: 'Cycle Analytics: VA/NVA ratio calculation.'
                    },
                    tips: {
                        title: '4. Accuracy Tips',
                        colors: 'Color Indicators: Blue rule means condition is currently met.',
                        holding: 'Holding Time: Add duration to avoid flickering transitions.',
                        refresh: 'Refresh: If data is stuck, save and refresh browser.'
                    },
                    close: 'Close Guide'
                },
                modelBuilder: {
                    title: 'Model Builder',
                    tabs: {
                        rules: 'Rules & Logic',
                        steps: 'Steps',
                        data: 'Data',
                        test: 'Test Run',
                        settings: 'Settings'
                    },
                    buttons: {
                        save: 'Save',
                        undo: 'Undo',
                        redo: 'Redo',
                        help: 'Help',
                        close: 'Close',
                        changeVideo: 'Change Video',
                        uploadVideo: 'Upload Video',
                        referenceVideo: 'Reference Video',
                        liveCamera: 'Live Camera',
                        simulator: 'Simulator',
                        clearConsole: 'Clear',
                        exportPdf: 'Export PDF',
                        addState: 'Add State',
                        backToList: 'Back to List',
                        drawRoi: 'Draw ROI',
                        captureFrame: 'Capture Frame',
                        addSound: 'Sound',
                        addWebhook: 'Webhook',
                        addPlc: 'PLC',
                        onEnter: 'On Enter State',
                        onExit: 'On Exit State',
                        delete: 'Delete',
                        backToVideo: 'Back to Video',
                        backToCamera: 'Back to Camera'
                    },
                    labels: {
                        motionTimeline: 'MOTION TIMELINE',
                        currentState: 'Current State',
                        liveConsole: 'Live Console',
                        cycleAnalytics: 'Cycle Analytics',
                        plcMonitor: 'PLC Signal Monitor',
                        detailedMetrics: 'Detailed Metrics',
                        totalCycles: 'TOTAL CYCLES',
                        vaRatio: 'VA RATIO',
                        avgStats: 'AVERAGE STATISTICS',
                        cycleTime: 'Cycle Time (TC)',
                        vaTime: 'VA Time',
                        cycleHistory: 'CYCLE HISTORY',
                        definedStates: 'Defined States',
                        stateName: 'State Name',
                        minDuration: 'Min Duration (s)',
                        valueAdded: 'Value Added (VA)',
                        markEssential: 'Mark this state as essential...',
                        actionTriggers: 'Action Triggers',
                        roi: 'ROI',
                        drawBoxHint: 'Draw a box on the video...',
                        poseRef: 'Pose Reference',
                        projectVault: 'Project Vault',
                        localFile: 'Local File',
                        selectFromProject: 'Select from Project',
                        defined: 'Defined',
                        none: 'None',
                        stepCount: 'Step',
                        duplicateState: 'Duplicate State',
                        addNextStep: 'Add Next Step',
                        drawRoiHint: 'Draw a box on the video to define the valid area for this step.',
                        camera: 'Camera',
                        simulator: 'Simulator',
                        addState: 'Add State',
                        backToList: 'Back to List',
                        definedStates: 'Defined States'
                    },
                    measure: {
                        result: 'RESULT',
                        distance: 'DISTANCE',
                        angle: 'ANGLE',
                        addToRule: 'Add to Rule',
                        hint: 'Pick points on skeleton (max 3)',
                        ruler: 'RULER',
                        measureDistance: 'Measure Distance',
                        measureAngle: 'Measure Angle',
                        clear: 'Clear Measurement'
                    },
                    vsm: {
                        title: 'Value Stream Map',
                        toolbox: {
                            title: 'VSM Toolbox',
                            desc: 'Drag & drop to canvas',
                            flowTitle: 'FLOW RELATIONSHIP',
                            material: 'Material',
                            manualInfo: 'Manual Info',
                            electronicInfo: 'Electronic Info',
                            processData: 'PROCESS DATA',
                            processBox: 'Process Box',
                            operator: 'Operator',
                            kaizenBurst: 'Kaizen Burst',
                            materialFlow: 'MATERIAL FLOW',
                            supplier: 'Supplier',
                            customer: 'Customer',
                            inventory: 'Inventory',
                            supermarket: 'Supermarket',
                            fifo: 'FIFO',
                            safetyStock: 'Safety Stock',
                            truck: 'Truck',
                            rawMaterial: 'Raw Material',
                            finishedGoods: 'Finished Goods',
                            push: 'Push',
                            informationFlow: 'INFORMATION FLOW',
                            productionControl: 'Production Control',
                            heijunka: 'Heijunka',
                            kanbanPost: 'Kanban Post',
                            productionKanban: 'Production Kanban',
                            withdrawalKanban: 'Withdrawal Kanban',
                            signalKanban: 'Signal Kanban',
                            goSee: 'Go See',
                            buffer: 'Buffer',
                            timelineMetrics: 'TIMELINE & METRICS',
                            timeline: 'Timeline',
                            generalNotes: 'GENERAL / NOTES',
                            stickyNote: 'Sticky Note',
                            customIcons: 'CUSTOM ICONS',
                            uploadIcon: 'Upload Icon'
                        },
                        ai: {
                            title: 'VSM AI Assistant',
                            subtitle: 'AI Generation',
                            modeReplace: 'Replace All',
                            modeMerge: 'Merge',
                            generateButton: 'Generate AI',
                            examplesButton: 'Examples',
                            wizardTitle: 'Setup Wizard'
                        },
                        wizard: {
                            title: 'Setup Wizard'
                        },
                        analysis: {
                            yamazumiTitle: 'Yamazumi Chart'
                        },
                        calculate: 'Recalculate',
                        nodes: {
                            noteDefault: '(Default)'
                        },
                        addProcess: 'Add Process'
                    },
                    projectPicker: {
                        title: 'Select Project Video',
                        noProjects: 'No projects found.',
                        select: 'Select'
                    },
                    ipCamera: {
                        title: 'Record from IP Camera',
                        streamUrl: 'Camera Stream URL (MJPEG/HTTP)',
                        recording: 'REC',
                        previewHint: 'Enter camera URL to preview or switch to Simulator'
                    },
                    rules: {
                        types: {
                            POSE_ANGLE: 'Joint Angle',
                            POSE_RELATION: 'Pose Relation (XYZ)',
                            POSE_VELOCITY: 'Pose Velocity (Speed)',
                            OBJECT_PROXIMITY: 'Object Proximity',
                            OBJECT_IN_ROI: 'Object in ROI',
                            OPERATOR_PROXIMITY: 'Operator Proximity',
                            POSE_MATCHING: 'Golden Pose Match',
                            SEQUENCE_MATCH: 'Motion Sequence Match (DTW)',
                            TEACHABLE_MACHINE: 'Teachable Machine',
                            ROBOFLOW_DETECTION: 'Roboflow Detection',
                            CVAT_MODEL: 'CVAT / Custom Model',
                            ADVANCED_SCRIPT: 'Advanced Script (DSL)'
                        },
                        operators: {
                            LESS: '<',
                            GREATER: '>',
                            LESS_EQUAL: '<=',
                            GREATER_EQUAL: '>=',
                            EQUAL: '=',
                            NOT_EQUAL: '!=',
                            BETWEEN: 'Between'
                        },
                        conditionMet: 'Condition Met',
                        noMatch: 'No Match',
                        ready: 'Ready',
                        mustBeIn: 'must be in',
                        distanceTo: 'distance to'
                    },
                    step: 'Step',
                    prompts: {
                        soundUrl: 'Enter Sound URL (mp3/wav):',
                        webhookUrl: 'Enter Webhook URL:',
                        plcSignalId: 'Enter PLC Signal ID (e.g. DO_01):',
                        plcValue: 'Enter Value (HIGH/LOW):',
                        versionName: 'Enter version name (e.g. "V1 Initial Draft"):',
                        restoreVersion: 'Restore version "{{version}}"? Current unsaved changes will be lost.',
                        deleteVersion: 'Delete version "{{version}}"?',
                        templateLoad: 'Load "{{name}}"? This will REPLACE your current states.'
                    },
                    settings: {
                        title: 'Model Settings',
                        versionHistory: 'Version History',
                        saveSnapshot: 'Save Snapshot',
                        noVersions: 'No saved versions yet.',
                        restore: 'Restore',
                        coordinateSystem: 'Coordinate System',
                        screen: 'Screen (Absolute 0-1)',
                        bodyCentric: 'Body-Centric (Relative to Hip)',
                        bodyCentricHint: 'Body-Centric is recommended for precision. It remains accurate even if the operator moves around or the camera shifts. (0,0) is the center of the hips.',
                        states: 'states'
                    },
                    teachableMachine: {
                        title: 'Teachable Machine Models',
                        goToSite: 'Go to Site',
                        addModel: 'Add Model',
                        modelUrl: 'Model URL',
                        image: 'Image',
                        pose: 'Pose',
                        loading: 'Loading Model...',
                        offlineMode: 'Offline Mode: Upload Files',
                        loadFiles: 'Load Files'
                    },
                    roboflow: {
                        title: 'Roboflow Models',
                        tryDemo: 'Try Demo',
                        apiKey: 'API Key',
                        projectId: 'Project ID',
                        version: 'Ver.',
                        noModels: 'No Roboflow models configured.'
                    },
                    portability: {
                        title: 'Portability & Templates',
                        exportJson: 'Export JSON',
                        importJson: 'Import JSON',
                        loadTemplate: 'Load from Template Library',
                        selectTemplate: 'Select Motion Template'
                    },
                    extraction: {
                        title: 'Pose Extraction Data',
                        mode: 'Mode',
                        trackingLive: 'Tracking Live',
                        noData: 'No Data',
                        keypoint: 'Keypoint',
                        conf: 'Conf'
                    },
                    indicators: {
                        referenceCaptured: '✓ Reference Pose Captured',
                        drawing: 'Drawing...',
                        loadingPose: 'Loading Pose Detector...',
                        detectorReady: 'Skeleton Ready - Play video to detect',
                        detecting: 'Detecting...',
                        operatorDetected: 'Operator Detected',
                        logicMatched: 'Logic matched',
                        playToTest: 'Play video to test',
                        systemReady: 'System ready. Press Play on video to start simulation.',
                        waiting: 'Waiting...',
                        noSignals: 'No signals active',
                        completeCycle: 'Complete one cycle to see analytics'
                    },
                    tooltips: {
                        restoreLayout: 'Restore Layout',
                        maximizeEditor: 'Maximize Editor',
                        changeVideo: 'Change or upload new video'
                    }
                }
            },
            how: {
                title: 'How Mavi Works',
                capture: {
                    title: 'Capture',
                    desc: 'Record your production line or upload an existing video file directly to the platform.'
                },
                analyze: {
                    title: 'Analyze',
                    desc: 'Our Computer Vision engine detects cycles, calculates times, and identifies waste automatically.'
                },
                improve: {
                    title: 'Improve',
                    desc: 'Use data-backed insights to rebalance lines, eliminate bottlenecks, and boost productivity.'
                }
            },
            audience: {
                title: 'Built for professionals',
                ie: {
                    title: 'Industrial Engineers',
                    desc: 'Stop spending hours on manual data entry. Capture cycles automatically and generate standard work charts in minutes.'
                },
                pm: {
                    title: 'Plant Managers',
                    desc: 'Gain full visibility into your production lines. Identify bottlenecks instantly and track efficiency improvements over time.'
                },
                lc: {
                    title: 'Lean Consultants',
                    desc: 'Deliver value to your clients faster. Use Mavi to provide data-backed recommendations and impressive "Before/After" visual proof.'
                }
            },
            faq: {
                title: 'Frequently Asked Questions',
                q1: {
                    q: 'Is my video data secure?',
                    a: 'Yes. Mavi uses enterprise-grade encryption. For Pro plans, data is stored securely in the cloud. For Starter plans, data never leaves your local device.'
                },
                q2: {
                    q: 'Can I export reports to Excel?',
                    a: 'Absolutely. You can export all analysis data, charts, and standard work sheets directly to Excel, PDF, or Word formats.'
                },
                q3: {
                    q: 'Do I need special hardware?',
                    a: 'No. Mavi works with any standard video file (MP4, WEBM) or IP Camera input. No expensive sensors required.'
                }
            },
            cta: {
                title: 'Ready to optimize your workflow?',
                desc: 'Join thousands of engineers who are saving time and improving efficiency with Mavi.',
                button: 'Start Free Trial'
            },
            footer: {
                product: 'Product',
                company: 'Company',
                resources: 'Resources',
                legal: 'Legal',
                rights: '© 2025 Mavi Systems Inc. All rights reserved.'
            }
        },
        sensei: {
            welcome: "👋 Hello! I am **MAVi Sensei**, an AI assistant ready to help you learn how to use the MAVi application.\n\nYou can ask about:\n- How to use specific features\n- Explanation of TPS tools\n- Tips & tricks\n- Troubleshooting\n\nWhat would you like to learn today?",
            placeholder: 'Ask Sensei...',
            thinking: 'Sensei is thinking...',
            mute: 'Mute Sensei',
            unmute: 'Unmute Sensei',
            apiKeyMissing: '⚠️ **API Key not set.**',
            apiKeyWarning: 'Please set the Gemini API Key in **Settings** to use full AI features.',
            openSettings: 'Open AI Settings',
            onlineStatus: 'Online & Ready to Help',
            errorTechnical: 'Sorry, there is a technical issue. Make sure the API Key is correct and your internet connection is stable.'
        },
        maviClass: {
            title: 'MAVi Class',
            subtitle: 'Learn MAVi from beginner to expert',
            progress: 'Progress',
            lessons: 'Lessons',
            totalDuration: 'Total Duration',
            modules: 'Modules',
            moduleLabel: 'Module',
            cobaSekarang: 'Try It Now',
            tontonVideo: 'Watch Video',
            keyPoints: 'Key Points',
            congratulations: 'Congratulations!',
            congratsMessage: 'You have completed all MAVi Class materials. Congratulations on becoming a MAVi Expert!',
            resetProgress: 'Reset Progress',
            resetConfirm: 'Reset all progress? This action cannot be undone.',
            basicResponses: {
                help: 'I can help you learn MAVi features like Yamazumi, VSM, and others.',
                features: 'MAVi features AI Analysis, Time Study, and TPS Tools.',
                yamazumi: '🏔️ Yamazumi Chart:\n1. Open **Yamazumi** menu (/yamazumi)\n2. Import data from measurement\n3. View stacked bars per operator/station\n4. Compare with takt time',
                vsm: '🗺️ Value Stream Map:\n1. Open **Value Stream Map** menu (/value-stream-map)\n2. Create Current State Map\n3. Identify wastes\n4. Design Future State Map',
                uploadVideo: '📹 To upload video:\n1. Open **Video Workspace** (🎬 menu)\n2. Click Upload or drag & drop file\n3. Supported formats: MP4, WebM, AVI',
                measureTime: '⏱️ To measure time:\n1. In Video Workspace, use **Element Editor**\n2. Click "Start Measurement" to begin\n3. Click "End Measurement" to finish\n4. Name the element and select Therblig type',
                aiFeatures: '🧠 AI Features available at:\n- **AI Process Studio** (/ai-process): Video intelligence, motion analysis\n- **Action Recognition**: Automatic action detection\n- **Real-time Compliance**: SOP compliance monitoring',
                wasteElimination: '🗑️ 7 Wastes (Muda):\n- Transport, Inventory, Motion, Waiting\n- Over-processing, Over-production, Defects\n\nUse **Waste Elimination** menu (/waste-elimination) for identification',
                therblig: '📍 18 Therblig Motions:\n- Transport Empty, Grasp, Transport Loaded\n- Position, Release, Use, Assemble, etc.\n\nOpen **Therblig Analysis** (/therblig) for details',
                createWorkInstruction: '📘 Create Work Instruction:\n1. Open **Manual Creation** (/manual-creation)\n2. Capture frame from video\n3. Use AI to generate instructions\n4. Export to PDF/Word/PowerPoint',
                fallback: "🤔 Hmm, I need more context. Try asking about video upload or AI features."
            }
        },
        videoWorkspace: {
            title: 'Video Workspace',
            uploadVideo: 'Upload Video',
            uploadOrIP: 'Upload video or use IP Camera',
            enterURL: 'Enter Stream URL (rtsp/http)',
            connecting: 'Connecting...',
            dragDrop: 'Drag & drop video or click to select',
            playPause: 'Play/Pause',
            speed: 'Speed',
            volume: 'Volume',
            fullscreen: 'Fullscreen',
            currentTime: 'Current Time',
            duration: 'Duration',
            noVideo: 'No video loaded',
            loading: 'Loading video...',
            error: 'Error loading video',
            cancel: 'Cancel',
            showDrawingTools: 'Show Drawing Tools',
            hideDrawingTools: 'Hide Drawing Tools',
            showCameraPanel: 'Show Camera Panel',
            hideCameraPanel: 'Hide Camera Panel',
            reverseMode: 'REVERSE MODE',
            frame: 'Frame',
            fullscreen: 'Full Screen',
            exitFullscreen: 'Exit Full Screen',
            pen: 'Pen',
            line: 'Line',
            arrow: 'Arrow',
            rectangle: 'Rectangle',
            circle: 'Circle',
            text: 'Text',
            prevFrame: 'Previous Frame',
            nextFrame: 'Next Frame',
            normalMode: 'Normal Mode',
            size: 'Size',
            clearDrawings: 'Clear All Drawings',
            dragToResize: 'Drag to resize',
            aiIntelligence: 'AI Video Intelligence'
        },
        elementEditor: {
            title: 'Element Editor',
            addElement: 'Add Element',
            editElement: 'Edit Element',
            deleteElement: 'Delete Element',
            elementName: 'Element Name',
            startTime: 'Start Time',
            endTime: 'End Time',
            duration: 'Duration',
            category: 'Category',
            therbligType: 'Therblig Type',
            notes: 'Notes',
            startMeasurement: 'Start Measurement',
            endMeasurement: 'End Measurement',
            cancelMeasurement: 'Cancel Measurement',
            measuring: 'Measuring...',
            noElements: 'No elements yet',
            confirmDelete: 'Delete this element?',
            saveToDb: 'Save to Database',
            quickMode: 'Quick Mode',
            autoCounter: 'Auto Counter',
            showDashboard: 'Show Dashboard',
            hideDashboard: 'Hide Dashboard',
            selectAnElement: 'Select an element first',
            nextCycle: 'Next Cycle',
            prevCycle: 'Previous Cycle',
            zoomLevel: 'Zoom Level',
            playbackSpeed: 'Playback Speed',
            actions: 'Actions',
            cycle: 'Cycle',
            process: 'Process',
            manual: 'Manual',
            auto: 'Auto',
            walk: 'Walk',
            loss: 'Loss (L)',
            rating: 'Rating %',
            normalTime: 'NT (s)',
            standardTime: 'ST (s)',
            emptyElements: 'No elements yet. Start measurement to add elements.',
            noFilterMatch: 'No elements match the filter.',
            exporting: 'Exporting...',
            exportSuccess: 'Export Completed!',
            exportFailed: 'Export failed',
            preparingExcel: 'Preparing Excel file...',
            showingElements: 'Showing {{filtered}} of {{total}} elements',
            errors: {
                positiveTimes: 'Start and Finish times must be positive numbers.',
                startLessFinish: 'Start time must be less than Finish time.',
                totalSplitExceeds: 'Total breakdown time cannot exceed element duration.'
            },
            ratingSpeed: 'Rating Speed',
            stopTracking: 'Stop {{type}} Tracking',
            startTracking: 'Start {{type}} Tracking',
            quickModeHint: 'Quick Mode Active: Press <kbd>M</kbd> to start/end measurement. Elements auto-named.',
            elements: 'Elements',
            cycles: 'Cycles',
            untitled: 'Untitled',
            exitFullscreen: 'Exit Full Screen',
            fullscreenEditor: 'Full Screen Editor',
            allowanceSettings: 'Allowance Settings',
            toggleColumns: 'Hide/Show Columns',
            searchPlaceholder: 'Search elements...',
            sortBy: 'Sort by',
            sortOriginal: 'Original Order',
            sortCycle: 'Cycle',
            sortDuration: 'Duration (Longest)',
            sortName: 'Name (A-Z)',
            selectOption: '-- Select --',
            total: 'Total',
            splitTimePrompt: 'Enter split time (between {{start}}s - {{end}}s):',
            invalidSplitTime: 'Invalid split time! Must be between start and end time.',
            toggleRatingSpeed: 'Toggle Rating Speed',
            zoomLevelTitle: 'Zoom Level'
        },
        timeline: {
            title: 'Timeline Statistics',
            totalTime: 'Total Time',
            vaRatio: 'VA Ratio',
            waste: 'Waste',
            bottleneck: 'Bottleneck Detected',
            noData: 'No data available',
            categoryBreakdown: 'Category Breakdown',
            zoomIn: 'Zoom In',
            zoomOut: 'Zoom Out',
            toggleGrid: 'Toggle Grid',
            grid: 'Grid',
            standard: 'Standard',
            vsm: 'VSM',
            compact: 'Compact'
        },
        yamazumi: {
            title: 'Yamazumi Chart',
            subtitle: 'Workload Balance Analysis',
            operator: 'Operator',
            station: 'Station',
            taktTime: 'Takt Time',
            cycleTime: 'Cycle Time',
            workload: 'Workload',
            balance: 'Balance',
            addOperator: 'Add Operator',
            importData: 'Import Data',
            exportChart: 'Export Chart',
            showTaktLine: 'Show Takt Line',
            noData: 'No data to display'
        },
        vsm: {
            title: 'Value Stream Mapping',
            templates: {
                title: 'Load Manufacturing Template',
                notFound: 'Template not found!',
                loadSuccess: 'Template "{{name}}" loaded successfully!',
                replace: 'Replace (Full Wipe)',
                merge: 'Merge (Append)',
                simple: 'Simple (3 Nodes)',
                intermediate: 'Intermediate (14 Nodes)',
                advanced: 'Advanced (20 Nodes)',
                integrated: 'Integrated Supply Chain Simulation',
                pull: 'Pull System & Information Flow',
                expert: 'Expert: Complex Factory (Trolley & QC)',
                descSimple: 'Supplier → Painting → Customer',
                descIntermediate: 'Automotive Manufacturing with Kanban',
                descAdvanced: 'Global Supply Chain - Sea Transport, 4-Month Lead Times, Full Kanban Pull',
                descIntegrated: 'Complete Flow: Customer → Delivery → QC → Manufacturing → Raw Materials → Suppliers',
                descPull: 'Kanban Loop: Production Control → Heijunka → Process → Supermarket',
                descExpert: 'Complete VSM with Trolley Transport, Quality Control, and Multi-Process Flow.',
                invalidNodes: 'Invalid file: nodes not found',
                invalidEdges: 'Invalid file: edges not found',
                loadSuccessGeneric: '✅ VSM loaded successfully!',
                loadError: '❌ Failed to load VSM: ',
                selectTitle: 'Select VSM Template',
                confirmTitle: 'Load Confirmation',
                loadQuestion: 'You are about to load template "{{name}}". How would you like to proceed?',
                replace: 'Replace Canvas',
                replaceDesc: 'Clear all & load new',
                merge: 'Merge Existing',
                mergeDesc: 'Add to current canvas'
            },
            currentState: 'Current State',
            futureState: 'Future State',
            process: 'Process',
            inventory: 'Inventory',
            information: 'Information',
            timeline: 'Timeline',
            leadTime: 'Lead Time',
            processTime: 'Process Time',
            valueAdded: 'Value Added',
            nonValueAdded: 'Non Value Added',
            addProcess: 'Add Process',
            pcsPerHour: 'Pcs per Hour',
            addInventory: 'Add Inventory',
            calculate: 'Recalculate', // Update key
            clear: 'Clear',
            newVsm: 'New VSM',
            ai: {
                title: 'Generate VSM from Description',
                subtitle: 'Describe your process, AI will create a full Value Stream Map',
                promptLabel: 'Process Description',
                promptPlaceholder: 'Example: Starts from supplier, then cutting 30s, assembly 45s, inventory 100 units, QC 20s, packing 25s to customer...',
                languageLabel: 'Output Language',
                promptLangName: 'English',
                modeLabel: 'Mode',
                modeReplace: 'Replace Canvas',
                modeMerge: 'Merge with Existing',
                examplesButton: 'View Examples',
                hideExamplesButton: 'Hide Examples',
                generateButton: 'Generate VSM',
                cancelButton: 'Cancel',
                charCount: 'characters',
                tip: 'Include cycle time, operators, inventory, AND info flow (control, kanban, forecast) for a complete VSM.',
                loadConfirm: 'Found {{nodes}} nodes & {{edges}} connections.\n\nOK = {{replace}}\nCancel = {{merge}}'
            },
            wizard: {
                title: 'Setup Wizard'
            },
            analysis: {
                yamazumiTitle: 'Yamazumi Chart',
                results: 'Simulation Results',
                feasible: 'FEASIBLE',
                impossible: 'IMPOSSIBLE',
                fulfilledQty: 'Fulfilled',
                bottleneckQty: 'Bottlenecks',
                totalCost: 'Total Cost',
                costBreakdown: 'Cost Breakdown',
                wipViolations: 'WIP Limit Violations',
                rootCause: 'Root Cause:',
                capacityDemandTitle: 'Capacity vs Demand (Yamazumi Chart)',
                outputCapacity: 'Output Capacity',
                targetDemand: 'Target Demand',
                nodeInventoryStatus: 'Node Inventory Status',
                tableName: 'Node',
                tableCt: 'CT (s)',
                tablePcsHr: 'Pcs/Hr',
                tableShift: 'Shift',
                tableOutput: 'Output',
                tableLoadHours: 'Hours (Load)',
                tableBalance: 'Balance',
                tableStatus: 'Status',
                exportReport: 'Export Report',
                noTimelineData: 'No timeline data available.',
                timelineTitle: 'End-to-End Supply Chain Timeline',
                mustStartNoLater: 'Must Start No Later Than:',
                supplier: 'Supplier',
                logistic: 'Logistic',
                process: 'Process',
                failCause: 'Failure Cause:'
            },
            confirmDeleteNode: 'Delete selected node?',
            confirmDeleteIcon: 'Delete this icon?',
            confirmReset: 'Clear canvas? All unsaved changes will be lost.',
            edgeOptions: 'Edge Options',
            arrowDirection: 'Arrow Direction',
            simulation: {
                start: 'Start Simulation',
                stop: 'Stop',
                reset: 'Reset',
                shortage: 'SHORTAGE!',
                demandMet: 'Demand Met',
                delivering: 'Delivering...',
                title: 'Flow Simulation'
            },
            supplyChain: {
                title: 'Supply Chain Simulation',
                backToCanvas: 'Back to Canvas',
                analysisResults: 'Analysis & Results',
                timeline: 'Timeline',
                logs: 'Logs',
                scenarios: 'Scenarios',
                demandQty: 'Demand Quantity',
                dueDate: 'Due Date',
                processing: 'Simulating...',
                run: 'Run Simulation',
                flowView: 'Flow View',
                autoTidy: 'Auto-Tidy Nodes',
                liveStatus: 'LIVE STATUS',
                idle: 'Standby',
                flowOptimized: 'Flow Optimized',
                shortageDetected: 'Shortage Detected',
                healthyFlow: 'Healthy Flow',
                bottleneck: 'Bottleneck',
                shortage: 'Shortage',
                issue: 'Issue',
                runPrompt: 'Click "Run Simulation" to see analysis results.',
                runFirst: 'Run simulation first!',
                customerNotFound: 'Customer Node not found!'
            },
            help: {
                mainTitle: 'Value Stream Mapping',
                addingSymbols: 'Adding Symbols',
                dragDrop: 'Drag symbols from VSM Toolbox (right sidebar)',
                dropCanvas: 'Drop onto canvas to add',
                editProps: 'Click symbol to edit properties',
                connectingHeading: 'Connecting Processes',
                connectDesc: 'Drag from connection point of one node to another',
                autoArrow: 'Automatically creates arrow connection',
                keyboardShortcuts: 'Keyboard Shortcuts',
                saveLoadHeading: 'Save/Load Features',
                saveDesc: 'Download VSM as .mavi-vsm file',
                loadDesc: 'Load VSM from file',
                mergeReplace: 'Choose mode: Replace (clear all) or Merge (combine)',
                advancedHeading: 'Advanced TPS Features',
                yamazumiDesc: 'Visualize work balance vs Takt Time.',
                epeiDesc: 'Analyze production flexibility.',
                timelineDesc: 'Automatic ladder at the bottom shows Lead Time vs VA Time steps.',
                nodesTitle: 'Node Functions & Parameters',
                processNodeTitle: 'Process Box',
                processNodeDesc: 'Main production step where value is added.',
                paramCT: 'CT (Cycle Time): Time to complete 1 unit (seconds).',
                paramCO: 'CO (Changeover): Setup time to switch product models.',
                paramUptime: 'Uptime: % machine availability.',
                paramYield: 'Yield: % good products (First Time Right).',
                inventoryNodeTitle: 'Inventory (Triangle)',
                inventoryNodeDesc: 'Stock accumulation between processes.',
                paramAmount: 'Amount: Physical quantity (pcs/kg).',
                paramTime: 'Time: How long stock lasts (Days) = Stock / Daily Demand.',
                customerTitle: 'Customer / Supplier (Factory)',
                paramDemand: 'Demand: Customer requirement per day.',
                paramTakt: 'Takt Time: Required production rhythm = Available Time / Demand.'
            },
            toolbox: {
                title: 'VSM Toolbox',
                desc: 'Drag & drop to canvas',
                flowTitle: 'FLOW CONNECTIONS',
                material: 'Material',
                manualInfo: 'Manual Info',
                electronicInfo: 'Electronic Info',
                processData: 'PROCESS DATA',
                processBox: 'Process Box',
                project: 'Project Node',
                operator: 'Operator',
                kaizenBurst: 'Kaizen Burst',
                materialFlow: 'MATERIAL FLOW',
                supplier: 'Supplier',
                customer: 'Customer',
                inventory: 'Inventory',
                supermarket: 'Supermarket',
                fifo: 'FIFO',
                safetyStock: 'Safety Stock',
                truck: 'Truck',
                forklift: 'Forklift',
                trolley: 'Trolley',
                sea: 'Sea Cargo',
                air: 'Air Cargo',
                rawMaterial: 'Raw Material',
                finishedGoods: 'Finished Goods',
                push: 'Push',
                informationFlow: 'INFORMATION FLOW',
                productionControl: 'Production Control',
                heijunka: 'Heijunka',
                kanbanPost: 'Kanban Post',
                productionKanban: 'Production Kanban',
                withdrawalKanban: 'Withdrawal Kanban',
                signalKanban: 'Signal Kanban',
                goSee: 'Go See',
                buffer: 'Buffer',
                timelineMetrics: 'TIMELINE & METRICS',
                timeline: 'Timeline',
                generalNotes: 'GENERAL / NOTES',
                stickyNote: 'Sticky Note',
                customIcons: 'MY ICONS',
                uploadIcon: 'Upload Icon'
            },
            wizard: {
                title: 'MAGIC WIZARD',
                customerTitle: 'Customer Configuration',
                customerDesc: 'Define your customer and their demand requirements.',
                customerName: 'Customer Name',
                demandPerDay: 'Demand / Day (pcs)',
                shifts: 'Shifts',
                hoursPerShift: 'Hours/Shift',
                packSize: 'Pack Size (Pitch)',
                materialSource: 'Customer Material Source',
                production: 'Production',
                fgWarehouse: 'FG Warehouse',
                shippingMethod: 'Shipping Method',
                productionTitle: 'Production Processes',
                productionDesc: 'Enter processes in order from Upstream (Supplier) to Downstream (Customer).',
                addProcess: 'Add New Process',
                processName: 'Process Name',
                ct: 'CT (sec)',
                pcsPerHour: 'Pcs/Hr',
                co: 'CO',
                uptime: 'Uptime (%)',
                buffer: 'Buffer',
                flow: 'Flow',
                receivingTitle: 'Receiving Warehouse',
                receivingDesc: 'Configure the material receiving area before it enters production.',
                useReceiving: 'Use Receiving Warehouse?',
                receivingInfo: 'Adds an initial buffer stock after material arrives from supplier.',
                initialStock: 'Initial Stock Amount (pcs)',
                internalTransport: 'Internal Transport to Production',
                directMaterialInfo: 'Material will be delivered directly from supplier to the first production process.',
                supplierTitle: 'Suppliers & Raw Material',
                addSupplier: 'Add Supplier',
                useMaterialWh: 'Use Material Warehouse (WH RM)',
                controlTitle: 'Control & Info Flow',
                commMethod: 'Communication Method',
                useHeijunka: 'Use Heijunka Box?',
                heijunkaDesc: 'Distribute production volume evenly for Lean Future State.',
                readyToGenerate: 'Ready to Generate!',
                generateInfo: 'VSM will be arranged from Upstream (Supplier) to Downstream (Customer).',
                back: 'Back',
                next: 'Next Step',
                generate: 'Generate VSM',
                rawMatWh: 'WH RAW MAT',
                fgWh: 'WH FINISHED GOODS',
                shipping: 'SHIPPING'
            },
            ai: {
                title: 'Generate VSM from Description',
                subtitle: 'Describe your process, AI will create a complete Value Stream Map',
                promptLabel: 'Process Description',
                promptPlaceholder: 'Example: Process starts from supplier, then cutting 30 seconds, assembly 45 seconds, inventory 100 units, QC 20 seconds, packing 25 seconds to customer...',
                languageLabel: 'Output Language',
                modeLabel: 'Mode',
                modeReplace: 'Replace Canvas',
                modeMerge: 'Merge with Existing',
                examplesButton: 'Show Examples',
                hideExamplesButton: 'Hide Examples',
                generateButton: 'Generate VSM',
                cancelButton: 'Cancel',
                charCount: 'characters',
                tip: 'Include cycle times, operators, inventory, AND information flow (production control, kanban, forecast) for complete VSM.'
            },
            analysis: {
                taktTime: 'Takt Time',
                pitch: 'Pitch',
                epeiTitle: 'EPEI Analysis (Every Part Every Interval)',
                epeiDesc: 'Add a Customer (Demand) and Processes to calculate EPEI.',
                epeiResult: 'Your Current EPEI:',
                excellent: 'Excellent Flexibility!',
                overload: 'Capacity Overload!',
                highCO: 'Changeover Time is Too High',
                recommendation: 'Recommendation:',
                smedAdvice: 'Perform SMED (Single Minute Exchange of Die) to reduce changeover time so EPEI can reach 1 day or less.',
                healthyAdvice: 'Your process is very flexible. You can produce in small batches to lower supermarket stock levels.',
                yamazumiTitle: 'Work Load Balancing',
                yamazumiSubtitle: 'Yamazumi Visualization',
                balanced: 'Balanced',
                bottleneck: 'Bottleneck',
                taktLine: 'Takt Time Line',
                heijunkaTip: 'Balance all work stations to level the production throughput.',
                processType: 'Process Type',
                normal: 'Normal',
                pacemaker: 'Pacemaker',
                shared: 'Shared',
                outside: 'Outside',
                supplyChainConfig: 'Supply Chain Config',
                shiftPattern: 'Shift Pattern',
                shift1: '1 Shift (8 hours/day)',
                shift2: '2 Shifts (16 hours/day)',
                shift3: '3 Shifts (24 hours/day)',
                allowOvertime: 'Allow Overtime (+25%)',
                capacity: 'Capacity',
                day: 'day',
                costPerUnit: 'Cost per Unit ($)',
                holdingCost: 'Holding Cost/Day ($)',
                wipLimit: 'WIP Limit (units)',
                yield: 'Yield (%)',
                noAnalysisData: 'No processes found for analysis'
            },
            nodes: {
                bottleneck: 'BOTTLENECK',
                oee: 'OEE (%)',
                capacity: 'Cap/Hr (pcs)',
                utilization: 'Utilization',
                bom: 'BILL OF MATERIALS:',
                receiving: 'RECEIVING',
                forklift: 'FORKLIFT',
                trolley: 'TROLLEY',
                notePlaceholder: 'Type note...',
                noteDefault: 'Note',
                ctShort: 'C/T (s)',
                coShort: 'C/O (min)',
                uptimeShort: 'Uptime (%)',
                perfShort: 'Perform. (%)',
                yieldShort: 'Yield (%)',
                vaShort: 'VA Time (s)',
                capShort: 'Cap/Hr (pcs)',
                shortageLabel: 'Shortage',
                invLabel: 'Inv',
                openProject: 'Double-click to open project: {{name}}',
                openLinkedProject: 'Double-click to open linked project',
                operators: 'Operators',
                pacemaker: 'PACEMAKER',
                shared: 'SHARED',
                outside: 'OUTSIDE'
            },
            scenarios: {
                title: 'Scenarios',
                saveTitle: 'Save Current Simulation',
                namePlaceholder: 'Scenario name...',
                saveBtn: 'Save',
                compareBtn: 'Compare',
                compareTitle: 'Scenario Comparison',
                metric: 'Metric',
                selectToCompare: 'Select 2-3 scenarios to compare',
                maxCompare: 'Maximum 3 scenarios for comparison',
                none: 'None',
                savedScenarios: 'Saved Scenarios',
                cancelCompare: 'Cancel Compare',
                loadBtn: 'Load',
                deleteConfirm: 'Delete this scenario?',
                saveSuccess: 'Scenario saved successfully!',
                saveError: 'Failed to save scenario!',
                nameRequired: 'Please enter a scenario name!',
                noSimToSave: 'No simulation to save!',
                fulfilledQty: 'Fulfilled Qty',
                demand: 'Demand'
            },
            logs: {
                title: 'Logs',
                searchPlaceholder: 'Search logs...',
                all: 'All',
                info: 'Info',
                success: 'Success',
                warn: 'Warning',
                error: 'Error',
                export: 'Export',
                showingLogs: 'Showing {{count}} of {{total}} logs',
                noLogs: 'No logs available. Run a simulation to see execution logs.',
                noMatch: 'No logs match the current filter.',
                justNow: 'Just now',
                secondsAgo: '{{count}}s ago',
                minutesAgo: '{{count}}m ago',
                level: 'Level:',
                time: 'Time:'
            }
        },
        therblig: {
            title: 'Therblig Analysis',
            subtitle: '18 Basic Motions',
            motionType: 'Motion Type',
            frequency: 'Frequency',
            totalTime: 'Total Time',
            percentage: 'Percentage',
            chart: 'Chart',
            table: 'Table',
            summary: 'Summary',
            transportEmpty: 'Transport Empty',
            grasp: 'Grasp',
            transportLoaded: 'Transport Loaded',
            position: 'Position',
            release: 'Release',
            use: 'Use',
            assemble: 'Assemble',
            disassemble: 'Disassemble'
        },
        waste: {
            title: 'Waste Elimination',
            subtitle: '7 Wastes (Muda)',
            transport: 'Transport',
            inventory: 'Inventory',
            motion: 'Motion',
            waiting: 'Waiting',
            overProcessing: 'Over-processing',
            overProduction: 'Over-production',
            defects: 'Defects',
            identify: 'Identify',
            analyze: 'Analyze',
            eliminate: 'Eliminate',
            noWaste: 'No waste identified',
            wasteFound: 'Waste found'
        },
        statistics: {
            title: 'Statistical Analysis',
            mean: 'Mean',
            median: 'Median',
            mode: 'Mode',
            stdDev: 'Standard Deviation',
            variance: 'Variance',
            min: 'Minimum',
            max: 'Maximum',
            range: 'Range',
            confidence: 'Confidence Interval',
            histogram: 'Histogram',
            boxPlot: 'Box Plot',
            calculate: 'Calculate'
        },
        manual: {
            title: 'Manual Creation',
            subtitle: 'Work Instruction Builder',
            addStep: 'Add Step',
            captureFrame: 'Capture Frame',
            generateAI: 'Generate with AI',
            stepNumber: 'Step',
            description: 'Description',
            image: 'Image',
            notes: 'Notes',
            exportPDF: 'Export PDF',
            exportWord: 'Export Word',
            exportPPT: 'Export PowerPoint',
            preview: 'Preview',
            noSteps: 'No steps yet',
            statuses: {
                draft: 'Draft',
                proposed: 'Proposed',
                review: 'In Review',
                approved: 'Approved',
                released: 'Released'
            },
            difficulties: {
                veryEasy: 'Very Easy',
                easy: 'Easy',
                moderate: 'Moderate',
                difficult: 'Difficult',
                veryDifficult: 'Very Difficult'
            },
            creator: 'Manual Creator',
            workInstructions: 'Work Instructions',
            noDocNumber: 'No Doc Number',
            scanForMobile: 'Scan for Digital Access',
            sourceVideo: 'Source Video',
            untitledStep: 'Untitled Step',
            documentInfo: 'Document Information',
            stepTitle: 'Step Title',
            pointsAlerts: 'Points & Alerts',
            instructions: 'Instructions'
        },
        swcs: {
            title: 'Standard Work Combination Sheet',
            subtitle: 'Man-Machine Chart',
            projects: 'Projects',
            loadManual: 'Load Manual Data',
            saveManual: 'Save Manual Data',
            exportPdf: 'Export PDF',
            exportExcel: 'Export Excel',
            importExcel: 'Import Excel',
            tpsAnalysis: 'TPS Analysis',
            cycleTime: 'Cycle Time',
            capacity: 'Capacity',
            vaTime: 'VA Time',
            nvaTime: 'NVA Time',
            waste: 'Waste',
            kaizen: 'Kaizen',
            legend: {
                manual: 'Manual (Solid)',
                auto: 'Auto (Dashed)',
                walk: 'Walk (Wavy)'
            },
            table: {
                no: 'No',
                elementName: 'Element Name',
                man: 'Man',
                auto: 'Auto',
                walk: 'Walk',
                wait: 'Wait',
                start: 'Start',
                finish: 'Finish',
                duration: 'Duration',
                total: 'Total',
                quality: 'Quality',
                safety: 'Safety',
                kaizen: 'Kaizen',
                add: 'Add Element'
            },
            header: {
                process: 'Process',
                partName: 'Part Name',
                station: 'Station',
                partNo: 'Part No',
                taktTime: 'Takt Time',
                stdWip: 'Std WIP',
                date: 'Date',
                revision: 'Rev'
            },
            noData: 'No Data Available',
            noDataDescProject: 'Select a project with data or switch to Manual Mode.',
            noDataDescManual: 'Add work elements in the table to visualize data.'
        },
        workspace: {
            title: 'Manage Projects',
            newProject: 'New Project',
            loadProject: 'Load Project',
            saveProject: 'Save Project',
            deleteProject: 'Delete Project',
            projectName: 'Project Name',
            lastModified: 'Last Modified',
            noProjects: 'No saved projects found',
            confirmDelete: 'Delete this project?'
        },
        fileExplorer: {
            title: 'File Explorer',
            storageUsed: 'Storage Used',
            newFolder: 'New Folder',
            projects: 'Projects',
            manuals: 'Manuals',
            swcs: 'SWCS',
            yamazumi: 'Yamazumi',
            vsm: 'Value Stream Map',
            bestWorst: 'Best vs Worst',
            rearrangement: 'Rearrange',
            waste: 'Waste Elimination',
            models: 'Models',
            api: 'API',
            root: 'Root',
            search: 'Search...',
            empty: 'No items found',
            deleteConfirm: 'Delete selected items?'
        },
        settings: {
            title: 'Global Settings',
            language: 'Language',
            ai: 'AI Configuration',
            provider: 'AI Provider',
            ollama: 'Local AI (Ollama)',
            apiKey: 'API Key',
            model: 'Model',
            testConnection: 'Test Connection',
            save: 'Save Changes',
            cancel: 'Cancel',
            openRouterHeaders: 'OpenRouter Headers (Auto)',
            testSuccess: 'Connected!',
            testFailed: 'Failed'
        },
        rearrangement: {
            title: 'Rearrange Elements',
            subtitle: 'Optimization Toolbox',
            projects: 'Projects',
            saveOrder: 'Save Order',
            autoArrange: 'Auto Arrange',
            shortest: 'Shortest',
            longest: 'Longest',
            jointSelection: 'Joint Selection',
            mergeHud: 'Merging #{0} and #{1}',
            simulationPreview: 'Simulation Preview',
            hudOn: 'HUD ON',
            hudOff: 'HUD OFF',
            liveSimulation: 'LIVE SIMULATION',
            startPreview: 'Start Preview',
            stopSimulation: 'Stop Simulation',
            selectProject: 'Select Project',
            selectProjectSub: 'Pick a project with measurement data',
            noReadyVideo: 'No video ready',
            loadInstruction: 'Select a project from the menu to load simulation video',
            noProjects: 'No projects with measurement data found'
        },
        swcs: {
            title: 'Standard Work Combination Sheet',
            subtitle: 'Work Standard Visualization',
            projects: 'Project',
            manual: 'Manual',
            exportPdf: 'Export PDF',
            exportExcel: 'Export Excel',
            importExcel: 'Import Excel',
            saveProject: 'Save to Project',
            loadManual: 'Load Manual (JSON)',
            saveManual: 'Save Manual (JSON)',
            zoom: 'Zoom',
            buffer: 'Buffer',
            tpsAnalysis: 'TPS Analysis',
            cycleTime: 'Cycle Time',
            capacity: 'Capacity',
            vaTime: 'VA Time',
            nvaTime: 'NVA Time',
            waste: 'Waste',
            kaizen: 'Kaizen',
            emptyTitle: 'No data',
            emptyProject: 'Select a project with data or switch to Manual Mode.',
            emptyManual: 'Add work elements in the table on the left.',
            header: {
                partName: 'Part Name',
                partNo: 'Part No',
                process: 'Process',
                station: 'Station',
                taktTime: 'Takt Time',
                stdWip: 'Std WIP',
                date: 'Date',
                revision: 'Revision'
            },
            table: {
                no: 'No',
                elementName: 'Element Name',
                man: 'Man',
                auto: 'Auto',
                walk: 'Walk',
                wait: 'Wait',
                start: 'Start',
                finish: 'Finish',
                duration: 'Duration',
                total: 'Total',
                add: 'Add Element'
            },
            legend: {
                manual: 'Manual (Solid)',
                auto: 'Auto (Dashed)',
                walk: 'Walk (Wavy)'
            }
        },
        analysisDashboard: {
            title: 'Analysis Summary',
            emptyState: 'No data to display. Add measurements first or use Safety/QC Tabs.',
            openSafety: '🛡️ Open Safety AI',
            openQC: 'Visual QC (TM)',
            openVideoIntel: '📹 Gemini Video Intelligence',
            kaizenReport: 'One-Click Kaizen Report',
            totalTime: 'Total Time',
            totalElements: 'Total Elements',
            avgRating: 'Avg Rating',
            valueAddedPct: 'Value-added %',
            oee: 'OEE',
            efficiency: 'Efficiency',
            taktVsCycle: 'Takt vs Cycle',
            productivityIndex: 'Productivity Index',
            categoryDist: 'Category Distribution',
            topElements: 'Top 10 Elements (Duration)',
            categoryBreakdown: 'Breakdown by Category',
            elementsCount: 'elements',
            swcs: 'Standard Work Combination Sheet'
        },
        senseiKnowledge: {
            intro: 'MAVi (Motion Analysis Video Intelligence) is a video analysis application for Industrial Engineering.',
            featuresHeader: 'MAIN FEATURES:',
            navHeader: 'NAVIGATION MENU:',
            navItems: [
                '- / (Video Workspace): Upload & analyze video, Element Editor',
                '- /ai-process: AI Process Studio - cycle detection, action recognition, video intelligence',
                '- /realtime-compliance: Real-time SOP compliance monitoring with AI',
                '- /studio-model: Studio Model - create custom AI models for motion detection',
                '- /teachable-machine: Teachable Machine Studio - Google Teachable Machine integration',
                '- /value-stream-map: Value Stream Mapping for TPS',
                '- /yamazumi: Yamazumi Chart for line balancing',
                '- /swcs: Standard Work Combination Sheet',
                '- /waste-elimination: Identify 7 wastes (Muda)',
                '- /therblig: Analyze 18 basic Therblig motions',
                '- /statistical-analysis: Cycle time statistical analysis',
                '- /best-worst: Best and worst cycle comparison',
                '- /comparison: Side-by-side video comparison',
                '- /rearrangement: Element rearrangement',
                '- /manual-creation: Create SOP and Work Instructions',
                '- /knowledge-base: Best practices repository',
                '- /multi-camera: Multi-camera 3D fusion',
                '- /vr-training: VR Training mode',
                '- /broadcast: Live broadcast & collaboration',
                '- /action-recognition: AI action recognition',
                '- /files: File Explorer',
                '- /diagnostics: System Diagnostics',
                '- /help: Help & Documentation'
            ],
            tipsHeader: 'USAGE TIPS:',
            tips: [
                '1. For beginners: Start at Video Workspace, upload video, then use Element Editor',
                '2. Use keyboard shortcuts (S/E) for easier measurement',
                '3. AI Process Studio is the control center for all AI features',
                '4. Export data to SWCS for standard work documentation',
                '5. Create work instructions with Manual Creation and AI Generate',
                '6. Setup Gemini API Key in Settings to enable AI features',
                '7. Use Studio Model to create custom motion detectors',
                '8. Export data to Excel for advanced spreadsheet analysis',
                '9. REBA Assessment for ergonomic posture evaluation',
                '10. Keyboard shortcut Space to play/pause, S to start measurement'
            ]
        },
        maviClassData: {
            glossary: {
                therblig: { term: 'Therblig', def: 'Basic unit of motion in motion study, consisting of 18 motion elements.' },
                cycleTime: { term: 'Cycle Time', def: 'Time required to complete one cycle of operation.' },
                taktTime: { term: 'Takt Time', def: 'Available time to produce one unit to meet customer demand.' },
                reba: { term: 'REBA', def: 'Ergonomics method to evaluate whole body postural risks.' },
                rula: { term: 'RULA', def: 'Ergonomics method to assess upper limb disorders risks.' },
                vsm: { term: 'VSM', def: 'Visual tool to map flow of materials and information.' },
                yamazumi: { term: 'Yamazumi', def: 'Visual stacked bar chart for workload distribution.' },
                swcs: { term: 'SWCS', def: 'Standard document showing combination of manual, machine, and walk time.' },
                muda: { term: 'Muda', def: '7 wastes in Lean (TIMWOOD).' },
                vaNva: { term: 'VA/NVA', def: 'Activity classification based on value addition.' },
                mediaPipe: { term: 'MediaPipe', def: 'ML framework for real-time pose detection.' },
                dtw: { term: 'DTW', def: 'Algorithm to measure similarity between two sequences.' },
                fsm: { term: 'FSM', def: 'Computational model with limited states and transitions.' },
                lineBalancing: { term: 'Line Balancing', def: 'Distributing workload evenly across production line.' },
                bottleneck: { term: 'Bottleneck', def: 'Process with longest cycle time limiting throughput.' },
                standardTime: { term: 'Standard Time', def: 'Time for qualified operator to complete task at normal pace.' },
                allowance: { term: 'Allowance', def: 'Additional factor for personal needs and delays.' },
                normalTime: { term: 'Normal Time', def: 'Observed time adjusted by rating factor.' },
                ratingFactor: { term: 'Rating Factor', def: 'Comparison of operator speed to standard.' },
                workSampling: { term: 'Work Sampling', def: 'Work measurement technique using random observations.' }
            },
            badges: {
                firstLesson: { name: 'First Step', desc: 'Complete first lesson' },
                quickLearner: { name: 'Quick Learner', desc: 'Complete 1 full module' },
                dedicated: { name: 'Dedicated Student', desc: 'Complete 3 modules' },
                knowledgeSeeker: { name: 'Knowledge Seeker', desc: 'Complete 6 modules' },
                master: { name: 'MAVi Master', desc: 'Complete all modules' },
                quizTaker: { name: 'Quiz Taker', desc: 'Complete first quiz' },
                perfectScore: { name: 'Perfect Score', desc: 'Get 100% score in a quiz' },
                quizChamp: { name: 'Quiz Champion', desc: 'Pass all quizzes' },
                consistent: { name: 'Consistent', desc: 'Study 3 days in a row' },
                weekWarrior: { name: 'Week Warrior', desc: 'Study 7 days in a row' },
                noteTaker: { name: 'Note Taker', desc: 'Create 5 notes' },
                explorer: { name: 'Explorer', desc: 'Visit all tabs' }
            },
            syllabus: {
                title: 'MAVi Class - Industrial Engineering Video Analysis',
                desc: 'Comprehensive curriculum to master video analysis in IE using MAVi.',
                instructorName: 'MAVi Sensei (AI)',
                instructorRole: 'AI Teaching Assistant',
                prereq1: 'Basic understanding of manufacturing processes',
                prereq2: 'Familiarity with computers and modern browsers',
                prereq3: 'No programming experience needed',
                outcome1: 'Perform Time & Motion Study using video',
                outcome2: 'Identify and eliminate waste',
                outcome3: 'Create Work Instructions and SOPs from video',
                outcome4: 'Use AI for automatic analysis',
                outcome5: 'Setup real-time compliance monitoring'
            },
            actions: {
                tryIt: 'Try This Feature',
                watchVideo: 'Watch Tutorial Video',
                markComplete: 'Mark as Complete',
                completed: 'Completed',
                keyPoints: 'Key Points'
            },
            levels: {
                beginner: 'Beginner',
                apprentice: 'Apprentice',
                practitioner: 'Practitioner',
                expert: 'Expert',
                master: 'Master'
            },
            modules: {
                'getting-started': {
                    title: '🚀 Getting Started',
                    description: 'Introduction to MAVi and its basic features',
                    lessons: {
                        'gs-1': {
                            title: 'What is MAVi?',
                            description: 'MAVi (Motion Analysis Video Intelligence) is a video analysis app for Industrial Engineering that supports process analysis, time study, and waste elimination.',
                            keyPoints: [
                                'AI-based Time & Motion Study using video',
                                'Integration with TPS (Toyota Production System) methodology',
                                'Support for automatic SOP and Work Instruction creation',
                                'Real-time collaboration and knowledge sharing'
                            ]
                        },
                        'gs-2': {
                            title: 'App Navigation',
                            description: 'Learn sidebar menu, keyboard shortcuts, and layout usage.',
                            keyPoints: [
                                'Quick access to features via right sidebar menu',
                                'Click icons to switch features',
                                'Hover to see feature names',
                                'Toggle sidebar with arrow button'
                            ]
                        },
                        'gs-3': {
                            title: 'First Video Upload',
                            description: 'Upload a work process video for analysis. Supports MP4, WebM, AVI.',
                            keyPoints: [
                                'Click upload button or drag & drop',
                                'Supported formats: MP4, WebM, AVI',
                                'View footage in left video panel',
                                'Control video with playback controls'
                            ]
                        },
                        'gs-4': {
                            title: 'Create New Project',
                            description: 'Create and organize projects to save analysis data.',
                            keyPoints: [
                                'Click "New Project" from menu',
                                'Enter a clear project name',
                                'Select the video to analyze',
                                'Projects are automatically saved to local database'
                            ]
                        }
                    },
                    practice: {
                        title: 'Mission 1: Ground Zero 🚀',
                        description: 'Start with your first project setup. You cannot save analysis without a project!',
                        tasks: [
                            'Upload a demo video (any video works)',
                            'Create a new project named "Practice MAVi 1"',
                            'Open sidebar menu and explore at least 3 features'
                        ],
                        actionLabel: 'Start Practice Now'
                    }
                },
                'time-measurement': {
                    title: '⏱️ Time & Motion Study',
                    description: 'Learn to measure time and breakdown work elements',
                    lessons: {
                        'tm-1': {
                            title: 'Element Editor Basics',
                            description: 'Element Editor is the main tool for time measurement and process breakdown.',
                            keyPoints: [
                                'Click Start Measurement to begin',
                                'Click End Measurement to finish',
                                'Give specific names to elements',
                                'Select the appropriate Therblig type'
                            ]
                        },
                        'tm-2': {
                            title: 'Keyboard Shortcuts',
                            description: 'Use keyboard shortcuts for measurement efficiency.',
                            keyPoints: [
                                'Press "Space" to Play/Pause video',
                                'Press "Arrow Right/Left" to navigate frames',
                                'Press "S" to Start Measurement',
                                'Press "E" to End Measurement'
                            ]
                        },
                        'tm-4': {
                            title: 'Value Added Analysis',
                            description: 'Identify activities that add value.',
                            keyPoints: [
                                'VA (Value Added) - activities transforming form/function',
                                'NVA (Non-Value Added) - waste to be eliminated',
                                'NNVA (Necessary NVA) - necessary but non-value adding',
                                'Mark each element with correct classification'
                            ]
                        },
                        'tm-5': {
                            title: 'Cycle Time Analysis',
                            description: 'Analyze cycle time and identify bottlenecks.',
                            keyPoints: [
                                'Measure multiple cycles for valid data',
                                'Compare cycle times between operators',
                                'Identify variations and causes',
                                'Use Best/Worst Cycle for comparison'
                            ]
                        },
                        'tm-6': {
                            title: 'Rearrangement',
                            description: 'Optimize work element sequence to improve efficiency.',
                            keyPoints: [
                                'Simulate new work sequence in Rearrangement dashboard',
                                'See impact on total lead time',
                                'Identify optimal sequence for balancing',
                                'Export rearrangement results as new SOP reference'
                            ]
                        }
                    },
                    practice: {
                        title: 'Mission 2: Time Master ⏱️',
                        description: 'Time to measure work speed! Use Element Editor to dissect motions.',
                        tasks: [
                            'Measure at least 3 work elements in a video',
                            'Mark which elements are VA and which are NVA',
                            'Try using keyboard shortcuts S and E'
                        ],
                        actionLabel: 'Open Video Workspace'
                    }
                },
                'ai-features': {
                    title: '🧠 AI Features',
                    description: 'Leverage AI power for automatic analysis',
                    lessons: {
                        'ai-1': {
                            title: 'Studio Model',
                            description: 'Create motion analysis models with rules and conditions.',
                            keyPoints: [
                                'Define rule-based models for motion detection',
                                'Set conditions and thresholds for validation',
                                'Test model with sample video',
                                'Export model for compliance monitoring usage'
                            ]
                        },
                        'ai-2': {
                            title: 'Action Recognition',
                            description: 'AI automatically recognizes actions and motions.',
                            keyPoints: [
                                'Upload video and run AI recognition',
                                'AI detects types of actions performed',
                                'Review and correct detection results',
                                'Export results for advanced analysis'
                            ]
                        },
                        'ai-3': {
                            title: 'Real-time Compliance',
                            description: 'Monitor SOP compliance in real-time with AI.',
                            keyPoints: [
                                'Connect live camera or IP camera',
                                'AI compares performance against standards',
                                'Automatic alerts for deviations',
                                'Log all anomalies for review'
                            ]
                        },
                        'ai-4': {
                            title: 'Video Intelligence',
                            description: 'Q&A with AI about video content.',
                            keyPoints: [
                                'Upload video to Gemini AI',
                                'Ask questions in natural language',
                                'AI analyzes and answers',
                                'Use for deep insights'
                            ]
                        },
                        'ai-5': {
                            title: 'AI Accuracy & Calibration',
                            description: 'Learn how AI recognizes motion and how to optimize accuracy.',
                            keyPoints: [
                                'Understand Confidence Threshold (0.6)',
                                'Heuristic Accuracy: Reach (95%), Grasp (85%), Move (92%)',
                                'Importance of video quality: Static camera and good lighting',
                                'How 33 body joint coordinates work (Pose Estimation)',
                                'Integration of custom models via Teachable Machine'
                            ]
                        },
                        'ai-6': {
                            title: 'End-to-End AI Deployment',
                            description: 'Complete guide to AI implementation from video prep to live monitoring.',
                            keyPoints: [
                                'Step 1: Create Project & Upload Gold Standard video',
                                'Step 2: Training Model via Studio Model or Teachable Machine',
                                'Step 3: Upload & Load Model (model.json, metadata.json) into system',
                                'Step 4: Monitoring via Camera - Connect webcam for real-time detection',
                                'Step 5: Review Dashboard - Monitor Cycle Time and Compliance automatically'
                            ]
                        },
                        'ai-7': {
                            title: 'Studio Model Masterclass',
                            description: 'Deep dive into creating custom motion detection logic using Studio Model.',
                            keyPoints: [
                                '1. Managing States: Add, remove, sort work states in a cycle',
                                '2. Designing Transitions: Define flow from one state to next',
                                '3. Rule Logic Builder: Use "Add Rule" for IF-THEN logic without coding',
                                '4. Rule Types: Joint Angle, Position (XY), and Velocity',
                                '5. Teachable Integration: Link Teachable Machine classes to rule logic',
                                '6. Testing & Debugging: Run standard video to validate AI state transitions'
                            ]
                        }
                    },
                    practice: {
                        title: 'Mission 3: AI Commander 🧠',
                        description: 'Let AI work for you. Try automatic detection.',
                        tasks: [
                            'Ask Gemini AI: "What wastes are visible in this video?"',
                            'Upload your custom model to Action Recognition dashboard',
                            'Create 1 model in Studio Model with at least 3 states and 3 rules',
                            'Connect live camera and activate Real-time Compliance monitoring'
                        ],
                        actionLabel: 'Open Studio Model'
                    }
                },
                'tps-tools': {
                    title: '📊 TPS Tools',
                    description: 'Toyota Production System tools for improvement',
                    lessons: {
                        'tps-1': {
                            title: 'Value Stream Mapping',
                            description: 'Map value flow from raw materials to finished product.',
                            keyPoints: [
                                'Create Current State Map first',
                                'Identify waste in every process',
                                'Calculate lead time and cycle time',
                                'Design more efficient Future State Map'
                            ]
                        },
                        'tps-2': {
                            title: 'Yamazumi Chart',
                            description: 'Workload visualization for line balancing.',
                            keyPoints: [
                                'Import data from measurement',
                                'View stack bar per operator/station',
                                'Compare with takt time',
                                'Identify bottlenecks and idle time'
                            ]
                        },
                        'tps-3': {
                            title: 'Standard Work Combination Sheet',
                            description: 'Standard documentation showing combination of manual and machine work.',
                            keyPoints: [
                                'Create manual and machine work timeline',
                                'Visualize walking time',
                                'Set takt time as reference',
                                'Export for SOP documentation'
                            ]
                        },
                        'tps-4': {
                            title: 'Waste Elimination',
                            description: 'Identify and eliminate 7 wastes (Muda).',
                            keyPoints: [
                                'Transport - unnecessary movement',
                                'Inventory - excess stock',
                                'Motion - inefficient movement',
                                'Waiting - waiting for other processes',
                                'Over-processing - excessive processing',
                                'Over-production - excessive production',
                                'Defects - product defects'
                            ]
                        },
                        'tps-5': {
                            title: 'Statistical Analysis',
                            description: 'Statistical analysis for data validation and decisions.',
                            keyPoints: [
                                'Calculate mean, standard deviation, range',
                                'Control chart for process monitoring',
                                'Process capability analysis',
                                'Identify outliers and causes'
                            ]
                        }
                    },
                    practice: {
                        title: 'Mission 4: Lean Architect 📊',
                        description: 'Visualize data to see the big picture.',
                        tasks: [
                            'Generate Yamazumi Chart from measurement data',
                            'Identify which operator is busiest (bottleneck)',
                            'Try creating 1 draft Standard Work Combination Sheet'
                        ],
                        actionLabel: 'Open Yamazumi Chart'
                    }
                },
                'documentation': {
                    title: '📘 Documentation',
                    description: 'Create professional SOPs and Work Instructions',
                    lessons: {
                        'doc-1': {
                            title: 'Manual Creation',
                            description: 'Create visual work instructions easily.',
                            keyPoints: [
                                'Capture video frames as steps',
                                'Add descriptions and annotations',
                                'Use AI to generate instructions',
                                'Export to PDF, Word, or PowerPoint'
                            ]
                        },
                        'doc-2': {
                            title: 'AI-Generated Instructions',
                            description: 'Let AI help write instructions.',
                            keyPoints: [
                                'Select frame to explain',
                                'AI analyzes the image',
                                'Generate step descriptions',
                                'Edit and adjust as needed'
                            ]
                        },
                        'doc-3': {
                            title: 'Knowledge Base',
                            description: 'Save and share best practices.',
                            keyPoints: [
                                'Upload manuals to Knowledge Base',
                                'Add tags for searching',
                                'Rate and review from other users',
                                'Download templates for new projects'
                            ]
                        }
                    },
                    practice: {
                        title: 'Mission 5: SOP Director 📘',
                        description: 'Turn video into standard work guide.',
                        tasks: [
                            'Capture 3 key frames from video',
                            'Use AI Generate to create step descriptions',
                            'Export SOP result as PDF or Word file'
                        ],
                        actionLabel: 'Open Manual Creation'
                    }
                },
                'advanced': {
                    title: '⚡ Advanced Features',
                    description: 'Advanced features for power users',
                    lessons: {
                        'adv-2': {
                            title: 'VR Training Mode',
                            description: 'Training simulation with VR/AR.',
                            keyPoints: [
                                'Interactive 3D training environment',
                                'Practice mode for training',
                                'Assessment mode for evaluation',
                                'Tracking trainee progress'
                            ]
                        },
                        'adv-3': {
                            title: 'Broadcast & Collaboration',
                            description: 'Real-time sharing and collaboration.',
                            keyPoints: [
                                'Broadcast video to multiple viewers',
                                'Real-time cursor sharing',
                                'Chat and collaboration tools',
                                'Remote training and review'
                            ]
                        },
                        'adv-4': {
                            title: 'Multi-Axial Analysis',
                            description: 'Compare timelines of multiple projects simultaneously.',
                            keyPoints: [
                                'Select multiple projects from File Explorer',
                                'Compare performance between cycles or operators visually',
                                'Identify variations on a larger scale',
                                'Use for multi-process auditing'
                            ]
                        }
                    },
                    practice: {
                        title: 'Mission 7: Future Engineer ⚡',
                        description: 'Experiment with MAVi\'s most advanced features.',
                        tasks: [
                            'Try the Motion Laboratory feature',
                            'Open Video Workspace and try Collaborate with a viewer',
                            'Explore VR Training mode if you have a device'
                        ],
                        actionLabel: 'Open Video Workspace'
                    }
                },
                'study-cases': {
                    title: '📂 Study Cases',
                    description: 'Real-world MAVi implementation across industries',
                    lessons: {
                        'sc-1': {
                            title: 'Automotive: Line Balancing',
                            description: 'Case study of engine assembly line optimization in a leading automotive factory.',
                            keyPoints: [
                                'Identify bottlenecks using Yamazumi Chart',
                                'Redistribute work elements between operators',
                                'Throughput increased by 15%',
                                'Elimination of waiting time at critical stations'
                            ]
                        },
                        'sc-2': {
                            title: 'Textile: Waste Elimination',
                            description: 'Reducing Motion Waste in sewing process.',
                            keyPoints: [
                                'Therblig analysis for operator hand movements',
                                'Rearrangement of material layout',
                                'Cycle time reduction of 20%',
                                'Improved ergonomics and work comfort'
                            ]
                        },
                        'sc-3': {
                            title: 'Logistics: VSM Optimization',
                            description: 'Optimization of document and goods flow in a regional distribution center.',
                            keyPoints: [
                                'Mapping Current State Map (VSM)',
                                'Identification of disconnected Information Flow',
                                'Lead time reduction from 2 days to 4 hours',
                                'Implementation of Kan-ban for replenishment'
                            ]
                        },
                        'sc-4': {
                            title: 'Electronics: AI Compliance',
                            description: 'Compliance monitoring for high-precision component installation.',
                            keyPoints: [
                                'Setting motion standards with Video Intelligence',
                                'Real-time anomaly detection during installation',
                                'Defect (rework) rate reduction up to 90%',
                                'Automated auditing without disrupting production'
                            ]
                        }
                    },
                    practice: {
                        title: 'Mission 8: Case Solver 📂',
                        description: 'Apply your knowledge to real-world cases.',
                        tasks: [
                            'Choose one of the case studies above',
                            'Try to replicate the analysis in Video Workspace',
                            'Write 3 improvement proposals for that case'
                        ],
                        actionLabel: 'Open Workspace'
                    }
                },
                'line-balancing': {
                    title: '⚖️ Line Balancing & Digital Twin',
                    description: 'Production flow optimization with Simulation & Digital Twin',
                    lessons: {
                        'lb-1': {
                            title: 'Line Balancing Basics',
                            description: 'Introduction to assembly line balancing concepts.',
                            keyPoints: [
                                'Understanding Takt Time vs Cycle Time',
                                'Calculating Line Efficiency',
                                'Distribution of work elements',
                                'Minimizing Balance Delay'
                            ]
                        },
                        'lb-2': {
                            title: 'Digital Twin Simulation',
                            description: 'Simulate line changes before implementation.',
                            keyPoints: [
                                'Create digital replica of production line',
                                'Test different operator configurations',
                                'Simulate "What-if" scenarios',
                                'Validate improvements virtually'
                            ]
                        }
                    },
                    practice: {
                        title: 'Mission: Line Optimizer',
                        description: 'Balance the line to meet customer demand.',
                        tasks: [
                            'Calculate Takt Time for given demand',
                            'Adjust operator work elements to meet Takt',
                            'Achieve line efficiency > 85%'
                        ],
                        actionLabel: 'Open Line Balancing'
                    }
                },
                'studio-model': {
                    title: '🎬 Studio Model & Compliance',
                    description: 'Create custom AI models and monitor real-time compliance',
                    lessons: {
                        'sm-1': {
                            title: 'Studio Model Introduction',
                            description: 'Studio Model allows you to create custom AI models to detect specific motions and states without coding.',
                            keyPoints: [
                                'Create models based on your own reference videos',
                                'Define states (conditions) to detect',
                                'Set rules for transitions between states',
                                'Use for real-time compliance monitoring'
                            ]
                        },
                        'sm-2': {
                            title: 'Creating a New Model',
                            description: 'Step-by-step to creating your first Studio Model.',
                            keyPoints: [
                                'Click "Create New Model" on Studio Model page',
                                'Give a descriptive model name (e.g., "Assembly Process")',
                                'Choose coordinate system: Body-Centric or Screen-Based',
                                'Add description for documentation'
                            ]
                        },
                        'sm-3': {
                            title: 'Defining States',
                            description: 'Create states for each condition you want to detect.',
                            keyPoints: [
                                'State = specific condition/position (e.g., "Idle", "Reaching", "Holding")',
                                'Capture reference pose from video for each state',
                                'Define ROI (Region of Interest) if needed',
                                'Set minimum duration for detection stability'
                            ]
                        },
                        'sm-4': {
                            title: 'Rule Configuration',
                            description: 'Set transition rules between states using Rule Builder.',
                            keyPoints: [
                                'Joint Angle: Body joint angles (e.g., Elbow < 90°)',
                                'Pose Relation: Relative position (e.g., Hand above Nose)',
                                'Pose Velocity: Movement speed (e.g., Detect sudden motion)',
                                'Object Proximity: Distance to AI object (e.g., Hand touching tool)',
                                'Golden Pose: Match with recorded ideal reference pose',
                                'Logic Operator: Use AND/OR to combine multiple rules'
                            ]
                        },
                        'sm-5': {
                            title: 'Teachable Machine Studio',
                            description: 'Learn how to use TM Studio to create video datasets and test custom models.',
                            keyPoints: [
                                'Use Video Slicer to cut long videos into training clips',
                                'Review dataset to ensure it is representative',
                                'Integrate dataset with rules in Studio Model',
                                'Use AI models for more complex state detection'
                            ]
                        },
                        'sm-6': {
                            title: 'Test Mode & Validation',
                            description: 'Test your model with video before deployment.',
                            keyPoints: [
                                'Upload test video in Test Mode',
                                'View timeline events for validation',
                                'Check if state transitions are correct',
                                'Adjust rules if there are false positives/negatives'
                            ]
                        },
                        'sm-7': {
                            title: 'Real-time Compliance Setup',
                            description: 'Deploy model for real-time compliance monitoring.',
                            keyPoints: [
                                'Open Real-time Compliance dashboard',
                                'Click "Add Camera" to setup new station',
                                'Select Studio Model from dropdown',
                                'Select webcam or enter IP camera URL',
                                'Click "Start Monitoring" to begin'
                            ]
                        },
                        'sm-8': {
                            title: 'Timeline Events Analysis',
                            description: 'Analyze timeline events for performance monitoring.',
                            keyPoints: [
                                'Timeline Events panel shows history of state transitions',
                                'View timestamp and duration of each state',
                                'Green = fast (<5s), Red = slow (>5s)',
                                'Identify bottlenecks from long-duration states',
                                'Export data for further analysis'
                            ]
                        }
                    },
                    practice: {
                        title: 'Mission 9: Model Master 🎬',
                        description: 'Train your own AI!',
                        tasks: [
                            'Create 1 new Studio Model',
                            'Define at least 2 states (e.g., Work vs Rest)',
                            'Test the model in Test Mode with a video'
                        ],
                        actionLabel: 'Open Studio Model'
                    }
                },
                'ai-settings': {
                    title: '⚙️ AI Settings & Configuration',
                    description: 'Complete guide to AI setup and configuration for optimal results',
                    lessons: {
                        'ais-1': {
                            title: 'Getting Gemini API Key',
                            description: 'Steps to get API Key from Google AI Studio to enable AI features.',
                            keyPoints: [
                                'Visit https://aistudio.google.com/',
                                'Login with your Google account',
                                'Click "Get API Key" → "Create API Key"',
                                'Copy API Key and paste into MAVi Settings',
                                'Free for standard use (60 requests/minute)'
                            ]
                        },
                        'ais-2': {
                            title: 'Configuring API Key in MAVi',
                            description: 'How to enter and save API Key in MAVi application.',
                            keyPoints: [
                                'Open Settings → AI Configuration',
                                'Paste API Key in the available field',
                                'Click "Test Connection" to verify',
                                'Green status = connection successful',
                                'API Key is saved in browser (localStorage)'
                            ]
                        },
                        'ais-3': {
                            title: 'Pose Detection Settings',
                            description: 'Configure MediaPipe Pose Detection for optimal accuracy.',
                            keyPoints: [
                                'Model Complexity: Lite (fast) vs Full (accurate)',
                                'Detection Confidence: pose detection threshold (0.5-0.9)',
                                'Tracking Confidence: tracking smoothness (0.5-0.9)',
                                'Higher confidence = more accurate but heavier',
                                'Recommendation: 0.7 for balance of speed & accuracy'
                            ]
                        },
                        'ais-4': {
                            title: 'Setup Teachable Machine Model',
                            description: 'Complete tutorial on using Google Teachable Machine for custom models.',
                            keyPoints: [
                                'Use Video Slicer in Studio Model to collect samples',
                                'Classify movements into meaningful states',
                                'Train rule detection using learned conditions',
                                'Use global model URL to sync between stations',
                                'Model can be updated anytime if process changes'
                            ]
                        },
                        'ais-5': {
                            title: 'Troubleshooting AI Errors',
                            description: 'How to resolve common AI feature errors.',
                            keyPoints: [
                                'Error 401: Invalid API Key → regenerate key',
                                'Error 429: Rate limit → wait 1 minute or upgrade plan',
                                'Pose not detected: ensure sufficient lighting',
                                'Slow model: reduce model complexity',
                                'Check System Diagnostics for full status'
                            ]
                        }
                    },
                    practice: {
                        title: 'Mission 10: SysAdmin AI ⚙️',
                        description: 'Ensure AI engine runs smoothly.',
                        tasks: [
                            'Check API Key status in Settings',
                            'Try changing Pose Detection Confidence to 0.8',
                            'Run System Diagnostics'
                        ],
                        actionLabel: 'Open Settings'
                    }
                },
                'ui-tutorial': {
                    title: '🖥️ User Interface Deep Dive',
                    description: 'Complete guide to the interface and customization',
                    lessons: {
                        'ui-1': {
                            title: 'Layout Overview',
                            description: 'Understanding the overall MAVi application layout.',
                            keyPoints: [
                                'Video Panel (left): video playback and analysis area',
                                'Element Panel (right): list of elements and measurements',
                                'Timeline (bottom): video navigation and markers',
                                'Sidebar (far right): navigation menu between features',
                                'All panels can be resized by dragging dividers'
                            ]
                        },
                        'ui-2': {
                            title: 'Keyboard Shortcuts',
                            description: 'Keyboard shortcuts for maximum productivity.',
                            keyPoints: [
                                'Space: Play/Pause video',
                                'Arrow Left/Right: Frame by frame navigation',
                                'S: Start measurement',
                                'E: End measurement',
                                'Ctrl+S: Save project',
                                'F: Toggle fullscreen video'
                            ]
                        },
                        'ui-3': {
                            title: 'Theme & Display Settings',
                            description: 'Customize application appearance to your preference.',
                            keyPoints: [
                                'Dark Mode: default, comfortable for long use',
                                'Language: Indonesia, English, Japanese',
                                'Font Size: adjust for reading comfort',
                                'Skeleton Overlay: toggle pose skeleton display',
                                'Settings saved automatically'
                            ]
                        },
                        'ui-4': {
                            title: 'Panel Customization',
                            description: 'Adjust panel layout for your workflow.',
                            keyPoints: [
                                'Drag divider to resize panels',
                                'Collapse sidebar with arrow button',
                                'Element Panel can be expanded/collapsed',
                                'Timeline height can be adjusted',
                                'Layout saved for next usage'
                            ]
                        },
                        'ui-5': {
                            title: 'Video Controls Mastery',
                            description: 'Master video controls for precise analysis.',
                            keyPoints: [
                                'Speed Control: 0.25x to 2x playback',
                                'Frame Counter: see current frame position',
                                'Zoom Controls: magnify specific areas',
                                'Loop Region: repeat playback of specific area',
                                'Seek Bar: click to jump directly to video position'
                            ]
                        }
                    },
                    practice: {
                        title: 'Mission 11: UI Pro 🖥️',
                        description: 'Become an application navigation master.',
                        tasks: [
                            'Use Space and S shortcuts while measuring',
                            'Try changing application language to English/Japanese',
                            'Resize Video Panel and Element Panel'
                        ],
                        actionLabel: 'Open Workspace'
                    }
                },
                'export-integration': {
                    title: '📤 Data Export & Integration',
                    description: 'Export analysis results and integrate with other systems',
                    lessons: {
                        'exp-1': {
                            title: 'Export to Excel',
                            description: 'Export measurement data to Excel format for advanced analysis.',
                            keyPoints: [
                                'Click Export button in Element Panel',
                                'Select format: Excel (.xlsx) or CSV',
                                'Data includes: element name, duration, type, timestamp',
                                'Additional columns: therblig classification, VA/NVA',
                                'File automatically downloads to Downloads folder'
                            ]
                        },
                        'exp-2': {
                            title: 'Export Work Instruction',
                            description: 'Export manuals and SOPs to various formats.',
                            keyPoints: [
                                'PDF: standard format for distribution',
                                'Word (.docx): for further editing',
                                'PowerPoint: for training presentations',
                                'Includes images, work steps, and notes',
                                'Custom header with company logo'
                            ]
                        },
                        'exp-4': {
                            title: 'Project Backup & Restore',
                            description: 'Backup and restore projects for data security.',
                            keyPoints: [
                                'Export Project: save as JSON file',
                                'Include all elements, measurements, settings',
                                'Import Project: restore from backup',
                                'Use for data migration between computers',
                                'Save backups periodically'
                            ]
                        }
                    },
                    practice: {
                        title: 'Mission 12: Data Scientist 📤',
                        description: 'Take MAVi data to the next level.',
                        tasks: [
                            'Export measurement results to Excel file',
                            'Export project as JSON file (Backup)',
                            'Try opening exported Excel file on computer'
                        ],
                        actionLabel: 'Open File Explorer'
                    }
                },
                'pose-ergonomics': {
                    title: '🔍 Pose Detection & Ergonomics',
                    description: 'Analyze body poses and ergonomic assessment',
                    lessons: {
                        'pe-1': {
                            title: 'How Pose Detection Works',
                            description: 'Understanding MediaPipe Pose Detection technology behind MAVi.',
                            keyPoints: [
                                'MediaPipe detects 33 body landmarks',
                                'Landmarks include: face, shoulders, elbows, hands, hips, knees, feet',
                                'Each landmark has x, y, z coordinates',
                                'Visibility score indicates detection confidence',
                                'Process runs real-time in browser (WebGL)'
                            ]
                        },
                        'pe-2': {
                            title: 'Joint Angle Analysis',
                            description: 'Measure joint angles for posture analysis.',
                            keyPoints: [
                                'Elbow Angle: measures arm flexion',
                                'Knee Angle: squat/stand posture analysis',
                                'Shoulder Angle: detect arm lifting',
                                'Back Angle: evaluate stooping posture',
                                'Angle data used for rules in Studio Model'
                            ]
                        },
                        'pe-3': {
                            title: 'REBA Assessment',
                            description: 'Rapid Entire Body Assessment for ergonomic risk evaluation.',
                            keyPoints: [
                                'REBA analyzes entire body posture',
                                'Score 1-3: Low risk (Acceptable)',
                                'Score 4-7: Medium risk (Investigate)',
                                'Score 8-10: High risk (Investigate soon)',
                                'Score 11+: Very high risk (Implement change)'
                            ]
                        },
                        'pe-4': {
                            title: 'Fatigue Analysis',
                            description: 'Detect and predict worker fatigue from movement patterns.',
                            keyPoints: [
                                'Analyze cycle time variation as fatigue indicator',
                                'Detect movement slowing over time',
                                'Alert when pattern indicates exhaustion',
                                'Optimal rest time recommendations',
                                'Integration with compliance monitoring'
                            ]
                        },
                        'pe-5': {
                            title: 'Ergonomic Improvement',
                            description: 'Using data for ergonomic improvement.',
                            keyPoints: [
                                'Identify high-risk postures',
                                'Compare before vs after improvement',
                                'Document workstation changes',
                                'Track improvement score over time',
                                'Generate report for management'
                            ]
                        }
                    },
                    practice: {
                        title: 'Mission 6: Ergo Guardian 🔍',
                        description: 'Ensure workplace safety with posture analysis.',
                        tasks: [
                            'Activate Skeleton View in video player',
                            'View elbow or back angle graphs',
                            'Identify moments with high REBA score (>7)'
                        ],
                        actionLabel: 'Open Video Workspace'
                    }
                }
            }
        },
        machineLearning: {
            title: 'Teachable Machine Studio',
            subtitle: 'Google Teachable Machine integration for motion and anomaly detection',
            videoSlicer: 'Video Slicer & Dataset Builder',
            videoSlicerDesc: 'Extract selected video segments for AI dataset training (Teachable Machine / CVAT.ai)',
            captureClip: 'Capture Clip for Dataset',
            datasetGallery: 'Dataset Gallery',
            extractToZip: 'Extract Images to ZIP',
            extracting: 'Extracting...',
            deleteClip: 'Delete Clip',
            previewStart: 'Preview Start',
            previewEnd: 'Preview End',
            previewSlice: 'Preview Slice',
            noClips: 'No clips captured yet',
            galleryDescription: 'Capture clips from the video to build your specialized dataset.',
            downloadClip: 'Download Video Clip',
            originalVideoRequired: 'Original video file is required for extraction. Please re-upload or ensure video is loaded as a File.',
            selectSegment: 'Select Segment (Seconds)',
            useTeachableMachine: 'Use Teachable Machine',
            startAnalysis: 'Start Analysis',
            stopAnalysis: 'Stop Analysis',
            consistencyTrend: 'Consistency Trend'
        },
        bestWorst: {
            title: 'Best vs Worst Cycle Analysis',
            selectProject: 'Select Project (Min 2)',
            noProjects: 'No projects saved.',
            selectMin2: 'Select at least 2 projects to see analysis.',
            loading: 'Loading analysis...',
            bestCycle: 'Best Cycle',
            worstCycle: 'Worst Cycle',
            potentialSavings: 'Potential Savings',
            improvement: 'improvement',
            ranking: 'All Cycles Ranking',
            comparison: 'Element-by-Element Comparison',
            elementName: 'Element Name',
            category: 'Category',
            bestTime: 'Best (s)',
            worstTime: 'Worst (s)',
            difference: 'Diff (s)',
            diffPct: 'Diff (%)',
            videoSideBySide: 'Video Side-by-Side Comparison',
            syncControls: 'Synchronized Controls',
            aiAnalysis: 'AI Analysis',
            selectLeft: 'Select Left Project...',
            selectRight: 'Select Right Project...',
            best: 'BEST',
            worst: 'WORST'
        },
    },
    id: {
        ipCamera: {
            title: 'Koneksi Kamera IP',
            preset: 'Preset',
            streamType: 'Tipe Stream',
            streamUrl: 'URL Stream',
            connect: 'Hubungkan ke Stream',
            connecting: 'Menghubungkan...',
            disconnect: 'Putuskan',
            connected: 'Terhubung',
            tips: {
                title: 'Tips',
                tip1: 'URL harus link langsung ke file video (bukan halaman web).',
                tip2: 'Untuk RTSP, gunakan server konversi (seperti FFmpeg/VLC) ke HTTP/HLS.',
                tip3: 'Cari URL yang berakhiran .m3u8 atau .mp4.'
            },
            errors: {
                missingUrl: 'Masukkan URL stream',
                videoUnavailable: 'Elemen video tidak tersedia',
                connectionFailed: 'Gagal menghubungkan. Pastikan URL adalah stream langsung (contoh: .m3u8, .mp4, atau MJPEG), bukan halaman web.',
                generic: 'Gagal menghubungkan ke stream'
            }
        },
        fileExplorer: {
            recent: 'Terbaru',
            favorites: 'Favorit',
            projects: 'Proyek',
            swcs: 'SWCS',
            yamazumi: 'Yamazumi',
            bestWorst: 'Terbaik vs Terburuk',
            rearrangement: 'Penataan Ulang',
            waste: 'Eliminasi Pemborosan',
            vsm: 'VSM',
            manuals: 'Manual',
            models: 'Model',
            api: 'API',
            deleteConfirm: 'Apakah Anda yakin ingin menghapus ini?',
            searchPlaceholder: 'Cari file dan folder...',
            mainWorkspace: 'Ruang Kerja Utama',
            tmStudio: 'TM Studio',
            elements: 'Elemen',
            rearrangeAction: 'Tata Ulang',
            eliminateAction: 'Eliminasi',
            analyzeAction: 'Analisis',
            openAction: 'Buka',
            downloadAction: 'Unduh',
            active: 'Aktif',
            folder: 'Folder',
            root: 'Root',
            loading: 'Memuat item...',
            measurements: 'Pengukuran',
            designAction: 'Desain',
            globalMap: 'Peta Global',
            noVideoShort: 'Tanpa Video'
        },
        studioModel: {
            title: 'Model Studio',
            subtitle: 'Desain dan bangun model analisis gerakan',
            createButton: 'Buat Model Baru',
            helpButton: 'Bantuan',
            searchPlaceholder: 'Cari model...',
            noModels: 'Tidak ada model ditemukan',
            createFirst: 'Buat model pertama Anda',
            deleteConfirm: 'Apakah Anda yakin ingin menghapus model ini?',
            renamePrompt: 'Masukkan nama baru untuk model ini:',
            descPrompt: 'Masukkan deskripsi baru:',
            openEditor: 'Buka Editor',
            delete: 'Hapus Model',
            clickRename: 'Klik untuk ubah nama',
            clickDesc: 'Klik untuk ubah deskripsi',
            states: 'State',
            rules: 'Aturan',
            helpModal: {
                title: 'Panduan Model Studio (Aturan Gerakan)',
                intro: 'Sistem ini dirancang untuk membuat **"Aturan Gerakan"** tanpa koding, menggunakan logika **Finite State Machine (FSM)**.',
                concepts: {
                    title: '1. Konsep Dasar (Logika)',
                    state: 'State (Status): Kondisi operator (mis. Menunggu, Menggenggam, Merakit).',
                    transition: 'Transisi: Perpindahan dari satu State ke State lain.',
                    rule: 'Rule (Aturan): Kondisi untuk transisi (mis. Jika Tangan Kanan > Meja, pindah ke \'Menggenggam\').'
                },
                workflow: {
                    title: '2. Alur Kerja Pembuatan Model',
                    step1: 'Upload Video: Masukkan video operator standar.',
                    step2: 'Definisikan State: Daftar aktivitas (langkah kerja).',
                    step3: 'Buat Transisi & Aturan: Hubungkan state dengan logika deteksi otomatis.',
                    step4: 'Validasi: Tes dengan video lain untuk memastikan akurasi.'
                },
                navigation: {
                    title: '3. Navigasi Editor',
                    tabStates: 'Tab State: Tambah/Edit langkah kerja.',
                    tabRules: 'Tab Rules: Buat logika "Kapan pindah langkah".',
                    tabTest: 'Tab Test/Debug: Lihat hasil deteksi realtime.'
                },
                aiIntegration: {
                    title: '2. Integrasi AI (Roboflow)',
                    desc: 'Mendeteksi APD, komponen, atau alat kerja menggunakan model AI kustom.',
                    config: 'Konfigurasi: Masuk ke tab Settings -> Roboflow Models. Masukkan API Key dan Project ID.',
                    demo: 'Demo: Klik "Try Demo" untuk simulasi deteksi.',
                    rule: 'Rule: Gunakan tipe rule "Roboflow Detection", ketik nama objek (misal: helmet), dan ambang batas.'
                },
                testRun: {
                    title: '3. Melakukan Pengujian (Test Run)',
                    desc: 'Uji logika Anda dengan video atau webcam.',
                    panel: 'Panel Kiri: Visualisasi (Video, Boneka Pose, dan Kotak Deteksi).',
                    console: 'Live Console: Memantau log sistem secara real-time.',
                    timeline: 'Visual Timeline: Menunjukkan kapan transisi terjadi.',
                    analytics: 'Cycle Analytics: Perhitungan rasio VA/NVA.'
                },
                tips: {
                    title: '4. Tips Akurasi',
                    colors: 'Indikator Warna: Biru artinya syarat sedang dipenuhi.',
                    holding: 'Holding Time: Tambahkan durasi agar status tidak pindah terlalu cepat.',
                    refresh: 'Refresh: Jika data macet, simpan dan refresh browser.'
                },
                close: 'Tutup Panduan'
            },
            modelBuilder: {
                title: 'Model Builder',
                tabs: {
                    rules: 'Aturan & Logika',
                    steps: 'Langkah',
                    data: 'Data',
                    test: 'Uji Coba',
                    settings: 'Pengaturan'
                },
                buttons: {
                    save: 'Simpan',
                    undo: 'Undo',
                    redo: 'Redo',
                    help: 'Bantuan',
                    close: 'Tutup',
                    changeVideo: 'Ganti Video',
                    uploadVideo: 'Upload Video',
                    referenceVideo: 'Video Referensi',
                    liveCamera: 'Kamera Langsung',
                    simulator: 'Simulator',
                    clearConsole: 'Bersihkan',
                    exportPdf: 'Ekspor PDF',
                    addState: 'Tambah State',
                    backToList: 'Kembali ke Daftar',
                    drawRoi: 'Gambar ROI',
                    captureFrame: 'Ambil Frame',
                    addSound: 'Suara',
                    addWebhook: 'Webhook',
                    addPlc: 'PLC',
                    onEnter: 'Saat Masuk State',
                    onExit: 'Saat Keluar State',
                    delete: 'Hapus',
                    backToVideo: 'Kembali ke Video',
                    backToCamera: 'Kembali ke Kamera'
                },
                labels: {
                    motionTimeline: 'TIMELINE GERAKAN',
                    currentState: 'State Saat Ini',
                    liveConsole: 'Konsol Langsung',
                    cycleAnalytics: 'Analitik Siklus',
                    plcMonitor: 'Monitor Sinyal PLC',
                    detailedMetrics: 'Metrik Detail',
                    totalCycles: 'TOTAL SIKLUS',
                    vaRatio: 'RASIO VA',
                    avgStats: 'STATISTIK RATA-RATA',
                    cycleTime: 'Waktu Siklus (TC)',
                    vaTime: 'Waktu VA',
                    cycleHistory: 'RIWAYAT SIKLUS',
                    definedStates: 'State Terdefinisi',
                    stateName: 'Nama State',
                    minDuration: 'Durasi Min (d)',
                    valueAdded: 'Nilai Tambah (VA)',
                    markEssential: 'Tandai state ini sebagai esensial...',
                    actionTriggers: 'Pemicu Aksi',
                    roi: 'ROI',
                    drawBoxHint: 'Gambar kotak di video...',
                    poseRef: 'Referensi Pose',
                    projectVault: 'Project Vault',
                    localFile: 'Berkas Lokal',
                    selectFromProject: 'Pilih dari Proyek',
                    defined: 'Terdefinisi',
                    none: 'Tidak Ada',
                    stepCount: 'Langkah',
                    duplicateState: 'Duplikasi State',
                    addNextStep: 'Tambah Langkah Berikutnya',
                    drawRoiHint: 'Gambar kotak pada video untuk menentukan area valid untuk langkah ini.',
                    camera: 'Kamera',
                    simulator: 'Simulator',
                    addState: 'Tambah State',
                    backToList: 'Kembali ke Daftar',
                    definedStates: 'State Terdefinisi'
                },
                measure: {
                    result: 'HASIL',
                    distance: 'JARAK',
                    angle: 'SUDUT',
                    addToRule: 'Tambah ke Aturan',
                    hint: 'Pilih titik pada rangka (maks 3)',
                    ruler: 'PENGGARIS',
                    measureDistance: 'Ukur Jarak',
                    measureAngle: 'Ukur Sudut',
                    clear: 'Hapus Pengukuran'
                },
                projectPicker: {
                    title: 'Pilih Video Proyek',
                    noProjects: 'Tidak ada proyek ditemukan.',
                    select: 'Pilih'
                },
                ipCamera: {
                    title: 'Rekam dari Kamera IP',
                    streamUrl: 'URL Stream Kamera (MJPEG/HTTP)',
                    recording: 'REK',
                    previewHint: 'Masukkan URL kamera untuk pratinjau atau ganti ke Simulator'
                },
                rules: {
                    types: {
                        POSE_ANGLE: 'Sudut Sendi',
                        POSE_RELATION: 'Relasi Pose (XYZ)',
                        POSE_VELOCITY: 'Kecepatan Pose (Speed)',
                        OBJECT_PROXIMITY: 'Kedekatan Objek',
                        OBJECT_IN_ROI: 'Objek dalam ROI',
                        OPERATOR_PROXIMITY: 'Kedekatan Operator',
                        POSE_MATCHING: 'Pencocokan Pose Emas',
                        SEQUENCE_MATCH: 'Pencocokan Urutan Gerakan (DTW)',
                        TEACHABLE_MACHINE: 'Teachable Machine',
                        ROBOFLOW_DETECTION: 'Deteksi Roboflow',
                        CVAT_MODEL: 'CVAT / Model Kustom',
                        ADVANCED_SCRIPT: 'Skrip Lanjutan (DSL)'
                    },
                    operators: {
                        LESS: '<',
                        GREATER: '>',
                        LESS_EQUAL: '<=',
                        GREATER_EQUAL: '>=',
                        EQUAL: '=',
                        NOT_EQUAL: '!=',
                        BETWEEN: 'Di antara'
                    },
                    conditionMet: 'Kondisi Terpenuhi',
                    noMatch: 'Tidak Cocok',
                    ready: 'Siap',
                    mustBeIn: 'harus di',
                    distanceTo: 'jarak ke'
                },
                step: 'Langkah',
                prompts: {
                    soundUrl: 'Masukkan URL Suara (mp3/wav):',
                    webhookUrl: 'Masukkan URL Webhook:',
                    plcSignalId: 'Masukkan ID Sinyal PLC (contoh: DO_01):',
                    plcValue: 'Masukkan Nilai (HIGH/LOW):',
                    versionName: 'Masukkan nama versi (contoh: "V1 Draf Awal"):',
                    restoreVersion: 'Pulihkan versi "{{version}}"? Perubahan yang belum disimpan akan hilang.',
                    deleteVersion: 'Hapus versi "{{version}}"?',
                    templateLoad: 'Muat "{{name}}"? Ini akan MENGGANTI model saat ini.'
                },
                settings: {
                    title: 'Pengaturan Model',
                    versionHistory: 'Riwayat Versi',
                    saveSnapshot: 'Simpan Snapshot',
                    noVersions: 'Belum ada versi tersimpan.',
                    restore: 'Pulihkan',
                    coordinateSystem: 'Sistem Koordinat',
                    screen: 'Layar (Absolut 0-1)',
                    bodyCentric: 'Berpusat pada Tubuh (Relatif ke Pinggul)',
                    bodyCentricHint: 'Body-Centric disarankan untuk presisi. Tetap akurat meskipun operator bergerak atau kamera bergeser. (0,0) adalah pusat pinggul.'
                },
                teachableMachine: {
                    title: 'Model Teachable Machine',
                    goToSite: 'Buka Situs',
                    addModel: 'Tambah Model',
                    modelUrl: 'URL Model',
                    image: 'Gambar',
                    pose: 'Pose',
                    loading: 'Memuat Model...',
                    offlineMode: 'Mode Offline: Unggah File',
                    loadFiles: 'Muat File'
                },
                roboflow: {
                    title: 'Model Roboflow',
                    tryDemo: 'Coba Demo',
                    apiKey: 'API Key',
                    projectId: 'Project ID',
                    version: 'Ver.',
                    noModels: 'Tidak ada model Roboflow yang dikonfigurasi.'
                },
                portability: {
                    title: 'Portabilitas & Template',
                    exportJson: 'Ekspor JSON',
                    importJson: 'Impor JSON',
                    loadTemplate: 'Muat dari Pustaka Template',
                    selectTemplate: 'Pilih Template Gerakan'
                },
                extraction: {
                    title: 'Data Ekstraksi Pose',
                    mode: 'Mode',
                    trackingLive: 'Pelacakan Aktif',
                    noData: 'Tidak Ada Data',
                    keypoint: 'Titik Kunci',
                    conf: 'Konf'
                },
                indicators: {
                    referenceCaptured: '✓ Pose Referensi Tertangkap',
                    drawing: 'Menggambar...',
                    loadingPose: 'Memuat Pendeteksi Pose...',
                    detectorReady: 'Rangka Siap - Putar video untuk mendeteksi',
                    detecting: 'Mendeteksi...',
                    operatorDetected: 'Operator Terdeteksi',
                    noOperator: 'Tidak Ada Operator Terdeteksi',
                    logicMatched: 'Logika terpenuhi',
                    playToTest: 'Putar video untuk menguji',
                    systemReady: 'Sistem siap. Tekan Putar pada video untuk memulai simulasi.',
                    waiting: 'Menunggu...',
                    noSignals: 'Tidak ada sinyal aktif',
                    completeCycle: 'Selesaikan satu siklus untuk melihat analitik'
                },
                tooltips: {
                    restoreLayout: 'Kembalikan Tata Letak',
                    maximizeEditor: 'Maksimalkan Editor',
                    changeVideo: 'Ganti atau unggah video baru'
                }
            },
            vsm: {
                title: 'Value Stream Map',
                templates: {
                    title: 'Muat Template Manufaktur',
                    notFound: 'Template tidak ditemukan!',
                    loadSuccess: 'Template "{{name}}" berhasil dimuat!',
                    replace: 'Ganti (Hapus Semua)',
                    merge: 'Gabung (Tambahkan)',
                    simple: 'Sederhana (3 Node)',
                    intermediate: 'Menengah (14 Node)',
                    advanced: 'Lanjutan (20 Node)',
                    integrated: 'Simulasi Rantai Pasok Terintegrasi',
                    pull: 'Sistem Tarik & Informasi (Kanban)',
                    expert: 'Ahli: Pabrik Kompleks (Troli & QC)',
                    descSimple: 'Supplier → Pengecatan → Pelanggan',
                    descIntermediate: 'Manufaktur Otomotif dengan Kanban',
                    descAdvanced: 'Rantai Pasok Global - Transportasi Laut, Lead Time 4 Bulan, Full Kanban Pull',
                    descIntegrated: 'Alur Lengkap: Pelanggan → Pengiriman → QC → Manufaktur → Material → Pemasok',
                    descPull: 'Loop Kanban: Kontrol Produksi → Heijunka → Proses → Supermarket',
                    descExpert: 'VSM Lengkap dengan Transportasi Troli, Kontrol Kualitas, dan Aliran Multi-Proses.',
                    invalidNodes: 'File tidak valid: nodes tidak ditemukan',
                    invalidEdges: 'File tidak valid: edges tidak ditemukan',
                    loadSuccessGeneric: '✅ VSM berhasil dimuat!',
                    loadError: '❌ Gagal memuat VSM: ',
                    selectTitle: 'Pilih Template VSM',
                    confirmTitle: 'Konfirmasi Load',
                    loadQuestion: 'Anda akan memuat template "{{name}}". Bagaimana Anda ingin memprosesnya?',
                    replace: 'Ganti (Replace)',
                    replaceDesc: 'Hapus semua & muat baru',
                    merge: 'Gabung (Merge)',
                    mergeDesc: 'Tambahkan ke canvas saat ini'
                },
                currentState: 'Current State',
                futureState: 'Future State',
                process: 'Proses',
                inventory: 'Inventory',
                information: 'Information',
                timeline: 'Timeline',
                leadTime: 'Lead Time',
                processTime: 'Process Time',
                valueAdded: 'Value Added',
                nonValueAdded: 'Non Value Added',
                addProcess: 'Tambah Proses',
                addInventory: 'Tambah Inventory',
                calculate: 'Hitung',
                clear: 'Bersihkan',
                newVsm: 'VSM Baru',
                analysis: {
                    yamazumiTitle: 'Grafik Yamazumi',
                    results: 'Hasil Simulasi',
                    feasible: 'LAYAK',
                    impossible: 'TIDAK LAYAK',
                    fulfilledQty: 'Terpenuhi',
                    bottleneckQty: 'Bottleneck',
                    totalCost: 'Total Biaya',
                    costBreakdown: 'Rincian Biaya',
                    wipViolations: 'Pelanggaran Batas WIP',
                    rootCause: 'Penyebab Utama:',
                    capacityDemandTitle: 'Kapasitas vs Permintaan (Yamazumi)',
                    outputCapacity: 'Kapasitas Output',
                    targetDemand: 'Target Permintaan',
                    nodeInventoryStatus: 'Status Inventaris Node',
                    tableName: 'Node',
                    tableCt: 'CT (d)',
                    tablePcsHr: 'Pcs/Jam',
                    tableShift: 'Shift',
                    tableOutput: 'Output',
                    tableLoadHours: 'Jam (Beban)',
                    tableBalance: 'Keseimbangan',
                    tableStatus: 'Status',
                    exportReport: 'Ekspor Laporan',
                    noTimelineData: 'Data timeline tidak tersedia.',
                    timelineTitle: 'Timeline Supply Chain End-to-End',
                    mustStartNoLater: 'Harus Mulai Paling Lambat:',
                    supplier: 'Pemasok',
                    logistic: 'Logistik',
                    process: 'Proses',
                    failCause: 'Penyebab Kegagalan:'
                },
                confirmDeleteNode: 'Hapus simbol yang dipilih?',
                confirmDeleteIcon: 'Hapus ikon ini?',
                confirmReset: 'Bersihkan canvas? Semua perubahan yang belum disimpan akan hilang.',
                edgeOptions: 'Opsi Garis',
                arrowDirection: 'Arah Panah / Arrow',
                backToCanvas: 'Kembali ke VSM',
                help: {
                    mainTitle: 'Value Stream Mapping (MIFH)',
                    addingSymbols: 'Menambah Simbol',
                    dragDrop: 'Tarik simbol dari VSM Toolbox (bilah sisi kanan)',
                    dropCanvas: 'Lepaskan di kanvas untuk menambah',
                    editProps: 'Klik simbol untuk mengedit properti',
                    connectingHeading: 'Menghubungkan Proses',
                    connectDesc: 'Tarik dari titik koneksi satu node ke node lainnya',
                    autoArrow: 'Otomatis membuat koneksi panah',
                    keyboardShortcuts: 'Pintasan Keyboard',
                    saveLoadHeading: 'Fitur Simpan/Muat',
                    saveDesc: 'Unduh VSM sebagai file .mavi-vsm',
                    loadDesc: 'Muat VSM dari file',
                    mergeReplace: 'Pilih mode: Ganti (hapus semua) atau Gabung (kombinasikan)',
                    advancedHeading: 'Fitur Lanjutan TPS',
                    yamazumiDesc: 'Visualisasikan keseimbangan kerja vs Takt Time.',
                    epeiDesc: 'Analisis fleksibilitas produksi.',
                    timelineDesc: 'Tangga otomatis di bagian bawah menunjukkan langkah Lead Time vs VA Time.',
                    nodesTitle: 'Fungsi Node & Parameter',
                    processNodeTitle: 'Process Box (Kotak Proses)',
                    processNodeDesc: 'Langkah produksi utama tempat nilai tambah terjadi.',
                    paramCT: 'CT (Cycle Time): Waktu untuk menyelesaikan 1 unit produk (detik).',
                    paramCO: 'CO (Changeover): Waktu setup untuk ganti model produk.',
                    paramUptime: 'Uptime: % ketersediaan mesin/alat.',
                    paramYield: 'Yield: % produk bagus (First Time Right).',
                    inventoryNodeTitle: 'Inventory (Segitiga)',
                    inventoryNodeDesc: 'Tumpukan material di antara proses.',
                    paramAmount: 'Amount: Jumlah fisik material (pcs/kg).',
                    paramTime: 'Time: Berapa lama stok bertahan (Hari) = Stok / Daily Demand.',
                    customerTitle: 'Customer / Supplier (Pabrik)',
                    paramDemand: 'Demand: Permintaan pelanggan per hari.',
                    paramTakt: 'Takt Time: Irama produksi yang dibutuhkan = Waktu Tersedia / Demand.'
                },
                simulation: {
                    start: 'Mulai Simulasi',
                    stop: 'Hentikan',
                    reset: 'Reset',
                    shortage: 'SHORTAGE!',
                    demandMet: 'Demand Terpenuhi',
                    delivering: 'Mengirim...',
                    title: 'Simulasi Aliran'
                },
                toolbox: {
                    title: 'VSM Toolbox',
                    desc: 'Drag & drop ke canvas',
                    flowTitle: 'KONEKSI ALIRAN',
                    material: 'Material',
                    manualInfo: 'Info Manual',
                    electronicInfo: 'Info Elektronik',
                    processData: 'DATA PROSES',
                    processBox: 'Kotak Proses',
                    project: 'Node Proyek',
                    operator: 'Operator',
                    kaizenBurst: 'Kaizen Burst',
                    materialFlow: 'ALIRAN MATERIAL',
                    supplier: 'Supplier',
                    customer: 'Customer',
                    inventory: 'Inventory',
                    supermarket: 'Supermarket',
                    fifo: 'FIFO',
                    safetyStock: 'Stok Pengaman',
                    truck: 'Truk',
                    forklift: 'Forklift',
                    trolley: 'Troli',
                    sea: 'Pengiriman Laut',
                    air: 'Pengiriman Udara',
                    rawMaterial: 'Bahan Baku',
                    finishedGoods: 'Barang Jadi',
                    push: 'Push (Dorong)',
                    informationFlow: 'ALIRAN INFORMASI',
                    productionControl: 'Kontrol Produksi',
                    heijunka: 'Heijunka',
                    kanbanPost: 'Pos Kanban',
                    productionKanban: 'Kanban Produksi',
                    withdrawalKanban: 'Kanban Pengambilan',
                    signalKanban: 'Kanban Sinyal',
                    goSee: 'Go See (Observasi)',
                    buffer: 'Buffer',
                    timelineMetrics: 'TIMELINE & METRIK',
                    timeline: 'Timeline',
                    generalNotes: 'CATATAN UMUM',
                    stickyNote: 'Catatan Tempel',
                    customIcons: 'IKON SAYA',
                    uploadIcon: 'Unggah Ikon'
                },
                wizard: {
                    title: 'MAGIC WIZARD',
                    generateSuccess: '✅ Template "{{name}}" berhasil dihasilkan!',
                    generateError: '❌ Gagal menghasilkan template VSM.'
                },
                customerTitle: 'Konfigurasi Pelanggan',
                customerDesc: 'Tentukan siapa pelanggan Anda dan seberapa besar permintaan mereka.',
                customerName: 'Nama Pelanggan',
                demandPerDay: 'Permintaan / Hari (pcs)',
                shifts: 'Jumlah Shift',
                hoursPerShift: 'Jam per Shift',
                packSize: 'Ukuran Pack (Pitch)',
                materialSource: 'Konfigurasi Pelanggan',
                production: 'Produksi',
                fgWarehouse: 'Gudang FG',
                shippingMethod: 'Metode Pengiriman',
                productionTitle: 'Proses Produksi',
                productionDesc: 'Masukkan proses berurutan dari Hulu (Supplier) ke Hilir (Customer).',
                addProcess: 'Tambah Proses Baru',
                processName: 'Nama Proses',
                ct: 'CT (detik)',
                pcsPerHour: 'Pcs/Jam',
                co: 'CO',
                uptime: 'Uptime (%)',
                buffer: 'Buffer',
                flow: 'Flow',
                receivingTitle: 'Gudang Penerimaan (Receiving)',
                receivingDesc: 'Konfigurasi area penerimaan material dari pemasok sebelum masuk ke produksi.',
                useReceiving: 'Gunakan Gudang Penerimaan?',
                receivingInfo: 'Menambahkan buffer stock awal setelah material datang dari supplier.',
                initialStock: 'Jumlah Stok Awal (pcs)',
                internalTransport: 'Metode Pemindahan ke Produksi',
                directMaterialInfo: 'Material akan dikirim langsung dari supplier ke proses produksi pertama.',
                supplierTitle: 'Pemasok & Material',
                addSupplier: 'Tambah Pemasok',
                useMaterialWh: 'Gunakan Gudang Material (WH RM)',
                controlTitle: 'Kontrol & Aliran Informasi',
                commMethod: 'Metode Komunikasi',
                useHeijunka: 'Gunakan Heijunka Box?',
                heijunkaDesc: 'Distribusikan volume produksi secara merata untuk Lean Future State.',
                readyToGenerate: 'Siap Generate!',
                generateInfo: 'VSM akan disusun dari Hulu (Supplier) ke Hilir (Customer).',
                back: 'Kembali',
                next: 'Lanjut',
                generate: 'Hasilkan VSM',
                rawMatWh: 'WH RAW MAT',
                fgWh: 'WH FINISHED GOODS',
                shipping: 'SHIPPING'
            },
            ai: {
                title: 'Generate VSM dari Deskripsi',
                subtitle: 'Jelaskan proses Anda, AI akan membuat Value Stream Map lengkap',
                promptLabel: 'Deskripsi Proses',
                promptPlaceholder: 'Contoh: Proses dimulai dari supplier, lalu cutting 30 detik, assembly 45 detik, inventory 100 unit, QC 20 detik, packing 25 detik ke customer...',
                languageLabel: 'Bahasa Output',
                promptLangName: 'Indonesian',
                modeLabel: 'Mode',
                modeReplace: 'Ganti Canvas',
                modeMerge: 'Gabung dengan Existing',
                examplesButton: 'Lihat Contoh',
                hideExamplesButton: 'Sembunyikan Contoh',
                generateButton: 'Generate VSM',
                cancelButton: 'Batal',
                charCount: 'karakter',
                tip: 'Sertakan cycle time, operator, inventory, DAN aliran informasi (production control, kanban, forecast) untuk VSM lengkap.',
                loadConfirm: 'Ditemukan {{nodes}} node & {{edges}} koneksi.\n\nOK = {{replace}}\nCancel = {{merge}}'
            },
            analysis: {
                taktTime: 'Takt Time',
                pitch: 'Pitch',
                epeiTitle: 'Analisis EPEI (Every Part Every Interval)',
                epeiDesc: 'Tambahkan Customer (Demand) and Proses untuk menghitung EPEI.',
                epeiResult: 'Current EPEI Anda:',
                excellent: 'Fleksibilitas Sangat Baik!',
                overload: 'Kapasitas Overload!',
                highCO: 'Waktu Changeover Terlalu Tinggi',
                recommendation: 'Rekomendasi:',
                smedAdvice: 'Lakukan SMED (Single Minute Exchange of Die) untuk mengurangi waktu changeover agar EPEI bisa mencapai 1 hari atau kurang.',
                healthyAdvice: 'Proses Anda sangat fleksibel. Anda dapat memproduksi batch kecil untuk mengurangi level stok supermarket.',
                yamazumiTitle: 'Keseimbangan Beban Kerja',
                yamazumiSubtitle: 'Visualisasi Yamazumi',
                balanced: 'Stabil',
                bottleneck: 'Bottleneck',
                taktLine: 'Garis Takt Time',
                heijunkaTip: 'Seimbangkan semua station agar berada di tingkat yang sama.',
                noAnalysisData: 'Belum ada proses analisis',
                perMonth: '/bln',
                perShift: '/shift',
                capacity: 'Kapasitas',
                processType: 'Tipe Proses',
                normal: 'Normal',
                pacemaker: 'Pacemaker',
                shared: 'Shared',
                outside: 'Luar',
                supplyChainConfig: 'Konfigurasi Supply Chain',
                shiftPattern: 'Pola Shift',
                shift1: '1 Shift (8 jam/hari)',
                shift2: '2 Shift (16 jam/hari)',
                shift3: '3 Shift (24 jam/hari)',
                allowOvertime: 'Izinkan Lembur (+25%)',
                day: 'hari',
                costPerUnit: 'Biaya per Unit',
                holdingCost: 'Biaya Simpan/Hari',
                wipLimit: 'Batas WIP (unit)',
                yield: 'Yield (%)',
                raw: 'RAW',
                pushSystem: 'Sistem Push',
                va: 'VA',
                nva: 'NVA',
                plt: 'PLT',
                electronicFlow: 'Aliran Elektronik',
                manualFlow: 'Aliran Manual',
                safetyStock: 'Safety Stock',
                heijunka: 'Heijunka',
                kanbanPost: 'Kanban Post',
                productionKanban: 'Prod. Kanban',
                withdrawalKanban: 'W-Draw Kanban',
                signalKanban: 'Signal Kanban',
                goSee: 'Go See',
                buffer: 'Buffer',
                timelineMetrics: 'TIMELINE & METRIK',
                stickyNote: 'Catatan Tempel',
                uploadIcon: 'Upload Ikon',
                customIcons: 'IKON KUSTOM',
                processBox: 'Box Proses',
                operator: 'Operator',
                kaizenBurst: 'Kaizen Burst',
                supplier: 'Supplier',
                customer: 'Customer',
                inventory: 'Inventory',
                supermarket: 'Supermarket',
                fifo: 'FIFO',
                truck: 'Truck',
                rawMaterial: 'Raw Mat.',
                finishedGoods: 'Finished',
                push: 'Push',
                informationFlow: 'ALIRAN INFORMASI',
                productionControl: 'Production Control',
                days: 'Hari',
                hr: 'jam',
                hrs: 'jam',
                min: 'menit',
                mins: 'menit',
                sec: 'detik',
                total: 'TOTAL',
                pce: 'PCE',
                availTime: 'Waktu Tersedia',
                dailyDemand: 'Permintaan Harian',
                spareCapacity: 'Kapasitas Cadangan',
                totalCO: 'Total Waktu C/O'
            },
            nodeDetails: {
                title: 'Node Details',
                noSelection: 'Select a node to view details',
                processName: 'Process Name',
                ct: 'Cycle Time (sec)',
                co: 'Changeover (min)',
                uptime: 'Uptime (%)',
                shifts: 'Shifts',
                operators: 'Operators',
                inventoryAmount: 'Amount',
                inventoryTime: 'Time',
                supplierName: 'Supplier Name',
                customerName: 'Customer Name',
                dailyDemand: 'Daily Demand',
                truckFrequency: 'Freq/Shift',
                leadTime: 'Lead Time'
            },
            nodes: {
                bottleneck: 'BOTTLENECK',
                oee: 'OEE (%)',
                capacity: 'Cap/Hr (pcs)',
                utilization: 'Utilisasi',
                bom: 'BILL OF MATERIALS:',
                receiving: 'RECEIVING',
                forklift: 'FORKLIFT',
                trolley: 'TROLLEY',
                notePlaceholder: 'Ketik catatan...',
                noteDefault: 'Catatan',
                vehicleCount: 'Jumlah Kendaraan',
                ritase: 'Ritase',
                loadPerTrip: 'Muatan/Trip',
                pcsPerHour: 'Pcs/Jam',
                ctShort: 'C/T (dtk)',
                coShort: 'C/O (mnt)',
                uptimeShort: 'Uptime (%)',
                perfShort: 'Perform. (%)',
                yieldShort: 'Yield (%)',
                vaShort: 'VA Time (s)',
                capShort: 'Kapasitas/Jam',
                shortageLabel: 'Kurang',
                invLabel: 'Stok',
                openProject: 'Klik 2x untuk buka proyek: {{name}}',
                openLinkedProject: 'Klik 2x untuk buka proyek terkait',
                operators: 'Operator',
                pacemaker: 'PACEMAKER',
                shared: 'SHARED',
                outside: 'DILUAR'
            },
            scenarios: {
                title: 'Scenario',
                saveTitle: 'Simpan Simulasi Saat Ini',
                namePlaceholder: 'Nama scenario...',
                saveBtn: 'Simpan',
                compareBtn: 'Bandingkan',
                compareTitle: 'Perbandingan Scenario',
                metric: 'Metrik',
                selectToCompare: 'Pilih 2-3 scenario untuk membandingkan',
                maxCompare: 'Maksimal 3 scenario untuk perbandingan',
                none: 'Tidak ada',
                savedScenarios: 'Scenario Tersimpan',
                cancelCompare: 'Batal Bandingkan',
                loadBtn: 'Muat',
                deleteConfirm: 'Hapus scenario ini?',
                saveSuccess: 'Scenario berhasil disimpan!',
                saveError: 'Gagal menyimpan scenario!',
                nameRequired: 'Masukkan nama scenario!',
                noSimToSave: 'Tidak ada simulasi untuk disimpan!',
                fulfilledQty: 'Qty Terpenuhi',
                demand: 'Permintaan'
            },
            logs: {
                title: 'Log',
                searchPlaceholder: 'Cari log...',
                all: 'Semua',
                info: 'Info',
                success: 'Sukses',
                warn: 'Peringatan',
                error: 'Error',
                export: 'Export',
                showingLogs: 'Menampilkan {{count}} dari {{total}} log',
                noLogs: 'Tidak ada log. Jalankan simulasi untuk melihat log eksekusi.',
                noMatch: 'Tidak ada log yang cocok dengan filter.',
                justNow: 'Baru saja',
                secondsAgo: '{{count}}d lalu',
                minutesAgo: '{{count}}m lalu',
                level: 'Level:',
                time: 'Waktu:'
            },
            workspace: {
                saveAsProject: 'Simpan ke Proyek',
                openInWorkspace: 'Buka di Workspace',
                newProjectPrompt: 'Masukkan nama proyek:',
                saveClipAsProject: 'Simpan Klip ke Proyek',
                cuttingVideo: 'Memotong segmen video...'
            },
            yamazumi: {
                title: 'Visualisasi Keseimbangan Kerja',
                subtitle: 'Visualisasikan dan seimbangkan beban kerja operator vs Takt Time',
                defaultStation: 'Stasiun',
                other: 'Lainnya',
                selectProject: 'Pilih Proyek',
                selected: 'Dipilih',
                visualChart: 'Grafik Visual',
                lineBalancing: 'Penyeimbangan Lini',
                takt: 'Waktu Takt',
                taktLine: 'Tampilkan Garis Takt',
                tct: 'Target Cycle Time',
                aiAnalysis: 'Analisis AI',
                kaizenSim: 'Simulasi Kaizen',
                ecrsSimMode: 'Mode Simulasi ECRS',
                eliminateWaste: 'Eliminasi Waste',
                eliminateWasteDesc: 'Hapus semua blok Waste (Merah)',
                simplifyNNVA: 'Sederhanakan NNVA',
                simplifyNNVADesc: 'Kurangi waktu Non-Value Added',
                maxCycleTime: 'Waktu Siklus Maks',
                minCycleTime: 'Waktu Siklus Min',
                avgCycleTime: 'Waktu Siklus Rata-rata',
                lineBalance: 'Keseimbangan Lini',
                bottlenecks: 'Bottleneck',
                workStations: 'Stasiun Kerja',
                theorOperators: 'Operator Teoritis',
                workDistribution: 'Distribusi Kerja',
                analysisPending: 'Menunggu Analisis',
                selectProjectInstruction: 'Silakan pilih proyek untuk melihat analisis',
                stationBreakdown: 'Rincian Stasiun',
                station: 'Stasiun',
                total: 'Total',
                efficiency: 'Efisiensi',
                critical: 'Kritis',
                balanced: 'Seimbang',
                loadingProjects: 'Memuat Proyek...',
                aiEngineer: 'Insinyur Industri AI',
                aiSubtitle: 'Analisis grafik Yamazumi ini'
            },
            categories: {
                valueAdded: 'Value Added',
                nonValueAdded: 'Non Value Added',
                waste: 'Waste'
            }
        }
    },
    ja: {
        // Japanese
        fileExplorer: {
            recent: '最近',
            favorites: 'お気に入り',
            projects: 'プロジェクト',
            swcs: 'SWCS',
            yamazumi: '山積み',
            bestWorst: 'ベスト vs ワースト',
            rearrangement: '再配置',
            waste: 'ムダ排除',
            vsm: 'VSM',
            manuals: 'マニュアル',
            models: 'モデル',
            api: 'API',
            deleteConfirm: '本当に削除してもよろしいですか？',
            searchPlaceholder: 'ファイルやフォルダを検索...',
            mainWorkspace: 'メインワークスペース',
            tmStudio: 'TM Studio',
            elements: '要素',
            rearrangeAction: '並べ替え',
            eliminateAction: '排除',
            analyzeAction: '分析',
            openAction: '開く',
            downloadAction: 'ダウンロード',
            active: 'アクティブ',
            folder: 'フォルダ',
            root: 'ルート',
            loading: 'アイテムを読み込み中...',
            measurements: '測定',
            designAction: '設計',
            globalMap: 'グローバルマップ',
            noVideoShort: '動画なし'
        },

        app: {
            title: 'MAVi - 動作分析と可視化',
            welcome: 'MAViへようこそ'
        },
        header: {
            mainMenu: 'メインメニュー',
            maviClass: 'MAViクラス',
            studioModel: 'スタジオモデル',
            teachableMachine: 'Teachable Machine Studio',
            swcs: '標準作業組合せ票 (Dhyo-hyo-ka)',
            multiAxial: '多軸分析',
            video: 'ビデオ',
            aiProcess: 'AI処理',
            realtimeCompliance: 'リアルタイム・コンプライアンス',
            analysis: '分析',
            rearrange: '再配置',
            cycleAnalysis: 'サイクル分析',
            aggregation: '集約',
            standardTime: '標準時間',
            waste: 'ムダ排除 (Muda Elimination)',
            therblig: 'サーブリッグ分析',
            bestWorst: 'ベスト vs ワースト',
            comparison: '比較',
            help: 'ヘルプ',
            uploadLogo: 'ロゴアップロード',
            screenshot: 'スクリーンショット',
            exportData: 'データ出力 (JSON)',
            sessions: '現場プロジェクト管理 (Genba)',
            workflowGuide: 'ワークフローガイド',
            statisticalAnalysis: '統計分析',
            yamazumi: '山積み (Yamazumi - Work Balance)',
            manualCreation: 'マニュアル作成',
            valueStreamMap: 'MIFH (モノと情報の流れ図)',
            multiCamera: 'マルチカメラ3D融合',
            vrTraining: 'VRトレーニング',
            knowledgeBase: '改善標準ライブラリ',
            broadcast: '放送',
            actionRecognition: '行動認識',
            files: 'ファイルエクスプローラー',
            diagnostics: 'システム診断',
            pitchDeck: 'ピッチデッキ',
            standardWorkLayout: 'スパゲッティ図 (Motion Analysis)',
            ergoCopilot: 'エルゴ・コパイロット'
        },
        complianceDashboard: {
            title: 'リアルタイム・コンプライアンス・ダッシュボード',
            activeStations: '稼働中のステーション',
            mismatchDetected: 'シーケンスの不一致を検出',
            standby: '待機中',
            currentStep: '現在のステップ',
            standardTime: '標準時間',
            actualTime: '実績時間',
            ng: 'NG',
            ok: 'OK',
            sequenceMismatchLabel: 'シーケンスの不一致',
            processCompliant: 'プロセス遵守',
            cycleCount: 'サイクル数',
            recentEvents: '最近のイベント',
            duration: '所要時間',
            workSequence: '作業順序',
            stopMonitoring: '監視停止',
            startMonitoring: '監視開始',
            backToGrid: 'グリッド表示に戻る',
            addNewStation: '新しいステーションを追加',
            configureCamera: 'IPカメラまたはストリームを構成',
            overlayOn: 'オーバーレイ ON',
            overlayOff: 'オーバーレイ OFF',
            initializing: '初期化中...',
            loadingEngine: 'マルチカメラエンジンを読み込み中...',
            hideOverlay: 'オーバーレイを非表示',
            showOverlay: 'オーバーレイを表示',
            switchFocus: 'フォーカス表示に切り替え',
            switchGrid: 'グリッド表示に切り替え',
            addCamera: 'カメラを追加',
            configureStation: 'ステーション設定',
            stationName: 'ステーション名',
            stationNamePlaceholder: '例：組立ライン1',
            cameraType: 'カメラタイプ',
            mjpegOption: 'IPカメラ / ストリーム (MJPEG/HTTP)',
            streamUrl: 'ストリームURL',
            streamUrlPlaceholder: 'http://192.168.1.50/mjpeg',
            complianceModel: 'コンプライアンスモデル',
            selectModel: '-- モデルを選択 --',
            saveConfiguration: '設定を保存',
            configuredStations: '設定済みステーション',
            deleteStation: 'ステーションを削除'
        },
        ergoCopilot: {
            title: 'エルゴ・コパイロット',
            uploadVideo: 'ビデオをアップロード',
            analysisMode: '分析モード',
            ergoStressTimeline: '人間工学的ストレス・タイムライン',
            digitalTwinAnalysis: '3Dデジタルツイン分析',
            riskConfidence: 'リスク信頼度',
            finalScore: '最終 {0} スコア',
            riskLevel: 'リスクレベル',
            targetRwl: '目標 RWL',
            liftingParameters: '持ち上げパラメータ',
            loadWeight: '荷重重量 (kg)',
            frequency: '頻度 (回/分)',
            hDistance: '水平距離 H (cm)',
            vDistance: '垂直距離 V (cm)',
            improvementPlan: '改善計画',
            generateReport: '全レポートを作成',
            uploadPrompt: '作業者のビデオをアップロードして分析を開始してください',
            highStressAt: '高ストレス @ {0}秒',
            standby: '待機中',
            engineering: 'エンジニアリング',
            ergonomic: 'エルゴノミック',
            administrative: '管理的',
            recom1: '部品レイアウトを再配置して、体幹のひねりを減らします。',
            recom2: '下半身のストレスを軽減するために、高さ調節可能な椅子を設置します。',
            recom3: '2時間ごとの作業者ローテーションを実施します。',
            negligible: '無視できる',
            acceptable: '許容範囲',
            nominal: '名目上',
            'low risk': '低リスク',
            increased: '増加',
            'medium risk': '中リスク',
            high: '高い',
            'high risk': '高リスク',
            'very high': '非常に高い',
            'very high risk': '極めて高いリスク'
        },
        spaghettiChart: {
            title: 'スパゲッティ図分析',
            subtitle: 'ワークフローシミュレーションと動作ムダの特定',
            projects: 'プロジェクトを選択...',
            saveProject: '分析を保存',
            header: {
                partName: '品名',
                partNo: '品番',
                machine: '設備',
                author: '作成者',
                date: '日付'
            },
            toolbox: {
                station: 'オペレーター・ステーション',
                material: '在庫管理',
                machine: '加工ユニット',
                qc: '品質検査',
                parts: '仕掛品バッファ',
                clear: 'キャンバスをクリア'
            },
            simulation: {
                run: 'シミュレーション実行',
                reset: 'リセット',
                speed: '速度',
                distance: '合計距離',
                cycleTime: 'サイクルタイム',
                efficiency: '効率',
                aiOptimize: 'AI最適化',
                optimizing: '最適化中...',
                scanComplete: 'スキャン完了',
                wasteDetected: 'ムダ検出',
                taktTime: 'タクトタイム',
                manualTime: '手作業時間',
                machineTime: '機械時間',
                walkingTime: '歩行時間',
                breakdown: '内訳',
                taktViolation: 'タクト違反!',
                uShapeOptimize: 'U字型セル最適化',
                applyingUShape: 'U字型レイアウトを適用中...',
                uShapeRecommendation: 'U字型推奨'
            },
            helpGuide: {
                title: 'スパゲッティ図ガイド',
                subtitle: 'リーン最適化システムの使い方',
                step1: '左のツールボックスからキャンバスにドラッグ＆ドロップ。',
                step2: 'ノードを接続して作業順序を作成。',
                step3: 'AI最適化を使用して歩行距離を最小化。',
                step4: 'U字型を使用して最高の製造セルを作成。',
                step5: 'ノードをクリックして手作業/機械時間を編集。'
            },
            aiChat: {
                title: 'Maviリーン・アシスタント',
                subtitle: 'トヨタ生産方式 (TPS) エキスパート',
                placeholder: 'レイアウト最適化について質問...',
                systemPrompt: 'あなたはトヨタ生産方式（TPS）のエキスパートです。ユーザーのスパゲッティ図の最適化を支援してください。歩行の削減、オペレーターのバランス、セルレイアウトについてアドバイスを提供してください。'
            },
            empty: {
                title: 'スパゲッティデータなし',
                desc: 'プロジェクトを選択してスパゲッティ図分析を開始してください。'
            }
        },
        vsm: {
            title: 'バリューストリームマップ (VSM)',
            templates: {
                title: '製造テンプレートを読み込む',
                notFound: 'テンプレートが見つかりません！',
                loadSuccess: 'テンプレート "{{name}}" の読み込みに成功しました！',
                replace: '置き換え (全消去)',
                merge: 'マージ (追加)',
                simple: 'シンプル (3ノード)',
                intermediate: '中級 (14ノード)',
                advanced: '上級 (20ノード)',
                integrated: '統合サプライチェーンシミュレーション',
                pull: 'プルシステム & 情報フロー',
                expert: 'エキスパート: 複雑な工場 (トロリー & QC)',
                descSimple: 'サプライヤー → 塗装 → 顧客',
                descIntermediate: 'かんばん方式による自動車製造',
                descAdvanced: 'グローバルサプライチェーン - 海上輸送、リードタイム4ヶ月、フルかんばんプル',
                descIntegrated: '完全なフロー: 顧客 → 配送 → QC → 製造 → 原材料 → サプライヤー',
                descPull: 'かんばんループ: 生産管理 → 平準化 → プロセス → スーパーマーケット',
                descExpert: 'トロリー輸送、品質管理、マルチプロセスフローを含む完全なVSM。',
                invalidNodes: '無効なファイル: ノードが見つかりません',
                invalidEdges: '無効なファイル: エッジが見つかりません',
                loadSuccessGeneric: '✅ VSMの読み込みに成功しました！',
                loadError: '❌ VSMの読み込みに失敗しました: ',
                selectTitle: 'VSMテンプレートを選択',
                confirmTitle: '読み込み確認',
                loadQuestion: 'テンプレート "{{name}}" を読み込もうとしています。どのように処理しますか？',
                replaceDesc: 'すべてクリアして新規読み込み',
                mergeDesc: '現在のキャンバスに追加'
            },
            currentState: '現状 (Current State)',
            futureState: '将来 (Future State)',
            process: '工程',
            inventory: '在庫',
            information: '情報',
            timeline: 'タイムライン',
            leadTime: 'リードタイム',
            addProcess: '工程を追加',
            addInventory: '在庫を追加',
            processTime: 'プロセス時間',
            valueAdded: '付加価値 (VA)',
            nonValueAdded: '非付加価値 (NVA)',
            pitch: 'ピッチ',
            calculate: '計算',
            clear: 'クリア',
            newVsm: '新規VSM',
            analysis: {
                yamazumiTitle: '山積みチャート',
                results: 'シミュレーション結果',
                feasible: '実行可能',
                impossible: '実行不可能',
                fulfilledQty: '達成数量',
                bottleneckQty: 'ボトルネック',
                totalCost: '総コスト',
                costBreakdown: 'コスト内訳',
                wipViolations: 'WIP制限違反',
                rootCause: '根本原因:',
                capacityDemandTitle: '能力対需要 (山積みチャート)',
                outputCapacity: '生産能力',
                targetDemand: '目標需要',
                nodeInventoryStatus: 'ノード在庫状況',
                tableName: 'ノード',
                tableCt: 'CT (秒)',
                tablePcsHr: '個/時',
                tableShift: 'シフト',
                tableOutput: '生産高',
                tableLoadHours: '時間 (負荷)',
                tableBalance: 'バランス',
                tableStatus: 'ステータス',
                exportReport: 'レポート出力',
                noTimelineData: 'タイムラインデータがありません。',
                timelineTitle: 'エンドツーエンドサプライチェーンタイムライン',
                mustStartNoLater: '開始期限:',
                supplier: 'サプライヤー',
                logistic: '物流',
                process: '工程',
                failCause: '失敗原因:'
            },
            confirmDeleteNode: '選択したノードを削除しますか？',
            confirmDeleteIcon: 'このアイコンを削除しますか？',
            confirmReset: 'キャンバスをクリアしますか？保存されていない変更は失われます。',
            edgeOptions: 'エッジオプション',
            arrowDirection: '矢印の方向',
            simulation: {
                start: 'シミュレーション開始',
                stop: '停止',
                reset: 'リセット',
                shortage: '欠品発生！',
                demandMet: '需要達成',
                delivering: '配送中...',
                title: '流れのシミュレーション'
            },
            supplyChain: {
                title: 'サプライチェーンシミュレーション',
                backToCanvas: 'キャンバスに戻る',
                analysisResults: '分析と結果',
                timeline: 'タイムライン',
                logs: 'ログ',
                scenarios: 'シナリオ',
                demandQty: '需要数量 (Qty)',
                dueDate: '納期',
                processing: 'シミュレーション中...',
                run: 'シミュレーション実行',
                flowView: 'フロー表示',
                autoTidy: 'ノードを自動整列',
                liveStatus: 'ライブステータス',
                idle: '待機',
                flowOptimized: 'フロー最適化済み',
                shortageDetected: '欠品検出',
                healthyFlow: '正常フロー',
                bottleneck: 'ボトルネック',
                shortage: '欠品',
                issue: '問題',
                runPrompt: '「シミュレーション実行」をクリックして分析結果を表示してください。',
                runFirst: '先にシミュレーションを実行してください！',
                customerNotFound: '顧客ノードが見つかりません！'
            },
            help: {
                mainTitle: 'バリューストリームマップ (VSM) の使い方',
                addingSymbols: '記号の追加',
                dragDrop: 'ツールボックス（左サイドバー）から記号をドラッグ',
                dropCanvas: 'キャンバスにドロップして追加',
                editProps: '記号をクリックしてプロパティを編集',
                connectingHeading: '工程の接続',
                connectDesc: 'あるノードの接続ポイントから別のノードへドラッグ',
                autoArrow: '自動的に矢印接続が作成されます',
                keyboardShortcuts: 'キーボードショートカット',
                saveLoadHeading: '保存・読み込み機能',
                saveDesc: 'VSMを.mavi-vsmファイルとして保存',
                loadDesc: 'ファイルからVSMを読み込み',
                mergeReplace: 'モード選択：置換（すべてクリア）または統合（既存に追加）',
                advancedHeading: '高度なTPS機能',
                yamazumiDesc: 'タクトタイムに対する作業バランスを視覚化します。',
                epeiDesc: '生産の柔軟性を分析します（Every Part Every Interval）。',
                timelineDesc: '下部のタイムラインラダーがリードタイムと付加価値時間のステップを表示します。'
            },
            toolbox: {
                title: 'VSMツールボックス',
                desc: 'ドラッグ＆ドロップ',
                flowTitle: 'フロー接続',
                material: 'マテリアル',
                manualInfo: '手動情報',
                electronicInfo: '電子情報',
                processData: 'プロセスデータ',
                processBox: '工程ボックス',
                operator: '作業者',
                kaizenBurst: '改善バースト',
                materialFlow: 'モノの流れ',
                supplier: 'サプライヤー',
                customer: '顧客',
                inventory: '在庫',
                supermarket: 'スーパーマーケット',
                fifo: 'FIFO',
                safetyStock: '安全在庫',
                truck: 'トラック',
                sea: '海運',
                air: '空運',
                rawMaterial: '材料',
                finishedGoods: '完成品',
                push: 'プッシュ',
                informationFlow: '情報の流れ',
                productionControl: '生産管理',
                heijunka: '平準化',
                kanbanPost: 'かんばんポスト',
                productionKanban: '生産かんばん',
                withdrawalKanban: '引取かんばん',
                signalKanban: '信号かんばん',
                goSee: '現地現物 (Go See)',
                buffer: 'バッファ',
                timelineMetrics: 'タイムラインとメトリクス',
                timeline: 'タイムライン',
                generalNotes: '一般 / ノート',
                stickyNote: '付箋 / テキスト',
                customIcons: 'カスタムアイコン',
                uploadIcon: 'アイコンをアップロード',
                scrollZoom: 'スクロールでズーム'
            },
            wizard: {
                title: 'マジックウィザード',
                customerTitle: '顧客設定',
                customerDesc: '顧客とその必要需要を定義します。',
                customerName: '顧客名',
                demandPerDay: '日当たり需要 (個)',
                shifts: 'シフト数',
                hoursPerShift: 'シフト当たりの時間',
                packSize: 'パックサイズ (ピッチ)',
                materialSource: '材料供給元',
                production: '生産',
                fgWarehouse: '製品倉庫',
                shippingMethod: '出荷方法',
                productionTitle: '生産工程',
                productionDesc: '上流（サプライヤー）から下流（顧客）へ順番に工程を入力します。',
                addProcess: '新規工程を追加',
                processName: '工程名',
                ct: 'CT (秒)',
                co: 'CO (切替時間)',
                uptime: '稼働率 (%)',
                buffer: 'バッファ',
                flow: 'フロー',
                receivingTitle: '入荷倉庫',
                receivingDesc: '生産に入る前の材料入荷エリアを設定します。',
                useReceiving: '入荷倉庫を使用しますか？',
                receivingInfo: 'サプライヤーから材料が到着した後の初期在庫を追加します。',
                initialStock: '初期在庫量 (個)',
                internalTransport: '生産への搬送方法',
                directMaterialInfo: '材料はサプライヤーから最初の生産工程へ直接配送されます。',
                supplierTitle: 'サプライヤーと原材料',
                addSupplier: 'サプライヤーを追加',
                useMaterialWh: '材料倉庫 (WH RM) を使用する',
                controlTitle: '管理と情報の流れ',
                commMethod: '通信方法',
                useHeijunka: '平準化ポストを使用しますか？',
                heijunkaDesc: '将来のリーン状態に向けて、生産量を均等に分散します。',
                readyToGenerate: '生成の準備ができました！',
                generateInfo: 'VSMは上流から下流へ配置されます。',
                back: '戻る',
                next: '次へ',
                generate: 'VSMを生成',
                rawMatWh: '材料倉庫',
                fgWh: '製品倉庫',
                shipping: '出荷'
            },
            ai: {
                title: '説明からVSMを生成',
                subtitle: '現在のプロセスを説明すると、AIが完全なバリューストリームマップを作成します',
                promptLabel: 'プロセスの詳細',
                promptPlaceholder: '例：サプライヤーから始まり、切断30秒、組立45秒、在庫100個、検査20秒、梱包25秒で顧客へ送ります...',
                languageLabel: '出力言語',
                modeLabel: 'モード',
                modeReplace: '現在のキャンバスを置換',
                modeMerge: '既存のキャンバスに統合',
                examplesButton: '例を見る',
                hideExamplesButton: '例を隠す',
                generateButton: 'VSM生成',
                cancelButton: 'キャンセル',
                charCount: '文字',
                tip: '正確なVSMを作成するには、サイクルタイム、オペレーター数、在庫量、情報の流れ（生産管理、かんばん、予測）を含めてください。'
            },
            analysis: {
                epeiTitle: 'EPEI分析 (Every Part Every Interval)',
                epeiDesc: '需要と工程を追加してEPEIを計算します。',
                epeiResult: '現在のEPEI:',
                excellent: '素晴らしい柔軟性です！',
                overload: '生産能力オーバー！',
                highCO: '切替時間が長すぎます',
                recommendation: '推奨事項:',
                smedAdvice: '切替時間を短縮するためにSMED（シングル段取り）を実施し、EPEIを1日以下にすることを目指してください。',
                healthyAdvice: '非常に柔軟なプロセスです。スーパーマーケットの在庫レベルを下げるために、より小さなロットで生産できます。',
                yamazumiTitle: '作業負荷バランス',
                yamazumiSubtitle: '山積み可視化',
                balanced: 'バランス良好',
                bottleneck: 'ボトルネック',
                heijunkaTip: 'すべてのステーションを同じレベルになるよう平準化してください。',
                noAnalysisData: '分析データなし',
                taktTime: 'タクトタイム',
                pitch: 'ピッチ',
                utilization: '稼働率',
                leadTime: 'リードタイム',
                valueAdded: '付加価値',
                lines: 'ライン',
                perMonth: '/月',
                perShift: '/シフト',
                capacity: '生産能力',
                raw: '材料',
                pushSystem: 'プッシュシステム',
                va: '付加価値',
                nva: '非付加価値',
                plt: 'PLT (リードタイム)',
                electronicFlow: '電子フロー',
                manualFlow: '手動フロー',
                safetyStock: '安全在庫',
                heijunka: '平準化',
                kanbanPost: 'かんばんポスト',
                productionKanban: '生産かんばん',
                withdrawalKanban: '引取かんばん',
                signalKanban: '信号かんばん',
                goSee: '現地現物 (Go See)',
                electronicInfo: '電子情報',
                manualInfo: '手動情報',
                buffer: 'バッファ',
                timelineMetrics: 'タイムラインとメトリクス',
                stickyNote: '付箋',
                uploadIcon: 'アイコンをアップロード',
                customIcons: 'カスタムアイコン',
                processBox: '工程ボックス',
                operator: '作業者',
                kaizenBurst: '改善バースト',
                supplier: 'サプライヤー',
                customer: '顧客',
                inventory: '在庫',
                supermarket: 'スーパーマーケット',
                fifo: 'FIFO',
                truck: 'トラック',
                rawMaterial: '原材料',
                finishedGoods: '完成品',
                push: 'プッシュ',
                informationFlow: '情報の流れ',
                productionControl: '生産管理',
                day: '日',
                days: '日',
                hr: '時間',
                hrs: '時間',
                min: '分',
                mins: '分',
                sec: '秒',
                total: '合計',
                pce: 'PCE (工程サイクル効率)',
                availTime: '稼働可能時間',
                dailyDemand: '1日需要',
                spareCapacity: '余裕能力',
                totalCO: '合計切替時間'
            },
            nodes: {
                bottleneck: 'ボトルネック',
                oee: 'OEE (%)',
                capacity: '能力/時 (個)',
                utilization: '稼働率',
                bom: '構成部品 (BOM):',
                receiving: '入荷',
                forklift: 'フォークリフト',
                trolley: '台車',
                notePlaceholder: 'メモを入力...',
                noteDefault: 'メモ',
                ctShort: 'サイクルタイム (秒)',
                coShort: '型替時間 (分)',
                uptimeShort: '可動率 (%)',
                perfShort: '性能 (%)',
                yieldShort: '良品率 (%)',
                vaShort: '付加価値時間 (秒)',
                capShort: '時間当たり能力',
                shortageLabel: '欠品',
                invLabel: '在庫',
                openProject: 'ダブルクリックしてプロジェクトを開く: {{name}}',
                openLinkedProject: 'ダブルクリックしてリンクされたプロジェクトを開く',
                operators: '作業員',
                pacemaker: 'ペースメーカー',
                shared: '共用',
                outside: '外部'
            }
        },
        common: {
            front: '前',
            back: '後ろ',
            noVideo: '警告: ビデオが読み込まれていません！',
            noElements: '警告: 要素がありません！',
            selectTwo: '要素を2つ選択してください。',
            noActiveProject: 'アクティブなプロジェクトがありません',
            save: '保存',
            cancel: 'キャンセル',
            delete: '削除',
            edit: '編集',
            close: '閉じる',
            upload: 'アップロード',
            export: '出力',
            import: '入力',
            search: '検索',
            filter: 'フィルター',
            loading: '読み込み中...',
            noData: 'データなし',
            confirm: '確認',
            success: '成功',
            error: 'エラー',
            warning: '警告',
            open: '開く',
            select: '選択',
            preview: 'プレビュー',
            saveAs: '別名で保存...',
            exportZip: 'プロジェクトを出力 (.zip)',
            importZip: 'プロジェクトを読み込み (.zip)',
            selectProject: 'プロジェクトを選択',
            steps: 'ステップ',
            none: 'なし',
            comingSoon: 'この機能はまもなく利用可能になります！',
            undo: '元に戻す',
            redo: 'やり直し',
            pan: 'パン',
            alignLeft: '左揃え',
            alignTop: '上揃え',
            exportAsPng: 'PNGとして出力',
            color: '色',
            normal: '標準'
        },
        categories: {
            valueAdded: '付加価値',
            nonValueAdded: '非付加価値',
            waste: 'ムダ'
        },
        project: {
            newProject: '新規プロジェクト',
            openProject: 'プロジェクトを開く',
            projectName: 'プロジェクト名',
            selectProject: 'プロジェクトを選択',
            noProjects: '保存されたプロジェクトはありません',
            createNew: '新規作成',
            createProject: 'プロジェクト作成',
            enterName: 'プロジェクト名を入力',
            videoFile: 'ビデオファイル',
            selectVideo: 'ビデオを選択',
            lastModified: '最終更新日',
            errors: {
                nameRequired: 'プロジェクト名は必須です',
                videoRequired: 'ビデオファイルを選択してください',
                nameExists: 'その名前はすでに使用されています',
                notFound: 'プロジェクトが見つかりません'
            },
            folderOptional: 'フォルダ (任意)',
            rootNoFolder: 'ルート (フォルダなし)',
            videoSelected: 'ビデオ選択済み'
        },
        measurement: {
            startMeasurement: '計測開始',
            endMeasurement: '計測終了',
            elementName: '要素名',
            category: 'カテゴリー',
            duration: '時間',
            startTime: '開始時刻',
            endTime: '終了時刻'
        },
        landing: {
            nav: {
                features: '機能',
                solutions: 'ソリューション',
                login: 'ログイン',
                startDemo: 'デモ開始'
            },
            hero: {
                newBadge: '✨ 新機能: AIマニュアル生成',
                title: '動作を最適化する',
                highlight: 'インテリジェント分析',
                subtitle: 'MAViは高度なコンピュータビジョンを使用してワークフローを分析し、標準時間を計算し、自動的にムダを特定します。生産性を最大40％向上させます。',
                ctaPrimary: '無料デモを開始',
                ctaSecondary: '詳細を見る'
            },
            solutions: {
                title: 'なぜMAViを選ぶのか？',
                oldWay: '従来の方法',
                maviWay: 'MAViソリューション',
                old: {
                    stopwatch: {
                        title: '手動ストップウォッチ',
                        desc: '人間の反応速度に依存する不正確なタイミング。'
                    },
                    paper: {
                        title: '紙とクリップボード',
                        desc: 'データは紙に閉じ込められ、後でExcelへの手動入力が必要です。'
                    },
                    subjective: {
                        title: '主観的分析',
                        desc: '同じタスクでも、エンジニアによって結果が異なります。'
                    }
                },
                mavi: {
                    video: {
                        title: 'AIビデオ分析',
                        desc: 'ビデオ映像から自動的に抽出されたフレーム単位の正確なタイミング。'
                    },
                    digital: {
                        title: 'デジタル＆インスタント',
                        desc: 'データは即座にデジタル化されます。ワンクリックでレポートとマニュアルを作成します。'
                    },
                    standardized: {
                        title: '標準化＆正確',
                        desc: '毎回一貫した分析を行い、人的ミスやバイアスを排除します。'
                    },
                    cta: '今すぐMAViに切り替える'
                }
            },
            features: {
                title: 'より強力な機能',
                manual: {
                    title: 'マニュアル作成',
                    desc: '分析をトレーニングマニュアルに変えます。Excel/Wordからインポートするか、ビデオステップから生成します。'
                },
                workflow: {
                    title: 'ドラッグ＆ドロップ ワークフロー',
                    desc: 'プロセス要素を視覚的に並べ替えて、生産ラインを中断することなく新しいレイアウトをテストします。'
                },
                cloud: {
                    title: 'クラウド同期',
                    desc: 'チームとリアルタイムでコラボレーションします。デバイス間でプロジェクトとマニュアルを安全に同期します。'
                }
            },
            how: {
                title: 'MAViの仕組み',
                capture: {
                    title: '撮影',
                    desc: '生産ラインを録画するか、既存のビデオファイルをプラットフォームに直接アップロードします。'
                },
                analyze: {
                    title: '分析',
                    desc: '当社のコンピュータビジョンエンジンは、サイクルを検出し、時間を計算し、自動的にムダを特定します。'
                },
                improve: {
                    title: '改善',
                    desc: 'データに基づいた洞察を使用して、ラインのバランスを取り、ボトルネックを解消し、生産性を向上させます。'
                }
            },
            audience: {
                title: 'プロフェッショナルのために',
                ie: {
                    title: '産業エンジニア (IE)',
                    desc: '手動データ入力に何時間も費やすのをやめましょう。サイクルを自動的にキャプチャし、標準作業チャートを数分で作成します。'
                },
                pm: {
                    title: '工場長',
                    desc: '生産ラインを完全に可視化します。ボトルネックを即座に特定し、効率改善を追跡します。'
                },
                lc: {
                    title: 'リーン・コンサルタント',
                    desc: 'クライアントにより早く価値を提供します。MAViを使用して、データに基づいた推奨事項と印象的な「改善前/改善後」の視覚的証拠を提供します。'
                }
            },
            faq: {
                title: 'よくある質問',
                q1: {
                    q: 'ビデオデータは安全ですか？',
                    a: 'はい。MAViはエンタープライズグレードの暗号化を使用しています。Proプランの場合、データはクラウドに安全に保存されます。Starterプランの場合、データはローカルデバイスから出ません。'
                },
                q2: {
                    q: 'レポートをExcelにエクスポートできますか？',
                    a: 'もちろんです。すべての分析データ、チャート、および標準作業票を、Excel、PDF、またはWord形式に直接エクスポートできます。'
                },
                q3: {
                    q: '特別なハードウェアが必要ですか？',
                    a: 'いいえ。MAViは、あらゆる標準ビデオファイル（MP4、WEBM）または直接Webカメラ入力で動作します。高価なセンサーは必要ありません。'
                }
            },
            cta: {
                title: 'ワークフローを最適化する準備はできましたか？',
                desc: 'MAViで時間を節約し、効率を向上させている何千ものエンジニアに加わりましょう。',
                button: '無料トライアルを開始'
            },
            footer: {
                product: '製品',
                company: '会社',
                resources: 'リソース',
                legal: '法的情報',
                rights: '© 2025 Mavi Systems Inc. 全著作権所有。'
            }
        },
        sensei: {
            welcome: "👋 こんにちは！私は **MAVi Sensei** です。MAViアプリケーションの使い方を学ぶお手伝いをするAIアシスタントです。\n\n以下のことについて質問できます：\n- 特定の機能の使い方\n- TPSツールの説明\n- ヒントとコツ\n- トラブルシューティング\n\n今日は何を学びたいですか？",
            placeholder: 'Senseiに聞く...',
            thinking: 'Senseiが考え中...',
            mute: 'Senseiをミュート',
            unmute: 'Senseiのミュート解除',
            apiKeyMissing: '⚠️ **APIキーが設定されていません。**',
            apiKeyWarning: 'AI機能をフルに使用するには、**設定**でGemini APIキーを設定してください。',
            openSettings: 'AI設定を開く',
            onlineStatus: 'オンライン & 準備完了',
            errorTechnical: '申し訳ありません、技術的な問題が発生しました。APIキーが正しいか、インターネット接続が安定しているか確認してください。'
        },
        ipCamera: {
            title: 'IPカメラ接続',
            preset: 'プリセット',
            streamType: 'ストリームタイプ',
            streamUrl: 'ストリームURL',
            connect: 'ストリームに接続',
            connecting: '接続中...',
            disconnect: '切断',
            connected: '接続済み',
            tips: {
                title: 'ヒント',
                tip1: 'URLはビデオファイルへの直接リンクである必要があります（Webページではありません）。',
                tip2: 'RTSPの場合、HTTP/HLSへの変換サーバー（FFmpeg/VLCなど）を使用してください。',
                tip3: '.m3u8または.mp4で終わるURLを探してください。'
            },
            errors: {
                missingUrl: 'ストリームURLを入力してください',
                videoUnavailable: 'ビデオ要素が利用できません',
                connectionFailed: '接続に失敗しました。URLがWebページではなく、直接ストリーム（例：.m3u8、.mp4、MJPEG）であることを確認してください。',
                generic: 'ストリームへの接続に失敗しました'
            }
        },
        allowance: {
            title: '余裕率設定',
            personal: '個人的余裕 (%)',
            basicFatigue: '基本疲労余裕 (%)',
            delay: '遅延余裕 (%)',
            total: '合計余裕率:',
            done: '完了'
        },
        studioModel: {
            title: 'スタジオモデル',
            subtitle: '動作分析モデルの設計と構築',
            createButton: '新規モデル作成',
            helpButton: 'ヘルプ',
            searchPlaceholder: 'モデルを検索...',
            noModels: 'モデルが見つかりません',
            createFirst: '最初のモデルを作成する',
            deleteConfirm: 'このモデルを削除してもよろしいですか？',
            renamePrompt: 'このモデルの新しい名前を入力してください：',
            descPrompt: '新しい説明を入力してください：',
            openEditor: 'エディターを開く',
            delete: 'モデルを削除',
            clickRename: 'クリックして名前を変更',
            clickDesc: 'クリックして説明を変更',
            states: 'ステート',
            rules: 'ルール',
            helpModal: {
                title: 'スタジオモデルガイド (モーションルール)',
                intro: 'このシステムは、**有限オートマトン (FSM)** ロジックを使用して、コーディングなしで**「動作ルール」**を作成するように設計されています。',
                concepts: {
                    title: '1. 基本概念 (ロジック)',
                    state: 'State (ステート): オペレーターの現在の状態 (例: 待機中、把持中、組み立て中)。',
                    transition: 'Transition (遷移): あるステートから別のステートへの移動。',
                    rule: 'Rule (ルール): 遷移が発生するための条件 (例: 右手がテーブルより高い場合、\'把持中\'に移動)。'
                },
                workflow: {
                    title: '2. モデル作成ワークフロー',
                    step1: '動画アップロード: 標準作業者の動画を入力します。',
                    step2: 'ステート定義: アクティビティ (作業手順) をリストアップします。',
                    step3: '遷移とルールの作成: 自動検出ロジックでステートを接続します。',
                    step4: '検証: 他の動画でテストして精度を確認します。'
                },
                navigation: {
                    title: '3. エディターナビゲーション',
                    tabStates: 'ステートタブ: 作業手順の追加/編集。',
                    tabRules: 'ルールタブ: 「いつ手順を移動するか」のロジックを作成。',
                    tabTest: 'テスト/デバッグタブ: リアルタイム検出結果を表示。'
                },
                aiIntegration: {
                    title: '2. AI統合 (Roboflow)',
                    desc: 'カスタムAIモデルを使用してPPE、部品、またはツールを検出します。',
                    config: '設定: Settingsタブ -> Roboflow Modelsへ移動。APIキーとプロジェクトIDを入力。',
                    demo: 'デモ: 「デモを試す」をクリックして検出をシミュレーション。',
                    rule: 'ルール: 「Roboflow Detection」ルールタイプを使用し、オブジェクト名（例: helmet）と閾値を入力。'
                },
                testRun: {
                    title: '3. テスト実行',
                    desc: 'ビデオまたはWebカメラでロジックをテストします。',
                    panel: '左パネル: 可視化（ビデオ、スケルトン、バウンディングボックス）。',
                    console: 'ライブコンソール: リアルタイムログを監視。',
                    timeline: 'ビジュアルタイムライン: 遷移の発生タイミングを表示。',
                    analytics: 'サイクル分析: VA/NVA比率の計算。'
                },
                tips: {
                    title: '4. 精度のヒント',
                    colors: 'カラーインジケータ: 青色は条件が満たされていることを示します。',
                    holding: '保持時間: 遷移がちらつくのを防ぐために時間を追加します。',
                    refresh: 'リフレッシュ: データが止まった場合は、保存してブラウザを更新してください。'
                },
                close: 'ガイドを閉じる'
            },
            modelBuilder: {
                title: 'モデルビルダー (Model Builder)',
                tabs: {
                    rules: 'ルールとロジック (Rules & Logic)',
                    steps: 'ステップ (Steps)',
                    data: 'データ (Data)',
                    test: 'テスト実行 (Test Run)',
                    settings: '設定 (Settings)'
                },
                buttons: {
                    save: '保存 (Save)',
                    undo: '元に戻す (Undo)',
                    redo: 'やり直し (Redo)',
                    help: 'ヘルプ (Help)',
                    close: '閉じる (Close)',
                    changeVideo: 'ビデオ変更 (Change Video)',
                    uploadVideo: 'ビデオアップロード (Upload Video)',
                    referenceVideo: '参照ビデオ (Reference Video)',
                    liveCamera: 'ライブカメラ (Live Camera)',
                    simulator: 'シミュレーター (Simulator)',
                    clearConsole: 'クリア (Clear)',
                    exportPdf: 'PDFエクスポート (Export PDF)',
                    addState: 'ステート追加 (Add State)',
                    backToList: 'リストに戻る (Back to List)',
                    drawRoi: 'ROI描画 (Draw ROI)',
                    captureFrame: 'フレームキャプチャ (Capture Frame)',
                    addSound: 'サウンド (Sound)',
                    addWebhook: 'Webhook',
                    addPlc: 'PLC',
                    onEnter: 'ステート入室時 (On Enter State)',
                    onExit: 'ステート退室時 (On Exit State)',
                    delete: '削除 (Delete)',
                    backToVideo: 'ビデオに戻る',
                    backToCamera: 'カメラに戻る'
                },
                labels: {
                    motionTimeline: 'モーションタイムライン (MOTION TIMELINE)',
                    currentState: '現在のステート (Current State)',
                    liveConsole: 'ライブコンソール (Live Console)',
                    cycleAnalytics: 'サイクル分析 (Cycle Analytics)',
                    plcMonitor: 'PLC信号モニター (PLC Signal Monitor)',
                    detailedMetrics: '詳細メトリクス (Detailed Metrics)',
                    totalCycles: '合計サイクル (TOTAL CYCLES)',
                    vaRatio: 'VA比率 (VA RATIO)',
                    avgStats: '平均統計 (AVERAGE STATISTICS)',
                    cycleTime: 'サイクルタイム (Cycle Time)',
                    vaTime: 'VA時間 (VA Time)',
                    cycleHistory: 'サイクル履歴 (CYCLE HISTORY)',
                    definedStates: '定義済みステート (Defined States)',
                    stateName: 'ステート名 (State Name)',
                    minDuration: '最小持続時間 (Min Duration)',
                    valueAdded: '付加価値 (Value Added)',
                    markEssential: 'このステートを必須としてマーク (Mark Essential)',
                    actionTriggers: 'アクショントリガー (Action Triggers)',
                    roi: 'ROI',
                    drawBoxHint: 'ビデオ上にボックスを描画... (Draw Box)',
                    poseRef: 'ポーズ参照 (Pose Reference)',
                    projectVault: 'プロジェクト・ボルト',
                    localFile: 'ローカルファイル',
                    selectFromProject: 'プロジェクトから選択',
                    defined: '定義済み',
                    none: 'なし',
                    stepCount: 'ステップ',
                    duplicateState: 'ステートを複製',
                    addNextStep: '次のステップを追加',
                    drawRoiHint: 'ビデオ上にボックスを描画して、このステップの有効なエリアを定義します。',
                    camera: 'カメラ',
                    simulator: 'シミュレータ',
                    addState: 'ステート追加',
                    backToList: 'リストに戻る',
                    definedStates: '定義済みステート'
                },
                measure: {
                    result: '結果',
                    distance: '距離',
                    angle: '角度',
                    addToRule: 'ルールに追加',
                    hint: 'スケルトン上の点を選択 (最大3つ)',
                    ruler: '定規',
                    measureDistance: '距離を測定',
                    measureAngle: '角度を測定',
                    clear: '測定をクリア'
                },
                projectPicker: {
                    title: 'プロジェクトビデオを選択',
                    noProjects: 'プロジェクトが見つかりません。',
                    select: '選択'
                },
                ipCamera: {
                    title: 'IPカメラから録画',
                    streamUrl: 'カメラストリームURL (MJPEG/HTTP)',
                    recording: '録画中',
                    previewHint: 'プレビューのためにカメラURLを入力するか、シミュレーターに切り替えてください'
                },
                rules: {
                    types: {
                        POSE_ANGLE: '関節角度 (Joint Angle)',
                        POSE_RELATION: 'ポーズ関係 (Pose Relation)',
                        POSE_VELOCITY: 'ポーズ速度 (Pose Velocity)',
                        OBJECT_PROXIMITY: 'オブジェクト近接 (Object Proximity)',
                        OBJECT_IN_ROI: 'ROI内のオブジェクト (Object in ROI)',
                        OPERATOR_PROXIMITY: 'オペレーター近接 (Operator Proximity)',
                        POSE_MATCHING: 'ゴールデンポーズ一致 (Golden Pose Match)',
                        SEQUENCE_MATCH: 'モーションシーケンス一致 (Sequence Match)',
                        TEACHABLE_MACHINE: 'Teachable Machine',
                        ROBOFLOW_DETECTION: 'Roboflow Detection',
                        CVAT_MODEL: 'CVAT / Custom Model',
                        ADVANCED_SCRIPT: '高度なスクリプト (Advanced Script)'
                    },
                    operators: {
                        LESS: '<',
                        GREATER: '>',
                        LESS_EQUAL: '<=',
                        GREATER_EQUAL: '>=',
                        EQUAL: '=',
                        NOT_EQUAL: '!=',
                        BETWEEN: 'の間 (Between)'
                    },
                    conditionMet: '条件一致 (Condition Met)',
                    noMatch: '不一致 (No Match)',
                    ready: '準備完了 (Ready)',
                    mustBeIn: 'must be in',
                    distanceTo: 'distance to'
                },
                step: 'ステップ',
                prompts: {
                    soundUrl: '音声URLを入力 (mp3/wav):',
                    webhookUrl: 'Webhook URLを入力:',
                    plcSignalId: 'PLC信号IDを入力 (例: DO_01):',
                    plcValue: '値を入力 (HIGH/LOW):',
                    versionName: 'バージョン名を入力 (例: "V1 初期ドラフト"):',
                    restoreVersion: 'バージョン "{{version}}" を復元しますか？保存されていない変更は失われます。',
                    deleteVersion: 'バージョン "{{version}}" を削除しますか？',
                    templateLoad: '"{{name}}" を読み込みますか？これにより、現在のモデルが置き換えられます。'
                },
                settings: {
                    title: 'モデル設定',
                    versionHistory: 'バージョン履歴',
                    saveSnapshot: 'スナップショットを保存',
                    noVersions: '保存されたバージョンはありません。',
                    restore: '復元',
                    coordinateSystem: '座標系',
                    screen: '画面 (絶対値 0-1)',
                    bodyCentric: '身体中心 (腰に対する相対値)',
                    bodyCentricHint: '精度のために身体中心を推奨します。作業者が移動したりカメラが動いたりしても精度が保たれます。(0,0) は腰の中心です。'
                },
                teachableMachine: {
                    title: 'Teachable Machine モデル',
                    goToSite: 'サイトへ移動',
                    addModel: 'モデルを追加',
                    modelUrl: 'モデルURL',
                    image: '画像',
                    pose: 'ポーズ',
                    loading: 'モデルを読み込み中...',
                    offlineMode: 'オフラインモード: ファイルをアップロード',
                    loadFiles: 'ファイルを読み込む'
                },
                roboflow: {
                    title: 'Roboflow モデル',
                    tryDemo: 'デモを試す',
                    apiKey: 'API Key',
                    projectId: 'Project ID',
                    version: 'Ver.',
                    noModels: 'Roboflowモデルが設定されていません。'
                },
                portability: {
                    title: '移植性とテンプレート',
                    exportJson: 'JSONをエクスポート',
                    importJson: 'JSONをインポート',
                    loadTemplate: 'テンプレートライブラリから読み込む',
                    selectTemplate: 'モーションテンプレートを選択'
                },
                extraction: {
                    title: 'ポーズ抽出データ',
                    mode: 'モード',
                    trackingLive: '追跡中',
                    noData: 'データなし',
                    keypoint: 'キーポイント',
                    conf: '信頼度'
                },
                indicators: {
                    referenceCaptured: '✓ 参照ポーズを取得しました',
                    drawing: '描画中...',
                    loadingPose: 'ポーズ検出器を読み込み中...',
                    detectorReady: 'スケルトンの準備完了 - ビデオを再生して検出を開始',
                    detecting: '検出中...',
                    operatorDetected: 'オペレーターを検出',
                    noOperator: 'オペレーター未検出',
                    logicMatched: 'ロジックが一致しました',
                    playToTest: 'テストのためにビデオを再生',
                    systemReady: 'システムの準備が完了しました。ビデオの再生ボタンを押してシミュレーションを開始してください。',
                    waiting: '待機中...',
                    noSignals: '信号がアクティブではありません',
                    completeCycle: '分析を表示するには1サイクル完了してください'
                },
                tooltips: {
                    restoreLayout: 'レイアウトを元に戻す',
                    maximizeEditor: 'エディタを最大化',
                    changeVideo: 'ビデオを変更または新規アップロード'
                }
            }
        },
        maviClass: {
            title: 'MAViクラス',
            subtitle: '初心者からエキスパートまでMAViを学ぶ',
            progress: '進捗',
            lessons: 'レッスン',
            totalDuration: '合計時間',
            modules: 'モジュール',
            moduleLabel: 'モジュール',
            cobaSekarang: '今すぐ試す',
            tontonVideo: 'ビデオを見る',
            keyPoints: 'キーポイント',
            congratulations: 'おめでとうございます！',
            congratsMessage: 'MAViクラスの全教材を完了しました。MAViエキスパート認定おめでとうございます！',
            resetProgress: '進捗をリセット',
            resetConfirm: 'すべての進捗をリセットしますか？この操作は取り消せません。',
            basicResponses: {
                help: '山積み表、VSMなどのMAVi機能の学習をお手伝いします。',
                features: 'MAViには、AI分析、時間研究、TPSツールなどの機能があります。',
                yamazumi: '🏔️ 山積み表 (Yamazumi):\n1. **山積み表**メニューを開く (/yamazumi)\n2. 計測データをインポート\n3. オペレーター/ステーションごとの積み上げ棒グラフを表示\n4. タクトタイムと比較',
                vsm: '🗺️ バリューストリームマップ (VSM):\n1. **VSM**メニューを開く (/value-stream-map)\n2. 現状マップ (Current State) を作成\n3. ムダを特定\n4. 将来マップ (Future State) を設計',
                uploadVideo: '📹 ビデオアップロード:\n1. **ビデオワークスペース**を開く (🎬 メニュー)\n2. アップロードをクリックまたはドラッグ＆ドロップ\n3. 対応フォーマット: MP4, WebM, AVI',
                measureTime: '⏱️ 時間計測:\n1. ビデオワークスペースで **要素エディタ** を使用\n2. 「計測開始」をクリック\n3. 「計測終了」をクリック\n4. 要素名を入力し、サーブリッグタイプを選択',
                aiFeatures: '🧠 AI機能:\n- **AIプロセススタジオ** (/ai-process): ビデオインテリジェンス、動作分析\n- **行動認識**: 自動アクション検出\n- **リアルタイム・コンプライアンス**:SOP遵守監視',
                wasteElimination: '🗑️ 7つのムダ (Muda):\n- 運搬、在庫、動作、手待ち\n- 加工そのもの、作りすぎ、不良\n\n**ムダ取り**メニュー (/waste-elimination) で特定',
                therblig: '📍 18のサーブリッグ動作:\n- 空運搬 (TE)、掴む (G)、運搬 (TL)\n- 位置決め (P)、放つ (RL)、使用 (U)、組立 (A) など\n\n詳細は **サーブリッグ分析** (/therblig) を参照',
                createWorkInstruction: '📘 作業手順書作成:\n1. **マニュアル作成** (/manual-creation) を開く\n2. ビデオからフレームをキャプチャ\n3. AIを使って手順を生成\n4. PDF/Word/PowerPointにエクスポート',
                fallback: "🤔 うーん、もっと情報が必要です。ビデオアップロードやAI機能について聞いてみてください。"
            }
        },
        videoWorkspace: {
            title: 'ビデオワークスペース',
            uploadVideo: 'ビデオをアップロード',
            uploadOrIP: 'ビデオをアップロードするかIPカメラを使用する',
            enterURL: 'ストリームURLを入力 (rtsp/http)',
            connecting: '接続中...',
            dragDrop: 'ドラッグ＆ドロップまたはクリックして選択',
            playPause: '再生/一時停止',
            speed: '速度',
            volume: '音量',
            fullscreen: '全画面',
            currentTime: '現在時間',
            duration: '長さ',
            noVideo: 'ビデオが読み込まれていません',
            loading: 'ビデオを読み込み中...',
            error: 'ビデオ読み込みエラー',
            cancel: 'キャンセル',
            showDrawingTools: '描画ツールを表示',
            hideDrawingTools: '描画ツールを非表示',
            showCameraPanel: 'カメラパネルを表示',
            hideCameraPanel: 'カメラパネルを非表示',
            reverseMode: 'リバースモード',
            frame: 'フレーム',
            fullscreen: '全画面表示',
            exitFullscreen: '全画面表示を終了',
            pen: 'ペン',
            line: 'ライン',
            arrow: '矢印',
            rectangle: '長方形',
            circle: '円',
            text: 'テキスト',
            prevFrame: '前のフレーム',
            nextFrame: '次のフレーム',
            normalMode: 'ノーマルモード',
            size: 'サイズ',
            clearDrawings: 'すべての描画を消去',
            dragToResize: 'ドラッグしてサイズ変更',
            aiIntelligence: 'AIビデオインテリジェンス'
        },
        elementEditor: {
            title: '要素エディタ',
            addElement: '要素を追加',
            editElement: '要素を編集',
            deleteElement: '要素を削除',
            elementName: '要素名',
            startTime: '開始時間',
            endTime: '終了時間',
            duration: '所要時間',
            category: 'カテゴリー',
            therbligType: 'サーブリッグ',
            notes: 'メモ',
            startMeasurement: '計測開始',
            endMeasurement: '計測終了',
            cancelMeasurement: '計測をキャンセル',
            measuring: '計測中...',
            noElements: '要素がありません',
            confirmDelete: 'この要素を削除しますか？',
            saveToDb: 'データベースに保存',
            quickMode: 'クイックモード',
            autoCounter: '自動カウンター',
            showDashboard: 'ダッシュボードを表示',
            hideDashboard: 'ダッシュボードを非表示',
            selectAnElement: 'まず要素を選択してください',
            nextCycle: '次のサイクル',
            prevCycle: '前のサイクル',
            zoomLevel: 'ズームレベル',
            playbackSpeed: '再生速度',
            actions: '操作',
            cycle: 'サイクル',
            process: '工程',
            manual: '手作業',
            auto: '自動',
            walk: '歩行',
            loss: 'ロス',
            rating: 'レイティング %',
            normalTime: '正味時間 (s)',
            standardTime: '標準時間 (s)',
            emptyElements: '要素がありません。計測を開始して要素を追加してください。',
            noFilterMatch: 'フィルターに一致する要素はありません。',
            exporting: 'エクスポート中...',
            exportSuccess: 'エクスポート完了！',
            exportFailed: 'エクスポート失敗',
            preparingExcel: 'Excelファイルを準備中...',
            showingElements: '{{total}}要素中 {{filtered}}要素を表示',
            errors: {
                positiveTimes: '開始時間と終了時間は正の数である必要があります。',
                startLessFinish: '開始時間は終了時間より前である必要があります。',
                totalSplitExceeds: '内訳の合計時間は要素の所要時間を超えることはできません。'
            },
            ratingSpeed: 'レイティング速度',
            stopTracking: '{{type}} トラッキング停止',
            startTracking: '{{type}} トラッキング開始',
            quickModeHint: 'クイックモード有効: <kbd>M</kbd>キーで計測の開始/終了。要素名は自動生成されます。',
            elements: '要素',
            cycles: 'サイクル',
            untitled: '無題',
            exitFullscreen: '全画面表示を終了',
            fullscreenEditor: '全画面エディタ',
            allowanceSettings: 'アローアンス設定',
            toggleColumns: 'カラムの表示選択',
            searchPlaceholder: '要素を検索...',
            sortBy: '並び替え',
            sortOriginal: '元の順序',
            sortCycle: 'サイクル',
            sortDuration: '所要時間（長い順）',
            sortName: '名称（A-Z）',
            selectOption: '-- 選択 --',
            total: '合計',
            splitTimePrompt: 'スプリット時間を入力（{{start}}s - {{end}}sの間）:',
            invalidSplitTime: 'スプリット時間が無効です！開始時間と終了時間の間である必要があります。',
            toggleRatingSpeed: 'レイティング速度を切り替え',
            zoomLevelTitle: 'ズームレベル'
        },
        timeline: {
            title: 'タイムライン統計',
            totalTime: '合計時間',
            vaRatio: 'VA 比率',
            waste: 'ムダ',
            bottleneck: 'ボトルネック検出',
            noData: 'データなし',
            categoryBreakdown: 'カテゴリー内訳',
            zoomIn: '拡大',
            zoomOut: '縮小',
            toggleGrid: 'グリッド表示切替',
            grid: 'グリッド',
            standard: '標準',
            vsm: 'VSM',
            compact: 'コンパクト'
        },
        yamazumi: {
            title: '山積み表',
            subtitle: '作業負荷バランス分析',
            operator: '作業者',
            station: '工程',
            taktTime: 'タクトタイム',
            cycleTime: 'サイクルタイム',
            workload: '作業負荷',
            balance: 'バランス',
            addOperator: '作業者を追加',
            importData: 'データをインポート',
            exportChart: 'チャート出力',
            showTaktLine: 'タクトラインを表示',
            noData: '表示するデータがありません'
        },
        swcs: {
            title: '標準作業組合せ票',
            subtitle: '人・機械チャート',
            projects: 'プロジェクト',
            manual: 'マニュアル',
            loadManual: 'マニュアル読込 (JSON)',
            saveManual: 'マニュアル保存 (JSON)',
            saveProject: 'プロジェクトに保存',
            exportPdf: 'PDFエクスポート',
            exportExcel: 'Excelエクスポート',
            importExcel: 'Excelインポート',
            zoom: 'ズーム',
            buffer: 'バッファ',
            tpsAnalysis: 'TPS分析',
            cycleTime: 'サイクルタイム',
            capacity: '能力',
            vaTime: '正味時間 (VA)',
            nvaTime: '付随作業 (NVA)',
            waste: 'ムダ',
            kaizen: '改善',
            legend: {
                manual: '手作業 (実線)',
                auto: '自動 (破線)',
                walk: '歩行 (波線)'
            },
            table: {
                no: 'No',
                elementName: '要素名',
                man: '手作業',
                auto: '自動',
                walk: '歩行',
                wait: '手待ち',
                start: '開始',
                finish: '終了',
                duration: '所要時間',
                total: '合計',
                quality: '品質',
                safety: '安全',
                kaizen: '改善',
                add: '要素を追加'
            },
            emptyTitle: 'データなし',
            emptyProject: 'データのあるプロジェクトを選択するか、マニュアルモードに切り替えてください。',
            emptyManual: '左側のテーブルに作業要素を追加してください。',
            header: {
                partName: '品名',
                partNo: '品番',
                process: '工程名',
                station: 'ステーション',
                taktTime: 'タクトタイム',
                stdWip: '標準仕掛',
                date: '日付',
                revision: '版'
            },
            table: {
                no: 'No',
                elementName: '要素名',
                man: '手作業',
                auto: '自動',
                walk: '歩行',
                wait: '手待ち',
                start: '開始',
                finish: '完了',
                duration: '時間',
                total: '合計',
                quality: '品質',
                safety: '安全',
                kaizen: '改善',
                add: '要素を追加'
            },
            legend: {
                manual: '手作業 (実線)',
                auto: '自動 (破線)',
                walk: '歩行 (波線)'
            }
        },
        therblig: {
            title: 'サーブリッグ分析',
            subtitle: '18の基本動作',
            motionType: '動作タイプ',
            frequency: '頻度',
            totalTime: '合計時間',
            percentage: '割合',
            chart: 'チャート',
            table: 'テーブル',
            summary: 'サマリー',
            transportEmpty: '空運搬 (TE)',
            grasp: '掴む (G)',
            transportLoaded: '運搬 (TL)',
            position: '位置決め (P)',
            release: '放つ (RL)',
            use: '使用 (U)',
            assemble: '組立 (A)',
            disassemble: '分解 (DA)'
        },
        waste: {
            title: 'ムダ取り',
            subtitle: '7つのムダ (Muda)',
            transport: '運搬のムダ',
            inventory: '在庫のムダ',
            motion: '動作のムダ',
            waiting: '手待ちのムダ',
            overProcessing: '加工のムダ',
            overProduction: '作りすぎのムダ',
            defects: '不良のムダ',
            identify: '特定',
            analyze: '分析',
            eliminate: '排除',
            noWaste: 'ムダは特定されませんでした',
            wasteFound: 'ムダが見つかりました'
        },
        statistics: {
            title: '統計分析',
            mean: '平均',
            median: '中央値',
            mode: '最頻値',
            stdDev: '標準偏差',
            variance: '分散',
            min: '最小値',
            max: '最大値',
            range: '範囲',
            confidence: '信頼区間',
            histogram: 'ヒストグラム',
            boxPlot: '箱ひげ図',
            calculate: '計算'
        },
        manual: {
            title: 'マニュアル作成',
            subtitle: '作業手順書ビルダー',
            addStep: 'ステップ追加',
            captureFrame: 'フレームキャプチャ',
            generateAI: 'AI生成',
            stepNumber: 'ステップ',
            description: '説明',
            image: '画像',
            notes: '備考',
            exportPDF: 'PDF出力',
            exportWord: 'Word出力',
            exportPPT: 'PowerPoint出力',
            preview: 'プレビュー',
            noSteps: 'ステップがありません',
            statuses: {
                draft: '下書き',
                proposed: '提案中',
                review: 'レビュー中',
                approved: '承認済み',
                released: 'リリース済み'
            },
            difficulties: {
                veryEasy: '非常に簡単',
                easy: '簡単',
                moderate: '普通',
                difficult: '難しい',
                veryDifficult: '非常に難しい'
            },
            creator: 'マニュアルクリエイター',
            workInstructions: '作業手順書',
            noDocNumber: 'ドキュメント番号なし',
            scanForMobile: 'デジタルアクセス用のスキャン',
            sourceVideo: 'ソースビデオ',
            untitledStep: '無題のステップ',
            documentInfo: 'ドキュメント情報',
            stepTitle: 'ステップタイトル',
            pointsAlerts: 'ポイントとアラート',
            instructions: '指示内容'
        },
        workspace: {
            title: 'プロジェクト管理',
            newProject: '新規プロジェクト',
            loadProject: 'プロジェクト読み込み',
            saveProject: 'プロジェクト保存',
            deleteProject: 'プロジェクト削除',
            projectName: 'プロジェクト名',
            lastModified: '最終更新',
            noProjects: '保存されたプロジェクトはありません',
            confirmDelete: 'このプロジェクトを削除しますか？'
        },
        fileExplorer: {
            title: 'ファイルエクスプローラー',
            storageUsed: '使用ストレージ',
            newFolder: '新規フォルダ',
            projects: 'プロジェクト',
            datasets: 'データセット (JSON/Zip)',
            manuals: 'マニュアル',
            swcs: 'SWCS',
            yamazumi: '山積み',
            vsm: 'バリューストリームマップ',
            bestWorst: '最高・最低サイクル',
            rearrangement: '要素の並べ替え',
            waste: 'ムダ排除',
            models: 'モデル',
            api: 'API',
            root: 'ルート',
            search: 'ファイルとフォルダを検索...',
            empty: 'アイテムが見つかりません',
            deleteConfirm: '本当に削除しますか？',
            recent: '最近',
            favorites: 'お気に入り',
            mainWorkspace: 'メインワークスペース',
            tmStudio: 'TMスタジオ',
            elements: '要素',
            rearrangeAction: '再配置',
            eliminateAction: '排除',
            analyzeAction: '分析',
            openAction: '開く',
            downloadAction: 'ダウンロード',
            active: 'アクティブ',
            folder: 'フォルダ',
            loading: '読み込み中...',
            measurements: '測定',
            designAction: '設計',
            globalMap: 'グローバルマップ',
            noVideoShort: 'ビデオなし',
            action: 'アクション',
            edit: '編集',
            deleteFailed: '削除に失敗しました',
            createFolderFailed: 'フォルダ作成に失敗しました',
            open: '開く',
            used: '使用量',
            total: '合計'
        },
        settings: {
            title: 'グローバル設定',
            language: '言語',
            theme: 'テーマ',
            ai: 'AI構成',
            provider: 'AIプロバイダー',
            ollama: 'ローカルAI (Ollama)',
            apiKey: 'APIキー',
            model: 'モデル',
            testConnection: '接続テスト',
            save: '変更を保存',
            cancel: 'キャンセル',
            openRouterHeaders: 'OpenRouterヘッダー (自動)',
            testSuccess: '接続成功！',
            testFailed: '失敗'
        },
        rearrangement: {
            title: '要素入れ替え',
            subtitle: '最適化ツールボックス',
            projects: 'プロジェクト',
            saveOrder: '順序を保存',
            autoArrange: '自動整列',
            shortest: '最短',
            longest: '最長',
            jointSelection: '結合選択',
            mergeHud: '#{0} と #{1} を結合中',
            simulationPreview: 'シミュレーションプレビュー',
            hudOn: '表示オン',
            hudOff: '表示オフ',
            liveSimulation: 'ライブシミュレーション',
            startPreview: 'プレビュー開始',
            stopSimulation: 'シミュレーション停止',
            selectProject: 'プロジェクト選択',
            selectProjectSub: '計測データのあるプロジェクトを選択してください',
            noReadyVideo: 'ビデオが準備できていません',
            loadInstruction: 'メニューからプロジェクトを選択してシミュレーションビデオを読み込んでください',
            noProjects: '計測データのあるプロジェクトが見つかりません'
        },
        analysisDashboard: {
            title: '分析サマリー',
            emptyState: '表示するデータがありません。測定を追加するか、Safety/QCタブを使用してください。',
            openSafety: '🛡️ Safety AIを開く',
            openQC: 'Visual QC (TM)',
            openVideoIntel: '📹 Gemini Video Intelligence',
            kaizenReport: 'ワンクリック改善レポート',
            totalTime: '合計時間',
            totalElements: '総要素数',
            avgRating: '平均評価',
            valueAddedPct: '付加価値率 %',
            oee: '設備総合効率 (OEE)',
            efficiency: '効率',
            taktVsCycle: 'タクト vs サイクル',
            productivityIndex: '生産性指数',
            categoryDist: 'カテゴリー分布',
            topElements: 'トップ10要素 (時間)',
            categoryBreakdown: 'カテゴリー別詳細',
            elementsCount: '要素',
            swcs: '標準作業組合せ票'
        },
        senseiKnowledge: {
            intro: 'MAVi (Motion Analysis Video Intelligence) は、産業工学向けビデオ分析アプリケーションです。',
            featuresHeader: '主な機能:',
            navHeader: 'ナビゲーションメニュー:',
            navItems: [
                '- / (Video Workspace): 動画アップロードと分析、要素エディタ',
                '- /ai-process: AIプロセススタジオ - サイクル検出、行動認識、ビデオインテリジェンス',
                '- /realtime-compliance: AIによるリアルタイムSOPコンプライアンス監視',
                '- /studio-model: スタジオモデル - 動作検出用のカスタムAIモデル作成',
                '- /teachable-machine: ティーチャブルマシンスタジオ - Google Teachable Machine統合',
                '- /value-stream-map: TPS向けバリューストリームマッピング',
                '- /yamazumi: ラインバランシング用山積み表',
                '- /swcs: 標準作業組合せ票',
                '- /waste-elimination: 7つのムダ特定',
                '- /therblig: 18種類のサーブリッグ動作分析',
                '- /statistical-analysis: サイクルタイム統計分析',
                '- /best-worst: 最良・最悪サイクルの比較',
                '- /comparison: 並列ビデオ比較',
                '- /rearrangement: 要素の並べ替え',
                '- /manual-creation: SOPと作業手順書の作成',
                '- /knowledge-base: ベストプラクティスリポジトリ',
                '- /multi-camera: マルチカメラ3Dフュージョン',
                '- /vr-training: VRトレーニングモード',
                '- /broadcast: ライブ放送＆コラボレーション',
                '- /action-recognition: AI行動認識',
                '- /files: ファイルエクスプローラー',
                '- /diagnostics: システム診断',
                '- /help: ヘルプ＆ドキュメント'
            ],
            tipsHeader: '使用上のヒント:',
            tips: [
                '1. 初心者の方へ：ビデオワークスペースから始めて、動画をアップロードし、要素エディタを使用してください',
                '2. キーボードショートカット（S/E）を使用して測定を容易にします',
                '3. AIプロセススタジオは、すべてのAI機能のコントロールセンターです',
                '4. 標準作業文書化のためにデータをSWCSにエクスポートします',
                '5. マニュアル作成とAI生成を使用して作業手順書を作成します',
                '6. 設定でGemini APIキーを設定してAI機能を有効にします',
                '7. スタジオモデルを使用してカスタム動作検出器を作成します',
                '8. 高度な分析のためにデータをExcelにエクスポートします',
                '9. 人間工学的な姿勢評価のためのREBA評価',
                '10. 再生/一時停止にはスペースキー、測定開始にはSキーを使用します'
            ]
        },
        maviClassData: {
            glossary: {
                therblig: { term: 'サーブリッグ', def: '動作研究における基本動作単位（18種類）。' },
                cycleTime: { term: 'サイクルタイム', def: '1サイクルの作業を完了するのに要する時間。' },
                taktTime: { term: 'タクトタイム', def: '顧客の需要を満たすために製品を1つ生産するのに使用可能な時間。' },
                reba: { term: 'REBA', def: '全身の作業姿勢リスクを評価する人間工学手法。' },
                rula: { term: 'RULA', def: '上肢障害のリスクを評価する人間工学手法。' },
                vsm: { term: 'VSM', def: 'モノと情報の流れを図式化するツール。' },
                yamazumi: { term: '山積み表', def: '作業負荷の分布を示す積み上げ棒グラフ。' },
                swcs: { term: '標準作業組合せ票', def: '人の手作業、機械加工、歩行時間の組み合わせを示す標準文書。' },
                muda: { term: 'ムダ', def: 'リーン生産方式における7つのムダ。' },
                vaNva: { term: 'VA/NVA', def: '付加価値に基づく活動の分類。' },
                mediaPipe: { term: 'MediaPipe', def: 'リアルタイム姿勢検出のためのMLフレームワーク。' },
                dtw: { term: 'DTW', def: '2つの時系列データの類似度を測定するアルゴリズム。' },
                fsm: { term: 'FSM', def: '有限の状態と遷移を持つ計算モデル。' },
                lineBalancing: { term: 'ラインバランシング', def: '生産ライン全体に作業負荷を均等に配分すること。' },
                bottleneck: { term: 'ボトルネック', def: 'スループットを制限する最も長いサイクルタイムを持つ工程。' },
                standardTime: { term: '標準時間', def: '熟練作業者が通常のペースでタスクを完了する時間。' },
                allowance: { term: '余裕時間', def: '個人的なニーズや遅延のための追加要素。' },
                normalTime: { term: '正味時間', def: 'レイティング係数で調整された観測時間。' },
                ratingFactor: { term: 'レイティング係数', def: '作業者の速度と標準速度の比較。' },
                workSampling: { term: 'ワークサンプリング', def: 'ランダムな観測を使用して作業を測定する手法。' }
            },
            badges: {
                firstLesson: { name: '第一歩', desc: '最初のレッスンを完了' },
                quickLearner: { name: 'クイックラーナー', desc: '1つのモジュールを完了' },
                dedicated: { name: '熱心な学生', desc: '3つのモジュールを完了' },
                knowledgeSeeker: { name: '探求者', desc: '6つのモジュールを完了' },
                master: { name: 'MAViマスター', desc: '全モジュールを完了' },
                quizTaker: { name: 'クイズ挑戦者', desc: '最初のクイズを完了' },
                perfectScore: { name: '満点', desc: 'クイズで100%を獲得' },
                quizChamp: { name: 'クイズチャンピオン', desc: '全クイズに合格' },
                consistent: { name: '継続は力なり', desc: '3日連続で学習' },
                weekWarrior: { name: '週間戦士', desc: '7日連続で学習' },
                noteTaker: { name: 'メモ魔', desc: '5つのメモを作成' },
                explorer: { name: '冒険家', desc: '全タブにアクセス' }
            },
            syllabus: {
                title: 'MAViクラス - 産業工学ビデオ分析',
                desc: 'MAViを使用したIEビデオ分析を習得するための包括的なカリキュラム。',
                instructorName: 'MAVi Sensei (AI)',
                instructorRole: 'AIティーチングアシスタント',
                prereq1: '製造プロセスの基本的な理解',
                prereq2: 'コンピュータと最新ブラウザの操作',
                prereq3: 'プログラミング経験は不要',
                outcome1: 'ビデオを使用した時間動作研究の実施',
                outcome2: 'ムダの特定と排除',
                outcome3: 'ビデオからの作業手順書とSOPの作成',
                outcome5: '自動分析のためのAI活用',
                outcome6: 'リアルタイム・コンプライアンス監視の設定'
            },
            actions: {
                tryIt: 'この機能を試す',
                watchVideo: 'チュートリアル動画を見る',
                markComplete: '完了としてマーク',
                completed: '学習済み',
                keyPoints: 'キーポイント'
            },
            levels: {
                beginner: 'ビギナー',
                apprentice: '見習い',
                practitioner: '実践者',
                expert: 'エキスパート',
                master: 'マスター'
            },
            modules: {
                'getting-started': {
                    title: '🚀 はじめに',
                    description: 'MAViの基本機能と使い方を知る',
                    lessons: {
                        'gs-1': {
                            title: 'MAViとは？',
                            description: 'MAVi (Motion Analysis Video Intelligence) は、プロセス分析、時間計測、ムダ取りを支援する産業工学向けビデオ分析アプリです。',
                            keyPoints: [
                                'AIベースのビデオ分析による時間・動作研究',
                                'TPS (トヨタ生産方式) メソドロジーとの統合',
                                'SOPと作業手順書の自動作成をサポート',
                                'リアルタイムのコラボレーションとナレッジ共有'
                            ]
                        },
                        'gs-2': {
                            title: 'アプリのナビゲーション',
                            description: 'サイドバーメニュー、キーボードショートカット、レイアウトの使い方を学びます。',
                            keyPoints: [
                                '右側のサイドバーメニューで各機能へ素早くアクセス',
                                'アイコンをクリックして機能切り替え',
                                'ホバーで機能名ツールチップを表示',
                                '矢印ボタンでサイドバーの開閉'
                            ]
                        },
                        'gs-3': {
                            title: '最初のビデオアップロード',
                            description: '分析する作業プロセスのビデオをアップロードします。MP4, WebM, AVIに対応。',
                            keyPoints: [
                                'アップロードボタンをクリックまたはドラッグ＆ドロップ',
                                '対応フォーマット: MP4, WebM, AVI',
                                '左側のビデオパネルに映像を表示',
                                '再生コントロールでビデオを操作'
                            ]
                        },
                        'gs-4': {
                            title: '新規プロジェクト作成',
                            description: '分析データを保存するためのプロジェクトを作成し、整理します。',
                            keyPoints: [
                                'メニューから「新規プロジェクト」をクリック',
                                '分かりやすいプロジェクト名を入力',
                                '分析するビデオを選択',
                                'プロジェクトはローカルデータベースに自動保存'
                            ]
                        }
                    },
                    practice: {
                        title: 'ミッション 1: グラウンドゼロ 🚀',
                        description: '最初のプロジェクトのセットアップから始めましょう。プロジェクトなしでは分析を保存できません！',
                        tasks: [
                            'デモビデオをアップロード (何でも可)',
                            '「練習 MAVi 1」という名前で新規プロジェクトを作成',
                            'サイドバーメニューを開いて最低3つの機能を探索'
                        ],
                        actionLabel: '今すぐ練習を開始'
                    }
                },
                'time-measurement': {
                    title: '⏱️ 時間研究 & 動作分析',
                    description: '時間計測と要素分解を学ぶ',
                    lessons: {
                        'tm-1': {
                            title: '要素エディタの基本',
                            description: '時間計測とプロセス分解のための主要ツール「要素エディタ」の使い方。',
                            keyPoints: [
                                '「計測開始」をクリックしてタイマー始動',
                                '「計測終了」でストップ',
                                '具体的で明確な要素名を入力',
                                '適切なサーブリッグタイプを選択'
                            ]
                        },
                        'tm-2': {
                            title: 'キーボードショートカット',
                            description: '計測効率を上げるためのショートカット (Space, S, E, 矢印キー) を習得。',
                            keyPoints: [
                                'Space: ビデオの再生/一時停止',
                                '矢印キー(左右): フレーム送り/戻し',
                                'Sキー: 計測開始 (Start)',
                                'Eキー: 計測終了 (End)'
                            ]
                        },
                        'tm-4': {
                            title: '付加価値分析 (VA/NVA)',
                            description: '価値を生む作業 (VA) とムダ (NVA) を識別・分類します。',
                            keyPoints: [
                                'VA (付加価値): 形や機能を変える作業',
                                'NVA (非付加価値): 排除すべきムダ',
                                'NNVA (必要だが非付加価値): 必要だが価値は生まない',
                                '各要素に適切な分類をタグ付け'
                            ]
                        },
                        'tm-5': {
                            title: 'サイクルタイム分析',
                            description: 'サイクルタイムを計測し、ばらつきやボトルネックを特定します。',
                            keyPoints: [
                                '正確なデータのために複数サイクルを計測',
                                '作業者間のサイクルタイムを比較',
                                'ばらつきの原因を特定',
                                '最良/最悪サイクルを使って比較分析'
                            ]
                        },
                        'tm-6': {
                            title: '再配置 (Rearrangement)',
                            description: '作業手順を並べ替え、効率的な順序をシミュレーションします。',
                            keyPoints: [
                                '再配置ダッシュボードで新しい手順をシミュレーション',
                                '総リードタイムへの影響を確認',
                                'ラインバランスに最適な順序を特定',
                                '新しいSOPの参照として結果をエクスポート'
                            ]
                        }
                    },
                    practice: {
                        title: 'ミッション 2: タイムマスター ⏱️',
                        description: '作業速度を計測する時間です！要素エディタを使用して動作を分析しましょう。',
                        tasks: [
                            'ビデオ内の最低3つの作業要素を計測',
                            '各要素をVA (付加価値) またはNVA (ムダ) としてマーク',
                            'キーボードショートカット S と E を使用してみる'
                        ],
                        actionLabel: 'ビデオワークスペースを開く'
                    }
                },
                'ai-features': {
                    title: '🧠 AI機能',
                    description: '自動分析のためのAI活用',
                    lessons: {
                        'ai-1': {
                            title: 'スタジオモデル',
                            description: '動作検知のためのルールベースモデルを作成・設定します。',
                            keyPoints: [
                                '動作検知のためのルールベースモデルを定義',
                                '検証のための条件と閾値を設定',
                                'サンプルビデオでモデルをテスト',
                                'コンプライアンス監視用にモデルをエクスポート'
                            ]
                        },
                        'ai-2': {
                            title: '行動認識 (Action Recognition)',
                            description: 'AIが自動的にアクションや動きを認識・分類します。',
                            keyPoints: [
                                'ビデオをアップロードしてAI認識を実行',
                                'AIがアクションの種類を自動検知',
                                '検知結果のレビューと修正',
                                '詳細分析のために結果をエクスポート'
                            ]
                        },
                        'ai-3': {
                            title: 'リアルタイム・コンプライアンス',
                            description: 'ライブカメラ映像と比較し、標準作業手順 (SOP) の遵守状況を監視します。',
                            keyPoints: [
                                'ライブカメラまたはIPカメラを接続',
                                'AIが標準手順と比較監視',
                                '逸脱があれば自動アラート',
                                'レビュー用に全異常をログ記録'
                            ]
                        },
                        'ai-4': {
                            title: 'ビデオ・インテリジェンス',
                            description: 'Gemini AIと対話し、ビデオの内容について質問・分析を行います。',
                            keyPoints: [
                                'Gemini AIへビデオをアップロード',
                                '自然言語で質問を送信',
                                'AIによる分析と回答',
                                '深いインサイトの獲得に活用'
                            ]
                        },
                        'ai-5': {
                            title: 'AI精度とキャリブレーション',
                            description: 'AIの認識精度、信頼度閾値、ポーズ推定の仕組みを理解します。',
                            keyPoints: [
                                '信頼度閾値 (0.6) の理解',
                                'ヒューリスティック精度: リーチ(95%), 把握(85%)',
                                'ビデオ品質の重要性: 固定カメラと十分な照明',
                                '33の身体関節ポイント(ポーズ推定)の仕組み'
                            ]
                        },
                        'ai-6': {
                            title: 'エンドツーエンドAI実装',
                            description: 'ビデオ準備からモデルトレーニング、ライブ監視までの完全な実装ステップ。',
                            keyPoints: [
                                'Step 1: プロジェクト作成 & 基準ビデオのアップロード',
                                'Step 2: モデルトレーニング (Studio Model または Teachable Machine)',
                                'Step 3: モデルのロードとシステムへの組み込み',
                                'Step 4: カメラ接続とリアルタイム検知開始',
                                'Step 5: ダッシュボードでの自動モニタリング'
                            ]
                        },
                        'ai-7': {
                            title: 'スタジオモデル・マスタークラス',
                            description: '状態遷移やロジックビルダーを使用した高度なカスタムモデル作成ガイド。',
                            keyPoints: [
                                '1. 状態管理: サイクルの各ステップ(State)の定義',
                                '2. 遷移設計: State間の移行フローの決定',
                                '3. ロジックビルダー: ノーコードでのIF-THENルール作成',
                                '4. ルールタイプ: 関節角度、位置座標、速度',
                                '5. Teachable連携: TMのクラスをルールに統合',
                                '6. テスト & デバッグ: 基準ビデオでの検証'
                            ]
                        }
                    },
                    practice: {
                        title: 'ミッション 3: AIコマンダー 🧠',
                        description: 'AIに仕事を任せましょう。自動検知を試してみます。',
                        tasks: [
                            'Gemini AIに質問: "このビデオに見られるムダは何ですか？"',
                            'カスタムモデルをAction Recognitionダッシュボードにアップロード',
                            'Studio Modelで最低3つのステートと3つのルールを持つモデルを1つ作成',
                            'ライブカメラを接続し、リアルタイムコンプライアンス監視を有効化'
                        ],
                        actionLabel: 'スタジオモデルを開く'
                    }
                },
                'tps-tools': {
                    title: '📊 TPSツール',
                    description: 'トヨタ生産方式の改善ツール',
                    lessons: {
                        'tps-1': {
                            title: 'バリューストリームマップ (VSM)',
                            description: 'モノと情報の流れを可視化し、全体最適化を図ります。',
                            keyPoints: [
                                'まずは現状マップ (Current State) を作成',
                                '各プロセスのムダを特定',
                                'リードタイムとサイクルタイムを計算',
                                'より効率的な将来マップ (Future State) を設計'
                            ]
                        },
                        'tps-2': {
                            title: '山積み表 (Yamazumi)',
                            description: '作業負荷を積み上げグラフで可視化し、ラインバランスを改善します。',
                            keyPoints: [
                                '計測データからのインポート',
                                '作業者/ステーションごとの積み上げグラフ表示',
                                'タクトタイムとの比較',
                                'ボトルネックとアイドル時間の特定'
                            ]
                        },
                        'tps-3': {
                            title: '標準作業組合せ票 (SWCS)',
                            description: '人と機械の作業時間の組み合わせを標準化・文書化します。',
                            keyPoints: [
                                '人手作業と機械稼働のタイムライン作成',
                                '歩行時間の可視化',
                                '基準としてのタクトタイム設定',
                                'SOP文書としてエクスポート'
                            ]
                        },
                        'tps-4': {
                            title: 'ムダ取り (Waste Elimination)',
                            description: '7つのムダ (動作、運搬、在庫など) を特定し排除します。',
                            keyPoints: [
                                '運搬のムダ (Transport)',
                                '在庫のムダ (Inventory)',
                                '動作のムダ (Motion)',
                                '手待ちのムダ (Waiting)',
                                '加工そのもののムダ (Over-processing)',
                                '作りすぎのムダ (Over-production)',
                                '不良をつくるムダ (Defects)'
                            ]
                        },
                        'tps-5': {
                            title: '統計分析',
                            description: '平均、標準偏差、管理図などを用いてデータを統計的に分析します。',
                            keyPoints: [
                                '平均、標準偏差、範囲の計算',
                                'プロセス監視のための管理図',
                                '工程能力分析',
                                '外れ値とその原因の特定'
                            ]
                        }
                    },
                    practice: {
                        title: 'ミッション 4: リーンアーキテクト 📊',
                        description: 'データを視覚化して全体像を把握しましょう。',
                        tasks: [
                            '計測データから山積み表 (Yamazumi Chart) を生成',
                            '最も忙しい作業者 (ボトルネック) を特定',
                            '標準作業組合せ票 (SWCS) のドラフトを1つ作成してみる'
                        ],
                        actionLabel: '山積み表を開く'
                    }
                },
                'documentation': {
                    title: '📘 ドキュメンテーション',
                    description: 'プロフェッショナルなSOPと作業手順書の作成',
                    lessons: {
                        'doc-1': {
                            title: 'マニュアル作成',
                            description: 'ビデオからフレームを切り出し、視覚的な作業手順書を作成します。',
                            keyPoints: [
                                'ビデオからフレームをキャプチャ',
                                '説明と注釈を追加',
                                'AIを使って説明文を生成',
                                'PDF, Word, PowerPointへエクスポート'
                            ]
                        },
                        'doc-2': {
                            title: 'AI生成インストラクション',
                            description: '画像認識AIを活用して、作業内容の記述を自動生成します。',
                            keyPoints: [
                                '説明したいフレームを選択',
                                'AIが画像を分析',
                                '作業手順の説明文を生成',
                                '必要に応じて編集・調整'
                            ]
                        },
                        'doc-3': {
                            title: 'ナレッジベース',
                            description: 'ベストプラクティスを共有・管理するためのデータベース。',
                            keyPoints: [
                                'マニュアルをナレッジベースへアップロード',
                                '検索用タグの追加',
                                '他のユーザーによる評価とレビュー',
                                '新規プロジェクト用テンプレートのダウンロード'
                            ]
                        }
                    },
                    practice: {
                        title: 'ミッション 5: SOPディレクター 📘',
                        description: 'ビデオを標準作業手順書に変えましょう。',
                        tasks: [
                            'ビデオから3つのキーフレームをキャプチャ',
                            'AI生成を使用してステップの説明を作成',
                            'SOPの結果をPDFまたはWordファイルとしてエクスポート'
                        ],
                        actionLabel: 'マニュアル作成を開く'
                    }
                },
                'advanced': {
                    title: '⚡ 高度な機能',
                    description: 'パワーユーザー向けの拡張機能',
                    lessons: {
                        'adv-2': {
                            title: 'VRトレーニングモード',
                            description: '没入型のVR/AR環境でのトレーニングと評価。',
                            keyPoints: [
                                'インタラクティブな3Dトレーニング環境',
                                '練習モード: リスクのない環境でのスキル習得',
                                '評価モード: パフォーマンスとエラーの計測',
                                '訓練生の進捗トラッキングとデータ化'
                            ]
                        },
                        'adv-3': {
                            title: 'ブロードキャスト & コラボレーション',
                            description: 'リアルタイムでの画面共有、チャット、リモート指導。',
                            keyPoints: [
                                '複数ビューワーへのビデオ同時配信',
                                'リアルタイムでのカーソル共有と指示',
                                'チャットツールによる即時フィードバック',
                                'リモートトレーニングと作業レビューの効率化'
                            ]
                        },
                        'adv-4': {
                            title: '多軸分析',
                            description: '複数のプロジェクトやサイクルを同時に比較・分析します。',
                            keyPoints: [
                                'ファイルエクスプローラーから複数プロジェクトを選択',
                                'サイクル間または作業者間のパフォーマンス比較',
                                '大規模スケールでのばらつき (Variation) 特定',
                                '複数プロセスの一括監査 (Audit)'
                            ]
                        }
                    },
                    practice: {
                        title: 'ミッション 7: フューチャーエンジニア ⚡',
                        description: 'MAViの最先端機能を実験しましょう。',
                        tasks: [
                            'モーションラボラトリー機能を試す',
                            'ビデオワークスペースを開き、視聴者とコラボレーションを試す',
                            'デバイスがあればVRトレーニングモードを探索'
                        ],
                        actionLabel: 'ビデオワークスペースを開く'
                    }
                },
                'study-cases': {
                    title: '📂 ケーススタディ',
                    description: '様々な業界でのMAVi導入事例',
                    lessons: {
                        'sc-1': {
                            title: '自動車: ラインバランシング',
                            description: 'エンジン組立ラインでのボトルネック解消と生産性向上の事例。',
                            keyPoints: [
                                '山積み表を使用したボトルネックの特定',
                                '作業要素の再配分によるバランス改善',
                                'スループット (生産量) の15%向上',
                                '重要ステーションでの手待ち時間の排除'
                            ]
                        },
                        'sc-2': {
                            title: '繊維: ムダ取り',
                            description: '縫製工程における動作のムダ排除とサイクルタイム短縮の事例。',
                            keyPoints: [
                                'サーブリッグ分析による手の動きの最適化',
                                '材料配置 (レイアウト) の改善',
                                'サイクルタイムの20%削減',
                                '作業者の疲労軽減とエルゴノミクス改善'
                            ]
                        },
                        'sc-3': {
                            title: '物流: VSM最適化',
                            description: '配送センターにおけるリードタイム短縮と情報フロー改善の事例。',
                            keyPoints: [
                                '現状 (Current State) のバリューストリームマップ作成',
                                '情報の断絶と滞留の特定',
                                'リードタイムを2日から4時間に短縮',
                                '補充のためのカンバンシステムの導入'
                            ]
                        },
                        'sc-4': {
                            title: '電子機器: AIコンプライアンス',
                            description: '精密部品実装におけるAI監視による品質向上と不良率低減の事例。',
                            keyPoints: [
                                'ビデオインテリジェンスによる標準動作の設定',
                                'リアルタイムでの異常検知とアラート',
                                '欠陥率 (手直し) の90%削減',
                                '生産を止めない自動監査の実現'
                            ]
                        }
                    },
                    practice: {
                        title: 'ミッション 8: ケースソルバー 📂',
                        description: '学んだ知識を実世界のケースに適用しましょう。',
                        tasks: [
                            '上記のケーススタディを1つ選択',
                            'ビデオワークスペースで分析を再現してみる',
                            'そのケースに対する3つの改善案を書き出す'
                        ],
                        actionLabel: 'ワークスペースを開く'
                    }
                },
                'line-balancing': {
                    title: '⚖️ ラインバランシング & デジタルツイン',
                    description: 'シミュレーションによる生産ラインの最適化',
                    lessons: {
                        'lb-1': {
                            title: 'ラインバランシング基礎',
                            description: 'タクトタイム、サイクルタイム、編成効率の基本概念。',
                            keyPoints: [
                                'タクトタイム: 顧客需要に基づく生産ペース',
                                'サイクルタイム: 実際の作業時間',
                                'ボトルネック: 全体の流れを制約する工程',
                                '編成効率: ライン全体のバランス指標'
                            ]
                        },
                        'lb-2': {
                            title: 'デジタルツイン・シミュレーション',
                            description: '仮想空間でのライン変更シミュレーションと影響分析。',
                            keyPoints: [
                                '作業者の変動 (バラツキ) を考慮した確率的モデル',
                                'モンテカルロ法による1000回以上の反復シミュレーション',
                                '信頼性 (%) による故障リスクの予測',
                                '事前のリスク評価によるダウンタイム削減'
                            ]
                        },
                        'dt-1': {
                            title: 'レイアウト最適化',
                            description: '作業ステーションの配置と物流動線の最適化。',
                            keyPoints: [
                                'ボードビューからデジタルツインビューへの切り替え',
                                'ステーション状態の監視 (Busy, Blocked, Starved)',
                                '仕掛品 (WIP) の滞留を視覚的に確認',
                                '時間加速シミュレーションで長期的な影響を分析'
                            ]
                        }
                    },
                    practice: {
                        title: 'ミッション 10: デジタルファクトリー 🏭',
                        description: 'デジタルツイン・シミュレーションで停止した工場を救いましょう。',
                        tasks: [
                            'ラインバランシングを開き、確率モード (Stochastic Mode) をオン',
                            '重要なステーションに標準偏差 (±) を設定',
                            '「デジタルツイン」を実行し、頻繁に「Blocked」になるステーションを特定',
                            '流れがスムーズになるまでタスクを移動 (赤色をなくす)'
                        ],
                        actionLabel: 'デジタルツインを開く'
                    }
                },
                'studio-model': {
                    title: '🎬 スタジオモデル & コンプライアンス',
                    description: 'カスタムAIモデルの作成とリアルタイム監視',
                    lessons: {
                        'sm-1': {
                            title: 'スタジオモデル入門',
                            description: 'コーディングなしで特定の動作や状態を検出するカスタムAIモデルを作成します。',
                            keyPoints: [
                                '独自の参照ビデオに基づいたモデル作成',
                                '検出したい状態 (State) の定義',
                                '状態遷移のためのルール (Rule) 設定',
                                'リアルタイムコンプライアンス監視への応用'
                            ]
                        },
                        'sm-2': {
                            title: '新しいモデルの作成',
                            description: '最初のスタジオモデルを作成するためのステップバイステップガイド。',
                            keyPoints: [
                                '「新規モデル作成」をクリック',
                                '分かりやすいモデル名を設定 (例: 組立工程)',
                                '座標系の選択: Body-Centric または Screen-Based',
                                'ドキュメント用の説明を追加'
                            ]
                        },
                        'sm-3': {
                            title: '状態 (State) の定義',
                            description: '検出したい各条件（例：「アイドル」、「作業中」）の状態を作成します。',
                            keyPoints: [
                                'State = 特定の条件/ポーズ (例: 待機中, 到達動作)',
                                'ビデオから各Stateの参照ポーズをキャプチャ',
                                '必要に応じて関心領域 (ROI) を定義',
                                '検出安定性のための最小持続時間を設定'
                            ]
                        },
                        'sm-4': {
                            title: 'ルール設定',
                            description: 'ルールビルダーを使用して状態間の遷移ルールを設定します（関節角度、位置など）。',
                            keyPoints: [
                                '関節角度: 身体の曲がり具合 (例: 肘 < 90°)',
                                'ポーズ関係: 相対的な位置 (例: 手が鼻より上)',
                                'ポーズ速度: 動きの速さ (例: 急な動作検知)',
                                'オブジェクト近接: AIオブジェクトとの距離',
                                'ゴールデンポーズ: 理想的なポーズとの一致度',
                                '論理演算子: AND/ORを使った複数ルールの組み合わせ'
                            ]
                        },
                        'sm-5': {
                            title: 'Teachable Machine スタジオ',
                            description: 'TM Studioを使用してビデオデータセットを作成し、カスタムモデルをトレーニングします。',
                            keyPoints: [
                                'ビデオスライサーでトレーニング用クリップを抽出',
                                '動きを意味のある状態(State)に分類',
                                '学習済み条件を使って検出ルールをトレーニング',
                                'グローバルモデルURLを使ってステーション間で同期',
                                'プロセス変更時はいつでもモデル更新可能'
                            ]
                        },
                        'sm-6': {
                            title: 'テストモードと検証',
                            description: '展開する前にビデオでモデルをテストし、精度を確認します。',
                            keyPoints: [
                                'テストビデオをアップロードして検証',
                                'タイムラインイベントでの遷移確認',
                                '状態遷移が正しく行われているかチェック',
                                '誤検知がある場合はルールを微調整'
                            ]
                        },
                        'sm-7': {
                            title: 'リアルタイム監視セットアップ',
                            description: '作成したモデルを展開して、リアルタイムのコンプライアンス監視を行います。',
                            keyPoints: [
                                'リアルタイムコンプライアンスダッシュボードを開く',
                                '「カメラ追加」で新しいステーションを設定',
                                '作成したStudio Modelを選択',
                                'ウェブカメラまたはIPカメラを選択して監視開始'
                            ]
                        },
                        'sm-8': {
                            title: 'タイムラインイベント分析',
                            description: 'パフォーマンス監視のためにタイムラインイベントを分析します。',
                            keyPoints: [
                                '状態遷移の履歴を表示するパネル',
                                '各状態の発生時刻と持続時間を確認',
                                '緑色=速い(<5秒), 赤色=遅い(>5秒)などの色分け',
                                '長時間滞留している状態からボトルネックを特定',
                                '詳細分析のためのデータエクスポート'
                            ]
                        }
                    },
                    practice: {
                        title: 'ミッション 9: モデルマスター 🎬',
                        description: 'あなただけのAIをトレーニングしましょう！',
                        tasks: [
                            '新しいスタジオモデルを1つ作成',
                            '最低2つのステート (例: 作業 vs 休憩) を定義',
                            'テストモードでビデオを使ってモデルをテスト'
                        ],
                        actionLabel: 'スタジオモデルを開く'
                    }
                },
                'ai-settings': {
                    title: '⚙️ AI設定 & 構成',
                    description: '最適な結果を得るための完全なセットアップガイド',
                    lessons: {
                        'ais-1': {
                            title: 'Gemini APIキーの取得',
                            description: 'Google AI StudioからAPIキーを取得してAI機能を有効にする手順。',
                            keyPoints: [
                                'aistudio.google.com にアクセス',
                                'Googleアカウントでログイン',
                                '「Get API Key」からキーを作成',
                                'キーをコピーしてMAVi設定に貼り付け',
                                '標準利用は無料 (60リクエスト/分)'
                            ]
                        },
                        'ais-2': {
                            title: 'MAViでのAPIキー設定',
                            description: 'アプリケーションにAPIキーを入力して保存する方法。',
                            keyPoints: [
                                '設定 → AI構成を開く',
                                'APIキーを所定のフィールドに貼り付け',
                                '「接続テスト」で有効性を確認',
                                '緑色のステータスで接続成功',
                                'キーはブラウザに安全に保存されます'
                            ]
                        },
                        'ais-3': {
                            title: 'ポーズ検出設定',
                            description: '最適な精度のためのMediaPipeポーズ検出の設定（信頼度、複雑度）。',
                            keyPoints: [
                                'モデル複雑度: Lite(高速) vs Full(高精度)',
                                '検出信頼度: ポーズ検出の閾値 (0.5-0.9)',
                                '追跡信頼度: トラッキングの滑らかさ (0.5-0.9)',
                                '信頼度が高いほど正確だが処理は重くなる',
                                '推奨: 0.7 (速度と精度のバランス)'
                            ]
                        },
                        'ais-4': {
                            title: 'Teachable Machineモデルのセットアップ',
                            description: 'カスタムモデルを使用するためのGoogle Teachable Machineの完全なチュートリアル。',
                            keyPoints: [
                                'Studio Modelのスライサーでサンプル収集',
                                '動きを意味のある状態(State)に分類',
                                '学習済み条件を使って検出ルールをトレーニング',
                                'グローバルモデルURLを使ってステーション間で同期',
                                'プロセス変更時はいつでもモデル更新可能'
                            ]
                        },
                        'ais-5': {
                            title: 'AIエラートラブルシューティング',
                            description: 'AI機能に関する一般的なエラー（401, 429など）の解決方法。',
                            keyPoints: [
                                'エラー 401: 無効なAPIキー → キーを再生成',
                                'エラー 429: レート制限 → 1分待つかプラン変更',
                                'ポーズ未検出: 照明を明るくする',
                                'モデルが遅い: モデル複雑度を下げる',
                                'システム診断で全体ステータスを確認'
                            ]
                        }
                    },
                    practice: {
                        title: 'ミッション 10: SysAdmin AI ⚙️',
                        description: 'AIマシンがスムーズに動作することを確認しましょう。',
                        tasks: [
                            '設定でAPIキーのステータスを確認',
                            'ポーズ検知の信頼度 (Confidence) を0.8に変更してみる',
                            'システム診断を実行'
                        ],
                        actionLabel: '設定を開く'
                    }
                },
                'ui-tutorial': {
                    title: '🖥️ ユーザーインターフェース詳細',
                    description: 'インターフェースとカスタマイズの完全ガイド',
                    lessons: {
                        'ui-1': {
                            title: 'レイアウト概要',
                            description: 'ビデオパネル、要素パネル、タイムラインなど、アプリの全体的なレイアウトを理解します。',
                            keyPoints: [
                                'ビデオパネル(左): 再生と分析エリア',
                                '要素パネル(右): 要素リストと測定値',
                                'タイムライン(下): ビデオナビゲーションとマーカー',
                                'サイドバー(最右): 機能ナビゲーション',
                                'dividerをドラッグしてパネルサイズ調整可能'
                            ]
                        },
                        'ui-2': {
                            title: 'キーボードショートカット',
                            description: '生産性を最大化するための必須ショートカット（Space, S, Eなど）。',
                            keyPoints: [
                                'Space: 再生/一時停止',
                                '矢印キー左右: フレーム送り',
                                'S: 計測開始',
                                'E: 計測終了',
                                'Ctrl+S: プロジェクト保存',
                                'F: フルスクリーン切り替え'
                            ]
                        },
                        'ui-3': {
                            title: 'テーマ & 表示設定',
                            description: 'ダークモード、言語設定、フォントサイズなど、好みに合わせてカスタマイズします。',
                            keyPoints: [
                                'ダークモード: デフォルト、目に優しい',
                                '言語: インドネシア語、英語、日本語',
                                'フォントサイズ: 読みやすさを調整',
                                'スケルトンオーバーレイ: ポーズ表示の切り替え',
                                '設定は自動保存されます'
                            ]
                        },
                        'ui-4': {
                            title: 'パネルのカスタマイズ',
                            description: 'ワークフローに合わせてパネルのサイズや配置を調整します。',
                            keyPoints: [
                                '境界線をドラッグしてサイズ変更',
                                '矢印ボタンでサイドバーを最小化',
                                '要素パネルの開閉',
                                'タイムラインの高さ調整',
                                'レイアウト設定の保持'
                            ]
                        },
                        'ui-5': {
                            title: 'ビデオコントロール',
                            description: '再生速度、コマ送り、ズームなど、精密な分析のためのビデオ操作。',
                            keyPoints: [
                                '速度制御: 0.25倍から2倍速',
                                'フレームカウンター: 現在のフレーム位置表示',
                                'ズーム制御: 特定エリアの拡大',
                                'ループ区間: 特定範囲の繰り返し再生',
                                'シークバー: 任意の位置へジャンプ'
                            ]
                        }
                    },
                    practice: {
                        title: 'ミッション 11: UIプロ 🖥️',
                        description: 'アプリナビゲーションの達人になりましょう。',
                        tasks: [
                            '計測時にショートカット Space と S を使用',
                            'アプリの言語を英語または日本語に変更してみる',
                            'ビデオパネルと要素パネルのサイズを変更'
                        ],
                        actionLabel: 'ワークスペースを開く'
                    }
                },
                'export-integration': {
                    title: '📤 データエクスポート & 統合',
                    description: '分析結果のエクスポートと他システムとの統合',
                    lessons: {
                        'exp-1': {
                            title: 'Excelへのエクスポート',
                            description: '詳細な分析のために測定データをExcel (.xlsx) またはCSV形式でエクスポートします。',
                            keyPoints: [
                                '要素パネルの「エクスポート」をクリック',
                                '形式選択: Excel (.xlsx) または CSV',
                                'データ内容: 要素名、時間、タイプ、タイムスタンプ',
                                '追加列: サーブリッグ分類、VA/NVA',
                                'ダウンロードフォルダに自動保存'
                            ]
                        },
                        'exp-2': {
                            title: '作業手順書のエクスポート',
                            description: '作成したマニュアルやSOPをPDF、Word、PowerPoint形式でエクスポートします。',
                            keyPoints: [
                                'PDF: 配布用の標準フォーマット',
                                'Word (.docx): 編集可能なドキュメント',
                                'PowerPoint: トレーニングプレゼン用',
                                '画像、手順、メモを含めることが可能',
                                '会社ロゴ付きのカスタムヘッダー'
                            ]
                        },
                        'exp-4': {
                            title: 'プロジェクトのバックアップと復元',
                            description: 'データの安全性のためにプロジェクトをJSONファイルとしてバックアップ・復元します。',
                            keyPoints: [
                                'プロジェクトのエクスポート: JSONファイルとして保存',
                                '全要素、測定値、設定を含む',
                                'プロジェクトのインポート: バックアップから復元',
                                'PC間のデータ移行に利用',
                                '定期的なバックアップを推奨'
                            ]
                        }
                    },
                    practice: {
                        title: 'ミッション 12: データサイエンティスト 📤',
                        description: 'MAViのデータを次のレベルへ。',
                        tasks: [
                            '計測結果をExcelファイルにエクスポート',
                            'プロジェクトをJSONファイルとしてエクスポート (バックアップ)',
                            'エクスポートしたExcelファイルをPCで開いてみる'
                        ],
                        actionLabel: 'ファイルエクスプローラーを開く'
                    }
                },
                'pose-ergonomics': {
                    title: '🔍 ポーズ検出 & エルゴノミクス',
                    description: '身体ポーズ分析と人間工学評価',
                    lessons: {
                        'pe-1': {
                            title: 'ポーズ検出の仕組み',
                            description: 'MAViの背後にあるMediaPipeポーズ検出技術（33の身体ランドマーク）について。',
                            keyPoints: [
                                'MediaPipeによる33の身体ランドマーク検出',
                                'ランドマーク: 顔、肩、肘、手、腰、膝、足',
                                '各点のx, y, z座標を取得',
                                '可視性スコアによる検出信頼度',
                                'ブラウザ上(WebGL)でリアルタイム処理'
                            ]
                        },
                        'pe-2': {
                            title: '関節角度分析',
                            description: '姿勢分析のために肘、膝、肩などの関節角度を測定します。',
                            keyPoints: [
                                '肘角度: 腕の曲げ具合',
                                '膝角度: しゃがみ/立ち姿勢の分析',
                                '肩角度: 腕の挙上検知',
                                '背中角度: 前屈姿勢の評価',
                                '角度データはStudio Modelのルールに使用'
                            ]
                        },
                        'pe-3': {
                            title: 'REBA評価',
                            description: 'REBA (Rapid Entire Body Assessment) を使用してエルゴノミクスリスクを評価します。',
                            keyPoints: [
                                'REBAによる全身姿勢等のリスク評価',
                                'スコア1-3: 低リスク (許容範囲)',
                                'スコア4-7: 中リスク (要調査)',
                                'スコア8-10: 高リスク (早期対応必要)',
                                'スコア11+: 超高リスク (即時改善必要)'
                            ]
                        },
                        'pe-4': {
                            title: '疲労分析',
                            description: '動作パターンの変化から作業者の疲労を検出し予測します。',
                            keyPoints: [
                                'サイクルタイムのばらつきを疲労指標として分析',
                                '時間の経過に伴う動作の遅れを検知',
                                '疲労パターンが検出された場合にアラート',
                                '最適な休憩時間の推奨',
                                'コンプライアンス監視との統合'
                            ]
                        },
                        'pe-5': {
                            title: '人間工学的改善',
                            description: '分析データを使用してワークステーションの改善とリスク低減を行います。',
                            keyPoints: [
                                '高リスクな姿勢の特定',
                                '改善前後の比較分析',
                                'ワークステーション変更の文書化',
                                '改善スコアの推移トラッキング',
                                '管理者向けレポートの生成'
                            ]
                        }
                    },
                    practice: {
                        title: 'ミッション 6: エルゴガーディアン 🔍',
                        description: '姿勢分析で作業の安全性を確保しましょう。',
                        tasks: [
                            'ビデオプレーヤーでスケルトンビューを有効化',
                            '肘または背中の角度グラフを確認',
                            'REBAスコアが高い (>7) 瞬間を特定'
                        ],
                        actionLabel: 'ビデオワークスペースを開く'
                    }
                }
            }
        },
        machineLearning: {
            title: 'ティーチャブルマシン・スタジオ',
            subtitle: '動作と異常検出のためのGoogle Teachable Machine統合',
            videoSlicer: 'ビデオ・スライサー & データセット・ビルダー',
            videoSlicerDesc: 'AIデータセットトレーニング（Teachable Machine / CVAT.ai）用に選択したビデオセグメントを抽出します',
            captureClip: 'データセット用クリップをキャプチャ',
            datasetGallery: 'データセット・ギャラリー',
            extractToZip: '画像をZIPで抽出',
            extracting: '抽出中...',
            deleteClip: 'クリップを削除',
            previewStart: 'プレビュー開始',
            previewEnd: 'プレビュー終了',
            previewSlice: 'スライスのプレビュー',
            noClips: 'まだキャプチャされたクリップはありません',
            galleryDescription: '動画からクリップをキャプチャして、独自のデータセットを作成します。',
            downloadClip: 'ビデオクリップをダウンロード',
            originalVideoRequired: '抽出には元のビデオファイルが必要です。再アップロードするか、ビデオがファイルとして読み込まれていることを確認してください。',
            selectSegment: 'セグメント選択（秒）',
            useTeachableMachine: 'Teachable Machineを使用',
            startAnalysis: '分析開始',
            stopAnalysis: '分析停止',
            consistencyTrend: 'コンシステンシー・トレンド'
        },
        bestWorst: {
            title: '最高・最低サイクル分析',
            selectProject: 'プロジェクト選択 (最低2つ)',
            noProjects: '保存されたプロジェクトはありません。',
            selectMin2: '分析を表示するには、少なくとも2つのプロジェクトを選択してください。',
            loading: '分析を読み込み中...',
            bestCycle: '最高サイクル',
            worstCycle: '最低サイクル',
            potentialSavings: '潜在的な節約',
            improvement: '改善',
            ranking: '全サイクルランキング',
            comparison: '要素ごとの比較',
            elementName: '要素名',
            category: 'カテゴリ',
            bestTime: '最高 (秒)',
            worstTime: '最低 (秒)',
            difference: '差 (秒)',
            diffPct: '差 (%)',
            videoSideBySide: 'ビデオサイドバイサイド比較',
            syncControls: '同期コントロール',
            aiAnalysis: 'AI分析',
            selectLeft: '左のプロジェクトを選択...',
            selectRight: '右のプロジェクトを選択...',
            best: 'ベスト',
            worst: 'ワースト'
        },
        vsm: {
            title: 'バリューストリームマップ',
            templates: {
                title: '製造テンプレートの読み込み',
                notFound: 'テンプレートが見つかりません！',
                loadSuccess: 'テンプレート「{{name}}」が正常に読み込まれました！',
                replace: '入れ替え (全消去)',
                merge: '統合 (追記)',
                simple: '簡易 (3ノード)',
                intermediate: '中級 (14ノード)',
                advanced: '上級 (20ノード)',
                integrated: '統合サプライチェーンシミュレーション',
                pull: 'プルシステムと情報の流れ (かんばん)',
                descSimple: 'サプライヤー → 塗装 → 顧客',
                descIntermediate: 'かんばん方式による自動車製造',
                descAdvanced: 'グローバルサプライチェーン - 海上輸送、4ヶ月のリードタイム、フルかんばんプル',
                descIntegrated: '完全なフロー：顧客 → 配送 → QC → 製造 → 原材料 → サプライヤー',
                descPull: 'かんばんループ：生産管理 → 平準化 → 工程 → スーパーマーケット',
                invalidNodes: '無効なファイル：ノードが見つかりません',
                invalidEdges: '無効なファイル：エッジが見つかりません',
                loadSuccessGeneric: '✅ VSMが正常に読み込まれました！',
                loadError: '❌ VSMの読み込みに失敗しました：',
                selectTitle: 'VSMテンプレートの選択',
                confirmTitle: '読み込みの確認',
                loadQuestion: 'テンプレート「{{name}}」を読み込もうとしています。どのように処理しますか？',
                replace: '入れ替え（置換）',
                replaceDesc: 'すべてをクリアして新しく読み込む',
                merge: '統合（マージ）',
                mergeDesc: '現在のキャンバスに追加する'
            },
            currentState: '現状マップ',
            futureState: '将来マップ',
            process: 'プロセス',
            inventory: '在庫',
            information: '情報',
            timeline: 'タイムライン',
            leadTime: 'リードタイム',
            processTime: '加工時間',
            valueAdded: '付加価値',
            nonValueAdded: '非付加価値',
            addProcess: 'プロセス追加',
            addInventory: '在庫追加',
            calculate: '計算',
            clear: 'クリア',
            newVsm: '新規VSM',
            confirmDeleteNode: '選択したシンボルを削除しますか?',
            confirmDeleteIcon: 'このアイコンを削除しますか?',
            confirmReset: 'キャンバスをクリアしますか? 未保存の変更は失われます。',
            edgeOptions: 'エッジオプション',
            arrowDirection: '矢印の方向',
            backToCanvas: 'VSMに戻る',
            help: {
                mainTitle: 'バリューストリームマッピング (MIFH)',
                addingSymbols: 'シンボルの追加',
                dragDrop: 'VSMツールボックス（右サイドバー）からシンボルをドラッグします',
                dropCanvas: 'キャンバスにドロップして追加します',
                editProps: 'シンボルをクリックしてプロパティを編集します',
                connectingHeading: 'プロセスの接続',
                connectDesc: 'あるノードの接続ポイントから別のノードへドラッグします',
                autoArrow: '自動的に矢印接続が作成されます',
                keyboardShortcuts: 'キーボードショートカット',
                saveLoadHeading: '保存/読み込み機能',
                saveDesc: 'VSMを.mavi-vsmファイルとしてダウンロードします',
                loadDesc: 'ファイルからVSMを読み込みます',
                mergeReplace: 'モード選択: 置換 (すべてクリア) または マージ (組み合わせ)',
                advancedHeading: '高度なTPS機能',
                yamazumiDesc: 'タクトタイムに対する仕事のバランスを可視化します。',
                epeiDesc: '生産の柔軟性を分析します。',
                timelineDesc: '下部の自動ラダーはリードタイム対VA時間を示します。',
                nodesTitle: 'ノードの機能とパラメータ',
                processNodeTitle: 'プロセスボックス',
                processNodeDesc: '価値が付加される主な生産ステップ。',
                paramCT: 'CT (サイクルタイム): 1ユニットを完了する時間 (秒)。',
                paramCO: 'CO (段取時間): 製品切り替えのセットアップ時間。',
                paramUptime: 'Uptime: 稼働率 %。',
                paramYield: 'Yield: 良品率 % (First Time Right)。',
                inventoryNodeTitle: '在庫 (三角形)',
                inventoryNodeDesc: 'プロセス間の材料の蓄積。',
                paramAmount: 'Amount: 物理的な数量 (pcs/kg)。',
                paramTime: 'Time: 在庫日数 = 在庫 / 1日の需要。',
                customerTitle: '顧客 / サプライヤー (工場)',
                paramDemand: 'Demand: 1日あたりの顧客注文。',
                paramTakt: 'Takt Time: 必要ペース = 稼働時間 / 需要。'
            },
            simulation: {
                start: 'シミュレーション開始',
                stop: '停止',
                reset: 'リセット',
                shortage: '欠品!',
                demandMet: '需要達成',
                delivering: '配送中...',
                title: 'フローシミュレーション'
            },
            toolbox: {
                title: 'VSMツールボックス',
                desc: 'キャンバスにドラッグ＆ドロップ',
                flowTitle: 'フロー接続',
                material: 'マテリアル',
                manualInfo: '手動情報',
                electronicInfo: '電子情報',
                processData: 'プロセスデータ',
                processBox: 'プロセスボックス',
                project: 'プロジェクトノード',
                operator: '作業者',
                kaizenBurst: '改善バースト',
                materialFlow: 'モノの流れ',
                supplier: 'サプライヤー',
                customer: '顧客',
                inventory: '在庫',
                supermarket: 'スーパーマーケット',
                fifo: 'FIFO',
                safetyStock: '安全在庫',
                truck: 'トラック',
                forklift: 'フォークリフト',
                trolley: '台車(台車)',
                sea: '船便',
                air: '航空便',
                rawMaterial: '原材料',
                finishedGoods: '完成品',
                push: 'プッシュ',
                informationFlow: '情報の流れ',
                productionControl: '生産管理',
                heijunka: '平準化',
                kanbanPost: 'かんばんポスト',
                productionKanban: '生産かんばん',
                withdrawalKanban: '引取かんばん',
                signalKanban: '信号かんばん',
                goSee: '現場観察',
                buffer: 'バッファ',
                timelineMetrics: 'タイムライン＆メトリクス',
                timeline: 'タイムライン',
                generalNotes: '一般 / メモ',
                stickyNote: '付箋 / テキスト',
                customIcons: 'マイアイコン',
                uploadIcon: 'アイコンをアップロード'
            },
            wizard: {
                title: 'マジックウィザード',
                customerTitle: '顧客構成',
                customerDesc: '顧客とその需要要件を定義します。',
                customerName: '顧客名',
                demandPerDay: '1日の需要 (pcs)',
                shifts: 'シフト数',
                hoursPerShift: '1シフトあたりの時間',
                packSize: '荷姿サイズ (ピッチ)',
                materialSource: '顧客への出荷元',
                production: '生産',
                fgWarehouse: '完成品倉庫',
                shippingMethod: '出荷方法',
                productionTitle: '生産工程',
                productionDesc: '上流（サプライヤー）から下流（顧客）の順に工程を入力してください。',
                addProcess: '新規工程追加',
                processName: '工程名',
                ct: 'サイクルタイム (秒)',
                pcsPerHour: '個/時',
                co: '段取時間',
                uptime: '稼働率 (%)',
                buffer: 'バッファ',
                flow: 'フロー',
                receivingTitle: '入荷倉庫',
                receivingDesc: '生産に入る前の材料入荷エリアを構成します。',
                useReceiving: '入荷倉庫を使用しますか？',
                receivingInfo: 'サプライヤーから届いた材料の初期バッファ在庫を追加します。',
                initialStock: '初期在庫量 (pcs)',
                internalTransport: '生産への内部搬送',
                directMaterialInfo: '材料はサプライヤーから最初の生産工程へ直接配送されます。',
                supplierTitle: 'サプライヤーと原材料',
                addSupplier: 'サプライヤー追加',
                useMaterialWh: '原材料倉庫を使用 (WH RM)',
                controlTitle: '管理と情報の流れ',
                commMethod: '通信方法',
                useHeijunka: '平準化ポストを使用しますか？',
                heijunkaDesc: 'リーンの将来の状態に合わせて生産量を均等に分散します。',
                readyToGenerate: '生成の準備ができました！',
                generateInfo: 'VSMは上流（サプライヤー）から下流（顧客）に向かって配置されます。',
                back: '戻る',
                next: '次へ',
                generate: 'VSMを生成',
                rawMatWh: '原材料倉庫',
                fgWh: '完成品倉庫',
                shipping: '出荷'
            },
            ai: {
                title: '説明からVSMを生成',
                subtitle: '工程を説明すると、AIが完全なバリューストリームマップを作成します',
                promptLabel: '工程の説明',
                promptPlaceholder: '例：サプライヤーから始まり、加工30秒、組立45秒、在庫100個、QC20秒、梱包25秒で顧客へ...',
                languageLabel: '出力言語',
                promptLangName: 'Japanese',
                modeLabel: 'モード',
                modeReplace: 'キャンバスを入れ替え',
                modeMerge: '既存のものに統合',
                examplesButton: '例を見る',
                hideExamplesButton: '例を隠す',
                generateButton: 'VSMを生成',
                cancelButton: 'キャンセル',
                charCount: '文字',
                tip: 'サイクルタイム、作業者、在庫、および情報の流れ（管理、かんばん、予測）を含めると、より完全なVSMになります。',
                loadConfirm: '{{nodes}}個のノードと{{edges}}個の接続が見つかりました。\n\nOK = {{replace}}\nキャンセル = {{merge}}'
            },
            analysis: {
                taktTime: 'タクトタイム',
                pitch: 'ピッチ',
                epeiTitle: 'EPEI分析 (Every Part Every Interval)',
                epeiDesc: '顧客（需要）とプロセスを追加してEPEIを計算します。',
                epeiResult: '現在のEPEI:',
                excellent: '非常に優れた柔軟性!',
                overload: 'キャパシティオーバーロード!',
                highCO: '段取時間が長すぎます',
                recommendation: '推奨事項:',
                smedAdvice: 'SMED (Single Minute Exchange of Die) を実施して、EPEIを1日以下にするために段取時間を短縮してください。',
                healthyAdvice: 'プロセスは非常に柔軟です。スーパーマーケットの在庫レベルを下げるために小ロット生産が可能です。',
                yamazumiTitle: '負荷バランス',
                yamazumiSubtitle: '山積み可視化',
                balanced: 'バランス良好',
                bottleneck: 'ボトルネック',
                taktLine: 'タクトタイムライン',
                heijunkaTip: 'すべてのステーションが同じレベルになるように調整してください。',
                noAnalysisData: '分析データがありません',
                perMonth: '/月',
                perShift: '/シフト',
                capacity: '能力',
                processType: 'プロセスタイプ',
                normal: '標準',
                pacemaker: 'ペースメーカー',
                shared: '共用',
                outside: '外部',
                supplyChainConfig: 'サプライチェーン構成',
                shiftPattern: 'シフトパターン',
                shift1: '1シフト (8時間/日)',
                shift2: '2シフト (16時間/日)',
                shift3: '3シフト (24時間/日)',
                allowOvertime: '残業を許可 (+25%)',
                day: '日',
                costPerUnit: '個当たりコスト',
                holdingCost: '保管コスト/日',
                wipLimit: 'WIP制限 (個)',
                yield: '歩留まり (%)',
                raw: '原材料',
                pushSystem: 'プッシュシステム',
                va: '付加価値 (VA)',
                nva: '非付加価値 (NVA)',
                plt: 'PLT',
                electronicFlow: '電子フロー',
                manualFlow: '手動フロー',
                safetyStock: '安全在庫',
                heijunka: '平準化',
                kanbanPost: 'かんばんポスト',
                productionKanban: '仕掛かんばん',
                withdrawalKanban: '引取かんばん',
                signalKanban: '信号かんばん',
                goSee: '現場観察',
                buffer: 'バッファ',
                timelineMetrics: 'タイムライン＆メトリクス',
                stickyNote: '付箋',
                uploadIcon: 'アイコンアップロード',
                customIcons: 'カスタムアイコン',
                processBox: 'プロセスボックス',
                operator: '作業者',
                kaizenBurst: 'カイゼンバースト',
                supplier: 'サプライヤー',
                customer: '顧客',
                inventory: '在庫',
                supermarket: 'スーパーマーケット',
                fifo: 'FIFO',
                truck: 'トラック',
                rawMaterial: '原材料',
                finishedGoods: '完成品',
                push: 'プッシュ',
                informationFlow: '情報の流れ',
                productionControl: '生産管理',
                days: '日',
                hr: '時',
                hrs: '時',
                min: '分',
                mins: '分',
                sec: '秒',
                total: '合計',
                pce: 'PCE',
                availTime: '稼働時間',
                dailyDemand: '1日需要',
                spareCapacity: '予備能力',
                totalCO: '合計段取時間'
            },
            nodeDetails: {
                title: 'ノード詳細',
                noSelection: 'ノードを選択して詳細を表示',
                processName: 'プロセス名',
                ct: 'サイクルタイム (秒)',
                co: '段取時間 (分)',
                uptime: '稼働率 (%)',
                shifts: 'シフト数',
                operators: '作業員数',
                inventoryAmount: '在庫量',
                inventoryTime: '在庫時間',
                supplierName: 'サプライヤー名',
                customerName: '顧客名',
                dailyDemand: '1日の需要',
                truckFrequency: '頻度/シフト',
                leadTime: 'リードタイム'
            },
            nodes: {
                bottleneck: 'ボトルネック',
                oee: 'OEE (%)',
                capacity: '能力/時 (個)',
                utilization: '利用率',
                bom: '部品構成 (BOM):',
                receiving: '入荷',
                forklift: 'フォークリフト',
                trolley: '台車',
                notePlaceholder: 'メモを入力...',
                noteDefault: 'メモ',
                vehicleCount: '車輛数',
                ritase: '運送回数',
                loadPerTrip: '1回積載量',
                pcsPerHour: '個/時'
            },
            scenarios: {
                title: 'シナリオ',
                saveTitle: '現在のシミュレーションを保存',
                namePlaceholder: 'シナリオ名...',
                saveBtn: '保存',
                compareBtn: '比較',
                compareTitle: 'シナリオ比較',
                metric: '指標',
                selectToCompare: '比較するシナリオを2-3個選択してください',
                maxCompare: '比較できるシナリオは最大3つまでです',
                none: 'なし',
                savedScenarios: '保存済みシナリオ',
                cancelCompare: '比較をキャンセル',
                loadBtn: '読み込み',
                deleteConfirm: 'このシナリオを削除しますか？',
                saveSuccess: 'シナリオが正常に保存されました！',
                saveError: 'シナリオの保存に失敗しました！',
                nameRequired: 'シナリオ名を入力してください！',
                noSimToSave: '保存するシミュレーションがありません！',
                fulfilledQty: '充足数',
                demand: '需要'
            },
            logs: {
                title: 'ログ',
                searchPlaceholder: 'ログを検索...',
                all: 'すべて',
                info: '情報',
                success: '成功',
                warn: '警告',
                error: 'エラー',
                export: '出力',
                showingLogs: '{{total}}件中{{count}}件のログを表示中',
                noLogs: 'ログがありません。エグゼキューションログを表示するにはシミュレーションを実行してください。',
                noMatch: 'フィルターに一致するログはありません。',
                justNow: 'たった今',
                secondsAgo: '{{count}}秒前',
                minutesAgo: '{{count}}分前',
                level: 'レベル：',
                time: '時間：'
            }
        },
        landing: {
            nav: {
                features: '機能',
                solutions: 'ソリューション',
                login: 'ログイン',
                startDemo: 'デモ開始',
                admin: '管理者',
                activate: 'キー有効化'
            },
            hero: {
                newBadge: '✨ 新機能: AIマニュアル作成',
                title: 'ビジョンで加速する<br />エンジニアリング・インテリジェンス',
                highlight: 'インテリジェンス',
                subtitle: 'サイクルタイム分析、VRトレーニング、モーションインテリジェンスのためのプレミアム産業エンジニアリングツールキット。今すぐ始めましょう。',
                ctaPrimary: '無料デモを試す',
                ctaSecondary: '詳細を見る',
                ctaDownload: 'デスクトップ版 (.exe) をダウンロード',
                ctaCloud: 'クラウドアクセス',
                ctaTrial: '30分トライアル開始'
            },
            solutions: {
                title: 'Maviを選ぶ理由',
                oldWay: '従来の方法',
                maviWay: 'Maviソリューション',
                old: {
                    stopwatch: {
                        title: '手動ストップウォッチ',
                        desc: '人間の反応速度に依存するため、時間の測定が不正確になります。'
                    },
                    paper: {
                        title: '紙とクリップボード',
                        desc: 'データが紙に閉じ込められ、後でExcelへの手動入力が必要になります。'
                    },
                    subjective: {
                        title: '主観的な分析',
                        desc: '同じタスクでも、エンジニアによって結果が異なります。'
                    }
                },
                mavi: {
                    video: {
                        title: 'AIビデオ分析',
                        desc: 'ビデオ録画から自動的に非常に正確な時間を取得します。'
                    },
                    digital: {
                        title: 'デジタル＆インスタント',
                        desc: 'データは即座にデジタル化されます。ワンクリックでレポートとマニュアルを作成します。'
                    },
                    standardized: {
                        title: '標準化と正確性',
                        desc: '常に一貫した分析を行い、人的ミスや偏りを排除します。'
                    }
                }
            },
            features: {
                title: 'より強力な機能',
                manual: {
                    title: 'マニュアル作成',
                    desc: '分析をトレーニングマニュアルに変換します。Excel/Wordからインポートするか、ビデオステップから作成します。'
                },
                workflow: {
                    title: 'ドラッグ＆ドロップワークフロー',
                    desc: 'プロセス要素を視覚的に並べ替えて、ラインを止めることなく新しいレイアウトを試すことができます。'
                },
                cloud: {
                    title: 'クラウド同期',
                    desc: 'チームとリアルタイムでコラボレーション。すべてのデバイスでプロジェクトとマニュアルを安全に同期します。'
                }
            },
            how: {
                title: 'Maviの仕組み',
                capture: {
                    title: '録画',
                    desc: '生産ラインを録画するか、既存のビデオファイルをプラットフォームに直接アップロードします。'
                },
                analyze: {
                    title: '分析',
                    desc: 'コンピュータビジョンエンジンがサイクルを検出し、時間を計算し、無駄を自動的に特定します。'
                },
                improve: {
                    title: '改善',
                    desc: 'データに基づく洞察を使用して、ラインのバランスを取り、ボトルネックを解消し、生産性を向上させます。'
                }
            },
            audience: {
                title: 'プロフェッショナルのために',
                ie: {
                    title: '生産技術エンジニア',
                    desc: '手動のデータ入力に時間を費やすのをやめましょう。サイクルを自動的にキャプチャし、標準作業チャートを数分で作成します。'
                },
                pm: {
                    title: '工場長',
                    desc: '生産ラインを完全に可視化します。ボトルネックを即座に特定し、時間の経過とともに効率の改善を追跡します。'
                },
                lc: {
                    title: 'リーンコンサルタント',
                    desc: 'クライアントにより早く価値を提供します。Maviを使用して、データに基づく推奨事項と印象的な「改善前/改善後」の視覚的証拠を提供します。'
                }
            },
            faq: {
                title: 'よくある質問',
                q1: {
                    q: 'ビデオデータは安全ですか？',
                    a: 'はい。Maviはエンタープライズグレードの暗号化を使用しています。Proプランでは、データはクラウドに安全に保存されます。Starterプランでは、データはローカルデバイスから出ることはありません。'
                },
                q2: {
                    q: 'レポートをExcelにエクスポートできますか？',
                    a: 'もちろんです。すべての分析データ、チャート、標準作業シートをExcel、PDF、またはWord形式に直接エクスポートできます。'
                },
                q3: {
                    q: '特別なハードウェアが必要ですか？',
                    a: 'いいえ。Maviは標準的なビデオファイル（MP4、WEBM）またはIPカメラインプットで動作します。高価なセンサーは必要ありません。'
                }
            },
            cta: {
                title: 'ワークフローを最適化する準備はできましたか？',
                desc: 'Maviで時間を節約し、効率を向上させている何千ものエンジニアに参加しましょう。',
                button: '無料トライアルを開始'
            },
            footer: {
                product: '製品',
                company: '会社',
                resources: 'リソース',
                legal: '法的情報',
                rights: '© 2025 Mavi Systems Inc. All rights reserved.'
            },
            request: {
                title: 'ライセンスキーのリクエスト',
                desc: '組織のためのプロフェッショナルライセンスが必要ですか？リクエストを送信してください。管理者がキーを発行します。',
                benefit1: '全機能への無期限アクセス',
                benefit2: '優先サポートとアップデート',
                deviceId: 'デバイスID (ハードウェアロック)',
                email: 'メールアドレス',
                notes: '備考 (任意)',
                notesPlaceholder: '組織について教えてください...',
                submit: 'リクエスト送信',
                sending: '送信中...',
                successTitle: 'リクエスト送信完了！',
                successDesc: 'チームがリクエストを確認し、メールでライセンスキーをお送りします。',
                offlineTitle: 'リクエスト保存完了！',
                offlineDesc: '接続に失敗しました。リクエストはこのコンピュータにローカル保存されました。管理者に手動で連絡するか、別のブラウザで再試行してください。',
                back: '戻る'
            },
            workspace: {
                saveAsProject: 'プロジェクトとして保存',
                openInWorkspace: 'ワークスペースで開く',
                newProjectPrompt: 'プロジェクト名を入力してください:',
                saveClipAsProject: 'クリップをプロジェクトとして保存',
                cuttingVideo: 'ビデオセグメントを切り出し中...'
            }
        },
        yamazumi: {
            title: '作業負荷バランス可視化',
            subtitle: 'タクトタイム対オペレーター負荷を可視化・平準化',
            defaultStation: 'ステーション',
            other: 'その他',
            selectProject: 'プロジェクトを選択',
            selected: '選択済み',
            visualChart: 'ビジュアルチャート',
            lineBalancing: 'ラインバランシング',
            takt: 'タクトタイム',
            taktLine: 'タクト線を表示',
            tct: '目標サイクルタイム',
            aiAnalysis: 'AI分析',
            kaizenSim: '改善シミュレーション',
            ecrsSimMode: 'ECRSシミュレーションモード',
            eliminateWaste: 'ムダ排除',
            eliminateWasteDesc: 'すべてのムダ（赤）ブロックを削除',
            simplifyNNVA: '付随作業の簡素化',
            simplifyNNVADesc: '非付加価値時間を削減',
            maxCycleTime: '最大サイクルタイム',
            minCycleTime: '最小サイクルタイム',
            avgCycleTime: '平均サイクルタイム',
            lineBalance: 'ラインバランス',
            bottlenecks: 'ボトルネック',
            workStations: 'ワークステーション',
            theorOperators: '理論作業者数',
            workDistribution: '作業分配',
            analysisPending: '分析保留中',
            selectProjectInstruction: '分析を表示するにはプロジェクトを選択してください',
            stationBreakdown: 'ステーション内訳',
            station: 'ステーション',
            total: '合計',
            efficiency: '効率',
            critical: 'クリティカル',
            balanced: 'バランス良',
            loadingProjects: 'プロジェクトを読み込み中...',
            aiEngineer: 'AI産業エンジニア',
            aiSubtitle: 'この山積みチャートを分析'
        },
        categories: {
            valueAdded: '正味時間 (VA)',
            nonValueAdded: '付随作業 (NVA)',
            waste: 'ムダ (Waste)'
        },
        project: {
            newProject: '新規プロジェクト',
            openProject: 'プロジェクトを開く',
            projectName: 'プロジェクト名',
            enterName: 'プロジェクト名を入力',
            folderOptional: 'フォルダ (任意)',
            rootNoFolder: 'ルート (フォルダなし)',
            videoFile: 'ビデオファイル *',
            selectVideo: 'ビデオを選択...',
            videoSelected: 'ビデオ選択済み',
            createProject: 'プロジェクト作成',
            cancel: 'キャンセル',
            errProjectName: 'プロジェクト名は必須です',
            errVideo: 'ビデオファイルは必須です'
        },
        allowance: {
            title: '余裕率設定',
            calculatorTitle: '余裕率計算機',
            subtitle: '個人的余裕、疲労、遅延、特別余裕を含む標準時間を計算します',
            normalTime: '正味時間',
            normalTimeMinutes: '正味時間 (分)',
            basicAllowances: '基本余裕',
            personal: '個人的余裕 (%)',
            basicFatigue: '基本疲労余裕 (%)',
            delay: '遅延余裕 (%)',
            special: '特別余裕 (%)',
            total: '合計余裕',
            done: '完了',
            typicalPersonal: '標準: 5-7% (休憩、個人的ニーズ)',
            typicalFatigue: '標準: 4% (基本的な身体的/精神的疲労)',
            typicalDelay: '標準: 2-5% (不可避な遅延)',
            specialDesc: '特別な事情',
            variableFatigue: '変動疲労余裕',
            results: '結果',
            standardTime: '標準時間',
            formula: '計算式'
        },
        elementEditor: {
            title: '要素エディタ',
            addElement: '要素を追加',
            editElement: '要素を編集',
            deleteElement: '要素を削除',
            elementName: '要素名',
            startTime: '開始時間',
            endTime: '終了時間',
            duration: '所要時間',
            category: 'カテゴリ',
            therbligType: 'サーブリッグタイプ',
            notes: 'メモ',
            startMeasurement: '計測開始',
            endMeasurement: '計測終了',
            cancelMeasurement: '計測キャンセル',
            measuring: '計測中...',
            noElements: '要素がありません',
            confirmDelete: 'この要素を削除しますか？',
            saveToDb: 'データベースに保存',
            quickMode: 'クイックモード',
            autoCounter: '自動カウンター',
            showDashboard: 'ダッシュボード表示',
            hideDashboard: 'ダッシュボード非表示',
            selectAnElement: '要素を選択してください',
            nextCycle: '次サイクル',
            prevCycle: '前サイクル',
            zoomLevel: 'ズームレベル',
            playbackSpeed: '再生速度',
            actions: '操作',
            cycle: 'サイクル',
            process: 'プロセス',
            manual: '手作業',
            auto: '自動',
            walk: '歩行',
            loss: 'ロス',
            rating: 'レイティング %',
            normalTime: '正味時間 (s)',
            standardTime: '標準時間 (s)',
            emptyElements: '要素がありません。計測を開始して要素を追加してください。',
            noFilterMatch: 'フィルターに一致する要素がありません。',
            exporting: 'エクスポート中...',
            exportSuccess: 'エクスポート完了！',
            exportFailed: 'エクスポート失敗',
            preparingExcel: 'Excelファイルを準備中...',
            showingElements: '{{total}} 件中 {{filtered}} 件を表示',
            errors: {
                positiveTimes: '開始時間と終了時間は正の数である必要があります。',
                startLessFinish: '開始時間は終了時間より前である必要があります。',
                totalSplitExceeds: '内訳時間の合計は要素の所要時間を超えてはいけません。'
            },
            toggleColumns: '列の表示/非表示',
            searchPlaceholder: '要素を検索...',
            sortBy: '並び替え',
            sortOriginal: '元の順序',
            sortCycle: 'サイクル',
            sortDuration: '所要時間',
            sortName: '名前',
            selectOption: '-- 選択 --',
            total: '合計',
            splitTimePrompt: '分割時間を入力 ({{start}}s - {{end}}s の間):',
            invalidSplitTime: '無効な分割時間です！開始時間と終了時間の間である必要があります。',
            toggleRatingSpeed: 'レイティング速度切替',
            allowanceSettings: '余裕率設定',
            fullscreenEditor: 'フルスクリーンエディタ',
            exitFullscreen: 'フルスクリーン終了'
        }
    }
};
