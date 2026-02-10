import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Export Standard Work Combination Sheet to PDF
 * @param {string} elementId - The ID of the DOM element to capture
 * @param {string} filename - The desired filename for the PDF
 */
export async function exportSWCSToPDF(elementId, filename = 'standard-work-combination-sheet.pdf') {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with ID ${elementId} not found`);
        return;
    }

    try {
        // Capture the element as a canvas
        const canvas = await html2canvas(element, {
            scale: 2, // Higher scale for better resolution
            backgroundColor: '#ffffff', // Ensure white background
            useCORS: true // Allow cross-origin images if any
        });

        const imgData = canvas.toDataURL('image/png');

        // Create PDF (Landscape A4)
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Calculate image dimensions to fit PDF
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Add image to PDF
        // If image height exceeds page height, we might need to scale it down or split (simple scaling for now)
        if (imgHeight > pdfHeight) {
            const scaledWidth = (pdfHeight * imgWidth) / imgHeight;
            pdf.addImage(imgData, 'PNG', (pdfWidth - scaledWidth) / 2, 0, scaledWidth, pdfHeight);
        } else {
            pdf.addImage(imgData, 'PNG', 0, (pdfHeight - imgHeight) / 2, imgWidth, imgHeight);
        }

        pdf.save(filename);
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Gagal mengekspor PDF: ' + error.message);
    }
}
