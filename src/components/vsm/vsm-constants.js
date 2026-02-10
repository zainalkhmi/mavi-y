export const VSMSymbols = {
    // Process Flow
    PROCESS: 'process',
    SUPPLIER: 'supplier',
    CUSTOMER: 'customer',
    DATA_BOX: 'data_box',
    OPERATOR: 'operator',
    KAIZEN_BURST: 'kaizen_burst',

    // Material Flow
    INVENTORY: 'inventory',
    SUPERMARKET: 'supermarket',
    FIFO: 'fifo',
    SAFETY_STOCK: 'safety_stock',
    TRUCK: 'truck',
    SEA: 'sea',
    AIR: 'air',
    RAW_MATERIAL: 'raw_material',
    PUSH_ARROW: 'push_arrow', // NEW: Push system arrow
    FINISHED_GOODS: 'finished_goods', // NEW: Finished goods to customer

    // Information Flow
    PRODUCTION_CONTROL: 'production_control',
    ELECTRONIC_INFO: 'electronic_info',
    MANUAL_INFO: 'manual_info',
    KANBAN_POST: 'kanban_post',
    SIGNAL_KANBAN: 'signal_kanban',
    KANBAN_PRODUCTION: 'kanban_production',
    KANBAN_WITHDRAWAL: 'kanban_withdrawal',
    EYE_OBSERVATION: 'eye_observation', // Go See
    HEIJUNKA_BOX: 'heijunka_box', // NEW: Load leveling box
    BUFFER: 'buffer',

    // Timeline & Metrics
    TIMELINE: 'timeline', // NEW: Lead time timeline

    // Custom
    WAREHOUSE_RECEIVING: 'warehouse_receiving', // NEW: Receiving dock/warehouse
    FORKLIFT: 'forklift', // NEW: Forklift transport
    TROLLEY: 'trolley', // NEW: Trolley transport
    TEXT_NOTE: 'text_note', // NEW: Free text note
    PROJECT: 'project', // NEW: Link to video project
    CUSTOM: 'custom',
};

export const PROCESS_TYPES = {
    NORMAL: 'normal',
    PACEMAKER: 'pacemaker',
    SHARED: 'shared',
    OUTSIDE: 'outside',
    PERIODIC: 'periodic'
};

export const INITIAL_DATA = {
    process: {
        name: 'Process',
        ct: 60, // Cycle Time (sec)
        co: 30, // Changeover (min)
        uptime: 95, // %
        yield: 99, // %
        performance: 90, // % (New)
        va: 60, // VA Time (sec)
        operators: 1, // Count
        shifts: 1,
        startTime: '08:00', // NEW: Start of shift
        endTime: '17:00', // NEW: End of shift
        processType: 'normal'
    },
    inventory: {
        amount: 0,
        unit: 'pcs',
        time: 0,
        minStock: 100, // NEW: Red line/threshold
        maxStock: 1000 // NEW: Capacity limit
    },
    supplier: {
        name: 'Supplier',
        reliability: 98, //%,
        leadTime: 5, // days
        moq: 100 // Minimum Order Quantity
    },
    customer: {
        name: 'Customer',
        demand: 1000,
        unit: 'pcs',
        availableTime: 480, // min/shift
        shifts: 1,
        daysPerMonth: 20, // NEW: Working days per month
        packSize: 1, // Standard pack for Pitch calculation
        taktTime: 0
    }, // Enhanced
    kaizen_burst: { name: 'Problem/Idea' },
    production_control: {
        name: 'Production Control',
        planningFreq: 'Daily', // Daily, Weekly
        horizon: 30 // days
    },
    heijunka_box: {
        name: 'Heijunka Box',
        description: 'Load Leveling',
        interval: 20, // mins
        pitch: 20 // mins (should match pitch metric)
    },
    warehouse_receiving: {
        name: 'Warehouse / Receiving',
        capacity: 5000,
        processingTime: 2, // hrs (unload/sort)
        dockDoors: 2
    },
    truck: {
        name: 'Milk Run (Truck)',
        frequency: 4, // times/shift
        capacity: 100, // pcs/trip
        leadTime: 30, // min (travel time)
        startTime: '08:00', // NEW: Only works regular hours
        endTime: '17:00'
    },
    forklift: {
        name: 'Forklift',
        distance: 50, // meters
        speed: 60, // m/min
        capacity: 1, // pallets/pcs
        loadTime: 2, // min
        unloadTime: 2 // min
    },
    trolley: {
        name: 'Trolley',
        distance: 20, // meters
        speed: 40, // m/min
        capacity: 10, // pcs
        tripsPerShift: 10
    },
    safety_stock: {
        name: 'Safety Stock',
        amount: 100,
        serviceLevel: 95, // %,
        demandStdDev: 10,
        leadTimeVar: 2 // days
    },
    supermarket: {
        name: 'Supermarket',
        minStock: 50,
        maxStock: 500,
        reorderPoint: 100,
        replenishTime: 4 // hours
    },
    buffer: {
        name: 'Buffer',
        amount: 0,
        maxCapacity: 200,
        throughputRate: 50 // pcs/hr
    },
    sea: {
        name: 'Sea Freight',
        frequency: 1, // per month/week
        capacity: 5000,
        leadTime: 30, // days
        costPerShipment: 1000 // currency
    },
    air: {
        name: 'Air Freight',
        frequency: 2,
        capacity: 1000,
        leadTime: 2, // days
        costPerShipment: 5000
    },
    timeline: { name: 'Timeline', leadTime: 0, vaTime: 0 }, // NEW
    finished_goods: { name: 'Finished Goods', amount: 0 }, // NEW
    text_note: { text: 'New Note', color: '#ffff88', fontSize: '14px' }, // NEW
    project: {
        name: 'Linked Project',
        projectId: null,
        projectName: '',
        ct: 0,
        outputPcs: 1, // NEW: For dividing total cycle time
        co: 30, // Changeover (min)
        uptime: 95, // %
        yield: 99, // %
        performance: 90, // % (New)
        va: 0, // VA Time (sec)
        operators: 1, // Count
        shifts: 1,
        startTime: '08:00', // NEW: Start of shift
        endTime: '17:00', // NEW: End of shift
        processType: 'normal'
    }, // NEW
    custom: { name: 'Custom Item', description: '' }
};
