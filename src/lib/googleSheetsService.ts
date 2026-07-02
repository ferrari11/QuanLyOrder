import { Order, MenuItem } from '../types';

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
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to create spreadsheet');
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
      const err = await batchResponse.json();
      throw new Error(err.error?.message || 'Failed to seed sheet headers and default data');
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
    console.error('Error syncing order to sheet:', error);
    throw error;
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

    // Overwrite content
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
              range: 'DON_HANG!A1:S500',
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
              range: 'CHI_TIET_DON_HANG!A1:G1000',
              values: [
                [
                  'detail_id', 'order_id', 'menu_id', 'menu_name', 'quantity', 'unit_price', 'line_total'
                ],
                ...detailRows,
                ...Array(200).fill(Array(7).fill('')),
              ],
            },
            {
              range: 'MENU!A1:F200',
              values: [
                [
                  'menu_id', 'menu_name', 'category', 'price', 'active', 'sort_order'
                ],
                ...menuRows,
                ...Array(50).fill(Array(6).fill('')),
              ],
            },
            {
              range: 'KHACH_HANG!A1:G200',
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
