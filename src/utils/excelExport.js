import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Helper to save workbook using file-saver for better compatibility 
export const saveWorkbook = (workbook, filename, onProgress = null) => {
    try {
        if (onProgress) onProgress(10); // Start processing
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        if (onProgress) onProgress(60); // Finished writing to array

        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        if (onProgress) onProgress(90); // Created blob

        saveAs(blob, filename);
        if (onProgress) {
            // Give a small delay for the download to "trigger" visually
            setTimeout(() => onProgress(100), 500);
        }
    } catch (error) {
        console.error('Error saving Excel file:', error);
        if (onProgress) onProgress(-1); // Error state
        alert('Gagal menyimpan file Excel: ' + error.message);
    }
};

// Export measurements to Excel
export const exportToExcel = (measurements, videoName = 'Untitled', allowances = null, onProgress = null) => {
    if (!measurements || measurements.length === 0) {
        alert('Tidak ada data untuk di-export!');
        return;
    }

    if (onProgress) onProgress(5);

    // Prepare data for Excel
    const data = measurements.map((m, index) => {
        const rating = m.rating || 100;
        const ratingFactor = rating / 100;
        const normalTime = (Number(m.duration) || 0) * ratingFactor;

        let standardTime = normalTime;
        if (allowances) {
            const totalAllowance = (allowances.personal || 0) + (allowances.fatigue || 0) + (allowances.delay || 0);
            standardTime = normalTime * (1 + totalAllowance / 100);
        }

        return {
            'No.': index + 1,
            'Cycle': m.cycle || 1, // Add Cycle column
            'Nama Elemen': m.elementName,
            'Kategori': m.category,
            'Rating (%)': rating,
            'M (Manual)': (Number(m.manualTime) || 0).toFixed(2),
            'A (Auto)': (Number(m.autoTime) || 0).toFixed(2),
            'W (Walk)': (Number(m.walkTime) || 0).toFixed(2),
            'L (Loss)': (Number(m.waitingTime) || 0).toFixed(2),
            'Waktu Mulai (s)': (Number(m.startTime) || 0).toFixed(2),
            'Waktu Selesai (s)': (Number(m.endTime) || 0).toFixed(2),
            'Durasi (s)': (Number(m.duration) || 0).toFixed(2),
            'Normal Time (s)': normalTime.toFixed(2),
            'Standard Time (s)': standardTime.toFixed(2)
        };
    });

    // Calculate statistics
    const totalTime = measurements.reduce((sum, m) => sum + (Number(m.duration) || 0), 0);
    const totalManual = measurements.reduce((sum, m) => sum + (Number(m.manualTime) || 0), 0);
    const totalAuto = measurements.reduce((sum, m) => sum + (Number(m.autoTime) || 0), 0);
    const totalWalk = measurements.reduce((sum, m) => sum + (Number(m.walkTime) || 0), 0);
    const totalLoss = measurements.reduce((sum, m) => sum + (Number(m.waitingTime) || 0), 0);

    const valueAddedTime = measurements
        .filter(m => m.category === 'Value-added')
        .reduce((sum, m) => sum + (Number(m.duration) || 0), 0);
    const nonValueAddedTime = measurements
        .filter(m => m.category === 'Non value-added')
        .reduce((sum, m) => sum + (Number(m.duration) || 0), 0);
    const wasteTime = measurements
        .filter(m => m.category === 'Waste')
        .reduce((sum, m) => sum + (Number(m.duration) || 0), 0);

    // Add summary rows
    data.push({});
    data.push({
        'No.': 'RINGKASAN',
        'Nama Elemen': '',
        'Kategori': '',
        'Rating (%)': '',
        'M (Manual)': '',
        'A (Auto)': '',
        'W (Walk)': '',
        'L (Loss)': '',
        'Waktu Mulai (s)': '',
        'Waktu Selesai (s)': '',
        'Durasi (s)': ''
    });
    data.push({
        'No.': 'Total Waktu',
        'Nama Elemen': '',
        'Kategori': '',
        'Rating (%)': '',
        'M (Manual)': totalManual.toFixed(2),
        'A (Auto)': totalAuto.toFixed(2),
        'W (Walk)': totalWalk.toFixed(2),
        'L (Loss)': totalLoss.toFixed(2),
        'Waktu Mulai (s)': '',
        'Waktu Selesai (s)': '',
        'Durasi (s)': totalTime.toFixed(2)
    });
    data.push({
        'No.': 'Value-added',
        'Nama Elemen': '',
        'Kategori': '',
        'Rating (%)': '',
        'M (Manual)': '',
        'A (Auto)': '',
        'W (Walk)': '',
        'L (Loss)': '',
        'Waktu Mulai (s)': '',
        'Waktu Selesai (s)': '',
        'Durasi (s)': `${valueAddedTime.toFixed(2)} ${totalTime > 0 ? `(${((valueAddedTime / totalTime) * 100).toFixed(1)}%)` : ''}`
    });
    data.push({
        'No.': 'Non value-added',
        'Nama Elemen': '',
        'Kategori': '',
        'Rating (%)': '',
        'M (Manual)': '',
        'A (Auto)': '',
        'W (Walk)': '',
        'L (Loss)': '',
        'Waktu Mulai (s)': '',
        'Waktu Selesai (s)': '',
        'Durasi (s)': `${nonValueAddedTime.toFixed(2)} ${totalTime > 0 ? `(${((nonValueAddedTime / totalTime) * 100).toFixed(1)}%)` : ''}`
    });
    data.push({
        'No.': 'Waste',
        'Nama Elemen': '',
        'Kategori': '',
        'Rating (%)': '',
        'M (Manual)': '',
        'A (Auto)': '',
        'W (Walk)': '',
        'L (Loss)': '',
        'Waktu Mulai (s)': '',
        'Waktu Selesai (s)': '',
        'Durasi (s)': `${wasteTime.toFixed(2)} ${totalTime > 0 ? `(${((wasteTime / totalTime) * 100).toFixed(1)}%)` : ''}`
    });

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Analisis Gerakan');

    // Set column widths
    worksheet['!cols'] = [
        { wch: 5 },  // No
        { wch: 8 },  // Cycle
        { wch: 30 }, // Nama Elemen
        { wch: 20 }, // Kategori
        { wch: 12 }, // Rating (%) -- Fixed misalignment
        { wch: 12 }, // M
        { wch: 12 }, // A
        { wch: 12 }, // W
        { wch: 12 }, // L
        { wch: 18 }, // Waktu Mulai
        { wch: 18 }, // Waktu Selesai
        { wch: 15 }, // Durasi
        { wch: 15 }, // Normal Time
        { wch: 15 }  // Standard Time
    ];

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -10);
    const sanitizedVideoName = (videoName || 'Untitled').replace(/[<>:"/\\|?*]/g, '_');
    const filename = `${sanitizedVideoName}_${timestamp}.xlsx`;

    // Download file using helper
    saveWorkbook(workbook, filename, (progress) => {
        if (onProgress) onProgress(progress);
    });
};

// Export comparison data to Excel
export const exportComparisonToExcel = (comparisonData, onProgress = null) => {
    if (!comparisonData || comparisonData.length === 0) {
        alert('Tidak ada data untuk di-export!');
        return;
    }

    if (onProgress) onProgress(10);

    const data = comparisonData.map((item, index) => ({
        'No.': index + 1,
        'Sesi': item.name,
        'Tanggal': item.date,
        'Total Waktu (s)': item.totalTime.toFixed(2),
        'Value Added (s)': item.valueAdded.toFixed(2),
        'Non Value Added (s)': item.nonValueAdded.toFixed(2),
        'Waste (s)': item.waste.toFixed(2),
        'VA %': item.vaPercent.toFixed(1) + '%'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Perbandingan Sesi');

    worksheet['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
        { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 10 }
    ];

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -10);
    saveWorkbook(workbook, `Comparison_${timestamp}.xlsx`, onProgress);
};

// Export aggregation data to Excel
export const exportAggregationToExcel = (aggregationData, onProgress = null) => {
    if (!aggregationData || aggregationData.length === 0) {
        alert('Tidak ada data untuk di-export!');
        return;
    }

    if (onProgress) onProgress(10);

    const data = aggregationData.map((item, index) => ({
        'No.': index + 1,
        'Nama Elemen': item.name,
        'Kategori': item.category,
        'Count': item.count,
        'Min (s)': item.min.toFixed(2),
        'Max (s)': item.max.toFixed(2),
        'Avg (s)': item.avg.toFixed(2),
        'Std Dev': item.stdDev.toFixed(3),
        'Total (s)': item.total.toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Agregasi Siklus');

    worksheet['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 20 }, { wch: 8 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
    ];

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -10);
    saveWorkbook(workbook, `Aggregation_${timestamp}.xlsx`, onProgress);
};

// Export standard time data to Excel
export const exportStandardTimeToExcel = (elementData, globalAllowance, onProgress = null) => {
    if (!elementData || elementData.length === 0) {
        alert('Tidak ada data untuk di-export!');
        return;
    }

    if (onProgress) onProgress(10);

    const data = elementData.map((item, index) => {
        const normalTime = item.avgTime * (item.rating / 100);
        const standardTime = normalTime * (1 + globalAllowance / 100);

        return {
            'No.': index + 1,
            'Nama Elemen': item.name,
            'Kategori': item.category,
            'Avg Time (s)': item.avgTime.toFixed(2),
            'Rating (%)': item.rating,
            'Normal Time (s)': normalTime.toFixed(2),
            'Allowance (%)': globalAllowance,
            'Standard Time (s)': standardTime.toFixed(2)
        };
    });

    // Add total
    const totalStdTime = elementData.reduce((total, item) => {
        const normalTime = item.avgTime * (item.rating / 100);
        const standardTime = normalTime * (1 + globalAllowance / 100);
        return total + standardTime;
    }, 0);

    data.push({});
    data.push({
        'No.': 'TOTAL',
        'Nama Elemen': '',
        'Kategori': '',
        'Avg Time (s)': '',
        'Rating (%)': '',
        'Normal Time (s)': '',
        'Allowance (%)': '',
        'Standard Time (s)': totalStdTime.toFixed(2)
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Standard Time');

    worksheet['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
        { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 18 }
    ];

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -10);
    saveWorkbook(workbook, `StandardTime_${timestamp}.xlsx`, onProgress);
};

// Export Cycle Time Analysis data to Excel
export const exportCycleTimeAnalysisToExcel = (aggregatedData, maxCycles, onProgress = null) => {
    if (!aggregatedData || aggregatedData.length === 0) {
        alert('Tidak ada data untuk di-export!');
        return;
    }

    if (onProgress) onProgress(10);

    // Prepare headers
    const headers = ['No.', 'Element Name', 'Category'];
    for (let i = 1; i <= maxCycles; i++) {
        headers.push(`Cycle ${i} (s)`);
    }
    headers.push('Min (s)', 'Max (s)', 'Average (s)');

    // Prepare data rows
    const data = aggregatedData.map((item, index) => {
        const row = {
            'No.': index + 1,
            'Element Name': item.elementName,
            'Category': item.category
        };

        // Add cycle values
        for (let i = 1; i <= maxCycles; i++) {
            row[`Cycle ${i} (s)`] = item.cycleValues[i] ? item.cycleValues[i].toFixed(2) : '-';
        }

        // Add stats
        row['Min (s)'] = item.min.toFixed(2);
        row['Max (s)'] = item.max.toFixed(2);
        row['Average (s)'] = item.average.toFixed(2);

        return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cycle Time Analysis');

    // Set column widths
    const wscols = [
        { wch: 5 },  // No
        { wch: 30 }, // Element Name
        { wch: 20 }, // Category
    ];
    // Add widths for cycle columns
    for (let i = 0; i < maxCycles; i++) {
        wscols.push({ wch: 12 });
    }
    // Add widths for stats
    wscols.push({ wch: 12 }, { wch: 12 }, { wch: 12 });

    worksheet['!cols'] = wscols;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -10);
    saveWorkbook(workbook, `CycleTimeAnalysis_${timestamp}.xlsx`, onProgress);
};

// Export Ergonomic Assessment Report to Excel
export const exportErgoReportToExcel = (reportData, onProgress = null) => {
    const { analysisMode, duration, historyData, highRiskIntervals, nioshParams, riskScores } = reportData;

    if (!historyData || historyData.length === 0) {
        alert('No analysis data available to export!');
        return;
    }

    if (onProgress) onProgress(10);

    // Calculate summary statistics
    const avgScore = historyData.reduce((sum, d) => sum + d.score, 0) / historyData.length;
    const maxScore = Math.max(...historyData.map(d => d.score));
    const minScore = Math.min(...historyData.map(d => d.score));
    const highRiskCount = historyData.filter(d => d.score > 6).length;
    const highRiskPercentage = ((highRiskCount / historyData.length) * 100).toFixed(1);

    // Sheet 1: Summary
    const summaryData = [
        { 'Parameter': 'Report Generated', 'Value': new Date().toLocaleString() },
        { 'Parameter': 'Assessment Method', 'Value': analysisMode },
        { 'Parameter': 'Video Duration', 'Value': `${duration.toFixed(2)} seconds` },
        { 'Parameter': '', 'Value': '' },
        { 'Parameter': 'RISK SCORES', 'Value': '' },
        { 'Parameter': 'Average Risk Score', 'Value': avgScore.toFixed(2) },
        { 'Parameter': 'Maximum Risk Score', 'Value': maxScore },
        { 'Parameter': 'Minimum Risk Score', 'Value': minScore },
        { 'Parameter': 'High Risk Frames', 'Value': `${highRiskCount} (${highRiskPercentage}%)` },
        { 'Parameter': 'High Risk Intervals', 'Value': highRiskIntervals.length }
    ];

    // Add NIOSH data if applicable
    if (analysisMode === 'NIOSH' && nioshParams) {
        summaryData.push(
            { 'Parameter': '', 'Value': '' },
            { 'Parameter': 'NIOSH PARAMETERS', 'Value': '' },
            { 'Parameter': 'Load Weight (kg)', 'Value': nioshParams.weight },
            { 'Parameter': 'Frequency (lifts/min)', 'Value': nioshParams.F },
            { 'Parameter': 'Horizontal Distance (cm)', 'Value': nioshParams.H },
            { 'Parameter': 'Vertical Distance (cm)', 'Value': nioshParams.V },
            { 'Parameter': 'Distance Traveled (cm)', 'Value': nioshParams.D },
            { 'Parameter': 'Asymmetry Angle (°)', 'Value': nioshParams.A },
            { 'Parameter': 'Lifting Index', 'Value': riskScores?.li || 'N/A' },
            { 'Parameter': 'Recommended Weight Limit (kg)', 'Value': riskScores?.rwl || 'N/A' }
        );
    }

    // Sheet 2: High Risk Segments
    const highRiskData = highRiskIntervals.map((interval, i) => ({
        'No.': i + 1,
        'Start Time (s)': interval.start.toFixed(2),
        'End Time (s)': interval.end.toFixed(2),
        'Duration (s)': (interval.end - interval.start).toFixed(2),
        'Peak Score': interval.peakScore || 'N/A'
    }));

    // Sheet 3: Recommendations
    const recommendationsData = [
        { 'Priority': 'P1', 'Type': 'Engineering', 'Recommendation': 'Reduce torso twisting by rearranging parts layout.' },
        { 'Priority': 'P2', 'Type': 'Ergonomic', 'Recommendation': 'Install height-adjustable chair for lower trunk stress.' },
        { 'Priority': 'P3', 'Type': 'Administrative', 'Recommendation': 'Implement worker rotation every 2 hours.' }
    ];

    // Sheet 4: Detailed Timeline
    const timelineData = historyData.map((d, i) => ({
        'Frame': i + 1,
        'Time (s)': Number(d.time || 0).toFixed(2),
        'Risk Score': d.score || 0,
        'Risk Level': (d.score || 0) <= 3 ? 'Low' : (d.score || 0) <= 6 ? 'Medium' : 'High'
    }));

    if (onProgress) onProgress(40);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Add Summary sheet
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Add High Risk Segments sheet
    const highRiskSheet = XLSX.utils.json_to_sheet(highRiskData);
    highRiskSheet['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, highRiskSheet, 'High Risk Segments');

    // Add Recommendations sheet
    const recommendationsSheet = XLSX.utils.json_to_sheet(recommendationsData);
    recommendationsSheet['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(workbook, recommendationsSheet, 'Recommendations');

    // Add Timeline sheet
    const timelineSheet = XLSX.utils.json_to_sheet(timelineData);
    timelineSheet['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, timelineSheet, 'Timeline');

    if (onProgress) onProgress(80);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -10);
    const filename = `Ergonomic_Report_${analysisMode}_${timestamp}.xlsx`;

    // Download file
    saveWorkbook(workbook, filename, onProgress);
};
