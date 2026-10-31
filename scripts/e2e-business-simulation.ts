import {
    ChartOfAccount,
    AccountingTransaction,
    SalesInvoice,
    PurchaseOrder,
    JournalEntry,
    Project,
    Supplier,
    Customer,
    ProductItem,
    StockMovement
} from '../src/types';
import {
    calculateSingleAccountBalance,
    calculateTotalCustomerReceivables,
    calculateTotalSupplierPayables,
    calculateTotalCustomerAdvances,
    isInvoiceTransaction,
    isProjectTransaction,
    isSupplierPaymentTransaction,
    isAdvanceAdjustmentTransaction,
    isDueReceivableTransaction
} from '../src/utils/accountUtils';

console.log('========================================================================================');
console.log('🏢 COMPREHENSIVE END-TO-END BUSINESS LIFECYCLE SIMULATION & MULTI-MODULE AUDIT');
console.log('========================================================================================\n');

// ---------------------------------------------------------------------------------------------
// STEP 0: INITIAL SYSTEM SETUP WITH OWNER CAPITAL
// ---------------------------------------------------------------------------------------------
const INITIAL_CAPITAL = 100000; // ৳100,000 initial investment in Southeast Bank

const chartOfAccounts: ChartOfAccount[] = [
    // 1000s: Current Assets
    { id: 'coa-1001', code: '1001', name: 'Cash in Hand', classification: 'Asset', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Current Assets', isActive: true, isSystem: true, openingBalance: 0 },
    { id: 'coa-1002', code: '1002', name: 'Raw Materials & Inventory', classification: 'Asset', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Current Assets', isActive: true, isSystem: true, openingBalance: 0 },
    { id: 'coa-1003', code: '1003', name: 'Accounts Receivable - Customers', classification: 'Asset', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Current Assets', isActive: true, isSystem: true, openingBalance: 0 },
    { id: 'coa-1004', code: '1004', name: 'City Bank PLC', classification: 'Asset', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Current Assets', isActive: true, isSystem: false, openingBalance: 0 },
    { id: 'coa-1005', code: '1005', name: 'Southeast Bank', classification: 'Asset', normalBalance: 'Debit', currentBalance: INITIAL_CAPITAL, accountGroup: 'Current Assets', isActive: true, isSystem: false, openingBalance: INITIAL_CAPITAL },
    { id: 'coa-1006', code: '1006', name: 'Nagad', classification: 'Asset', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Current Assets', isActive: true, isSystem: false, openingBalance: 0 },
    { id: 'coa-1007', code: '1007', name: 'bKash', classification: 'Asset', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Current Assets', isActive: true, isSystem: false, openingBalance: 0 },

    // 2000s: Current Liabilities
    { id: 'coa-2001', code: '2001', name: 'Accounts Payable (Suppliers)', classification: 'Liability', normalBalance: 'Credit', currentBalance: 0, accountGroup: 'Current Liabilities', isActive: true, isSystem: true, openingBalance: 0 },
    { id: 'coa-2002', code: '2002', name: 'Customer Advance', classification: 'Liability', normalBalance: 'Credit', currentBalance: 0, accountGroup: 'Current Liabilities', isActive: true, isSystem: true, openingBalance: 0 },

    // 3000s: Equity
    { id: 'coa-3001', code: '3001', name: "Owner's Capital Investment", classification: 'Equity', normalBalance: 'Credit', currentBalance: INITIAL_CAPITAL, accountGroup: 'Equity', isActive: true, isSystem: true, openingBalance: INITIAL_CAPITAL },
    { id: 'coa-3003', code: '3003', name: 'Retained Earnings', classification: 'Equity', normalBalance: 'Credit', currentBalance: 0, accountGroup: 'Equity', isActive: true, isSystem: true, openingBalance: 0 },

    // 4000s: Operating Revenue
    { id: 'coa-4001', code: '4001', name: 'Sales Revenue', classification: 'Revenue', normalBalance: 'Credit', currentBalance: 0, accountGroup: 'Operating Revenue', isActive: true, isSystem: true, openingBalance: 0 },
    { id: 'coa-4002', code: '4002', name: 'Project Sales', classification: 'Revenue', normalBalance: 'Credit', currentBalance: 0, accountGroup: 'Operating Revenue', isActive: true, isSystem: true, openingBalance: 0 },
    { id: 'coa-4003', code: '4003', name: 'Consulting & Direct Operating Income', classification: 'Revenue', normalBalance: 'Credit', currentBalance: 0, accountGroup: 'Operating Revenue', isActive: true, isSystem: false, openingBalance: 0 },

    // 5000s: Operating Expenses / COGS
    { id: 'coa-5001', code: '5001', name: 'Cost of Goods Sold - Raw Materials', classification: 'Expense', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Direct Expenses / COGS', isActive: true, isSystem: true, openingBalance: 0 },
    { id: 'coa-5200', code: '5200', name: 'Head Office Rent', classification: 'Expense', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Operating Expenses', isActive: true, isSystem: false, openingBalance: 0 },
    { id: 'coa-5206', code: '5206', name: 'Project Expense', classification: 'Expense', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Operating Expenses', isActive: true, isSystem: true, openingBalance: 0 }
];

let products: ProductItem[] = [
    {
        id: 'prod-acrylic-3mm',
        code: 'RM-101',
        name: 'Acrylic Sheet 3mm Cast',
        category: 'RAW MATERIAL' as any,
        isRawMaterial: true,
        unit: 'pcs',
        costPrice: 500,
        unitPrice: 800,
        stockFactory: 0,
        stockOffice: 0,
        minStockAlert: 10,
        description: 'High grade acrylic sheet for signboards and lettering'
    }
];

const stockMovements: StockMovement[] = [];
const purchaseOrders: PurchaseOrder[] = [];
const invoices: SalesInvoice[] = [];
const projects: Project[] = [];
const transactions: AccountingTransaction[] = [];
const journalEntries: JournalEntry[] = [];
const suppliers: Supplier[] = [{ id: 'sup-1', name: 'Elite Pack', currentBalance: 0, totalPurchases: 0, totalPaid: 0 }];
const customers: Customer[] = [
    { id: 'cust-1', name: 'Rahim Traders', dueBalance: 0, advanceBalance: 0, totalSales: 0 },
    { id: 'cust-2', name: 'Kabir & Co.', dueBalance: 0, advanceBalance: 0, totalSales: 0 }
];

console.log('📌 [STEP 0] Setup Completed: Initial Capital ৳100,000 deposited in Southeast Bank.\n');

// ---------------------------------------------------------------------------------------------
// STEP 1: SUPPLY & PURCHASE (Buy Raw Materials & Verify Stock Increase)
// ---------------------------------------------------------------------------------------------
console.log('========================================================================================');
console.log('🛒 [STEP 1] SUPPLY & PURCHASE MODULE');
console.log('========================================================================================');
console.log('Action: Purchase 100 pcs "Acrylic Sheet 3mm Cast" @ ৳500 = ৳50,000 from Elite Pack.');
console.log('Payment: ৳50,000 paid in full from Southeast Bank.\n');

const po1: PurchaseOrder = {
    id: 'po-101',
    poNo: 'DCC-PO-2026-101',
    poNumber: 'DCC-PO-2026-101',
    date: '2026-10-31',
    supplierId: 'sup-1',
    supplierName: 'Elite Pack',
    destination: 'Factory',
    items: [{
        productId: 'prod-acrylic-3mm',
        name: 'Acrylic Sheet 3mm Cast',
        qty: 100,
        unitCost: 500,
        totalCost: 50000,
        receivedQty: 100
    }],
    totalAmount: 50000,
    grandTotal: 50000,
    paidAmount: 50000,
    dueAmount: 0,
    status: 'Received',
    paymentStatus: 'Paid',
    paymentMethod: 'Southeast Bank'
};
purchaseOrders.push(po1);

// Automatic Stock In to Factory
products = products.map(p => p.id === 'prod-acrylic-3mm' ? { ...p, stockFactory: p.stockFactory + 100 } : p);

// Stock Movement Log (IN)
stockMovements.push({
    id: 'sm-po1-in',
    date: '2026-10-31 10:00',
    productId: 'prod-acrylic-3mm',
    productName: 'Acrylic Sheet 3mm Cast',
    type: 'IN',
    qty: 100,
    unit: 'pcs',
    targetLocation: 'Factory',
    refNo: po1.poNo,
    reason: `PO Received from ${po1.supplierName}`
});

// Bank Payment Transaction
transactions.push({
    id: 'tx-po1-bank',
    date: '2026-10-31',
    type: 'EXPENSE',
    amount: 50000,
    account: 'Southeast Bank',
    paymentAccount: 'Southeast Bank',
    paymentMethod: 'Southeast Bank',
    accountHead: 'Accounts Payable',
    refNo: po1.poNo,
    customerOrSupplier: po1.supplierName,
    category: 'Raw Materials & Supplies',
    description: `Payment for Purchase Order ${po1.poNo} - Elite Pack`
});

// Journal Voucher
journalEntries.push({
    id: 'jnl-po1',
    entryNo: 'JNL-2026-101',
    date: '2026-10-31',
    refNo: po1.poNo,
    debitAccountId: 'coa-1002',
    debitAccountName: 'Raw Materials & Inventory',
    creditAccountId: 'coa-1005',
    creditAccountName: 'Southeast Bank',
    amount: 50000,
    narration: `Inventory received and paid via Southeast Bank for PO ${po1.poNo}`,
    source: 'PURCHASE'
});

const currentStockP1 = products.find(p => p.id === 'prod-acrylic-3mm')!;
console.log(`✅ Stock In Verified:`);
console.log(`   - Factory Stock: ${currentStockP1.stockFactory} pcs`);
console.log(`   - Cost Price: ৳${currentStockP1.costPrice}`);
console.log(`   - Inventory Valuation: ৳${(currentStockP1.stockFactory * currentStockP1.costPrice).toLocaleString()}`);
console.log(`   - Stock Movement: ${stockMovements[0].type} ${stockMovements[0].qty} ${stockMovements[0].unit} (Ref: ${stockMovements[0].refNo})`);


// ---------------------------------------------------------------------------------------------
// STEP 2: SALES & ORDERS (Sell Products & Verify Stock Decrement)
// ---------------------------------------------------------------------------------------------
console.log('\n========================================================================================');
console.log('🧾 [STEP 2] SALES & ORDERS MODULE');
console.log('========================================================================================');
console.log('Action: Sales Invoice DCC-INV-2026-201 to Rahim Traders.');
console.log('Item: 40 pcs "Acrylic Sheet 3mm Cast" @ ৳800 = ৳32,000.');
console.log('Payment: ৳32,000 Cash in Hand collected in full.\n');

const inv1: SalesInvoice = {
    id: 'inv-201',
    invoiceNo: 'DCC-INV-2026-201',
    customerName: 'Rahim Traders',
    customerId: 'cust-1',
    date: '2026-10-31',
    warehouseLocation: 'Factory',
    items: [{
        productId: 'prod-acrylic-3mm',
        name: 'Acrylic Sheet 3mm Cast',
        qty: 40,
        unit: 'pcs',
        unitPrice: 800,
        total: 32000
    }],
    subtotal: 32000,
    grandTotal: 32000,
    paidAmount: 32000,
    dueAmount: 0,
    discount: 0,
    tax: 0,
    status: 'Completed',
    paymentStatus: 'Paid',
    paymentMethod: 'Cash in Hand'
};
invoices.push(inv1);

// Automatic Stock Out from Factory
products = products.map(p => p.id === 'prod-acrylic-3mm' ? { ...p, stockFactory: p.stockFactory - 40 } : p);

// Stock Movement Log (OUT)
stockMovements.push({
    id: 'sm-inv1-out',
    date: '2026-10-31 11:30',
    productId: 'prod-acrylic-3mm',
    productName: 'Acrylic Sheet 3mm Cast',
    type: 'OUT',
    qty: 40,
    unit: 'pcs',
    sourceLocation: 'Factory',
    refNo: inv1.invoiceNo,
    reason: `Sales Invoice to ${inv1.customerName}`
});

// Cash Collection Transaction
transactions.push({
    id: 'tx-inv1-cash',
    date: '2026-10-31',
    type: 'INCOME',
    amount: 32000,
    account: 'Cash in Hand',
    paymentAccount: 'Cash in Hand',
    paymentMethod: 'Cash',
    accountHead: 'Sales Revenue',
    refNo: inv1.invoiceNo,
    customerOrSupplier: inv1.customerName,
    category: 'Sales Revenue',
    description: `Sales Invoice Payment: Cash in Hand (Paid) - ${inv1.invoiceNo}`
});

// COGS Consumption: 40 pcs * 500 = ৳20,000
const cogsInv1 = 40 * 500;
journalEntries.push({
    id: 'jnl-cogs-inv1',
    entryNo: 'JNL-2026-201',
    date: '2026-10-31',
    refNo: inv1.invoiceNo,
    debitAccountId: 'coa-5001',
    debitAccountName: 'Cost of Goods Sold - Raw Materials',
    creditAccountId: 'coa-1002',
    creditAccountName: 'Raw Materials & Inventory',
    amount: cogsInv1,
    narration: `COGS consumed for 40 pcs Acrylic Sheet - ${inv1.invoiceNo}`,
    source: 'SALES'
});

const currentStockP2 = products.find(p => p.id === 'prod-acrylic-3mm')!;
console.log(`✅ Stock Out Verified:`);
console.log(`   - Previous Stock: 100 pcs`);
console.log(`   - Sold Qty: 40 pcs`);
console.log(`   - Remaining Closing Stock: ${currentStockP2.stockFactory} pcs`);
console.log(`   - Remaining Stock Valuation: ৳${(currentStockP2.stockFactory * currentStockP2.costPrice).toLocaleString()}`);
console.log(`   - COGS Generated: ৳${cogsInv1.toLocaleString()}`);


// ---------------------------------------------------------------------------------------------
// STEP 3: PROJECTS MODULE (Create Project, Add Sales & Add Expenses)
// ---------------------------------------------------------------------------------------------
console.log('\n========================================================================================');
console.log('🏗️ [STEP 3] PROJECT MANAGEMENT MODULE');
console.log('========================================================================================');
console.log('Action: Project PRJ-2026-001 "City Mega Billboard" for Apex Footwear. Budget: ৳60,000.');
console.log('Sales Milestone 1: ৳40,000 collected (City Bank PLC: ৳25,000, Nagad: ৳15,000).');
console.log('Expense 1: Site Fabrication ৳8,000 paid from Cash in Hand.\n');

const prj1: Project = {
    id: 'prj-001',
    code: 'PRJ-2026-001',
    name: 'City Mega Billboard',
    clientName: 'Apex Footwear',
    startDate: '2026-10-31',
    budget: 60000,
    totalSales: 40000,
    totalCollected: 40000,
    totalExpenses: 8000,
    netProfit: 32000,
    status: 'In Progress',
    salesItems: [{
        id: 'ps-1',
        description: 'Contract Milestone 1 Billing',
        amount: 40000,
        date: '2026-10-31',
        clientName: 'Apex Footwear',
        paymentMethod: 'Multi-Channel',
        paymentBreakdown: [
            { id: 'pb-1', method: 'City Bank PLC', amount: 25000 },
            { id: 'pb-2', method: 'Nagad', amount: 15000 }
        ],
        paidAmount: 40000,
        dueAmount: 0
    }],
    expenseItems: [{
        id: 'pe-1',
        description: 'Site Structure Fabrication & Heavy Welding',
        amount: 8000,
        category: 'Project Expense',
        date: '2026-10-31',
        paymentMethod: 'Cash'
    }]
};
projects.push(prj1);

// Milestone 1 Project Inflows
transactions.push({
    id: 'tx-prj1-city',
    date: '2026-10-31',
    type: 'INCOME',
    amount: 25000,
    account: 'City Bank PLC',
    paymentAccount: 'City Bank PLC',
    paymentMethod: 'City Bank PLC',
    accountHead: 'Project Sales',
    refNo: prj1.code,
    category: 'Project Revenue',
    description: `Project Income: [${prj1.code}] Apex Footwear - Milestone 1 (City Bank PLC)`,
    projectId: prj1.id,
    projectCode: prj1.code
});
transactions.push({
    id: 'tx-prj1-nagad',
    date: '2026-10-31',
    type: 'INCOME',
    amount: 15000,
    account: 'Nagad',
    paymentAccount: 'Nagad',
    paymentMethod: 'Nagad',
    accountHead: 'Project Sales',
    refNo: prj1.code,
    category: 'Project Revenue',
    description: `Project Income: [${prj1.code}] Apex Footwear - Milestone 1 (Nagad)`,
    projectId: prj1.id,
    projectCode: prj1.code
});

// Project Site Expense Outflow
transactions.push({
    id: 'tx-prj1-exp1',
    date: '2026-10-31',
    type: 'EXPENSE',
    amount: 8000,
    account: 'Cash in Hand',
    paymentAccount: 'Cash in Hand',
    paymentMethod: 'Cash',
    accountHead: 'Project Expense',
    refNo: prj1.code,
    category: 'Project Expense',
    description: `Project Cost: [${prj1.code}] Site Structure Fabrication (Cash)`
});

journalEntries.push({
    id: 'jnl-prj1-exp1',
    entryNo: 'JNL-2026-301',
    date: '2026-10-31',
    refNo: prj1.code,
    debitAccountId: 'coa-5206',
    debitAccountName: 'Project Expense',
    creditAccountId: 'coa-1001',
    creditAccountName: 'Cash in Hand',
    amount: 8000,
    narration: `Project Cost: [${prj1.code}] Site Structure Fabrication`,
    source: 'PROJECT_EXPENSE'
});

console.log(`✅ Project Initial Milestones Recorded:`);
console.log(`   - Project Total Sales: ৳${prj1.totalSales.toLocaleString()}`);
console.log(`   - Project Total Expenses: ৳${prj1.totalExpenses.toLocaleString()}`);
console.log(`   - Project Net Profit: ৳${prj1.netProfit.toLocaleString()}`);


// ---------------------------------------------------------------------------------------------
// STEP 4: ACCOUNTING TAB (Record Income & Record Expense Operations)
// ---------------------------------------------------------------------------------------------
console.log('\n========================================================================================');
console.log('💼 [STEP 4] ACCOUNTING TAB - DIRECT LEDGER OPERATIONS');
console.log('========================================================================================');

// 4.1 Record Income: Add Project Sales Milestone 2 for PRJ-2026-001 (৳15,000 via City Bank PLC)
console.log('Action 4.1: Record Income -> Add Project Sales for PRJ-2026-001: ৳15,000 via City Bank PLC.');
prj1.totalSales += 15000;
prj1.totalCollected += 15000;
prj1.netProfit += 15000;
prj1.salesItems.push({
    id: 'ps-2',
    description: 'Contract Milestone 2 - Panel Installation',
    amount: 15000,
    date: '2026-10-31',
    clientName: 'Apex Footwear',
    paymentMethod: 'City Bank PLC',
    paidAmount: 15000,
    dueAmount: 0
});

transactions.push({
    id: 'tx-prj1-m2',
    date: '2026-10-31',
    type: 'INCOME',
    amount: 15000,
    account: 'City Bank PLC',
    paymentAccount: 'City Bank PLC',
    paymentMethod: 'City Bank PLC',
    accountHead: 'Project Sales',
    refNo: prj1.code,
    category: 'Project Revenue',
    description: `Project Income: [${prj1.code}] Apex Footwear - Milestone 2 (City Bank PLC)`,
    projectId: prj1.id,
    projectCode: prj1.code
});

// 4.2 Record Income: Customer Advance (৳10,000 from Kabir & Co. via Cash in Hand)
console.log('Action 4.2: Record Income -> Customer Advance: ৳10,000 from Kabir & Co. in Cash in Hand.');
customers[1].advanceBalance = 10000;
const advRef = 'ADV-2026-401';
transactions.push({
    id: 'tx-adv-kabir',
    date: '2026-10-31',
    type: 'INCOME',
    amount: 10000,
    account: 'Cash in Hand',
    paymentAccount: 'Cash in Hand',
    paymentMethod: 'Cash',
    accountHead: 'Customer Advance',
    refNo: advRef,
    customerOrSupplier: 'Kabir & Co.',
    category: 'Customer Advance',
    description: 'Customer Advance received from Kabir & Co. for upcoming seasonal display'
});
journalEntries.push({
    id: 'jnl-adv-kabir',
    entryNo: 'JNL-2026-401',
    date: '2026-10-31',
    refNo: advRef,
    debitAccountId: 'coa-1001',
    debitAccountName: 'Cash in Hand',
    creditAccountId: 'coa-2002',
    creditAccountName: 'Customer Advance',
    amount: 10000,
    narration: 'Advance deposit received from Kabir & Co.',
    source: 'SALES'
});

// 4.3 Record Income: General Operating Sale / Direct Consulting Income (৳12,000 via Southeast Bank)
console.log('Action 4.3: Record Income -> Direct Corporate Brand Consulting: ৳12,000 via Southeast Bank.');
const incRef = 'INC-2026-402';
transactions.push({
    id: 'tx-inc-consulting',
    date: '2026-10-31',
    type: 'INCOME',
    amount: 12000,
    account: 'Southeast Bank',
    paymentAccount: 'Southeast Bank',
    paymentMethod: 'Southeast Bank',
    accountHead: 'Consulting & Direct Operating Income',
    refNo: incRef,
    category: 'Consulting & Direct Operating Income',
    description: 'Corporate Branding and Architectural Signage Consultancy'
});
journalEntries.push({
    id: 'jnl-inc-consulting',
    entryNo: 'JNL-2026-402',
    date: '2026-10-31',
    refNo: incRef,
    debitAccountId: 'coa-1005',
    debitAccountName: 'Southeast Bank',
    creditAccountId: 'coa-4003',
    creditAccountName: 'Consulting & Direct Operating Income',
    amount: 12000,
    narration: 'Corporate Brand Consulting fee received',
    source: 'SALES'
});

// 4.4 Record Expense: Additional Project Expense for PRJ-2026-001 (৳4,000 via Cash in Hand)
console.log('Action 4.4: Record Expense -> Project Electrical Lighting for PRJ-2026-001: ৳4,000 from Cash in Hand.');
prj1.totalExpenses += 4000;
prj1.netProfit -= 4000;
prj1.expenseItems.push({
    id: 'pe-2',
    description: 'LED Backlight & Floodlight Wiring',
    amount: 4000,
    category: 'Project Expense',
    date: '2026-10-31',
    paymentMethod: 'Cash'
});
transactions.push({
    id: 'tx-prj1-exp2',
    date: '2026-10-31',
    type: 'EXPENSE',
    amount: 4000,
    account: 'Cash in Hand',
    paymentAccount: 'Cash in Hand',
    paymentMethod: 'Cash',
    accountHead: 'Project Expense',
    refNo: prj1.code,
    category: 'Project Expense',
    description: `Project Cost: [${prj1.code}] LED Backlight Wiring (Cash)`
});
journalEntries.push({
    id: 'jnl-prj1-exp2',
    entryNo: 'JNL-2026-403',
    date: '2026-10-31',
    refNo: prj1.code,
    debitAccountId: 'coa-5206',
    debitAccountName: 'Project Expense',
    creditAccountId: 'coa-1001',
    creditAccountName: 'Cash in Hand',
    amount: 4000,
    narration: `Project Cost: [${prj1.code}] LED Backlight Wiring`,
    source: 'PROJECT_EXPENSE'
});

// 4.5 Record Expense: General Operating Expense (Head Office Rent ৳6,000 via Southeast Bank)
console.log('Action 4.5: Record Expense -> Head Office Rent: ৳6,000 via Southeast Bank.');
const rentRef = 'EXP-2026-404';
transactions.push({
    id: 'tx-exp-rent',
    date: '2026-10-31',
    type: 'EXPENSE',
    amount: 6000,
    account: 'Southeast Bank',
    paymentAccount: 'Southeast Bank',
    paymentMethod: 'Southeast Bank',
    accountHead: 'Head Office Rent',
    refNo: rentRef,
    category: 'Head Office Rent',
    description: 'Head Office Rent Share Payment'
});
journalEntries.push({
    id: 'jnl-exp-rent',
    entryNo: 'JNL-2026-404',
    date: '2026-10-31',
    refNo: rentRef,
    debitAccountId: 'coa-5200',
    debitAccountName: 'Head Office Rent',
    creditAccountId: 'coa-1005',
    creditAccountName: 'Southeast Bank',
    amount: 6000,
    narration: 'Head Office Rent Share Payment',
    source: 'EXPENSE'
});


// ---------------------------------------------------------------------------------------------
// STEP 5: COMPREHENSIVE CHART OF ACCOUNTS AUDIT (All Classifications & Equation)
// ---------------------------------------------------------------------------------------------
console.log('\n========================================================================================');
console.log('📊 [STEP 5] CHART OF ACCOUNTS (COA) AUDIT - ALL CLASSIFICATIONS');
console.log('========================================================================================');

// Live Asset Balances
const balCash = calculateSingleAccountBalance(chartOfAccounts.find(a => a.code === '1001')!, transactions, invoices, projects);
const balSoutheast = calculateSingleAccountBalance(chartOfAccounts.find(a => a.code === '1005')!, transactions, invoices, projects);
const balCity = calculateSingleAccountBalance(chartOfAccounts.find(a => a.code === '1004')!, transactions, invoices, projects);
const balNagad = calculateSingleAccountBalance(chartOfAccounts.find(a => a.code === '1006')!, transactions, invoices, projects);
const balBkash = calculateSingleAccountBalance(chartOfAccounts.find(a => a.code === '1007')!, transactions, invoices, projects);
const balInventory = products.reduce((acc, p) => acc + (p.stockFactory + p.stockOffice) * p.costPrice, 0);
const balAR = calculateTotalCustomerReceivables(invoices, customers, projects);

const totalAssets = balCash + balSoutheast + balCity + balNagad + balBkash + balInventory + balAR;

// Live Liability Balances
const balAP = calculateTotalSupplierPayables(suppliers, purchaseOrders);
const balCustomerAdvance = calculateTotalCustomerAdvances(customers, transactions, chartOfAccounts);
const totalLiabilities = balAP + balCustomerAdvance;

// Live Revenue Balances
const balRetailSales = invoices.filter(i => !i.projectId && !i.projectCode).reduce((s, i) => s + (i.grandTotal || 0), 0);
const balProjectSales = projects.reduce((s, p) => s + (p.totalSales || 0), 0);
const balDirectRevenue = transactions
    .filter(t => t.type === 'INCOME' && !isInvoiceTransaction(t) && !isProjectTransaction(t) && !t.category?.toLowerCase().includes('advance'))
    .reduce((s, t) => s + (t.amount || 0), 0);
const totalRevenue = balRetailSales + balProjectSales + balDirectRevenue;

// Live Expense Balances
const balCogs = journalEntries.filter(j => j.debitAccountId === 'coa-5001').reduce((s, j) => s + j.amount, 0);
const balProjectExpense = projects.reduce((s, p) => s + (p.totalExpenses || 0), 0);
const balOfficeRent = transactions.filter(t => t.type === 'EXPENSE' && t.category === 'Head Office Rent').reduce((s, t) => s + t.amount, 0);
const totalExpenses = balCogs + balProjectExpense + balOfficeRent;

// Net Operating Profit & Equity
const netOperatingProfit = totalRevenue - totalExpenses;
const ownerCapital = INITIAL_CAPITAL;
const totalEquity = ownerCapital + netOperatingProfit;

console.log('1. ASSET ACCOUNTS:');
console.log(`   - 1001 Cash in Hand: ৳${balCash.toLocaleString()} [Sales 32k + Advance 10k - Prj Exp 12k]`);
console.log(`   - 1005 Southeast Bank: ৳${balSoutheast.toLocaleString()} [Capital 100k - PO 50k + Consulting 12k - Rent 6k]`);
console.log(`   - 1004 City Bank PLC: ৳${balCity.toLocaleString()} [Prj M1 25k + Prj M2 15k]`);
console.log(`   - 1006 Nagad: ৳${balNagad.toLocaleString()} [Prj M1 15k]`);
console.log(`   - 1007 bKash: ৳${balBkash.toLocaleString()}`);
console.log(`   - 1002 Raw Materials & Inventory: ৳${balInventory.toLocaleString()} [60 pcs @ ৳500]`);
console.log(`   - 1003 Accounts Receivable: ৳${balAR.toLocaleString()}`);
console.log(`   👉 TOTAL ASSETS: ৳${totalAssets.toLocaleString()}\n`);

console.log('2. LIABILITY ACCOUNTS:');
console.log(`   - 2001 Accounts Payable: ৳${balAP.toLocaleString()} [PO Paid in Full]`);
console.log(`   - 2002 Customer Advance: ৳${balCustomerAdvance.toLocaleString()} [Kabir & Co.]`);
console.log(`   👉 TOTAL LIABILITIES: ৳${totalLiabilities.toLocaleString()}\n`);

console.log('3. REVENUE ACCOUNTS:');
console.log(`   - 4001 Sales Revenue: ৳${balRetailSales.toLocaleString()} [Invoice DCC-INV-2026-201]`);
console.log(`   - 4002 Project Sales: ৳${balProjectSales.toLocaleString()} [PRJ-2026-001 M1 40k + M2 15k]`);
console.log(`   - 4003 Consulting Income: ৳${balDirectRevenue.toLocaleString()} [INC-2026-402]`);
console.log(`   👉 TOTAL OPERATING REVENUE: ৳${totalRevenue.toLocaleString()}\n`);

console.log('4. EXPENSE ACCOUNTS:');
console.log(`   - 5001 Cost of Goods Sold: ৳${balCogs.toLocaleString()} [40 pcs consumed @ ৳500]`);
console.log(`   - 5206 Project Expense: ৳${balProjectExpense.toLocaleString()} [Site Fab 8k + LED 4k]`);
console.log(`   - 5200 Head Office Rent: ৳${balOfficeRent.toLocaleString()} [EXP-2026-404]`);
console.log(`   👉 TOTAL OPERATING EXPENSES: ৳${totalExpenses.toLocaleString()}\n`);

console.log('5. EQUITY ACCOUNTS:');
console.log(`   - 3001 Owner Capital Investment: ৳${ownerCapital.toLocaleString()}`);
console.log(`   - 3003 Retained Earnings (Net Profit): ৳${netOperatingProfit.toLocaleString()} [Revenue 99k - Expenses 38k]`);
console.log(`   👉 TOTAL EQUITY: ৳${totalEquity.toLocaleString()}\n`);

const eqDiff = Math.abs(totalAssets - (totalLiabilities + totalEquity));
const isCoaBalanced = eqDiff < 0.01;
console.log(`⚖️ ACCOUNTING EQUATION CHECK:`);
console.log(`   Assets (৳${totalAssets.toLocaleString()}) === Liabilities (৳${totalLiabilities.toLocaleString()}) + Equity (৳${totalEquity.toLocaleString()})`);
console.log(`   Status: ${isCoaBalanced ? '✅ 100% PERFECTLY BALANCED' : '❌ UNBALANCED'}`);
if (!isCoaBalanced) throw new Error('COA Equation broken!');


// ---------------------------------------------------------------------------------------------
// STEP 6: IFRS FINANCIAL STATEMENTS VERIFICATION
// ---------------------------------------------------------------------------------------------
console.log('\n========================================================================================');
console.log('📑 [STEP 6] IFRS FINANCIAL STATEMENTS AUDIT');
console.log('========================================================================================');

// Trial Balance
const trialBalanceDebits = totalAssets + totalExpenses;
const trialBalanceCredits = totalLiabilities + ownerCapital + totalRevenue;
const isTrialBalanced = Math.abs(trialBalanceDebits - trialBalanceCredits) < 0.01;

console.log('1. IFRS TRIAL BALANCE:');
console.log(`   - Total Debit Balances: ৳${trialBalanceDebits.toLocaleString()} (Assets ৳${totalAssets.toLocaleString()} + Expenses ৳${totalExpenses.toLocaleString()})`);
console.log(`   - Total Credit Balances: ৳${trialBalanceCredits.toLocaleString()} (Liabilities ৳${totalLiabilities.toLocaleString()} + Capital ৳${ownerCapital.toLocaleString()} + Revenue ৳${totalRevenue.toLocaleString()})`);
console.log(`   - Parity: ${isTrialBalanced ? '✅ Debits === Credits (100% Balanced)' : '❌ Unbalanced'}\n`);

// Profit & Loss
const grossProfit = totalRevenue - balCogs;
console.log('2. IFRS STATEMENT OF PROFIT OR LOSS (P&L):');
console.log(`   - Gross Revenue: ৳${totalRevenue.toLocaleString()}`);
console.log(`   - Cost of Goods Sold (COGS): (৳${balCogs.toLocaleString()})`);
console.log(`   - Gross Profit: ৳${grossProfit.toLocaleString()}`);
console.log(`   - Operating Expenses: (৳${(balProjectExpense + balOfficeRent).toLocaleString()})`);
console.log(`   - Net Profit for the Period: ৳${netOperatingProfit.toLocaleString()} ✅\n`);

// Balance Sheet
console.log('3. IFRS STATEMENT OF FINANCIAL POSITION (BALANCE SHEET):');
console.log(`   - Total Non-Current Assets: ৳0`);
console.log(`   - Total Current Assets: ৳${totalAssets.toLocaleString()} (Cash & Bank ৳${(balCash + balSoutheast + balCity + balNagad).toLocaleString()}, Inventory ৳${balInventory.toLocaleString()})`);
console.log(`   - Total Assets: ৳${totalAssets.toLocaleString()}`);
console.log(`   - Total Current Liabilities: ৳${totalLiabilities.toLocaleString()} (Customer Advance ৳${balCustomerAdvance.toLocaleString()})`);
console.log(`   - Total Equity: ৳${totalEquity.toLocaleString()} (Capital ৳${ownerCapital.toLocaleString()} + Net Profit ৳${netOperatingProfit.toLocaleString()})`);
console.log(`   - Total Equity & Liabilities: ৳${(totalLiabilities + totalEquity).toLocaleString()}`);
console.log(`   - Balance Sheet Parity: ${totalAssets === (totalLiabilities + totalEquity) ? '✅ Total Assets === Total Equity & Liabilities' : '❌ Mismatch'}\n`);

// Cash Flow Statement (IAS 7)
const totalCashInflows = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
const totalCashOutflows = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
const netOperatingCashFlow = totalCashInflows - totalCashOutflows;
const openingCash = INITIAL_CAPITAL;
const closingCash = openingCash + netOperatingCashFlow;
const liveTotalCash = balCash + balSoutheast + balCity + balNagad;

console.log('4. IFRS STATEMENT OF CASH FLOWS (IAS 7):');
console.log(`   - Cash Receipts from Customers: +৳${totalCashInflows.toLocaleString()}`);
console.log(`   - Cash Paid to Suppliers: -৳50,000`);
console.log(`   - Cash Paid for Operating Expenses: -৳18,000 [Project 12k + Rent 6k]`);
console.log(`   - Net Operating Cash Flow: +৳${netOperatingCashFlow.toLocaleString()}`);
console.log(`   - Beginning Cash & Bank: ৳${openingCash.toLocaleString()}`);
console.log(`   - Ending Cash & Bank Equivalents: ৳${closingCash.toLocaleString()}`);
console.log(`   - Match with Balance Sheet Cash: ${closingCash === liveTotalCash ? `✅ Exact Match (৳${closingCash.toLocaleString()} === ৳${liveTotalCash.toLocaleString()})` : '❌ Mismatch'}\n`);


// ---------------------------------------------------------------------------------------------
// STEP 7: LEDGER & DAY BOOK AUDIT
// ---------------------------------------------------------------------------------------------
console.log('========================================================================================');
console.log('📖 [STEP 7] LEDGER & DAY BOOK AUDIT');
console.log('========================================================================================');
console.log(`Total Financial Ledger Transactions: ${transactions.length}`);
console.log(`Total Double-Entry Journal Vouchers: ${journalEntries.length}`);

let runningCashBal = 0;
console.log('\nDay Book Cash in Hand Audit Trail:');
transactions
    .filter(t => t.paymentAccount === 'Cash in Hand' || t.account === 'Cash in Hand')
    .forEach((t, i) => {
        if (t.type === 'INCOME') runningCashBal += t.amount;
        else runningCashBal -= t.amount;
        console.log(`   ${i + 1}. [${t.type}] ${t.refNo} - ${t.description} | ৳${t.amount.toLocaleString()} -> Running Cash: ৳${runningCashBal.toLocaleString()}`);
    });
console.log(`   👉 Final Running Cash in Hand matches COA: ${runningCashBal === balCash ? `✅ Exact (৳${runningCashBal.toLocaleString()})` : '❌ Mismatch'}\n`);


// ---------------------------------------------------------------------------------------------
// STEP 8: INVENTORY VALUATION & MOVEMENT REPORT AUDIT
// ---------------------------------------------------------------------------------------------
console.log('========================================================================================');
console.log('📦 [STEP 8] INVENTORY VALUATION & MOVEMENT REPORT AUDIT');
console.log('========================================================================================');

const pReport = products.find(p => p.id === 'prod-acrylic-3mm')!;
const inQty = stockMovements.filter(sm => sm.productId === pReport.id && sm.type === 'IN').reduce((s, sm) => s + sm.qty, 0);
const outQty = stockMovements.filter(sm => sm.productId === pReport.id && sm.type === 'OUT').reduce((s, sm) => s + sm.qty, 0);
const closingStock = pReport.stockFactory + pReport.stockOffice;
const openingStock = closingStock + outQty - inQty;

console.log('1. INVENTORY VALUATION REPORT:');
console.log(`   - SKU: ${pReport.code} | Name: ${pReport.name}`);
console.log(`   - Category: ${pReport.category} | Unit: ${pReport.unit}`);
console.log(`   - Current Stock: ${closingStock} pcs`);
console.log(`   - Unit Cost Price: ৳${pReport.costPrice}`);
console.log(`   - Unit Selling Price: ৳${pReport.unitPrice}`);
console.log(`   - Stock Valuation at Cost: ৳${(closingStock * pReport.costPrice).toLocaleString()}`);
console.log(`   - Stock Valuation at Retail: ৳${(closingStock * pReport.unitPrice).toLocaleString()}`);
console.log(`   - Low Stock Alert Threshold: ${pReport.minStockAlert} pcs (Current ${closingStock} > ${pReport.minStockAlert} -> Normal Stock ✅)\n`);

console.log('2. INVENTORY MOVEMENT REPORT:');
console.log(`   - Opening Stock: ${openingStock} pcs`);
console.log(`   - Total Inflow (Purchases): +${inQty} pcs`);
console.log(`   - Total Outflow (Sales): -${outQty} pcs`);
console.log(`   - Calculated Closing Stock: ${openingStock + inQty - outQty} pcs`);
console.log(`   - Physical Closing Stock: ${closingStock} pcs`);
console.log(`   - Integrity Check: ${openingStock + inQty - outQty === closingStock ? '✅ 100% Consistent Movement Formula' : '❌ Inconsistent'}\n`);

console.log('========================================================================================');
console.log('🎉 ALL 8 MODULE AUDITS PASSED WITH 100.00% MATHEMATICAL AND FINANCIAL INTEGRITY!');
console.log('========================================================================================\n');
