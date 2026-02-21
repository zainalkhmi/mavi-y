import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Export simulation results to PDF
 */
export const exportToPDF = (result, nodes, scenarioName = 'Simulation') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(0, 120, 212);
    doc.text('Supply Chain Simulation Report', pageWidth / 2, 20, { align: 'center' });

    // Scenario Name
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Scenario: ${scenarioName}`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 37, { align: 'center' });

    let yPos = 50;

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Summary', 14, yPos);
    yPos += 10;

    const summaryData = [
        ['Status', result.success ? 'FEASIBLE ✓' : 'IMPOSSIBLE ✗'],
        ['Fulfilled Quantity', result.fulfilledQuantity || 0],
        ['Root Cause', result.rootCause || 'N/A']
    ];

    doc.autoTable({
        startY: yPos,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [0, 120, 212] },
        margin: { left: 14 }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Cost Breakdown Section
    if (result.costBreakdown && result.costBreakdown.total > 0) {
        doc.setFontSize(14);
        doc.text('Cost Breakdown', 14, yPos);
        yPos += 10;

        const costData = [
            ['Direct Material', `$${(result.costBreakdown.directMaterial || 0).toFixed(2)}`],
            ['Direct Labor', `$${(result.costBreakdown.directLabor || 0).toFixed(2)}`],
            ['Machine Cost', `$${(result.costBreakdown.machine || 0).toFixed(2)}`],
            ['WIP', `$${result.costBreakdown.wip.toFixed(2)}`],
            ['FOH', `$${(result.costBreakdown.foh || 0).toFixed(2)}`],
            ['Quality Loss (COPQ)', `$${(result.costBreakdown.qualityLoss || 0).toFixed(2)}`],
            ['Direct Cost', `$${(result.costBreakdown.directCost || 0).toFixed(2)}`],
            ['Indirect Cost', `$${(result.costBreakdown.indirectCost || 0).toFixed(2)}`],
            ['VA Cost', `$${(result.costBreakdown.valueAddedCost || 0).toFixed(2)}`],
            ['NVA Cost', `$${(result.costBreakdown.nonValueAddedCost || 0).toFixed(2)}`],
            ['Total', `$${result.costBreakdown.total.toFixed(2)}`]
        ];

        doc.autoTable({
            startY: yPos,
            head: [['Category', 'Amount']],
            body: costData,
            theme: 'grid',
            headStyles: { fillColor: [76, 175, 80] },
            margin: { left: 14 },
            footStyles: { fillColor: [76, 175, 80], fontStyle: 'bold' }
        });

        yPos = doc.lastAutoTable.finalY + 15;
    }

    // WIP Violations
    if (result.wipViolations && result.wipViolations.length > 0) {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('WIP Limit Violations', 14, yPos);
        yPos += 10;

        const wipData = result.wipViolations.map(v => [
            v.nodeName,
            v.limit,
            v.actual,
            v.excess
        ]);

        doc.autoTable({
            startY: yPos,
            head: [['Node', 'Limit', 'Actual', 'Excess']],
            body: wipData,
            theme: 'grid',
            headStyles: { fillColor: [255, 193, 7] },
            margin: { left: 14 }
        });

        yPos = doc.lastAutoTable.finalY + 15;
    }

    // Node Status Table
    if (result.nodeStatus) {
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Node Inventory Status', 14, yPos);
        yPos += 10;

        const nodeData = Object.entries(result.nodeStatus).map(([nodeId, status]) => {
            const node = nodes.find(n => n.id === nodeId);
            return [
                node?.data?.label || node?.data?.name || nodeId,
                status.initial,
                status.final,
                status.shortage || 0
            ];
        });

        doc.autoTable({
            startY: yPos,
            head: [['Node', 'Initial', 'Final', 'Shortage']],
            body: nodeData,
            theme: 'grid',
            headStyles: { fillColor: [33, 150, 243] },
            margin: { left: 14 }
        });
    }

    // Save PDF
    doc.save(`${scenarioName.replace(/\s+/g, '_')}_Report.pdf`);
};

/**
 * Export simulation results to Excel
 */
export const exportToExcel = (result, nodes, scenarioName = 'Simulation') => {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
        ['Supply Chain Simulation Report'],
        ['Scenario:', scenarioName],
        ['Generated:', new Date().toLocaleString()],
        [],
        ['Summary'],
        ['Status', result.success ? 'FEASIBLE' : 'IMPOSSIBLE'],
        ['Fulfilled Quantity', result.fulfilledQuantity || 0],
        ['Root Cause', result.rootCause || 'N/A']
    ];

    // Add Cost Breakdown
    if (result.costBreakdown && result.costBreakdown.total > 0) {
        summaryData.push(
            [],
            ['Cost Breakdown'],
            ['Direct Material', result.costBreakdown.directMaterial || 0],
            ['Direct Labor', result.costBreakdown.directLabor || 0],
            ['Machine Cost', result.costBreakdown.machine || 0],
            ['WIP', result.costBreakdown.wip],
            ['FOH', result.costBreakdown.foh || 0],
            ['Quality Loss (COPQ)', result.costBreakdown.qualityLoss || 0],
            ['Direct Cost', result.costBreakdown.directCost || 0],
            ['Indirect Cost', result.costBreakdown.indirectCost || 0],
            ['VA Cost', result.costBreakdown.valueAddedCost || 0],
            ['NVA Cost', result.costBreakdown.nonValueAddedCost || 0],
            ['Total', result.costBreakdown.total]
        );
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Node Status Sheet
    if (result.nodeStatus) {
        const nodeHeaders = [['Node', 'Initial', 'Final', 'Shortage']];
        const nodeRows = Object.entries(result.nodeStatus).map(([nodeId, status]) => {
            const node = nodes.find(n => n.id === nodeId);
            return [
                node?.data?.label || node?.data?.name || nodeId,
                status.initial,
                status.final,
                status.shortage || 0
            ];
        });

        const nodeSheet = XLSX.utils.aoa_to_sheet([...nodeHeaders, ...nodeRows]);
        XLSX.utils.book_append_sheet(workbook, nodeSheet, 'Node Status');
    }

    // WIP Violations Sheet
    if (result.wipViolations && result.wipViolations.length > 0) {
        const wipHeaders = [['Node', 'Limit', 'Actual', 'Excess']];
        const wipRows = result.wipViolations.map(v => [
            v.nodeName,
            v.limit,
            v.actual,
            v.excess
        ]);

        const wipSheet = XLSX.utils.aoa_to_sheet([...wipHeaders, ...wipRows]);
        XLSX.utils.book_append_sheet(workbook, wipSheet, 'WIP Violations');
    }

    // Logs Sheet
    if (result.logs && result.logs.length > 0) {
        const logHeaders = [['Timestamp', 'Level', 'Message']];
        const logRows = result.logs.map(log => [
            log.timestamp ? new Date(log.timestamp).toLocaleString() : '',
            log.level || 'info',
            log.message || ''
        ]);

        const logSheet = XLSX.utils.aoa_to_sheet([...logHeaders, ...logRows]);
        XLSX.utils.book_append_sheet(workbook, logSheet, 'Logs');
    }

    // Save Excel
    XLSX.writeFile(workbook, `${scenarioName.replace(/\s+/g, '_')}_Report.xlsx`);
};

/**
 * Export simulation results to CSV
 */
export const exportToCSV = (result, nodes, scenarioName = 'Simulation') => {
    // Create CSV content
    let csvContent = 'Supply Chain Simulation Report\n';
    csvContent += `Scenario:,${scenarioName}\n`;
    csvContent += `Generated:,${new Date().toLocaleString()}\n\n`;

    // Summary
    csvContent += 'Summary\n';
    csvContent += `Status,${result.success ? 'FEASIBLE' : 'IMPOSSIBLE'}\n`;
    csvContent += `Fulfilled Quantity,${result.fulfilledQuantity || 0}\n`;
    csvContent += `Root Cause,${result.rootCause || 'N/A'}\n\n`;

    // Cost Breakdown
    if (result.costBreakdown && result.costBreakdown.total > 0) {
        csvContent += 'Cost Breakdown\n';
        csvContent += `Direct Material,$${(result.costBreakdown.directMaterial || 0).toFixed(2)}\n`;
        csvContent += `Direct Labor,$${(result.costBreakdown.directLabor || 0).toFixed(2)}\n`;
        csvContent += `Machine Cost,$${(result.costBreakdown.machine || 0).toFixed(2)}\n`;
        csvContent += `WIP,$${result.costBreakdown.wip.toFixed(2)}\n`;
        csvContent += `FOH,$${(result.costBreakdown.foh || 0).toFixed(2)}\n`;
        csvContent += `Quality Loss,$${(result.costBreakdown.qualityLoss || 0).toFixed(2)}\n`;
        csvContent += `Direct Cost,$${(result.costBreakdown.directCost || 0).toFixed(2)}\n`;
        csvContent += `Indirect Cost,$${(result.costBreakdown.indirectCost || 0).toFixed(2)}\n`;
        csvContent += `VA Cost,$${(result.costBreakdown.valueAddedCost || 0).toFixed(2)}\n`;
        csvContent += `NVA Cost,$${(result.costBreakdown.nonValueAddedCost || 0).toFixed(2)}\n`;
        csvContent += `Total,$${result.costBreakdown.total.toFixed(2)}\n\n`;
    }

    // Node Status
    if (result.nodeStatus) {
        csvContent += 'Node Inventory Status\n';
        csvContent += 'Node,Initial,Final,Shortage\n';

        Object.entries(result.nodeStatus).forEach(([nodeId, status]) => {
            const node = nodes.find(n => n.id === nodeId);
            const nodeName = node?.data?.label || node?.data?.name || nodeId;
            csvContent += `${nodeName},${status.initial},${status.final},${status.shortage || 0}\n`;
        });
        csvContent += '\n';
    }

    // WIP Violations
    if (result.wipViolations && result.wipViolations.length > 0) {
        csvContent += 'WIP Limit Violations\n';
        csvContent += 'Node,Limit,Actual,Excess\n';

        result.wipViolations.forEach(v => {
            csvContent += `${v.nodeName},${v.limit},${v.actual},${v.excess}\n`;
        });
    }

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${scenarioName.replace(/\s+/g, '_')}_Report.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
