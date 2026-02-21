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
        performance: 90, // %
        va: 60, // VA Time (sec)
        operators: 1,
        shifts: 1,
        startTime: '08:00',
        endTime: '17:00',
        processType: 'normal',
        variants: [], // Array of { id, name, ratio, ct, va } for mixed model
        inventoryCost: 0, // NEW: Carrying cost per unit/day
        operatingCost: 0, // NEW: Hourly process cost
        fohPerUnit: 0,
        directMaterialCost: 0,
        directLaborCost: 0,
        machineCost: 0
    },
    inventory: {
        amount: 0,
        unit: 'pcs',
        time: 0,
        minStock: 100,
        maxStock: 1000,
        holdingCost: 0 // NEW: Cost per unit per day
    },
    supplier: {
        name: 'Supplier',
        reliability: 98,
        leadTime: 5,
        moq: 100,
        unitPrice: 0 // NEW: For cost analysis
    },
    customer: {
        name: 'Customer',
        demand: 1000,
        unit: 'pcs',
        availableTime: 480,
        shifts: 1,
        daysPerMonth: 20,
        packSize: 1,
        taktTime: 0,
        productMix: [] // NEW: Demand per variant
    },
    kaizen_burst: { name: 'Problem/Idea' },
    production_control: {
        name: 'Production Control',
        planningFreq: 'Daily',
        horizon: 30
    },
    heijunka_box: {
        name: 'Heijunka Box',
        description: 'Load Leveling',
        interval: 20,
        pitch: 20
    },
    warehouse_receiving: {
        name: 'Warehouse / Receiving',
        capacity: 5000,
        processingTime: 2,
        dockDoors: 2
    },
    truck: {
        name: 'Milk Run (Truck)',
        frequency: 4,
        capacity: 100,
        leadTime: 30,
        startTime: '08:00',
        endTime: '17:00',
        distance: 0,
        costPerKm: 0, // NEW: Landed cost calculation
        fixedTripCost: 0, // NEW
        emissionsFactor: 0.18 // kg CO2/km
    },
    forklift: {
        name: 'Forklift',
        distance: 50,
        speed: 60,
        capacity: 1,
        loadTime: 2,
        unloadTime: 2,
        operatingCost: 0 // NEW
    },
    trolley: {
        name: 'Trolley',
        distance: 20,
        speed: 40,
        capacity: 10,
        tripsPerShift: 10,
        operatingCost: 0 // NEW
    },
    safety_stock: {
        name: 'Safety Stock',
        amount: 100,
        serviceLevel: 95,
        demandStdDev: 10,
        leadTimeVar: 2
    },
    supermarket: {
        name: 'Supermarket',
        minStock: 50,
        maxStock: 500,
        reorderPoint: 100,
        replenishTime: 4
    },
    buffer: {
        name: 'Buffer',
        amount: 0,
        maxCapacity: 200,
        throughputRate: 50
    },
    sea: {
        name: 'Sea Freight',
        frequency: 1,
        capacity: 5000,
        leadTime: 30,
        costPerShipment: 1000,
        dutyRate: 0, // NEW: % Landed cost
        insuranceRate: 0 // NEW: % Landed cost
    },
    air: {
        name: 'Air Freight',
        frequency: 2,
        capacity: 1000,
        leadTime: 2,
        costPerShipment: 5000,
        dutyRate: 0,
        insuranceRate: 0
    },
    timeline: { name: 'Timeline', leadTime: 0, vaTime: 0 },
    finished_goods: { name: 'Finished Goods', amount: 0 },
    text_note: { text: 'New Note', color: '#ffff88', fontSize: '14px' },
    project: {
        name: 'Linked Project',
        projectId: null,
        projectName: '',
        ct: 0,
        outputPcs: 1,
        co: 30,
        uptime: 95,
        yield: 99,
        performance: 90,
        va: 0,
        operators: 1,
        shifts: 1,
        startTime: '08:00',
        endTime: '17:00',
        processType: 'normal',
        variants: [] // NEW
    },
    custom: { name: 'Custom Item', description: '' }
};
