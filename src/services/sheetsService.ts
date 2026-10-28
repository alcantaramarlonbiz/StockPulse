import { InventoryItem } from '../types/inventory';

export const SHEET_HEADERS = [
  'SKU / Barcode',
  'Item Name',
  'Category',
  'Quantity',
  'Min Threshold',
  'Unit Price ($)',
  'Location / Shelf',
  'Status',
  'Last Updated',
  'Notes'
];

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * Creates a brand new Google Spreadsheet formatted specifically for StockPulse Inventory.
 */
export async function createInventorySpreadsheet(
  accessToken: string,
  title: string = 'StockPulse Inventory'
): Promise<{ id: string; url: string; name: string }> {
  const dateStr = new Date().toISOString().split('T')[0];
  const fullTitle = `${title} (${dateStr})`;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: fullTitle
      },
      sheets: [
        {
          properties: {
            title: 'Inventory',
            gridProperties: {
              frozenRowCount: 1
            }
          }
        }
      ]
    })
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to create spreadsheet: ${createRes.statusText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // Initialize header row and formatting
  await initializeSheetHeaders(accessToken, spreadsheetId, 'Inventory');

  return {
    id: spreadsheetId,
    url: spreadsheetUrl,
    name: fullTitle
  };
}

/**
 * Populates header row and header styling
 */
export async function initializeSheetHeaders(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string = 'Inventory'
) {
  // Write header values
  const writeHeaderRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:J1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: `${sheetTitle}!A1:J1`,
        majorDimension: 'ROWS',
        values: [SHEET_HEADERS]
      })
    }
  );

  if (!writeHeaderRes.ok) {
    console.warn('Could not write header row, attempting batchUpdate format');
  }

  // Format headers with blue background, bold white text
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 10
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.08, green: 0.15, blue: 0.28 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  horizontalAlignment: 'CENTER'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 10
              }
            }
          }
        ]
      })
    });
  } catch (fmtErr) {
    console.warn('Batch header styling failed non-fatally:', fmtErr);
  }
}

/**
 * List existing spreadsheets the user has access to in Drive
 */
export async function listUserSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  try {
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&pageSize=25&fields=files(id,name,modifiedTime,webViewLink)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!res.ok) {
      console.warn('Drive file search returned status', res.status);
      return [];
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Error fetching spreadsheets from Google Drive:', err);
    return [];
  }
}

/**
 * Get spreadsheet details and tab names
 */
export async function getSpreadsheetDetails(accessToken: string, spreadsheetId: string) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties,sheets.properties`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch sheet info: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Read inventory records from a Google Sheet
 */
export async function readInventoryFromSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle?: string
): Promise<{ items: InventoryItem[]; sheetName: string; title: string }> {
  // If sheetTitle not specified, fetch metadata to get the first sheet's title
  let targetSheet: string = sheetTitle || '';
  let docTitle = 'Spreadsheet';

  if (!targetSheet) {
    const meta = await getSpreadsheetDetails(accessToken, spreadsheetId);
    docTitle = meta.properties?.title || 'Spreadsheet';
    const sheets = meta.sheets || [];
    // Prefer sheet named "Inventory" if it exists, else the first tab
    const invSheet = sheets.find((s: any) => s.properties?.title?.toLowerCase() === 'inventory');
    targetSheet = invSheet?.properties?.title || sheets[0]?.properties?.title || 'Sheet1';
  }

  const range = `${targetSheet}!A1:J2000`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to read values: ${res.statusText}`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  if (rows.length === 0) {
    return { items: [], sheetName: targetSheet, title: docTitle };
  }

  // Header detection
  const firstRow = rows[0].map((c: any) => String(c || '').toLowerCase().trim());
  let skuIdx = firstRow.findIndex((c: string) => c.includes('sku') || c.includes('barcode') || c.includes('code'));
  let nameIdx = firstRow.findIndex((c: string) => c.includes('name') || c.includes('item') || c.includes('product') || c.includes('title'));
  let catIdx = firstRow.findIndex((c: string) => c.includes('cat') || c.includes('dept') || c.includes('type'));
  let qtyIdx = firstRow.findIndex((c: string) => c.includes('qty') || c.includes('quantity') || c.includes('stock') || c.includes('count'));
  let minIdx = firstRow.findIndex((c: string) => c.includes('min') || c.includes('threshold') || c.includes('reorder'));
  let priceIdx = firstRow.findIndex((c: string) => c.includes('price') || c.includes('cost') || c.includes('unit'));
  let locIdx = firstRow.findIndex((c: string) => c.includes('loc') || c.includes('aisle') || c.includes('shelf') || c.includes('bin'));
  let notesIdx = firstRow.findIndex((c: string) => c.includes('note') || c.includes('desc') || c.includes('comment'));
  let updatedIdx = firstRow.findIndex((c: string) => c.includes('update') || c.includes('date') || c.includes('time'));

  // Default indices if headers not matched standard names
  if (skuIdx === -1) skuIdx = 0;
  if (nameIdx === -1) nameIdx = 1;
  if (catIdx === -1) catIdx = 2;
  if (qtyIdx === -1) qtyIdx = 3;
  if (minIdx === -1) minIdx = 4;
  if (priceIdx === -1) priceIdx = 5;
  if (locIdx === -1) locIdx = 6;
  if (notesIdx === -1) notesIdx = 9;
  if (updatedIdx === -1) updatedIdx = 8;

  const items: InventoryItem[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const sku = String(row[skuIdx] || '').trim();
    const name = String(row[nameIdx] || '').trim();

    // Skip empty lines
    if (!sku && !name) continue;

    const rawQty = parseFloat(String(row[qtyIdx] || '0').replace(/[^0-9.-]/g, ''));
    const quantity = isNaN(rawQty) ? 0 : rawQty;

    const rawMin = parseFloat(String(row[minIdx] || '5').replace(/[^0-9.-]/g, ''));
    const minThreshold = isNaN(rawMin) ? 5 : rawMin;

    const rawPrice = parseFloat(String(row[priceIdx] || '0').replace(/[^0-9.-]/g, ''));
    const unitPrice = isNaN(rawPrice) ? 0 : rawPrice;

    const category = String(row[catIdx] || 'General').trim() || 'General';
    const location = String(row[locIdx] || 'Warehouse').trim() || 'Warehouse';
    const notes = notesIdx !== -1 && row[notesIdx] ? String(row[notesIdx]).trim() : '';
    const lastUpdated = updatedIdx !== -1 && row[updatedIdx] ? String(row[updatedIdx]).trim() : new Date().toISOString();

    items.push({
      id: sku ? `item-${sku}` : `item-${Date.now()}-${i}`,
      sku: sku || `SKU-${1000 + i}`,
      name: name || 'Untitled Item',
      category,
      quantity,
      minThreshold,
      unitPrice,
      location,
      notes,
      lastUpdated
    });
  }

  return { items, sheetName: targetSheet, title: docTitle };
}

/**
 * Synchronize full inventory dataset to the Google Sheet
 */
export async function syncInventoryToSheet(
  accessToken: string,
  spreadsheetId: string,
  items: InventoryItem[],
  sheetTitle: string = 'Inventory'
): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Build rows array: header + all items
  const rows: (string | number)[][] = [
    SHEET_HEADERS
  ];

  for (const item of items) {
    let statusText = 'OK';
    if (item.quantity <= 0) {
      statusText = 'OUT OF STOCK';
    } else if (item.quantity <= item.minThreshold) {
      statusText = 'LOW STOCK';
    }

    rows.push([
      item.sku,
      item.name,
      item.category,
      item.quantity,
      item.minThreshold,
      Number(item.unitPrice.toFixed(2)),
      item.location,
      statusText,
      item.lastUpdated || now,
      item.notes || ''
    ]);
  }

  // Clear existing range first to prevent leftover rows
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:J2000:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  // Write new rows
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:J${rows.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: `${sheetTitle}!A1:J${rows.length}`,
        majorDimension: 'ROWS',
        values: rows
      })
    }
  );

  if (!writeRes.ok) {
    const errorData = await writeRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Sync failed: ${writeRes.statusText}`);
  }
}
