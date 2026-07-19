const PDFDocument = require('pdfkit');

/**
 * Helper to calculate hours worked from check-in and check-out times
 */
const calculateHours = (checkInTime, checkOutTime) => {
  if (!checkInTime || !checkOutTime) return '--';
  
  const [inH, inM, inS] = checkInTime.split(':').map(Number);
  const [outH, outM, outS] = checkOutTime.split(':').map(Number);
  
  const inMinutes = inH * 60 + inM + inS / 60;
  const outMinutes = outH * 60 + outM + outS / 60;
  
  let diffMinutes = outMinutes - inMinutes;
  if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight shifts
  
  const hours = Math.floor(diffMinutes / 60);
  const minutes = Math.round(diffMinutes % 60);
  
  return `${hours}h ${minutes}m`;
};

/**
 * Generates a monthly attendance PDF report and streams it directly to the Express response object.
 */
const generateMonthlyPDF = (res, employeeName, monthYear, records, summary) => {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Report_${employeeName.replace(/\s+/g, '_')}_${monthYear.replace('/', '_')}.pdf`
  );

  doc.pipe(res);

  // Header Brand
  doc.fillColor('#4f46e5').fontSize(24).text('WorkTrack Pro', { align: 'left' });
  doc.fillColor('#4b5563').fontSize(10).text('Employee Workforce Management & Attendance Systems', { align: 'left' });
  doc.moveDown(2);

  // Document Title
  doc.fillColor('#1f2937').fontSize(18).text('Monthly Attendance Report', { align: 'center', underline: true });
  doc.moveDown(1.5);

  // Employee Information Section
  doc.fillColor('#1f2937').fontSize(12);
  const infoTop = doc.y;
  doc.text(`Employee Name:  ${employeeName}`, 50, infoTop);
  doc.text(`Report Period:  ${monthYear}`, 50, infoTop + 20);
  doc.text(`Generated On:   ${new Date().toLocaleDateString()}`, 350, infoTop);
  doc.text(`Organization:   Headquarters`, 350, infoTop + 20);
  doc.moveDown(2.5);

  // Summary Grid Panel
  doc.fillColor('#111827').fontSize(14).text('Summary Statistics', { bold: true });
  doc.moveDown(0.5);

  const statsY = doc.y;
  doc.rect(50, statsY, 512, 60).fill('#f3f4f6');
  
  doc.fillColor('#374151').fontSize(10);
  doc.text('Total Days Logged', 60, statsY + 15);
  doc.text('Present On-Time', 180, statsY + 15);
  doc.text('Late Check-Ins', 300, statsY + 15);
  doc.text('Half Days Logged', 420, statsY + 15);

  doc.fillColor('#1e1b4b').fontSize(14);
  doc.text(`${summary.totalDays || 0}`, 60, statsY + 32, { bold: true });
  doc.text(`${summary.present || 0}`, 180, statsY + 32, { bold: true });
  doc.text(`${summary.late || 0}`, 300, statsY + 32, { bold: true });
  doc.text(`${summary.halfDay || 0}`, 420, statsY + 32, { bold: true });
  
  doc.y = statsY + 80; // Reset Y coordinate below card

  // Attendance Records Table
  doc.fillColor('#111827').fontSize(14).text('Detailed Logs', { bold: true });
  doc.moveDown(0.5);

  const tableTop = doc.y;
  doc.fontSize(10).fillColor('#4b5563');
  doc.text('Date', 50, tableTop, { bold: true });
  doc.text('Check In', 130, tableTop, { bold: true });
  doc.text('Check Out', 200, tableTop, { bold: true });
  doc.text('Hours', 270, tableTop, { bold: true });
  doc.text('Status', 320, tableTop, { bold: true });
  doc.text('IP Address', 385, tableTop, { bold: true });

  // Draw Header Line
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, tableTop + 15).lineTo(562, tableTop + 15).stroke();

  let currentY = tableTop + 25;

  records.forEach((rec) => {
    // Add page if exceeding safe vertical limit
    if (currentY > doc.page.height - 80) {
      doc.addPage();
      currentY = 50;
    }

    const dateStr = rec.date instanceof Date 
      ? rec.date.toISOString().split('T')[0] 
      : String(rec.date).split('T')[0];

    doc.fillColor('#374151').fontSize(9);
    doc.text(dateStr, 50, currentY);
    doc.text(rec.check_in_time || '--:--:--', 130, currentY);
    doc.text(rec.check_out_time || '--:--:--', 200, currentY);
    doc.text(calculateHours(rec.check_in_time, rec.check_out_time), 270, currentY);

    // Apply color indicator for status
    let statusColor = '#059669'; // Green for present
    if (rec.status === 'late') statusColor = '#d97706'; // Amber
    if (rec.status === 'half_day') statusColor = '#2563eb'; // Blue
    if (rec.status === 'absent') statusColor = '#dc2626'; // Red

    doc.fillColor(statusColor).text(rec.status.toUpperCase(), 320, currentY, { bold: true });
    doc.fillColor('#374151').text(rec.check_in_ip || '-', 385, currentY);

    // Light line divider
    doc.strokeColor('#f3f4f6').moveTo(50, currentY + 13).lineTo(562, currentY + 13).stroke();
    currentY += 20;
  });

  doc.end();
};

module.exports = {
  generateMonthlyPDF,
};
