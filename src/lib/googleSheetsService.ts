import { Order, MenuItem, OrderStatus } from '../types';

export interface SheetConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

// Check if a spreadsheet ID is already linked
export const getLinkedSpreadsheetId = (): string | null => {
  return localStorage.getItem('google_spreadsheet_id');
};

export const setLinkedSpreadsheetId = (id: string, url: string) => {
  localStorage.setItem('google_spreadsheet_id', id);
  localStorage.setItem('google_spreadsheet_url', url);
};

export const unlinkSpreadsheet = () => {
  localStorage.removeItem('google_spreadsheet_id');
  localStorage.removeItem('google_spreadsheet_url');
};

/**
 * Creates a brand new Google Spreadsheet structured precisely as requested
 */
export const createSpreadsheet = async (
  accessToken: string,
  defaultMenuItems: MenuItem[],
  defaultOrders: Order[]
): Promise<SheetConfig> => {
  if (accessToken && accessToken.startsWith('mock_token_')) {
    const spreadsheetId = '1CmMJtsHuAcI36UvWkHBn0nOOxGyFlfRLVKBp-vkcOIg';
    const spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1CmMJtsHuAcI36UvWkHBn0nOOxGyFlfRLVKBp-vkcOIg/edit?gid=264988304#gid=264988304';
    setLinkedSpreadsheetId(spreadsheetId, spreadsheetUrl);
    return { spreadsheetId, spreadsheetUrl };
  }
  try {
    // 1. Create Spreadsheet with correct sheets
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: 'G-Order Manager Database - Nhà Của Bắp',
        },
        sheets: [
          { properties: { title: 'DON_HANG' } },
          { properties: { title: 'CHI_TIET_DON_HANG' } },
          { properties: { title: 'MENU' } },
          { properties: { title: 'KHACH_HANG' } },
          { properties: { title: 'BAO_CAO' } },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw handleSheetsApiError(errText, 'Không thể tạo tệp Google Sheets mới.');
    }

    const sheetData = await response.json();
    const { spreadsheetId, spreadsheetUrl } = sheetData;

    // 2. Prepare relational seed data
    // MENU
    const menuRows = defaultMenuItems.map((item, idx) => [
      item.id,
      item.name,
      item.category,
      item.price,
      'TRUE',
      idx + 1,
    ]);

    // KHACH_HANG
    const customers: { [phone: string]: any } = {};
    defaultOrders.forEach((o) => {
      const cleanPhone = o.phone.replace(/\s+/g, '');
      if (!customers[cleanPhone]) {
        customers[cleanPhone] = {
          id: `KH${1000 + Object.keys(customers).length + 1}`,
          name: o.customerName,
          phone: o.phone,
          address: o.note || 'Địa chỉ mặc định',
          total_orders: 0,
          total_spent: 0,
          last_order: o.deliveryDate || '2026-07-02',
        };
      }
      customers[cleanPhone].total_orders += 1;
      customers[cleanPhone].total_spent += o.totalAmount;
    });
    const customerRows = Object.values(customers).map((c) => [
      c.id,
      c.name,
      c.phone,
      c.address,
      c.total_orders,
      c.total_spent,
      c.last_order,
    ]);

    // DON_HANG
    const orderRows = defaultOrders.map((o) => {
      const subtotal = o.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const totalQty = o.items.reduce((sum, item) => sum + item.quantity, 0);
      return [
        o.id,
        o.deliveryDate || '2026-07-02',
        o.customerName,
        o.phone,
        o.deliveryDate || '2026-07-02',
        o.deliveryTime || '12:00',
        totalQty,
        subtotal,
        0, // shipping_fee
        0, // discount
        o.totalAmount,
        (o as any).paymentMethod || 'Tiền mặt',
        (o as any).paymentStatus || (o.status === 'Đã giao' ? 'Đã thanh toán' : 'Chưa thanh toán'),
        o.status,
        o.status === 'Đã giao' ? `${o.deliveryDate || '2026-07-02'} ${o.deliveryTime || '12:00'}` : '',
        o.source,
        o.note || '',
        new Date().toISOString(),
        new Date().toISOString(),
      ];
    });

    // CHI_TIET_DON_HANG
    let detailCounter = 1;
    const detailRows: any[] = [];
    defaultOrders.forEach((o) => {
      o.items.forEach((item) => {
        const detailId = `CT${String(detailCounter++).padStart(4, '0')}`;
        detailRows.push([
          detailId,
          o.id,
          item.id,
          item.name,
          item.quantity,
          item.price,
          item.price * item.quantity,
        ]);
      });
    });

    // 3. Batch write all headers and default data
    const batchResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: [
            // Headers
            {
              range: 'DON_HANG!A1:S1',
              values: [[
                'order_id', 'order_date', 'customer_name', 'phone', 'delivery_date', 'delivery_time',
                'total_quantity', 'subtotal', 'shipping_fee', 'discount', 'total_amount',
                'payment_method', 'payment_status', 'order_status', 'delivered_at', 'source', 'note', 'created_at', 'updated_at'
              ]],
            },
            {
              range: 'CHI_TIET_DON_HANG!A1:G1',
              values: [[
                'detail_id', 'order_id', 'menu_id', 'menu_name', 'quantity', 'unit_price', 'line_total'
              ]],
            },
            {
              range: 'MENU!A1:F1',
              values: [[
                'menu_id', 'menu_name', 'category', 'price', 'active', 'sort_order'
              ]],
            },
            {
              range: 'KHACH_HANG!A1:G1',
              values: [[
                'customer_id', 'customer_name', 'phone', 'address', 'total_orders', 'total_spent', 'last_order'
              ]],
            },
            // Seeding Data
            {
              range: `MENU!A2:F${menuRows.length + 1}`,
              values: menuRows,
            },
            {
              range: `KHACH_HANG!A2:G${customerRows.length + 1}`,
              values: customerRows,
            },
            {
              range: `DON_HANG!A2:S${orderRows.length + 1}`,
              values: orderRows,
            },
            {
              range: `CHI_TIET_DON_HANG!A2:G${detailRows.length + 1}`,
              values: detailRows,
            },
            // BAO_CAO Sheet Setup with powerful Google Sheet formulas!
            {
              range: 'BAO_CAO!A1:B15',
              values: [
                ['THỐNG KÊ DOANH THU & ĐƠN HÀNG (TỰ ĐỘNG CHẠY)', ''],
                ['Tổng đơn hôm nay', '=COUNTIF(DON_HANG!B:B, TEXT(TODAY(), "yyyy-mm-dd"))'],
                ['Tổng doanh thu toàn bộ', '=SUM(DON_HANG!K:K)'],
                ['Số đơn đã hoàn thành', '=COUNTIF(DON_HANG!N:N, "Đã giao")'],
                ['Số đơn chưa giao', '=COUNTIF(DON_HANG!N:N, "Đang chờ") + COUNTIF(DON_HANG!N:N, "Chuẩn bị") + COUNTIF(DON_HANG!N:N, "Đang giao")'],
                ['Món bán chạy nhất', '=IFERROR(INDEX(QUERY(CHI_TIET_DON_HANG!D:E, "select D, sum(E) where D is not null group by D order by sum(E) desc", 1), 2, 1), "Chưa có")'],
                ['Khách hàng thân thiết nhất', '=IFERROR(INDEX(QUERY(DON_HANG!C:D, "select C, count(D) where C is not null group by C order by count(D) desc", 1), 2, 1), "Chưa có")'],
                ['Tỷ lệ hoàn thành đơn', '=IF(COUNTA(DON_HANG!A:A)-1 > 0, COUNTIF(DON_HANG!N:N, "Đã giao") / (COUNTA(DON_HANG!A:A)-1), 0)'],
                ['', ''],
                ['Lưu ý:', 'Dữ liệu được cập nhật tự động thời gian thực từ phần mềm G-Order Manager.'],
                ['Thời gian thiết lập', new Date().toLocaleString('vi-VN')],
              ],
            },
          ],
        }),
      }
    );

    if (!batchResponse.ok) {
      const errText = await batchResponse.text();
      throw handleSheetsApiError(errText, 'Không thể thiết lập dữ liệu mẫu và tiêu đề cột.');
    }

    // 4. Set Spreadsheet styling to look gorgeous
    // To keep it simple and perfectly robust, let's execute formatting
    await formatSheets(accessToken, spreadsheetId, sheetData.sheets);

    setLinkedSpreadsheetId(spreadsheetId, spreadsheetUrl);
    return { spreadsheetId, spreadsheetUrl };
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    throw error;
  }
};

/**
 * Applies professional aesthetic styles to the created Spreadsheet sheets
 */
const formatSheets = async (accessToken: string, spreadsheetId: string, sheets: any[]) => {
  try {
    const requests = sheets.map((sheet) => {
      const sheetId = sheet.properties.sheetId;
      return [
        // Bold headers
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.98, green: 0.95, blue: 0.93 }, // Soft cream/orange tint
                textFormat: {
                  bold: true,
                  fontSize: 10,
                  foregroundColor: { red: 0.1, green: 0.1, blue: 0.1 },
                },
                horizontalAlignment: 'CENTER',
                borders: {
                  bottom: { style: 'SOLID_MEDIUM', color: { red: 0.9, green: 0.5, blue: 0.2 } },
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,borders)',
          },
        },
        // Enable grid lines
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                showGridLines: true,
              },
            },
            fields: 'gridProperties.showGridLines',
          },
        },
      ];
    }).flat();

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  } catch (e) {
    console.warn('Could not apply formatting to sheet, skipping:', e);
  }
};

/**
 * Syncs a new order to the Google Spreadsheet in a fully relational model
 */
export const syncNewOrderToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  order: Order
): Promise<void> => {
  if ((accessToken && accessToken.startsWith('mock_token_')) || (spreadsheetId && spreadsheetId.startsWith('mock_'))) {
    return;
  }
  try {
    const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const nowStr = new Date().toISOString();

    // 1. Prepare Order Row (DON_HANG)
    const orderRow = [
      order.id,
      order.deliveryDate || '2026-07-02',
      order.customerName,
      order.phone,
      order.deliveryDate || '2026-07-02',
      order.deliveryTime || '12:00',
      totalQty,
      subtotal,
      0, // shipping_fee
      0, // discount
      order.totalAmount,
      (order as any).paymentMethod || 'Tiền mặt',
      (order as any).paymentStatus || (order.status === 'Đã giao' ? 'Đã thanh toán' : 'Chưa thanh toán'),
      order.status,
      order.status === 'Đã giao' ? `${order.deliveryDate || '2026-07-02'} ${order.deliveryTime || '12:00'}` : '',
      order.source,
      order.note || '',
      nowStr,
      nowStr,
    ];

    // Append to DON_HANG
    const appendOrderRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/DON_HANG!A:A:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [orderRow] }),
      }
    );

    if (!appendOrderRes.ok) {
      throw new Error('Failed to append order to DON_HANG');
    }

    // 2. Prepare detail items rows (CHI_TIET_DON_HANG)
    // We fetch current rows to generate detailed ID sequentially or we can generate random details
    const randomSuffix = () => Math.floor(Math.random() * 9000) + 1000;
    const detailRows = order.items.map((item) => [
      `CT${randomSuffix()}`, // Unique detail ID
      order.id,
      item.id,
      item.name,
      item.quantity,
      item.price,
      item.price * item.quantity,
    ]);

    // Append to CHI_TIET_DON_HANG
    const appendDetailsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/CHI_TIET_DON_HANG!A:A:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: detailRows }),
      }
    );

    if (!appendDetailsRes.ok) {
      throw new Error('Failed to append details to CHI_TIET_DON_HANG');
    }

    // 3. Customer Identification & Sync (KHACH_HANG)
    await handleCustomerSync(accessToken, spreadsheetId, order);
  } catch (error) {
    console.warn('Error syncing order to sheet (simulated fallback success):', error);
  }
};

/**
 * Checks if customer exists, updates metrics, or appends a new customer
 */
const handleCustomerSync = async (
  accessToken: string,
  spreadsheetId: string,
  order: Order
): Promise<void> => {
  try {
    // Fetch all current customers
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/KHACH_HANG!A:G`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) return;

    const data = await res.json();
    const rows: string[][] = data.values || [];

    const cleanOrderPhone = order.phone.replace(/\s+/g, '');
    let existingRowIndex = -1;

    // Search for customer with matching phone number (column index 2 is phone)
    for (let i = 1; i < rows.length; i++) {
      const rowPhone = (rows[i][2] || '').replace(/\s+/g, '');
      if (rowPhone === cleanOrderPhone) {
        existingRowIndex = i + 1; // 1-indexed for sheets, plus 1 for offset
        break;
      }
    }

    if (existingRowIndex !== -1) {
      // Customer exists, update their total_orders, total_spent, and last_order
      const currentRow = rows[existingRowIndex - 1];
      const currentOrdersCount = parseInt(currentRow[4] || '0', 10);
      const currentSpent = parseFloat((currentRow[5] || '0').replace(/[,.\sđ]/g, '')) || 0;

      const newOrdersCount = currentOrdersCount + 1;
      const newSpent = currentSpent + order.totalAmount;
      const lastOrderDate = order.deliveryDate || '2026-07-02';

      // Update cells in the existing row
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/KHACH_HANG!E${existingRowIndex}:G${existingRowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [[newOrdersCount, newSpent, lastOrderDate]],
          }),
        }
      );
    } else {
      // New Customer!
      const nextCustomerId = `KH${1000 + rows.length}`;
      const newCustomerRow = [
        nextCustomerId,
        order.customerName,
        order.phone,
        order.note || 'Địa chỉ mới nhận dạng',
        1, // total_orders
        order.totalAmount, // total_spent
        order.deliveryDate || '2026-07-02', // last_order
      ];

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/KHACH_HANG!A:A:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [newCustomerRow] }),
        }
      );
    }
  } catch (err) {
    console.warn('Customer sync skipped due to error:', err);
  }
};

/**
 * Updates an order status in Google Sheets (DON_HANG table)
 */
export const updateOrderStatusInSheet = async (
  accessToken: string,
  spreadsheetId: string,
  orderId: string,
  newStatus: string
): Promise<void> => {
  if ((accessToken && accessToken.startsWith('mock_token_')) || (spreadsheetId && spreadsheetId.startsWith('mock_'))) {
    return;
  }
  try {
    // 1. Fetch order IDs to find the correct row index
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/DON_HANG!A:A`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      throw new Error('Failed to find DON_HANG sheet to update status');
    }

    const data = await res.json();
    const rows: string[][] = data.values || [];

    let orderRowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === orderId) {
        orderRowIndex = i + 1; // Sheets are 1-indexed
        break;
      }
    }

    if (orderRowIndex === -1) {
      console.warn(`Order ${orderId} not found in DON_HANG sheet.`);
      return;
    }

    // Columns: order_status is col 14 (N), delivered_at is col 15 (O), updated_at is col 19 (S)
    const nowStr = new Date().toISOString();
    const deliveredAtStr = newStatus === 'Đã giao' ? nowStr.split('T')[0] + ' ' + nowStr.split('T')[1].substring(0, 5) : '';

    // Batch update cells N (status), O (delivered_at), S (updated_at)
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/DON_HANG!N${orderRowIndex}:S${orderRowIndex}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[
            newStatus,
            deliveredAtStr,
            '', // source (skip)
            '', // note (skip)
            '', // created_at (skip)
            nowStr, // updated_at
          ]],
        }),
      }
    );
  } catch (error) {
    console.error(`Error updating status for order ${orderId} in sheet:`, error);
  }
};

/**
 * Syncs the entire current state of orders to Google Sheets, doing a complete overwrite or sync
 * Useful for a full sync button
 */
export const fullSyncToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  orders: Order[],
  menuItems: MenuItem[]
): Promise<void> => {
  if ((accessToken && accessToken.startsWith('mock_token_')) || (spreadsheetId && spreadsheetId.startsWith('mock_'))) {
    return;
  }
  try {
    // Prepare all rows to rewrite sheets
    const menuRows = menuItems.map((item, idx) => [
      item.id,
      item.name,
      item.category,
      item.price,
      'TRUE',
      idx + 1,
    ]);

    const customers: { [phone: string]: any } = {};
    orders.forEach((o) => {
      const cleanPhone = o.phone.replace(/\s+/g, '');
      if (!customers[cleanPhone]) {
        customers[cleanPhone] = {
          id: `KH${1000 + Object.keys(customers).length + 1}`,
          name: o.customerName,
          phone: o.phone,
          address: o.note || 'Địa chỉ mặc định',
          total_orders: 0,
          total_spent: 0,
          last_order: o.deliveryDate || '2026-07-02',
        };
      }
      customers[cleanPhone].total_orders += 1;
      customers[cleanPhone].total_spent += o.totalAmount;
    });
    const customerRows = Object.values(customers).map((c) => [
      c.id,
      c.name,
      c.phone,
      c.address,
      c.total_orders,
      c.total_spent,
      c.last_order,
    ]);

    const orderRows = orders.map((o) => {
      const subtotal = o.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const totalQty = o.items.reduce((sum, item) => sum + item.quantity, 0);
      return [
        o.id,
        o.deliveryDate || '2026-07-02',
        o.customerName,
        o.phone,
        o.deliveryDate || '2026-07-02',
        o.deliveryTime || '12:00',
        totalQty,
        subtotal,
        0,
        0,
        o.totalAmount,
        (o as any).paymentMethod || 'Tiền mặt',
        (o as any).paymentStatus || (o.status === 'Đã giao' ? 'Đã thanh toán' : 'Chưa thanh toán'),
        o.status,
        o.status === 'Đã giao' ? `${o.deliveryDate || '2026-07-02'} ${o.deliveryTime || '12:00'}` : '',
        o.source,
        o.note || '',
        new Date().toISOString(),
        new Date().toISOString(),
      ];
    });

    let detailCounter = 1;
    const detailRows: any[] = [];
    orders.forEach((o) => {
      o.items.forEach((item) => {
        const detailId = `CT${String(detailCounter++).padStart(4, '0')}`;
        detailRows.push([
          detailId,
          o.id,
          item.id,
          item.name,
          item.quantity,
          item.price,
          item.price * item.quantity,
        ]);
      });
    });

    // Overwrite content with auto-discovered sheet titles
    let donHangTitle = 'DON_HANG';
    let chiTietTitle = 'CHI_TIET_DON_HANG';
    let menuTitle = 'MENU';
    let khachHangTitle = 'KHACH_HANG';

    try {
      const metadataRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (metadataRes.ok) {
        const metadata = await metadataRes.json();
        const sheetsList = metadata.sheets || [];

        const findTitle = (lowerName: string, defaultName: string, gid?: string): string => {
          if (gid) {
            const matchedByGid = sheetsList.find(
              (s: any) => s.properties?.sheetId?.toString() === gid
            );
            if (matchedByGid && matchedByGid.properties?.title) {
              return matchedByGid.properties.title;
            }
          }
          const matched = sheetsList.find(
            (s: any) => s.properties?.title?.toLowerCase() === lowerName || s.properties?.title?.toLowerCase() === lowerName.replace(/_/g, '')
          );
          return matched?.properties?.title || defaultName;
        };

        donHangTitle = findTitle('don_hang', 'DON_HANG');
        chiTietTitle = findTitle('chi_tiet_don_hang', 'CHI_TIET_DON_HANG');
        menuTitle = findTitle('menu', 'MENU', '1550897850');
        khachHangTitle = findTitle('khach_hang', 'KHACH_HANG');
        console.log(`Discovered sheet titles for sync - DON_HANG: "${donHangTitle}", CHI_TIET_DON_HANG: "${chiTietTitle}", MENU: "${menuTitle}", KHACH_HANG: "${khachHangTitle}"`);
      }
    } catch (metaErr) {
      console.warn('Failed to discover sheet titles for fullSyncToSheet, using defaults:', metaErr);
    }

    const batchResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: [
            // Clear content by writing headers and values
            {
              range: `${donHangTitle}!A1:S500`,
              values: [
                [
                  'order_id', 'order_date', 'customer_name', 'phone', 'delivery_date', 'delivery_time',
                  'total_quantity', 'subtotal', 'shipping_fee', 'discount', 'total_amount',
                  'payment_method', 'payment_status', 'order_status', 'delivered_at', 'source', 'note', 'created_at', 'updated_at'
                ],
                ...orderRows,
                ...Array(100).fill(Array(19).fill('')), // Pad with empty strings to clear old rows
              ],
            },
            {
              range: `${chiTietTitle}!A1:G1000`,
              values: [
                [
                  'detail_id', 'order_id', 'menu_id', 'menu_name', 'quantity', 'unit_price', 'line_total'
                ],
                ...detailRows,
                ...Array(200).fill(Array(7).fill('')),
              ],
            },
            {
              range: `${menuTitle}!A1:F200`,
              values: [
                [
                  'menu_id', 'menu_name', 'category', 'price', 'active', 'sort_order'
                ],
                ...menuRows,
                ...Array(50).fill(Array(6).fill('')),
              ],
            },
            {
              range: `${khachHangTitle}!A1:G200`,
              values: [
                [
                  'customer_id', 'customer_name', 'phone', 'address', 'total_orders', 'total_spent', 'last_order'
                ],
                ...customerRows,
                ...Array(50).fill(Array(7).fill('')),
              ],
            },
          ],
        }),
      }
    );

    if (!batchResponse.ok) {
      throw new Error('Failed to overwrite sheets during full sync');
    }
  } catch (err) {
    console.error('Error in full sync:', err);
    throw err;
  }
};

/**
 * Fetches current menu items from Google Sheets to sync with the application state
 */
const parseCSV = (text: string): string[][] => {
  const lines = text.split(/\r?\n/);
  return lines
    .map((line) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result.map(cell => {
        let c = cell.trim();
        if (c.startsWith('"') && c.endsWith('"')) {
          c = c.substring(1, c.length - 1);
        }
        return c.replace(/""/g, '"');
      });
    })
    .filter((row) => row.length > 0 && row.some(cell => cell !== ''));
};

/**
 * Formats Google Sheets API errors to make them user-friendly and actionable, especially when the Sheets API is disabled.
 */
function handleSheetsApiError(errText: string, defaultMsg: string): Error {
  try {
    const parsed = JSON.parse(errText);
    const msg = parsed?.error?.message || '';
    if (msg.includes('Google Sheets API has not been used') || msg.includes('disabled')) {
      const projectMatch = msg.match(/project=(\d+)/);
      const projectId = projectMatch ? projectMatch[1] : '';
      const enableUrl = projectId 
        ? `https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=${projectId}`
        : 'https://console.developers.google.com/apis/api/sheets.googleapis.com/overview';
      return new Error(
        `API Google Sheets chưa được kích hoạt trong Google Cloud Project của bạn.\n\n` +
        `👉 VUI LÒNG CLICK VÀO ĐƯỜNG LINK DƯỚI ĐÂY ĐỂ BẬT API:\n` +
        `${enableUrl}\n\n` +
        `Sau khi truy cập đường dẫn trên, hãy nhấn nút "ENABLE" (hoặc "BẬT") để kích hoạt dịch vụ Google Sheets cho dự án, rồi quay lại đây tải lại trang và thử đồng bộ lại.`
      );
    }
    return new Error(parsed?.error?.message || defaultMsg);
  } catch (e) {
    if (errText.includes('Google Sheets API has not been used') || errText.includes('disabled')) {
      return new Error(
        `API Google Sheets chưa được kích hoạt trong Google Cloud Project của bạn.\n\n` +
        `👉 Vui lòng kích hoạt "Google Sheets API" trong Google Cloud Console của bạn để ứng dụng có thể đọc/ghi dữ liệu.\n\n` +
        `Chi tiết lỗi: ${errText}`
      );
    }
    return new Error(`${defaultMsg} Chi tiết: ${errText}`);
  }
}

export const fetchMenuItemsFromSheet = async (
  accessToken: string,
  spreadsheetId: string,
  defaultMenuItems: MenuItem[]
): Promise<MenuItem[]> => {
  let rows: string[][] = [];
  const isMockToken = !accessToken || accessToken.startsWith('mock_token_') || !spreadsheetId || spreadsheetId.startsWith('mock_');
  let lastError: Error | null = null;

  let sheetTitle = 'Menu'; // Fallback sheet name

  if (!isMockToken) {
    try {
      // Step 1: Discover correct sheet title for GID 1550897850
      const metadataRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (metadataRes.ok) {
        const metadata = await metadataRes.json();
        const sheetsList = metadata.sheets || [];

        // Look for exact GID first
        const matchedByGid = sheetsList.find(
          (s: any) => s.properties?.sheetId?.toString() === '1550897850'
        );
        if (matchedByGid && matchedByGid.properties?.title) {
          sheetTitle = matchedByGid.properties.title;
          console.log(`Discovered Menu sheet title "${sheetTitle}" for GID 1550897850 via API metadata`);
        } else {
          // If not found by GID, look for sheet with name matching "menu" case-insensitively
          const matchedByName = sheetsList.find(
            (s: any) => s.properties?.title?.toLowerCase() === 'menu' || s.properties?.title?.toLowerCase() === 'danh mục món'
          );
          if (matchedByName && matchedByName.properties?.title) {
            sheetTitle = matchedByName.properties.title;
            console.log(`Discovered Menu sheet title "${sheetTitle}" by matching "menu" lowercase via API metadata`);
          }
        }
      } else {
        const metadataErrText = await metadataRes.text();
        console.warn('Metadata request failed:', metadataErrText);
        lastError = handleSheetsApiError(metadataErrText, 'Không thể tải thông tin tệp Google Sheets.');
      }
    } catch (metadataErr) {
      console.warn('Failed to fetch spreadsheet metadata for Menu GID discovery:', metadataErr);
    }

    // Step 2: Fetch the menu values using discovered sheet title (fetching A1:F150 to read headers)
    try {
      console.log(`Fetching from range: "${sheetTitle}!A1:F150" using API`);
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:F150`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        rows = data.values || [];
      } else {
        const errText = await res.text();
        console.warn(`API Menu sheet "${sheetTitle}" fetch failed: ${errText}, trying fallback to MENU (all caps)...`);
        const resUpper = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/MENU!A1:F150`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (resUpper.ok) {
          const dataUpper = await resUpper.json();
          rows = dataUpper.values || [];
        } else {
          const upperErrText = await resUpper.text();
          console.warn(`API MENU (all caps) sheet fetch failed: ${upperErrText}`);
          lastError = handleSheetsApiError(upperErrText, `Không thể tải dữ liệu từ trang tính "${sheetTitle}" hoặc "MENU".`);
        }
      }
    } catch (apiErr: any) {
      console.warn('Error fetching menu items via Sheets API, trying CSV fallback:', apiErr);
      lastError = apiErr instanceof Error ? apiErr : new Error(String(apiErr));
    }
  }

  // If we couldn't get rows from API (e.g. mock auth or API error), fetch from public CSV export
  if (rows.length === 0 && spreadsheetId && !spreadsheetId.startsWith('mock_')) {
    const urlsToTry = [
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=1550897850`, // Exact Menu GID provided by user
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=Menu`,      // Title casing sheet name
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=MENU`,      // Uppercase sheet name
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=264988304`    // Alternative GID
    ];

    for (const url of urlsToTry) {
      try {
        console.log('Attempting to fetch menu items from CSV url:', url);
        const csvRes = await fetch(url);
        if (csvRes.ok) {
          const csvText = await csvRes.text();
          const parsedRows = parseCSV(csvText);
          if (parsedRows.length > 0) {
            rows = parsedRows;
            console.log(`Successfully fetched ${rows.length} rows from MENU sheet via public CSV URL: ${url}`);
            break; // Stop trying other URLs if we found data!
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch/parse CSV from ${url}:`, err);
      }
    }
  }

  // If we are connected and still have no rows, throw an error instead of silently falling back to defaults!
  if (!isMockToken && rows.length === 0) {
    throw lastError || new Error('Không thể tải thực đơn từ Google Sheets. Vui lòng đảm bảo bạn có trang tính tên "MENU" hoặc "Menu"!');
  }

  // Fallback to default if still empty (only for mock or disconnected)
  if (rows.length === 0) {
    return defaultMenuItems;
  }

  // Detect column mapping based on headers
  let idColIndex = -1;
  let nameColIndex = -1;
  let categoryColIndex = -1;
  let priceColIndex = -1;

  // Search first 2 rows for headers
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(rows.length, 3); r++) {
    const row = rows[r] || [];
    const hasHeaders = row.some(cell => {
      const val = cell.toLowerCase().trim();
      return val.includes('tên') || val.includes('món') || val.includes('name') || val.includes('giá') || val.includes('price');
    });

    if (hasHeaders) {
      headerRowIndex = r;
      row.forEach((cell, idx) => {
        const val = cell.toLowerCase().trim();
        if (val === 'id' || val.includes('mã') || val === 'menu_id') {
          idColIndex = idx;
        } else if (val.includes('tên') || val.includes('món') || val.includes('name') || val === 'menu_name') {
          nameColIndex = idx;
        } else if (val.includes('nhóm') || val.includes('loại') || val.includes('category') || val.includes('danhmuc') || val.includes('danh mục')) {
          categoryColIndex = idx;
        } else if (val.includes('giá') || val.includes('price') || val.includes('đơn giá')) {
          priceColIndex = idx;
        }
      });
      console.log(`Detected header row at index ${r} with column mapping: id=${idColIndex}, name=${nameColIndex}, category=${categoryColIndex}, price=${priceColIndex}`);
      break;
    }
  }

  // Fallback to default index assumptions if header was not found or columns were not matched
  if (idColIndex === -1) idColIndex = 0;
  if (nameColIndex === -1) nameColIndex = 1;
  if (categoryColIndex === -1) categoryColIndex = 2;
  if (priceColIndex === -1) priceColIndex = 3;

  const isHeaderRow = (row: string[], idx: number) => {
    if (idx === headerRowIndex) return true;
    if (!row || row.length === 0) return true;
    const nameVal = (nameColIndex < row.length && row[nameColIndex]) ? row[nameColIndex].toLowerCase().trim() : '';
    return (
      nameVal === 'name' || 
      nameVal === 'tên' || 
      nameVal === 'tên món' || 
      nameVal === 'tên sản phẩm' || 
      nameVal === 'menu_name' || 
      nameVal === 'menu_id' ||
      nameVal === 'mã món' ||
      nameVal === 'id' ||
      nameVal === 'tên món ăn'
    );
  };

  const fetchedItems: MenuItem[] = rows
    .filter((row, idx) => {
      if (!row || row.length === 0) return false;
      // Skip if it's the header row or lookalike
      if (isHeaderRow(row, idx)) return false;
      
      const name = (nameColIndex < row.length && row[nameColIndex]) ? row[nameColIndex].trim() : '';
      return name !== '';
    })
    .map((row, idx) => {
      const rawId = (idColIndex < row.length && row[idColIndex]) ? row[idColIndex].trim() : '';
      const id = rawId || `M_${idx + 101}`;
      
      const name = (nameColIndex < row.length && row[nameColIndex]) ? row[nameColIndex].trim() : '';
      const category = (categoryColIndex < row.length && row[categoryColIndex] ? row[categoryColIndex].trim() : '') || 'Khác';
      const priceStr = (priceColIndex < row.length && row[priceColIndex] ? row[priceColIndex].trim() : '') || '0';
      const price = parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
      
      // Match with defaultMenuItems to retain high-quality images and metrics if possible
      const matchedDefault = defaultMenuItems.find((item) => item.id === id || item.name.toLowerCase() === name.toLowerCase());
      
      // Provide category-based default images or a nice food generic fallback image
      const categoryLower = category.toLowerCase();
      let fallbackImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGsng6TClD04l_FlxZhRVR_zDehiIJOWejLfeBC8sHP-MYUby9H4OTRvt8itP153vTuvUeyDvT4d8w-PI15Cg1dlNq-9QUNEMubm-vw918p484oJx8vjs-PsOf4iLD4-airFuEZUXZcFrmCqLO33EduCAINDWsngwS_Ji8mgU_8kLjMjLr9VxVWhbbbilLkGztfD7TdjUl4SnZHDIW33B6ujL7wcZ1X7xDSi_zabgH6OitfWW81uN0vw'; // steaming dish/bowl
      
      if (categoryLower.includes('mì') || categoryLower.includes('bún')) {
        fallbackImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDaOyqUzjSI7jmW28KaRzXZUbn7YGWJRZdsk71yeDXoPyn8M6ooyg0PV0OdBqTZPpwKZPUUcTQJPucnbxUNx_ur1sJCP_rdmoIJz95tDgBFpvSg5aCYmaIc7-sctwrVU3jFDFHKgOKpSjZVZgIg_wyjoC5h19JI64pTql28iH9N-5HdqUssg-akwO0eTOYrwuhK1bI_-3RWVwSZ5_48DUxzbcjRg7YX-uJJmM9IjRxeuQKbG4CyoTw1uw';
      } else if (categoryLower.includes('nui')) {
        fallbackImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuB-aBtDV9-3aIxC_eyN43mADTSLwFvhfB8Y839lJ1-NVQcyftLYaoMda971HYdOeVZK6Qu-pt7cluokB6-I8lfmTROtAt-U12x3Ub5S8KzwkaMwFGqCUVkolNDI2nL52vXT3ALMVf6fJB-biGx2k-pKEShEsiG_r0OGb4sNdAitkcu859vlVdW8x6gpWjIY0vxnob9brk4R7KC2CwkFlrJOs-xU_PXxdtX92zIbSNeYX2r2nhsyjmuKkA';
      } else if (categoryLower.includes('cơm')) {
        fallbackImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGsng6TClD04l_FlxZhRVR_zDehiIJOWejLfeBC8sHP-MYUby9H4OTRvt8itP153vTuvUeyDvT4d8w-PI15Cg1dlNq-9QUNEMubm-vw918p484oJx8vjs-PsOf4iLD4-airFuEZUXZcFrmCqLO33EduCAINDWsngwS_Ji8mgU_8kLjMjLr9VxVWhbbbilLkGztfD7TdjUl4SnZHDIW33B6ujL7wcZ1X7xDSi_zabgH6OitfWW81uN0vw';
      }

      return {
        id,
        name,
        price,
        category,
        image: matchedDefault?.image || fallbackImage,
        salesCount: matchedDefault?.salesCount || 0,
        revenue: matchedDefault?.revenue || 0,
        trend: matchedDefault?.trend || 0,
      };
    });

  return fetchedItems;
};

/**
 * Fetches current orders from Google Sheets (DON_HANG and CHI_TIET_DON_HANG) to sync with application state
 */
export const fetchOrdersFromSheet = async (
  accessToken: string,
  spreadsheetId: string,
  menuItems: MenuItem[],
  defaultOrders: Order[]
): Promise<Order[]> => {
  let orderRows: string[][] = [];
  let detailRows: string[][] = [];
  const isMockToken = !accessToken || accessToken.startsWith('mock_token_') || !spreadsheetId || spreadsheetId.startsWith('mock_');
  let lastError: Error | null = null;

  let donHangTitle = 'DON_HANG';
  let chiTietTitle = 'CHI_TIET_DON_HANG';

  if (!isMockToken) {
    try {
      // Step 1: Discover correct sheet titles
      const metadataRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (metadataRes.ok) {
        const metadata = await metadataRes.json();
        const sheetsList = metadata.sheets || [];

        const findTitle = (lowerName: string, defaultName: string): string => {
          const matched = sheetsList.find(
            (s: any) => s.properties?.title?.toLowerCase() === lowerName || s.properties?.title?.toLowerCase() === lowerName.replace(/_/g, '')
          );
          return matched?.properties?.title || defaultName;
        };

        donHangTitle = findTitle('don_hang', 'DON_HANG');
        chiTietTitle = findTitle('chi_tiet_don_hang', 'CHI_TIET_DON_HANG');
      }
    } catch (metadataErr) {
      console.warn('Failed to fetch spreadsheet metadata for order/detail discovery:', metadataErr);
    }

    // Step 2: Fetch DON_HANG
    try {
      console.log(`Fetching from range: "${donHangTitle}!A1:S500" using API`);
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(donHangTitle)}!A1:S500`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        orderRows = data.values || [];
      } else {
        const errText = await res.text();
        console.warn(`API DON_HANG fetch failed: ${errText}`);
        lastError = handleSheetsApiError(errText, `Không thể tải dữ liệu từ trang tính "${donHangTitle}".`);
      }
    } catch (apiErr: any) {
      console.warn('Error fetching order rows via Sheets API, trying CSV fallback:', apiErr);
      lastError = apiErr instanceof Error ? apiErr : new Error(String(apiErr));
    }

    // Step 3: Fetch CHI_TIET_DON_HANG
    try {
      console.log(`Fetching from range: "${chiTietTitle}!A1:G1000" using API`);
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(chiTietTitle)}!A1:G1000`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        detailRows = data.values || [];
      } else {
        const errText = await res.text();
        console.warn(`API CHI_TIET_DON_HANG fetch failed: ${errText}`);
        lastError = handleSheetsApiError(errText, `Không thể tải dữ liệu từ trang tính "${chiTietTitle}".`);
      }
    } catch (apiErr: any) {
      console.warn('Error fetching detail rows via Sheets API, trying CSV fallback:', apiErr);
      lastError = apiErr instanceof Error ? apiErr : new Error(String(apiErr));
    }
  }

  // Fallbacks to CSV URLs if API failed but we have a spreadsheet ID
  if (orderRows.length === 0 && spreadsheetId && !spreadsheetId.startsWith('mock_')) {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=${encodeURIComponent(donHangTitle)}`;
    try {
      const csvRes = await fetch(csvUrl);
      if (csvRes.ok) {
        const csvText = await csvRes.text();
        orderRows = parseCSV(csvText);
      }
    } catch (err) {
      console.warn('Failed to fetch/parse CSV from', csvUrl, err);
    }
  }

  if (detailRows.length === 0 && spreadsheetId && !spreadsheetId.startsWith('mock_')) {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=${encodeURIComponent(chiTietTitle)}`;
    try {
      const csvRes = await fetch(csvUrl);
      if (csvRes.ok) {
        const csvText = await csvRes.text();
        detailRows = parseCSV(csvText);
      }
    } catch (err) {
      console.warn('Failed to fetch/parse CSV from', csvUrl, err);
    }
  }

  // If mock token or no sheets, return default orders
  if (orderRows.length === 0) {
    if (!isMockToken) {
      throw lastError || new Error('Không thể tải đơn hàng từ Google Sheets. Vui lòng đảm bảo bạn có trang tính tên "DON_HANG"!');
    }
    return defaultOrders;
  }

  // Detect DON_HANG column mapping based on headers (first 2 rows)
  let orderIdCol = 0;
  let custNameCol = 2;
  let phoneCol = 3;
  let delivDateCol = 4;
  let delivTimeCol = 5;
  let totalAmountCol = 10;
  let statusCol = 13;
  let sourceCol = 15;
  let noteCol = 16;
  let createdAtCol = 17;

  let orderHeaderRowIndex = -1;
  for (let r = 0; r < Math.min(orderRows.length, 3); r++) {
    const row = orderRows[r] || [];
    const hasHeaders = row.some(cell => {
      const val = cell.toLowerCase().trim();
      return val.includes('order_id') || val.includes('mã đơn') || val.includes('customer') || val.includes('khách');
    });

    if (hasHeaders) {
      orderHeaderRowIndex = r;
      row.forEach((cell, idx) => {
        const val = cell.toLowerCase().trim();
        if (val === 'order_id' || val.includes('mã đơn') || val === 'id') orderIdCol = idx;
        else if (val.includes('customer_name') || val.includes('tên khách') || val.includes('khách hàng')) custNameCol = idx;
        else if (val.includes('phone') || val.includes('sđt') || val.includes('điện thoại')) phoneCol = idx;
        else if (val.includes('delivery_time') || val.includes('giờ giao')) delivTimeCol = idx;
        else if (val.includes('delivery_date') || val.includes('ngày giao')) delivDateCol = idx;
        else if (val.includes('total_amount') || val.includes('tổng tiền') || val === 'tổng') totalAmountCol = idx;
        else if (val.includes('order_status') || val.includes('trạng thái') || val === 'status') statusCol = idx;
        else if (val.includes('source') || val.includes('nguồn')) sourceCol = idx;
        else if (val.includes('note') || val.includes('ghi chú') || val.includes('lời dặn')) noteCol = idx;
        else if (val.includes('created_at') || val.includes('tạo lúc')) createdAtCol = idx;
      });
      break;
    }
  }

  // Detect CHI_TIET_DON_HANG column mapping
  let detOrderIdCol = 1;
  let detMenuIdCol = 2;
  let detMenuNameCol = 3;
  let detQtyCol = 4;
  let detPriceCol = 5;

  let detailHeaderRowIndex = -1;
  for (let r = 0; r < Math.min(detailRows.length, 3); r++) {
    const row = detailRows[r] || [];
    const hasHeaders = row.some(cell => {
      const val = cell.toLowerCase().trim();
      return val.includes('detail_id') || val.includes('mã chi tiết') || val.includes('menu_id') || val.includes('mã món');
    });

    if (hasHeaders) {
      detailHeaderRowIndex = r;
      row.forEach((cell, idx) => {
        const val = cell.toLowerCase().trim();
        if (val === 'order_id' || val.includes('mã đơn')) detOrderIdCol = idx;
        else if (val === 'menu_id' || val.includes('mã món')) detMenuIdCol = idx;
        else if (val === 'menu_name' || val.includes('tên món')) detMenuNameCol = idx;
        else if (val === 'quantity' || val.includes('số lượng') || val === 'qty') detQtyCol = idx;
        else if (val === 'unit_price' || val.includes('giá') || val.includes('đơn giá')) detPriceCol = idx;
      });
      break;
    }
  }

  const isOrderHeader = (row: string[], idx: number) => {
    if (idx === orderHeaderRowIndex) return true;
    if (!row || row.length === 0) return true;
    const val = (orderIdCol < row.length && row[orderIdCol]) ? row[orderIdCol].toLowerCase().trim() : '';
    return val === 'order_id' || val === 'id' || val.includes('mã đơn');
  };

  const isDetailHeader = (row: string[], idx: number) => {
    if (idx === detailHeaderRowIndex) return true;
    if (!row || row.length === 0) return true;
    const val = (detOrderIdCol < row.length && row[detOrderIdCol]) ? row[detOrderIdCol].toLowerCase().trim() : '';
    return val === 'order_id' || val === 'id' || val.includes('mã đơn');
  };

  // Parse details rows into detail groups grouped by order_id
  const detailsByOrderId: { [orderId: string]: any[] } = {};
  detailRows.forEach((row, idx) => {
    if (isDetailHeader(row, idx)) return;
    const orderId = (detOrderIdCol < row.length && row[detOrderIdCol]) ? row[detOrderIdCol].trim() : '';
    if (!orderId) return;

    const menuId = (detMenuIdCol < row.length && row[detMenuIdCol]) ? row[detMenuIdCol].trim() : '';
    const name = (detMenuNameCol < row.length && row[detMenuNameCol]) ? row[detMenuNameCol].trim() : '';
    const qtyStr = (detQtyCol < row.length && row[detQtyCol]) ? row[detQtyCol].trim() : '1';
    const quantity = parseInt(qtyStr.replace(/[^0-9]/g, ''), 10) || 1;
    const priceStr = (detPriceCol < row.length && row[detPriceCol]) ? row[detPriceCol].trim() : '0';
    const price = parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;

    // Look up menu item image
    const matchedMenu = menuItems.find(m => m.id === menuId || m.name.toLowerCase() === name.toLowerCase());
    const image = matchedMenu?.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGsng6TClD04l_FlxZhRVR_zDehiIJOWejLfeBC8sHP-MYUby9H4OTRvt8itP153vTuvUeyDvT4d8w-PI15Cg1dlNq-9QUNEMubm-vw918p484oJx8vjs-PsOf4iLD4-airFuEZUXZcFrmCqLO33EduCAINDWsngwS_Ji8mgU_8kLjMjLr9VxVWhbbbilLkGztfD7TdjUl4SnZHDIW33B6ujL7wcZ1X7xDSi_zabgH6OitfWW81uN0vw';

    if (!detailsByOrderId[orderId]) {
      detailsByOrderId[orderId] = [];
    }
    detailsByOrderId[orderId].push({
      id: menuId || `M_${Math.floor(Math.random() * 900) + 100}`,
      name,
      price,
      quantity,
      image,
    });
  });

  // Map orderRows to Orders
  const fetchedOrders: Order[] = orderRows
    .filter((row, idx) => {
      if (isOrderHeader(row, idx)) return false;
      const orderId = (orderIdCol < row.length && row[orderIdCol]) ? row[orderIdCol].trim() : '';
      return orderId !== '';
    })
    .map((row) => {
      const id = row[orderIdCol].trim();
      const customerName = (custNameCol < row.length && row[custNameCol]) ? row[custNameCol].trim() : 'Khách hàng';
      const phone = (phoneCol < row.length && row[phoneCol]) ? row[phoneCol].trim() : '';
      const deliveryTime = (delivTimeCol < row.length && row[delivTimeCol]) ? row[delivTimeCol].trim() : '12:00';
      const deliveryDate = (delivDateCol < row.length && row[delivDateCol]) ? row[delivDateCol].trim() : new Date().toISOString().split('T')[0];
      const totalAmountStr = (totalAmountCol < row.length && row[totalAmountCol]) ? row[totalAmountCol].trim() : '0';
      const totalAmount = parseInt(totalAmountStr.replace(/[^0-9]/g, ''), 10) || 0;
      const statusRaw = (statusCol < row.length && row[statusCol]) ? row[statusCol].trim() : 'Đang chờ';
      
      let status: OrderStatus = 'Đang chờ';
      if (statusRaw === 'Chuẩn bị' || statusRaw === 'Đã giao' || statusRaw === 'Đã hủy') {
        status = statusRaw;
      }

      const sourceRaw = (sourceCol < row.length && row[sourceCol]) ? row[sourceCol].trim() : 'Gọi điện';
      let source: any = 'Gọi điện';
      if (['Facebook', 'Zalo', 'Gọi điện', 'Khách quen', 'ShopeeFood', 'GrabFood'].includes(sourceRaw)) {
        source = sourceRaw;
      }

      const note = (noteCol < row.length && row[noteCol]) ? row[noteCol].trim() : '';
      const createdAt = (createdAtCol < row.length && row[createdAtCol]) ? row[createdAtCol].trim() : new Date().toISOString();
      const isUrgent = note.toLowerCase().includes('gấp') || note.toLowerCase().includes('khẩn cấp') || note.toLowerCase().includes('urgently');

      const items = detailsByOrderId[id] || [];

      return {
        id,
        customerName,
        phone,
        source,
        items,
        totalAmount,
        deliveryTime,
        deliveryDate,
        status,
        note,
        isUrgent,
        createdAt,
      };
    });

  // Sort orders by id or date descending (latest first)
  return fetchedOrders.sort((a, b) => b.id.localeCompare(a.id));
};

