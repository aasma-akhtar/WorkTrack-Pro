const ExcelJS = require('exceljs');

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
 * Generates an Excel spreadsheet containing monthly attendance data and summary stats.
 */
const generateMonthlyExcel = async (res, employeeName, monthYear, records, summary) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance');

  // Title Block
  worksheet.mergeCells('A1:F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'WorkTrack Pro - Monthly Attendance Report';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '4F46E5' } // Indigo color
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  // Metadata
  worksheet.addRow([]);
  worksheet.addRow(['Employee Name:', employeeName]);
  worksheet.addRow(['Report Period:', monthYear]);
  worksheet.addRow(['Generated Date:', new Date().toLocaleDateString()]);
  worksheet.addRow([]);

  // Bold metadata titles
  worksheet.getCell('A3').font = { bold: true };
  worksheet.getCell('A4').font = { bold: true };
  worksheet.getCell('A5').font = { bold: true };

  // Summary Statistics Section
  worksheet.addRow(['Summary Statistics']).font = { bold: true, size: 12 };
  worksheet.addRow(['Total Days Logged', 'Present On-Time', 'Late Check-Ins', 'Half Days Logged']);
  worksheet.addRow([summary.totalDays || 0, summary.present || 0, summary.late || 0, summary.halfDay || 0]);
  
  // Format summary header and values
  worksheet.getRow(8).font = { bold: true };
  worksheet.getRow(8).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F3F4F6' }
  };
  worksheet.addRow([]);

  // Table Headers
  worksheet.addRow(['Detailed Logs']).font = { bold: true, size: 12 };
  worksheet.addRow(['Date', 'Check In', 'Check Out', 'Hours Worked', 'Status', 'IP Address', 'Check-in Status']);

  const headerRow = worksheet.getRow(12);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  const headers = ['A12', 'B12', 'C12', 'D12', 'E12', 'F12', 'G12'];
  headers.forEach(cellRef => {
    worksheet.getCell(cellRef).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '374151' } // Dark gray
    };
    worksheet.getCell(cellRef).alignment = { horizontal: 'center' };
  });

  // Data rows
  records.forEach((rec) => {
    const dateStr = rec.date instanceof Date 
      ? rec.date.toISOString().split('T')[0] 
      : String(rec.date).split('T')[0];

    const newRow = worksheet.addRow([
      dateStr,
      rec.check_in_time || '--:--:--',
      rec.check_out_time || '--:--:--',
      calculateHours(rec.check_in_time, rec.check_out_time),
      rec.status.toUpperCase(),
      rec.check_in_ip || '-',
      rec.check_in_status || 'verified'
    ]);

    // Align content
    newRow.getCell(1).alignment = { horizontal: 'center' };
    newRow.getCell(2).alignment = { horizontal: 'center' };
    newRow.getCell(3).alignment = { horizontal: 'center' };
    newRow.getCell(4).alignment = { horizontal: 'center' };
    newRow.getCell(5).alignment = { horizontal: 'center' };
    newRow.getCell(6).alignment = { horizontal: 'left' };
    newRow.getCell(7).alignment = { horizontal: 'center' };

    // Format Status colors
    const statusCell = newRow.getCell(5);
    if (rec.status === 'present') {
      statusCell.font = { bold: true, color: { argb: '059669' } };
    } else if (rec.status === 'late') {
      statusCell.font = { bold: true, color: { argb: 'D97706' } };
    } else if (rec.status === 'half_day') {
      statusCell.font = { bold: true, color: { argb: '2563EB' } };
    } else {
      statusCell.font = { bold: true, color: { argb: 'DC2626' } };
    }
  });

  // Auto-adjust column widths
  worksheet.columns.forEach((col) => {
    col.width = 22;
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Report_${employeeName.replace(/\s+/g, '_')}_${monthYear.replace('/', '_')}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  generateMonthlyExcel,
};
