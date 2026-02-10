import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

/**
 * Generate a comprehensive PDF report for motion study analysis
 */
export async function generatePDFReport(projectData, options = {}) {
    const {
        projectName = 'Motion Study Report',
        measurements = [],
        statistics = {},
        includeCharts = true,
        includeTables = true,
        includeStatistics = true,
        logoUrl = null
    } = options;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Helper function to add new page if needed
    const checkPageBreak = (requiredSpace = 20) => {
        if (yPosition + requiredSpace > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
            return true;
        }
        return false;
    };

    // Helper function to add footer
    const addFooter = () => {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128);
            doc.text(
                `Page ${i} of ${pageCount}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
            doc.text(
                `Generated: ${new Date().toLocaleString()}`,
                pageWidth - 20,
                pageHeight - 10,
                { align: 'right' }
            );
        }
    };

    // 1. Cover Page
    if (logoUrl) {
        try {
            doc.addImage(logoUrl, 'PNG', pageWidth / 2 - 25, yPosition, 50, 50);
            yPosition += 60;
        } catch (error) {
            console.error('Error adding logo:', error);
        }
    }

    doc.setFontSize(24);
    doc.setTextColor(0, 90, 158); // Blue color
    doc.text(projectName, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(16);
    doc.setTextColor(100);
    doc.text('Motion Study Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 40;

    // 2. Executive Summary
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Executive Summary', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(60);

    const summaryLines = [
        `Total Elements: ${measurements.length}`,
        `Total Duration: ${(measurements.reduce((sum, m) => sum + m.duration, 0)).toFixed(2)} seconds`,
        `Average Cycle Time: ${statistics.mean ? statistics.mean.toFixed(2) : 'N/A'} seconds`,
        `Standard Deviation: ${statistics.stdDev ? statistics.stdDev.toFixed(2) : 'N/A'} seconds`
    ];

    summaryLines.forEach(line => {
        doc.text(line, 25, yPosition);
        yPosition += 7;
    });

    // 3. Measurements Table
    if (includeTables && measurements.length > 0) {
        checkPageBreak(60);
        yPosition += 10;

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Measurement Details', 20, yPosition);
        yPosition += 10;

        const tableData = measurements.map((m, index) => [
            index + 1,
            m.elementName || 'N/A',
            m.category || 'N/A',
            m.therblig || 'N/A',
            m.duration.toFixed(2),
            m.startTime.toFixed(2),
            m.endTime.toFixed(2)
        ]);

        doc.autoTable({
            startY: yPosition,
            head: [['#', 'Element', 'Category', 'Therblig', 'Duration (s)', 'Start (s)', 'End (s)']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [0, 90, 158], textColor: 255 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 40 },
                2: { cellWidth: 30 },
                3: { cellWidth: 25 },
                4: { cellWidth: 25 },
                5: { cellWidth: 25 },
                6: { cellWidth: 25 }
            }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
    }

    // 4. Statistical Analysis
    if (includeStatistics && statistics) {
        checkPageBreak(80);

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Statistical Analysis', 20, yPosition);
        yPosition += 10;

        const statsData = [
            ['Mean', statistics.mean ? statistics.mean.toFixed(3) + ' s' : 'N/A'],
            ['Median', statistics.median ? statistics.median.toFixed(3) + ' s' : 'N/A'],
            ['Std Deviation', statistics.stdDev ? statistics.stdDev.toFixed(3) + ' s' : 'N/A'],
            ['Minimum', statistics.min ? statistics.min.toFixed(3) + ' s' : 'N/A'],
            ['Maximum', statistics.max ? statistics.max.toFixed(3) + ' s' : 'N/A'],
            ['Range', statistics.range ? statistics.range.toFixed(3) + ' s' : 'N/A'],
            ['CV (%)', statistics.cv ? statistics.cv.toFixed(2) + '%' : 'N/A']
        ];

        if (statistics.ci95) {
            statsData.push(['95% CI Lower', statistics.ci95.lower.toFixed(3) + ' s']);
            statsData.push(['95% CI Upper', statistics.ci95.upper.toFixed(3) + ' s']);
        }

        doc.autoTable({
            startY: yPosition,
            head: [['Metric', 'Value']],
            body: statsData,
            theme: 'striped',
            headStyles: { fillColor: [0, 90, 158], textColor: 255 },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 80, fontStyle: 'bold' },
                1: { cellWidth: 80 }
            }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
    }

    // 5. Category Breakdown
    if (includeTables && measurements.length > 0) {
        checkPageBreak(60);

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Category Breakdown', 20, yPosition);
        yPosition += 10;

        const categoryStats = {};
        measurements.forEach(m => {
            const cat = m.category || 'Unknown';
            if (!categoryStats[cat]) {
                categoryStats[cat] = { count: 0, totalDuration: 0 };
            }
            categoryStats[cat].count++;
            categoryStats[cat].totalDuration += m.duration;
        });

        const categoryData = Object.entries(categoryStats).map(([category, stats]) => [
            category,
            stats.count,
            stats.totalDuration.toFixed(2),
            ((stats.totalDuration / measurements.reduce((sum, m) => sum + m.duration, 0)) * 100).toFixed(1) + '%'
        ]);

        doc.autoTable({
            startY: yPosition,
            head: [['Category', 'Count', 'Total Duration (s)', 'Percentage']],
            body: categoryData,
            theme: 'grid',
            headStyles: { fillColor: [0, 90, 158], textColor: 255 },
            styles: { fontSize: 10, cellPadding: 3 }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
    }

    // Add footer to all pages
    addFooter();

    return doc;
}

/**
 * Capture a chart element and add it to PDF
 */
export async function addChartToPDF(doc, chartElement, x, y, width, height) {
    try {
        const canvas = await html2canvas(chartElement, {
            backgroundColor: '#ffffff',
            scale: 2
        });

        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', x, y, width, height);

        return true;
    } catch (error) {
        console.error('Error capturing chart:', error);
        return false;
    }
}

/**
 * Export PDF report with custom filename
 */
export function savePDFReport(doc, filename = 'motion-study-report.pdf') {
    doc.save(filename);
}

/**
 * Generate and download a quick summary report
 */
export async function generateQuickReport(measurements, projectName = 'Motion Study') {
    const durations = measurements.map(m => m.duration);
    const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const stdDev = Math.sqrt(
        durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length
    );

    const statistics = {
        mean,
        stdDev,
        min: Math.min(...durations),
        max: Math.max(...durations),
        range: Math.max(...durations) - Math.min(...durations),
        cv: (stdDev / mean) * 100
    };

    const doc = await generatePDFReport({ projectName }, {
        projectName,
        measurements,
        statistics,
        includeCharts: false,
        includeTables: true,
        includeStatistics: true
    });

    savePDFReport(doc, `${projectName.replace(/\s+/g, '-')}-report.pdf`);
}
