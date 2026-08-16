import ExcelJS from "exceljs";

export async function rowsToExcelBuffer<T extends object>(rows: T[], sheetName: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  if (rows.length > 0) {
    const headers = Object.keys(rows[0]!);
    sheet.columns = headers.map((h) => ({ header: h, key: h, width: 18 }));
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) sheet.addRow(row as Record<string, unknown>);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
