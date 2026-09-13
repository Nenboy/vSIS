import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function downloadIdCardAsPdf(elementId: string, fileName: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('ID card element not found');
    return;
  }

  try {
    // 1. Render the element to a high-res canvas
    const canvas = await html2canvas(element, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');

    // 2. ✅ Calculate PDF size to MATCH the card's aspect ratio
    const cardWidthMm = 86; // 86mm wide (standard ID width)
    const cardHeightMm = (canvas.height / canvas.width) * cardWidthMm;

    // 3. Create PDF sized exactly to the card
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [cardWidthMm, cardHeightMm],
    });

    // 4. Add the image, filling the entire page
    pdf.addImage(imgData, 'PNG', 0, 0, cardWidthMm, cardHeightMm);

    // 5. Download
    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate the PDF. Please try again.');
  }
}