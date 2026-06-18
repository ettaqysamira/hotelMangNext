import { jsPDF } from 'jspdf';

export function generateInvoicePdf({
  invoiceNumber, guestName, hostelName, roomNumber, bedNumber,
  checkInDate, checkOutDate, totalPrice, amountPaid, status
}: {
  invoiceNumber: string;
  guestName: string;
  hostelName: string;
  roomNumber: string;
  bedNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  amountPaid: number;
  status: string;
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Couleurs
  const primary = '#00ffff';
  const dark = '#080b12';
  const gray = '#8892a8';

  // Fond
  doc.setFillColor(8, 11, 18);
  doc.rect(0, 0, pageWidth, 297, 'F');

  // Accent header
  doc.setFillColor(0, 212, 170);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Titre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(0, 212, 170);
  doc.text('ROOMIFY', pageWidth / 2, 24, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(136, 146, 168);
  doc.text('Facture de réservation · Invoice', pageWidth / 2, 32, { align: 'center' });

  // Separator
  doc.setDrawColor(28, 35, 51);
  doc.line(20, 38, pageWidth - 20, 38);

  // Invoice number
  doc.setFontSize(16);
  doc.setTextColor(232, 237, 245);
  doc.text(invoiceNumber, 20, 52);

  doc.setFontSize(8);
  doc.setTextColor(136, 146, 168);
  doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 20, 52, { align: 'right' });

  // Info box
  const boxY = 62;
  doc.setDrawColor(28, 35, 51);
  doc.setFillColor(13, 17, 23);
  doc.roundedRect(20, boxY, pageWidth - 40, 50, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(232, 237, 245);
  doc.text(`Client: ${guestName}`, 28, boxY + 12);
  doc.text(`Établissement: ${hostelName}`, 28, boxY + 22);
  doc.text(`Chambre: ${roomNumber} ${bedNumber ? '· Lit ' + bedNumber : ''}`, 28, boxY + 32);
  doc.text(`Séjour: ${checkInDate} → ${checkOutDate}`, 28, boxY + 42);

  // Table
  const tableY = boxY + 70;
  doc.setFillColor(0, 212, 170);
  doc.rect(20, tableY, pageWidth - 40, 10, 'F');
  doc.setFontSize(8);
  doc.setTextColor(8, 11, 18);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 28, tableY + 7);
  doc.text('Montant', pageWidth - 28, tableY + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(232, 237, 245);
  doc.setFontSize(10);
  const nights = Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24));
  doc.text(`Hébergement (${nights} nuits)`, 28, tableY + 24);
  doc.text(`${totalPrice.toFixed(2)} EUR`, pageWidth - 28, tableY + 24, { align: 'right' });

  doc.setDrawColor(28, 35, 51);
  doc.line(20, tableY + 32, pageWidth - 20, tableY + 32);

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 212, 170);
  doc.text('TOTAL', 28, tableY + 44);
  doc.text(`${totalPrice.toFixed(2)} EUR`, pageWidth - 28, tableY + 44, { align: 'right' });

  // Status badge
  const statusY = tableY + 60;
  const paid = status === 'PAID' || status === 'PAID_PARTIALLY';
  doc.setFillColor(paid ? 0 : 255, paid ? 230 : 77, paid ? 118 : 109);
  doc.roundedRect(pageWidth - 60, statusY - 4, 40, 8, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(paid ? 8 : 255, paid ? 11 : 255, paid ? 18 : 255);
  doc.text(status, pageWidth - 40, statusY + 1, { align: 'center' });

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(90, 100, 120);
  doc.text('Roomify Management System · Document généré automatiquement', pageWidth / 2, 280, { align: 'center' });

  doc.save(`facture-${invoiceNumber}.pdf`);
}
