declare global {
  interface Window {
    XLSX?: {
      read: (data: ArrayBuffer, options: { type: string }) => any;
      utils: {
        sheet_to_json: (sheet: unknown, options: { header: number; defval: string }) => unknown[][];
      };
    };
  }
}

let sheetJsLoader: Promise<NonNullable<Window['XLSX']>> | null = null;

function loadSheetJs() {
  if (window.XLSX) {
    return Promise.resolve(window.XLSX);
  }

  if (!sheetJsLoader) {
    sheetJsLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.async = true;
      script.onload = () => {
        if (window.XLSX) {
          resolve(window.XLSX);
          return;
        }

        reject(new Error('Biblioteca de planilha não carregada.'));
      };
      script.onerror = () => reject(new Error('Falha ao carregar parser XLSX.'));
      document.head.appendChild(script);
    });
  }

  return sheetJsLoader;
}

function rowLooksLikeHeader(cells: string[]) {
  const normalized = cells.join(' ').toLowerCase();
  return normalized.includes('sku') || normalized.includes('descri') || normalized.includes('quant');
}

function rowsToDraftLines(rows: string[][]) {
  return rows
    .filter((row) => row.some((cell) => cell.trim()))
    .filter((row, index) => (index === 0 ? !rowLooksLikeHeader(row) : true))
    .map((row) => {
      const [sku = '', description = '', quantity = '1', unit = 'un', targetPrice = '0'] = row;
      return [sku, description, quantity, unit, targetPrice].map((cell) => cell.trim()).join(' | ');
    })
    .join('\n');
}

export async function parseSpreadsheetFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.split(/[;,]/).map((cell) => cell.trim()));

    return rowsToDraftLines(rows);
  }

  if (extension !== 'xlsx' && extension !== 'xls') {
    throw new Error('Formato inválido. Use CSV, XLS ou XLSX.');
  }

  const XLSX = await loadSheetJs();
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const firstSheetName = workbook.SheetNames?.[0];

  if (!firstSheetName) {
    throw new Error('A planilha não possui abas legíveis.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];
  return rowsToDraftLines(rows.map((row) => row.map((cell) => String(cell ?? ''))));
}