import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function restore() {
  if (!process.env.MONGODB_URI) {
    console.error('No MONGODB_URI found.');
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('erpstates');
  const doc = await coll.findOne();
  if (!doc) {
    console.error('No singleton erpstate doc found.');
    await mongoose.disconnect();
    return;
  }

  const existingData = typeof doc.data === 'string' ? JSON.parse(doc.data) : doc.data;

  const products = [
    {
      id: 'prod-1793594364069-872',
      name: 'Sublimation Transfer Paper & Ink',
      nameBn: 'সাবলিমেশন ট্রান্সফার পেপার ও কালি',
      code: 'BRA-265',
      sku: 'BRA-265',
      category: 'RAW PRINTING MEDIA & ROLLS',
      unit: 'set',
      costPrice: 5,
      unitPrice: 8,
      sellingPrice: 8,
      stock: 950,
      stockFactory: 950,
      stockOffice: 0,
      minStockAlert: 100,
      lowStockThreshold: 100,
      isRawMaterial: true,
      warehouse: 'Central Warehouse'
    },
    {
      id: 'prod-1793594380000-884',
      name: 'Mug Packaging Gift Box',
      nameBn: 'মগ প্যাকেজিং গিফট বক্স',
      code: 'BRA-884',
      sku: 'BRA-884',
      category: 'RAW PRINTING MEDIA & ROLLS',
      unit: 'box',
      costPrice: 8,
      unitPrice: 12,
      sellingPrice: 12,
      stock: 450,
      stockFactory: 450,
      stockOffice: 0,
      minStockAlert: 50,
      lowStockThreshold: 50,
      isRawMaterial: true,
      warehouse: 'Central Warehouse'
    },
    {
      id: 'prod-1793510200000-145',
      name: 'Blank Ceramic White Mug 11oz',
      nameBn: 'ব্ল্যাঙ্ক সিরামিক হোয়াইট মগ',
      code: 'BRA-145',
      sku: 'BRA-145',
      category: 'RAW PRINTING MEDIA & ROLLS',
      unit: 'pcs',
      costPrice: 100,
      unitPrice: 140,
      sellingPrice: 140,
      stock: 0,
      stockFactory: 0,
      stockOffice: 0,
      minStockAlert: 20,
      lowStockThreshold: 20,
      isRawMaterial: true,
      warehouse: 'Central Warehouse'
    },
    {
      id: 'prod-1793510100000-740',
      name: 'Solvent Printing Ink',
      nameBn: 'সলভেন্ট প্রিন্টিং কালি',
      code: 'RAW-740',
      sku: 'RAW-740',
      category: 'RAW PRINTING MEDIA & ROLLS',
      unit: 'ltr',
      costPrice: 800,
      unitPrice: 1100,
      sellingPrice: 1100,
      stock: 6,
      stockFactory: 6,
      stockOffice: 0,
      minStockAlert: 2,
      lowStockThreshold: 2,
      isRawMaterial: true,
      warehouse: 'Central Warehouse'
    },
    {
      id: 'prod-1793510229096-192',
      name: 'PVC Foam Board 5mm (8ft x 4ft)',
      nameBn: 'পিভিসি ফোম বোর্ড ৫মিমি',
      code: 'ACR-511',
      sku: 'ACR-511',
      category: 'ACRYLIC & BOARD RAW MATERIALS',
      unit: 'pcs',
      costPrice: 1400,
      unitPrice: 1800,
      sellingPrice: 1800,
      stock: 7.5,
      stockFactory: 7.5,
      stockOffice: 0,
      minStockAlert: 3,
      lowStockThreshold: 3,
      isRawMaterial: true,
      warehouse: 'Central Warehouse'
    },
    {
      id: 'prod-1793510184002-811',
      name: 'Clear Cast Acrylic Sheet 3mm (8ft x 4ft)',
      nameBn: 'ক্লিয়ার কাস্ট এক্রিলিক শিট ৩মিমি',
      code: 'ACR-220',
      sku: 'ACR-220',
      category: 'ACRYLIC & BOARD RAW MATERIALS',
      unit: 'pcs',
      costPrice: 2800,
      unitPrice: 3500,
      sellingPrice: 3500,
      stock: 5,
      stockFactory: 5,
      stockOffice: 0,
      minStockAlert: 2,
      lowStockThreshold: 2,
      isRawMaterial: true,
      warehouse: 'Central Warehouse'
    },
    {
      id: 'prod-1793510114967-357',
      name: 'Self Adhesive Vinyl Roll (4.2ft x 164ft)',
      nameBn: 'সেলফ আঠালো ভিনাইল রোল',
      code: 'RAW-585',
      sku: 'RAW-585',
      category: 'RAW PRINTING MEDIA & ROLLS',
      unit: 'pcs',
      costPrice: 3500,
      unitPrice: 4500,
      sellingPrice: 4500,
      stock: 4.913,
      stockFactory: 4.913,
      stockOffice: 0,
      minStockAlert: 1,
      lowStockThreshold: 1,
      isRawMaterial: true,
      warehouse: 'Central Warehouse'
    },
    {
      id: 'prod-1793510043978-978',
      name: 'Solvent Banner Flex Roll (10ft x 164ft)',
      nameBn: 'সলভেন্ট ব্যানার ফ্লেক্স রোল',
      code: 'RAW-979',
      sku: 'RAW-979',
      category: 'RAW PRINTING MEDIA & ROLLS',
      unit: 'roll',
      costPrice: 4200,
      unitPrice: 5500,
      sellingPrice: 5500,
      stock: 4.9132,
      stockFactory: 4.9132,
      stockOffice: 0,
      minStockAlert: 1,
      lowStockThreshold: 1,
      isRawMaterial: true,
      warehouse: 'Central Warehouse'
    },
    {
      id: 'prod-1793509699474-738',
      name: 'Sublimation Ceramic Mug',
      nameBn: 'সাবলিমেশন সিরামিক মগ',
      code: 'BRA-748',
      sku: 'BRA-748',
      category: 'BRANDED PROMOTIONAL GIFTS',
      unit: 'pcs',
      costPrice: 113,
      unitPrice: 220,
      sellingPrice: 220,
      stock: 50,
      stockFactory: 50,
      stockOffice: 0,
      minStockAlert: 10,
      lowStockThreshold: 10,
      isRawMaterial: false,
      warehouse: 'Central Warehouse'
    },
    {
      id: 'prod-1793509624654-940',
      name: 'Park ID Card',
      nameBn: 'পার্ক আইডি কার্ড',
      code: 'BRA-619',
      sku: 'BRA-619',
      category: 'BRANDED PROMOTIONAL GIFTS',
      unit: 'pcs',
      costPrice: 80,
      unitPrice: 100,
      sellingPrice: 100,
      stock: 50,
      stockFactory: 50,
      stockOffice: 0,
      minStockAlert: 20,
      lowStockThreshold: 20,
      isRawMaterial: false,
      warehouse: 'Central Warehouse'
    },
    {
      id: 'prod-1793509566476-992',
      name: 'Frontlit Banner Print (340gsm)',
      nameBn: 'ফ্রন্টলিট ব্যানার প্রিন্ট',
      code: 'DIG-010',
      sku: 'DIG-010',
      category: 'DIGITAL PRINTING',
      unit: 'sqft',
      costPrice: 18.60,
      unitPrice: 35,
      sellingPrice: 35,
      stock: 140,
      stockFactory: 140,
      stockOffice: 0,
      minStockAlert: 50,
      lowStockThreshold: 50,
      isRawMaterial: false,
      warehouse: 'Central Warehouse'
    },
    {
      id: 'prod-1793509485978-631',
      name: 'Glossy Vinyl Sticker Print',
      nameBn: 'গ্লসি ভিনাইল স্টিকার প্রিন্ট',
      code: 'DIG-015',
      sku: 'DIG-015',
      category: 'DIGITAL PRINTING',
      unit: 'sqft',
      costPrice: 21.07,
      unitPrice: 45,
      sellingPrice: 45,
      stock: 60,
      stockFactory: 60,
      stockOffice: 0,
      minStockAlert: 30,
      lowStockThreshold: 30,
      isRawMaterial: false,
      warehouse: 'Central Warehouse'
    }
  ];

  const purchaseOrders = [
    {
      id: 'po-1793594430000',
      poNo: 'DCC-PO-2026-8881',
      poNumber: 'DCC-PO-2026-8881',
      date: '2026-11-02',
      supplierId: 'sup-1793509871109',
      supplierName: 'PromoGift & Card Import Center',
      destination: 'Factory',
      destinationLocation: 'Factory',
      status: 'Received',
      challanStatus: 'Received',
      paymentStatus: 'Paid',
      paymentMethod: 'City Bank PLC',
      bankAccount: 'City Bank PLC',
      grandTotal: 4000,
      totalAmount: 4000,
      subtotal: 4000,
      paidAmount: 4000,
      items: [
        {
          productId: 'prod-1793594380000-884',
          name: 'Mug Packaging Gift Box',
          unit: 'box',
          qty: 500,
          unitCost: 8,
          totalCost: 4000,
          receivedQty: 500
        }
      ]
    },
    {
      id: 'po-1793594420000',
      poNo: 'DCC-PO-2026-8507',
      poNumber: 'DCC-PO-2026-8507',
      date: '2026-11-02',
      supplierId: 'sup-1793509871109',
      supplierName: 'PromoGift & Card Import Center',
      destination: 'Factory',
      destinationLocation: 'Factory',
      status: 'Received',
      challanStatus: 'Received',
      paymentStatus: 'Paid',
      paymentMethod: 'City Bank PLC',
      bankAccount: 'City Bank PLC',
      grandTotal: 5000,
      totalAmount: 5000,
      subtotal: 5000,
      paidAmount: 5000,
      items: [
        {
          productId: 'prod-1793594364069-872',
          name: 'Sublimation Transfer Paper & Ink',
          unit: 'set',
          qty: 1000,
          unitCost: 5,
          totalCost: 5000,
          receivedQty: 1000
        }
      ]
    },
    {
      id: 'po-1793594410000',
      poNo: 'DCC-PO-2026-7959',
      poNumber: 'DCC-PO-2026-7959',
      date: '2026-11-02',
      supplierId: 'sup-1793509871109',
      supplierName: 'PromoGift & Card Import Center',
      destination: 'Factory',
      destinationLocation: 'Factory',
      status: 'Received',
      challanStatus: 'Received',
      paymentStatus: 'Paid',
      paymentMethod: 'City Bank PLC',
      bankAccount: 'City Bank PLC',
      grandTotal: 5000,
      totalAmount: 5000,
      subtotal: 5000,
      paidAmount: 5000,
      items: [
        {
          productId: 'prod-1793510200000-145',
          name: 'Blank Ceramic White Mug 11oz',
          unit: 'pcs',
          qty: 50,
          unitCost: 100,
          totalCost: 5000,
          receivedQty: 50
        }
      ]
    },
    {
      id: 'po-1793509800000',
      poNo: 'DCC-PO-2026-7042',
      poNumber: 'DCC-PO-2026-7042',
      date: '2026-11-01',
      supplierId: 'sup-1793509871109',
      supplierName: 'PromoGift & Card Import Center',
      destination: 'Factory',
      destinationLocation: 'Factory',
      status: 'Received',
      challanStatus: 'Received',
      paymentStatus: 'Paid',
      paymentMethod: 'City Bank PLC',
      bankAccount: 'City Bank PLC',
      grandTotal: 8000,
      totalAmount: 8000,
      subtotal: 8000,
      paidAmount: 8000,
      items: [
        {
          productId: 'prod-1793510100000-740',
          name: 'Solvent Printing Ink',
          unit: 'ltr',
          qty: 10,
          unitCost: 800,
          totalCost: 8000,
          receivedQty: 10
        }
      ]
    },
    {
      id: 'po-1793509700000',
      poNo: 'DCC-PO-2026-7404',
      poNumber: 'DCC-PO-2026-7404',
      date: '2026-11-01',
      supplierId: 'sup-1793509871108',
      supplierName: 'Bengal Acrylic & Board House',
      destination: 'Factory',
      destinationLocation: 'Factory',
      status: 'Received',
      challanStatus: 'Received',
      paymentStatus: 'Paid',
      paymentMethod: 'City Bank PLC',
      bankAccount: 'City Bank PLC',
      grandTotal: 28000,
      totalAmount: 28000,
      subtotal: 28000,
      paidAmount: 28000,
      items: [
        {
          productId: 'prod-1793510229096-192',
          name: 'PVC Foam Board 5mm (8ft x 4ft)',
          unit: 'pcs',
          qty: 10,
          unitCost: 1400,
          totalCost: 14000,
          receivedQty: 10
        },
        {
          productId: 'prod-1793510184002-811',
          name: 'Clear Cast Acrylic Sheet 3mm (8ft x 4ft)',
          unit: 'pcs',
          qty: 5,
          unitCost: 2800,
          totalCost: 14000,
          receivedQty: 5
        }
      ]
    },
    {
      id: 'po-1793509600000',
      poNo: 'DCC-PO-2026-7279',
      poNumber: 'DCC-PO-2026-7279',
      date: '2026-11-01',
      supplierId: 'sup-1793509871107',
      supplierName: 'Universal Media & Flex Supply',
      destination: 'Factory',
      destinationLocation: 'Factory',
      status: 'Received',
      challanStatus: 'Received',
      paymentStatus: 'Paid',
      paymentMethod: 'City Bank PLC',
      bankAccount: 'City Bank PLC',
      grandTotal: 17500,
      totalAmount: 17500,
      subtotal: 17500,
      paidAmount: 17500,
      items: [
        {
          productId: 'prod-1793510114967-357',
          name: 'Self Adhesive Vinyl Roll (4.2ft x 164ft)',
          unit: 'pcs',
          qty: 5,
          unitCost: 3500,
          totalCost: 17500,
          receivedQty: 5
        }
      ]
    },
    {
      id: 'po-1793509500000',
      poNo: 'DCC-PO-2026-8859',
      poNumber: 'DCC-PO-2026-8859',
      date: '2026-11-01',
      supplierId: 'sup-1793509871107',
      supplierName: 'Universal Media & Flex Supply',
      destination: 'Factory',
      destinationLocation: 'Factory',
      status: 'Received',
      challanStatus: 'Received',
      paymentStatus: 'Paid',
      paymentMethod: 'City Bank PLC',
      bankAccount: 'City Bank PLC',
      grandTotal: 21000,
      totalAmount: 21000,
      subtotal: 21000,
      paidAmount: 21000,
      items: [
        {
          productId: 'prod-1793510043978-978',
          name: 'Solvent Banner Flex Roll (10ft x 164ft)',
          unit: 'roll',
          qty: 5,
          unitCost: 4200,
          totalCost: 21000,
          receivedQty: 5
        }
      ]
    }
  ];

  const bomList = [
    {
      id: 'bom-1',
      targetProductId: 'prod-1793509566476-992',
      productName: 'Frontlit Banner Print (340gsm)',
      autoDeductOnSale: true,
      components: [
        {
          productId: 'prod-1793510043978-978',
          productName: 'Solvent Banner Flex Roll (10ft x 164ft)',
          requiredQty: 0.00062,
          unit: 'roll',
          unitCost: 4200,
          componentCost: 2.60
        },
        {
          productId: 'prod-1793510100000-740',
          productName: 'Solvent Printing Ink',
          requiredQty: 0.02,
          unit: 'ltr',
          unitCost: 800,
          componentCost: 16.00
        }
      ],
      estimatedUnitCost: 18.60,
      notes: 'Standard solvent flex print formula with ink allowance'
    },
    {
      id: 'bom-2',
      targetProductId: 'prod-1793509624654-940',
      productName: 'Park ID Card',
      autoDeductOnSale: false,
      components: [
        {
          productId: 'prod-1793510229096-192',
          productName: 'PVC Foam Board 5mm (8ft x 4ft)',
          requiredQty: 0.05,
          unit: 'pcs',
          unitCost: 1400,
          componentCost: 70.00
        }
      ],
      estimatedUnitCost: 70.00,
      notes: 'Digital direct printing and CNC cutout per card'
    },
    {
      id: 'bom-3',
      targetProductId: 'prod-1793509485978-631',
      productName: 'Glossy Vinyl Sticker Print',
      autoDeductOnSale: true,
      components: [
        {
          productId: 'prod-1793510114967-357',
          productName: 'Self Adhesive Vinyl Roll (4.2ft x 164ft)',
          requiredQty: 0.00145,
          unit: 'pcs',
          unitCost: 3500,
          componentCost: 5.07
        },
        {
          productId: 'prod-1793510100000-740',
          productName: 'Solvent Printing Ink',
          requiredQty: 0.02,
          unit: 'ltr',
          unitCost: 800,
          componentCost: 16.00
        }
      ],
      estimatedUnitCost: 21.07,
      notes: 'High gloss eco solvent vinyl print recipe'
    },
    {
      id: 'bom-4',
      targetProductId: 'prod-1793509699474-738',
      productName: 'Sublimation Ceramic Mug',
      autoDeductOnSale: false,
      components: [
        {
          productId: 'prod-1793510200000-145',
          productName: 'Blank Ceramic White Mug 11oz',
          requiredQty: 1,
          unit: 'pcs',
          unitCost: 100,
          componentCost: 100.00
        },
        {
          productId: 'prod-1793594380000-884',
          productName: 'Mug Packaging Gift Box',
          requiredQty: 1,
          unit: 'box',
          unitCost: 8,
          componentCost: 8.00
        },
        {
          productId: 'prod-1793594364069-872',
          productName: 'Sublimation Transfer Paper & Ink',
          requiredQty: 1,
          unit: 'set',
          unitCost: 5,
          componentCost: 5.00
        }
      ],
      estimatedUnitCost: 113.00,
      notes: 'Heat press transfer recipe with mug box packaging'
    }
  ];

  const productCategories = [
    {
      id: 'cat-1',
      code: 'CAT-PRINT',
      name: 'DIGITAL PRINTING',
      description: 'All large format banners, stickers and vinyl printing',
      classification: 'Finished Goods / Service',
      isRawMaterialGroup: false,
      itemCount: 2
    },
    {
      id: 'cat-2',
      code: 'CAT-GIFT',
      name: 'BRANDED PROMOTIONAL GIFTS',
      description: 'Corporate gifts, mugs, ID cards, crests and stationery',
      classification: 'Finished Goods / Service',
      isRawMaterialGroup: false,
      itemCount: 2
    },
    {
      id: 'cat-3',
      code: 'RAW-MEDIA',
      name: 'RAW PRINTING MEDIA & ROLLS',
      description: 'Raw media rolls like banner flex, vinyl, lamination and backlit',
      classification: 'Raw Material',
      isRawMaterialGroup: true,
      itemCount: 6
    },
    {
      id: 'cat-4',
      code: 'RAW-SHEET',
      name: 'ACRYLIC & BOARD RAW MATERIALS',
      description: 'Cast acrylic sheets, PVC foam boards, ACP sheets for signage',
      classification: 'Raw Material',
      isRawMaterialGroup: true,
      itemCount: 2
    }
  ];

  const suppliers = [
    {
      id: 'sup-1793509871109',
      name: 'PromoGift & Card Import Center',
      contactPerson: 'Kazi Farhan',
      phone: '01711223344',
      email: 'promogift.ctg@gmail.com',
      address: 'Jubilee Road, Chattogram',
      balancePayable: 0,
      dueAmount: 0
    },
    {
      id: 'sup-1793509871108',
      name: 'Bengal Acrylic & Board House',
      contactPerson: 'Engr. Mofizul Islam',
      phone: '01819334455',
      email: 'bengalacrylic@bd.net',
      address: 'Muradpur Commercial Area, Chattogram',
      balancePayable: 0,
      dueAmount: 0
    },
    {
      id: 'sup-1793509871107',
      name: 'Universal Media & Flex Supply',
      contactPerson: 'Nurul Alam',
      phone: '01911445566',
      email: 'universalmedia.ctg@yahoo.com',
      address: 'Anderkilla, Chattogram',
      balancePayable: 0,
      dueAmount: 0
    }
  ];

  const restoredPayload = {
    ...existingData,
    products,
    purchaseOrders,
    bomList,
    productCategories,
    suppliers,
    lastPurgedAt: null,
    lastPurgeMode: null,
  };

  const nextRev = (doc.revision || 1) + 1;
  restoredPayload._rev = nextRev;

  // Save directly as BSON Object in MongoDB Atlas
  await coll.updateOne(
    { _id: doc._id },
    {
      $set: {
        data: restoredPayload,
        revision: nextRev,
        updatedAt: new Date()
      }
    }
  );

  console.log('✅ Successfully restored 7 POs, 12 Products, 4 BOMs, 4 Categories, and 3 Suppliers directly into MongoDB Atlas!');
  await mongoose.disconnect();
}

restore().catch(console.error);
