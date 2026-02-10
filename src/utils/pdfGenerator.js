import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export const generateManualPDF = async (guide) => {
    try {
        if (!guide.steps || guide.steps.length === 0) {
            throw new Error('No steps to export.');
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let yPos = margin;

        // Document Title
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(guide.title || 'Work Instructions', margin, yPos + 5);

        // QR Code - Top Right Corner (web-accessible URL)
        const baseUrl = window.location.origin;
        const manualId = guide.id || 'preview';
        const qrUrl = `${baseUrl}/#/manual/${manualId}`;

        try {
            const qrDataUrl = await QRCode.toDataURL(qrUrl, {
                width: 40,
                margin: 1,
                color: { dark: '#0078d4', light: '#ffffff' }
            });
            doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 11, margin, 11, 11);
            doc.setFontSize(5);
            doc.setTextColor(100, 100, 100);
            doc.text('Scan', pageWidth - margin - 5.5, margin + 12, { align: 'center' });
        } catch (qrError) {
            console.log('QR code error:', qrError);
        }

        yPos += 12;

        // Black line under title
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        // Document Metadata Table
        doc.setFontSize(8);
        const cellHeight = 6;
        const labelWidth = 38;
        const valueWidth = 52;

        const drawMetaRow = (label1, value1, label2, value2, y) => {
            const x1 = margin;
            const x2 = margin + labelWidth + valueWidth;

            // Draw all rectangles first (structure)
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.1);

            // Left label cell (with gray background)
            doc.setFillColor(245, 245, 245);
            doc.rect(x1, y, labelWidth, cellHeight, 'FD');

            // Left value cell (white background)
            doc.setFillColor(255, 255, 255);
            doc.rect(x1 + labelWidth, y, valueWidth, cellHeight, 'FD');

            // Right label cell (with gray background)
            doc.setFillColor(245, 245, 245);
            doc.rect(x2, y, labelWidth, cellHeight, 'FD');

            // Right value cell (white background)
            doc.setFillColor(255, 255, 255);
            doc.rect(x2 + labelWidth, y, valueWidth, cellHeight, 'FD');

            // Now add text on top
            doc.setTextColor(0, 0, 0);

            // Left pair text
            doc.setFont(undefined, 'bold');
            doc.text(label1, x1 + 2, y + 4);
            doc.setFont(undefined, 'normal');
            doc.text(value1 || '-', x1 + labelWidth + 2, y + 4);

            // Right pair text
            doc.setFont(undefined, 'bold');
            doc.text(label2, x2 + 2, y + 4);
            doc.setFont(undefined, 'normal');
            doc.text(value2 || '-', x2 + labelWidth + 2, y + 4);
        };

        drawMetaRow('Doc Number', guide.documentNumber, 'Revision Date', guide.revisionDate, yPos);
        yPos += cellHeight;
        drawMetaRow('Version', guide.version, 'Effective Date', guide.effectiveDate, yPos);
        yPos += cellHeight;
        drawMetaRow('Status', guide.status, 'Difficulty', guide.difficulty, yPos);
        yPos += cellHeight;
        drawMetaRow('Author', guide.author, 'Time Required', guide.timeRequired, yPos);
        yPos += cellHeight;

        // Description (full width)
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPos, labelWidth, cellHeight, 'FD');
        doc.setFillColor(255, 255, 255);
        doc.rect(margin + labelWidth, yPos, pageWidth - margin - margin - labelWidth, cellHeight, 'FD');

        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text('Description', margin + 2, yPos + 4);
        doc.setFont(undefined, 'normal');
        const descText = doc.splitTextToSize(guide.summary || guide.description || '-', pageWidth - margin - margin - labelWidth - 4);
        doc.text(descText, margin + labelWidth + 2, yPos + 4);
        yPos += cellHeight + 10;

        // Steps
        guide.steps.forEach((step, index) => {
            // Check if we need a new page
            if (yPos > pageHeight - 80) {
                doc.addPage();
                yPos = margin;
            }

            // Step Title (above everything)
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            const stepTitle = step.title || `Step ${index + 1}`;
            doc.text(`Step ${index + 1}: ${stepTitle}`, margin, yPos);
            yPos += 8;

            const contentStartY = yPos;
            const imageWidth = 70;
            const imageHeight = 55;
            const textStartX = margin + imageWidth + 5;
            const textWidth = pageWidth - textStartX - margin;

            // Image on the left
            if (step.media && step.media.url) {
                try {
                    doc.addImage(step.media.url, 'JPEG', margin, yPos, imageWidth, imageHeight);
                } catch (e) {
                    console.error('PDF Image Error', e);
                }
            }

            // Instructions and Alerts on the right
            let textY = yPos;
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);

            // Instructions
            if (step.instructions) {
                const plainText = step.instructions.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
                if (plainText) {
                    const splitInst = doc.splitTextToSize(plainText, textWidth);
                    doc.text(splitInst, textStartX, textY);
                    textY += (splitInst.length * 4) + 3;
                }
            }

            // Alerts/Bullets
            if (step.bullets && step.bullets.length > 0) {
                step.bullets.forEach(b => {
                    let prefix = '';
                    let color = [0, 0, 0];
                    const bType = typeof b === 'string' ? 'bullet' : b.type;
                    const bText = typeof b === 'string' ? b : b.text;

                    if (bType === 'note') {
                        prefix = 'NOTE: ';
                        color = [0, 120, 212];
                    } else if (bType === 'warning') {
                        prefix = 'WARNING: ';
                        color = [255, 170, 0];
                    } else if (bType === 'caution') {
                        prefix = 'CAUTION: ';
                        color = [209, 52, 56];
                    } else {
                        prefix = '• ';
                    }

                    doc.setFont(undefined, 'bold');
                    doc.setTextColor(color[0], color[1], color[2]);
                    const prefixWidth = doc.getTextWidth(prefix);
                    doc.text(prefix, textStartX, textY);

                    doc.setFont(undefined, 'normal');
                    const bulletText = doc.splitTextToSize(bText, textWidth - prefixWidth - 2);
                    doc.text(bulletText, textStartX + prefixWidth, textY);
                    textY += (bulletText.length * 4) + 2;
                    doc.setTextColor(0, 0, 0);
                });
            }

            // Move yPos to the bottom of the tallest content (image or text)
            const imageBottom = contentStartY + imageHeight;
            const textBottom = textY;
            yPos = Math.max(imageBottom, textBottom) + 8;
        });

        doc.save(`${(guide.title || 'manual').replace(/\s+/g, '_')}.pdf`);
        return true;
    } catch (e) {
        console.error(e);
        throw e;
    }
};
