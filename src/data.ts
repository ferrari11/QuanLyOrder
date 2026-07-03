import { Order, MenuItem } from './types';

export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    id: 'menu_1',
    name: 'Mì xào bò + Trứng lòng đào',
    price: 25000,
    category: 'Mì',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDaOyqUzjSI7jmW28KaRzXZUbn7YGWJRZdsk71yeDXoPyn8M6ooyg0PV0OdBqTZPpwKZPUUcTQJPucnbxUNx_ur1sJCP_rdmoIJz95tDgBFpvSg5aCYmaIc7-sctwrVU3jFDFHKgOKpSjZVZgIg_wyjoC5h19JI64pTql28iH9N-5HdqUssg-akwO0eTOYrwuhK1bI_-3RWVwSZ5_48DUxzbcjRg7YX-uJJmM9IjRxeuQKbG4CyoTw1uw',
    salesCount: 120,
    revenue: 7800000,
    trend: 5,
  },
  {
    id: 'menu_2',
    name: 'Mì xào bò + Trứng ốp la',
    price: 25000,
    category: 'Mì',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBbUS7uK6X_DWncQWjfOtRRDcqQiQIzahxYrdCHm3n8zYwHqA501yKDHLMOIcP1XJRf3lZFkDtTCmlgnublLYqj9qb2lfeP6AG-Pr6yZWUpdUJDWWf4zRR1EX7EIJ35GibDDaFWLDSfnuQXiJ_escnPY_OmMND-UhYklTwhYQWoBrT7X6oiHpnt_jXOHlWZDMVl7Z2vGTV-jmzvkx0xbFofE2kQPPYA5V6gcqUHRsOA64HtwC_bMBqK-g',
    salesCount: 85,
    revenue: 3825000,
    trend: 10,
  },
  {
    id: 'menu_3',
    name: 'Mì xào bò + Tôm',
    price: 25000,
    category: 'Mì',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7kXq3Lp9IeNtLh7TO-K7rpz9Lv3tp5WLRZ4IfmZBp323N3VifvXdhHV9z6AjWB0diOPJTMtY8ZXz6a4oNI6GoAgfYYHf7IKwTJpu8X8c2qOnsB1si-xOboHQKR5ZZQ6roNK7JB4JmmZWlrCNrDyV3mot3r4U42f0j7UGlgTPpJtLQgeLUfWj9EGEWmYHqJU4warO_H9592GbOPrmtvIUlia8K4H3ftEWm5q-weI6wOUtEnHXSL02snw',
    salesCount: 42,
    revenue: 3150000,
    trend: 8,
  },
  {
    id: 'menu_4',
    name: 'Nui xào bò + Trứng lòng đào',
    price: 25000,
    category: 'Nui',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB-aBtDV9-3aIxC_eyN43mADTSLwFvhfB8Y839lJ1-NVQcyftLYaoMda971HYdOeVZK6Qu-pt7cluokB6-I8lfmTROtAt-U12x3Ub5S8KzwkaMwFGqCUVkolNDI2nL52vXT3ALMVf6fJB-biGx2k-pKEShEsiG_r0OGb4sNdAitkcu859vlVdW8x6gpWjIY0vxnob9brk4R7KC2CwkFlrJOs-xU_PXxdtX92zIbSNeYX2r2nhsyjmuKkA',
    salesCount: 38,
    revenue: 1330000,
    trend: 12,
  },
  {
    id: 'menu_5',
    name: 'Nui xào bò + Trứng ốp la',
    price: 25000,
    category: 'Nui',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDXdvnli41J_ZcSIM6NYwcMgyCfUKv0KEtOejy7gtyyPzH_tsohgyFpHnKtfn2VNj5ShYKBwguVW1j9Y813H8nfWIIkTfuWSBT_LVU30tO1gv89uEGp_36Dag570c_xPB0Vde8fCjFo4DA7EMdcqEBYQNMwXxoBtppkc-fneHqVQJt_JnRbqGQ5v0LBQNPPdRiquno3Umna7RQbiqzJ2ECJP3lS9bF_tAnHAJqNNFLG6F47wnXCcZ5-A',
    salesCount: 35,
    revenue: 875000,
    trend: -2,
  },
  {
    id: 'menu_6',
    name: 'Nui xào bò + Tôm',
    price: 25000,
    category: 'Nui',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOoTTUVtPC8hiCBqu-P0a2r-kOHxR_DfEU4VgpsZZQPAHWaJbAdMWrd6HK-CzQFAJ_ZaUal5LdqZg861l49_NRyV4rnvC4s0YCTNF7TDHyFxm_ScQ-U3veop_c1OiBJdJoYnLFxzDTAY7dxPn7eHa_9Ei5KXzrb6jjVZT6pDMPHUoriPukQMUAXJ4hv0UZ_dzHMQfzVa7p6seT6gqBRLhz9y0amaPxCavBhsN2sW_7PaCp8044HeN38g',
    salesCount: 27,
    revenue: 945000,
    trend: 5,
  },
  {
    id: 'menu_7',
    name: 'Mì Thập cẩm Bò + Tôm + Trứng',
    price: 25000,
    category: 'Thập cẩm',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGsng6TClD04l_FlxZhRVR_zDehiIJOWejLfeBC8sHP-MYUby9H4OTRvt8itP153vTuvUeyDvT4d8w-PI15Cg1dlNq-9QUNEMubm-vw918p484oJx8vjs-PsOf4iLD4-airFuEZUXZcFrmCqLO33EduCAINDWsngwS_Ji8mgU_8kLjMjLr9VxVWhbbbilLkGztfD7TdjUl4SnZHDIW33B6ujL7wcZ1X7xDSi_zabgH6OitfWW81uN0vw',
    salesCount: 24,
    revenue: 1560000,
    trend: 0,
  },
    {
    id: 'menu_8',
    name: 'Bún nước tương Trứng lòng đào + Tôm + Tàu hữu',
    price: 25000,
    category: 'Bún',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGsng6TClD04l_FlxZhRVR_zDehiIJOWejLfeBC8sHP-MYUby9H4OTRvt8itP153vTuvUeyDvT4d8w-PI15Cg1dlNq-9QUNEMubm-vw918p484oJx8vjs-PsOf4iLD4-airFuEZUXZcFrmCqLO33EduCAINDWsngwS_Ji8mgU_8kLjMjLr9VxVWhbbbilLkGztfD7TdjUl4SnZHDIW33B6ujL7wcZ1X7xDSi_zabgH6OitfWW81uN0vw',
    salesCount: 24,
    revenue: 1560000,
    trend: 0,
  }
  ,
    {
    id: 'menu_9',
    name: 'Cơm chiên Trứng lòng đào',
    price: 25000,
    category: 'Cơm',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGsng6TClD04l_FlxZhRVR_zDehiIJOWejLfeBC8sHP-MYUby9H4OTRvt8itP153vTuvUeyDvT4d8w-PI15Cg1dlNq-9QUNEMubm-vw918p484oJx8vjs-PsOf4iLD4-airFuEZUXZcFrmCqLO33EduCAINDWsngwS_Ji8mgU_8kLjMjLr9VxVWhbbbilLkGztfD7TdjUl4SnZHDIW33B6ujL7wcZ1X7xDSi_zabgH6OitfWW81uN0vw',
    salesCount: 24,
    revenue: 1560000,
    trend: 0,
  }
  ,
    {
    id: 'menu_10',
    name: 'Cơm chiên Trúng ốp la',
    price: 25000,
    category: 'Bún',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGsng6TClD04l_FlxZhRVR_zDehiIJOWejLfeBC8sHP-MYUby9H4OTRvt8itP153vTuvUeyDvT4d8w-PI15Cg1dlNq-9QUNEMubm-vw918p484oJx8vjs-PsOf4iLD4-airFuEZUXZcFrmCqLO33EduCAINDWsngwS_Ji8mgU_8kLjMjLr9VxVWhbbbilLkGztfD7TdjUl4SnZHDIW33B6ujL7wcZ1X7xDSi_zabgH6OitfWW81uN0vw',
    salesCount: 24,
    revenue: 1560000,
    trend: 0,
  } ,
    {
    id: 'menu_11',
    name: 'Nui Thập cẩm Bò + Tôm + Trứng',
    price: 25000,
    category: 'Bún',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGsng6TClD04l_FlxZhRVR_zDehiIJOWejLfeBC8sHP-MYUby9H4OTRvt8itP153vTuvUeyDvT4d8w-PI15Cg1dlNq-9QUNEMubm-vw918p484oJx8vjs-PsOf4iLD4-airFuEZUXZcFrmCqLO33EduCAINDWsngwS_Ji8mgU_8kLjMjLr9VxVWhbbbilLkGztfD7TdjUl4SnZHDIW33B6ujL7wcZ1X7xDSi_zabgH6OitfWW81uN0vw',
    salesCount: 24,
    revenue: 1560000,
    trend: 0,
  }
];

export const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ORD001',
    customerName: 'Nguyễn Văn A',
    phone: '090 123 4567',
    source: 'Facebook',
    items: [
      { id: 'menu_1', name: 'Mì xào bò + Trứng lòng đào', price: 25000, quantity: 2, image: DEFAULT_MENU_ITEMS[0].image },
      { id: 'menu_2', name: 'Nui xào bò + Trứng ốp la', price: 25000, quantity: 1, image: DEFAULT_MENU_ITEMS[1].image }
    ],
    totalAmount: 50000,
    deliveryTime: '11:30',
    deliveryDate: '2023-11-24',
    status: 'Đang chờ',
    note: 'Ít bánh phở, nhiều hành, nem giòn rụm.',
    createdAt: '2026-07-02T10:30:00.000Z'
  },
  {
    id: 'ORD002',
    customerName: 'Trần Thị B',
    phone: '091 987 6543',
    source: 'Zalo',
    items: [
      { id: 'menu_4', name: 'Nui xào bò + Trứng lòng đào', price: 25000, quantity: 2, image: DEFAULT_MENU_ITEMS[3].image },
      { id: 'menu_5', name: 'Nui xào bò + Trứng ốp la', price: 25000, quantity: 1, image: DEFAULT_MENU_ITEMS[4].image }
    ],
    totalAmount: 50000,
    deliveryTime: '10:45',
    deliveryDate: '2023-11-24',
    status: 'Đã giao',
    note: 'Không lấy ớt.',
    createdAt: '2026-07-02T09:45:00.000Z'
  }
];
