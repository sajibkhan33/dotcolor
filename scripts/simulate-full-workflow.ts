import {
    ChartOfAccount,
    AccountingTransaction,
    SalesInvoice,
    PurchaseOrder,
    JournalEntry,
    Project,
    Supplier,
    Customer
} from '../src/types';
import {
    calculateSingleAccountBalance,
    calculateTotalCustomerReceivables,
    calculateTotalSupplierPayables,
    calculateTotalCustomerAdvances,
    isInvoiceTransaction,
    isProjectTransaction,
    isSupplierPaymentTransaction
} from '../src/utils/accountUtils';

console.log('================================================================');
console.log('🚀 FULL LIFECYCLE ENTERPRISE WORKFLOW SIMULATION & AUDIT REPORT');
console.log('================================================================\n');

const createFreshAccounts = (initialCapital: number = 0): ChartOfAccount[] => [
    // Assets
    { id: 'coa-1001', code: '1001', name: 'Cash in Hand', classification: 'Asset', normalBalance: 'Debit', currentBalance: initialCapital / 2, accountGroup: 'Current Assets', isActive: true, isSystem: true, openingBalance: initialCapital / 2 },
    { id: 'coa-1002', code: '1002', name: 'Raw Materials & Inventory', classification: 'Asset', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Current Assets', isActive: true, isSystem: true, openingBalance: 0 },
    { id: 'coa-1003', code: '1003', name: 'Accounts Receivable - Customers', classification: 'Asset', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Current Assets', isActive: true, isSystem: true, openingBalance: 0 },
    { id: 'coa-1004', code: '1004', name: 'City Bank PLC', classification: 'Asset', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Current Assets', isActive: true, isSystem: false, openingBalance: 0 },
    { id: 'coa-1005', code: '1005', name: 'Southeast Bank', classification: 'Asset', normalBalance: 'Debit', currentBalance: initialCapital / 2, accountGroup: 'Current Assets', isActive: true, isSystem: false, openingBalance: initialCapital / 2 },
    { id: 'coa-1006', code: '1006', name: 'Nagad', classification: 'Asset', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Current Assets', isActive: true, isSystem: false, openingBalance: 0 },
    { id: 'coa-1007', code: '1007', name: 'bKash', classification: 'Asset', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Current Assets', isActive: true, isSystem: false, openingBalance: 0 },

    // Liabilities
    { id: 'coa-2001', code: '2001', name: 'Accounts Payable (Suppliers)', classification: 'Liability', normalBalance: 'Credit', currentBalance: 0, accountGroup: 'Current Liabilities', isActive: true, isSystem: true, openingBalance: 0 },
    { id: 'coa-2002', code: '2002', name: 'Customer Advance', classification: 'Liability', normalBalance: 'Credit', currentBalance: 0, accountGroup: 'Current Liabilities', isActive: true, isSystem: true, openingBalance: 0 },

    // Equity
    { id: 'coa-3001', code: '3001', name: "Owner's Capital Investment", classification: 'Equity', normalBalance: 'Credit', currentBalance: initialCapital, accountGroup: 'Equity', isActive: true, isSystem: true, openingBalance: initialCapital },
    { id: 'coa-3003', code: '3003', name: 'Retained Earnings', classification: 'Equity', normalBalance: 'Credit', currentBalance: 0, accountGroup: 'Equity', isActive: true, isSystem: true, openingBalance: 0 },

    // Revenue
    { id: 'coa-4001', code: '4001', name: 'Sales Revenue', classification: 'Revenue', normalBalance: 'Credit', currentBalance: 0, accountGroup: 'Operating Revenue', isActive: true, isSystem: true, openingBalance: 0 },
    { id: 'coa-4002', code: '4002', name: 'Project Sales', classification: 'Revenue', normalBalance: 'Credit', currentBalance: 0, accountGroup: 'Operating Revenue', isActive: true, isSystem: true, openingBalance: 0 },
    { id: 'coa-4003', code: '4003', name: 'Consulting & Direct Operating Income', classification: 'Revenue', normalBalance: 'Credit', currentBalance: 0, accountGroup: 'Operating Revenue', isActive: true, isSystem: false, openingBalance: 0 },

    // Expenses
    { id: 'coa-5001', code: '5001', name: 'Cost of Goods Sold - Raw Materials', classification: 'Expense', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Direct Expenses / COGS', isActive: true, isSystem: true, openingBalance: 0 },
    { id: 'coa-5200', code: '5200', name: 'Head Office Rent', classification: 'Expense', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Operating Expenses', isActive: true, isSystem: false, openingBalance: 0 },
    { id: 'coa-5206', code: '5206', name: 'Project Expense', classification: 'Expense', normalBalance: 'Debit', currentBalance: 0, accountGroup: 'Operating Expenses', isActive: true, isSystem: true, openingBalance: 0 }
];

function runFullSimulation(scenarioTitle: string, initialCapital: number) {
    console.log(`\n================================================================`);
    console.log(`🔷 EXECUTING: ${scenarioTitle}`);
    console.log(`================================================================`);

    const chartOfAccounts = createFreshAccounts(initialCapital);
    const transactions: AccountingTransaction[] = [];
    const invoices: SalesInvoice[] = [];
    const purchaseOrders: PurchaseOrder[] = [];
    const projects: Project[] = [];
    const journalEntries: JournalEntry[] = [];
    const suppliers: Supplier[] = [{ id: 'sup-1', name: 'Elite Pack', currentBalance: 0, totalPurchases: 0, totalPaid: 0 }];
    const customers: Customer[] = [
        { id: 'cust-1', name: 'Rahim Traders', dueBalance: 0, advanceBalance: 0, totalSales: 0 },
        { id: 'cust-2', name: 'Kabir & Co.', dueBalance: 0, advanceBalance: 0, totalSales: 0 }
    ];
    let rawStockValuation = 0;

    function audit(stepName: string) {
        const cashInHand = calculateSingleAccountBalance(chartOfAccounts.find(a => a.code === '1001')!, transactions, invoices, projects);
        const southeastBank = calculateSingleAccountBalance(chartOfAccounts.find(a => a.code === '1005')!, transactions, invoices, projects);
        const cityBank = calculateSingleAccountBalance(chartOfAccounts.find(a => a.code === '1004')!, transactions, invoices, projects);
        const nagad = calculateSingleAccountBalance(chartOfAccounts.find(a => a.code === '1006')!, transactions, invoices, projects);
        const bkash = calculateSingleAccountBalance(chartOfAccounts.find(a => a.code === '1007')!, transactions, invoices, projects);
        const inventory = rawStockValuation;
        const ar = calculateTotalCustomerReceivables(invoices, customers, projects);

        const totalAssets = cashInHand + southeastBank + cityBank + nagad + bkash + inventory + ar;

        const ap = calculateTotalSupplierPayables(suppliers, purchaseOrders);
        const customerAdvance = calculateTotalCustomerAdvances(customers, transactions, chartOfAccounts);
        const totalLiabilities = ap + customerAdvance;

        // Revenue
        const nonPrjInvoices = invoices.filter(i => !i.projectId && !i.projectCode);
        const salesRevenue = nonPrjInvoices.reduce((s, i) => s + (i.grandTotal || 0), 0);
        const projectRevenue = projects.reduce((s, p) => s + (p.totalSales || 0), 0);
        const directRevenue = transactions
            .filter(t => t.type === 'INCOME' && !isInvoiceTransaction(t) && !isProjectTransaction(t) && !t.category?.toLowerCase().includes('advance'))
            .reduce((s, t) => s + (t.amount || 0), 0);
        const totalRevenue = salesRevenue + projectRevenue + directRevenue;

        // Expenses
        const cogs = journalEntries
            .filter(j => j.debitAccountId === 'coa-5001')
            .reduce((s, j) => s + j.amount, 0) || transactions
            .filter(t => t.type === 'EXPENSE' && t.category?.toLowerCase().includes('cogs'))
            .reduce((s, t) => s + t.amount, 0);

        const opex = transactions
            .filter(t => t.type === 'EXPENSE' && !isSupplierPaymentTransaction(t) && !t.category?.toLowerCase().includes('cogs'))
            .reduce((s, t) => s + (t.amount || 0), 0);
        const totalExpenses = cogs + opex;

        const netProfit = totalRevenue - totalExpenses;
        const totalEquity = initialCapital + netProfit;

        const diff = Math.abs(totalAssets - (totalLiabilities + totalEquity));
        const isBalanced = diff < 0.01;

        console.log(`\n📌 ${stepName}`);
        console.log(`  Assets: ৳${totalAssets.toLocaleString()} (Cash: ৳${cashInHand}, SEBank: ৳${southeastBank}, CityBank: ৳${cityBank}, Nagad: ৳${nagad}, Inventory: ৳${inventory}, AR: ৳${ar})`);
        console.log(`  Liabilities: ৳${totalLiabilities.toLocaleString()} (AP: ৳${ap}, Advance: ৳${customerAdvance})`);
        console.log(`  Revenue: ৳${totalRevenue.toLocaleString()} (Retail: ৳${salesRevenue}, Project: ৳${projectRevenue}, Direct: ৳${directRevenue})`);
        console.log(`  Expenses: ৳${totalExpenses.toLocaleString()} (COGS: ৳${cogs}, Operating: ৳${opex})`);
        console.log(`  Net Profit: ৳${netProfit.toLocaleString()} | Owner Capital: ৳${initialCapital.toLocaleString()} | Total Equity: ৳${totalEquity.toLocaleString()}`);
        console.log(`  ⚖️ Accounting Equation: Assets (${totalAssets}) === Liabilities (${totalLiabilities}) + Equity (${totalEquity}) -> ${isBalanced ? '✅ 100% BALANCED' : '❌ UNBALANCED'}`);

        if (!isBalanced) {
            throw new Error(`CRITICAL: Equation failed at ${stepName}! Diff: ${diff}`);
        }

        return { totalAssets, totalLiabilities, totalEquity, totalRevenue, totalExpenses, netProfit, cashInHand, southeastBank, cityBank, nagad, inventory };
    }

    audit('Step 0: Baseline Initial State');

    // -------------------------------------------------------------
    // 1. SUPPLY & PURCHASE (Purchase Order)
    // -------------------------------------------------------------
    console.log('\n--- 1. SUPPLY & PURCHASE MODULE ---');
    console.log('Action: Purchase ৳50,000 raw materials from Elite Pack. Paid ৳30,000 Southeast Bank + ৳20,000 Cash.');

    const po1: PurchaseOrder = {
        id: 'po-001',
        poNo: 'DCC-PO-2026-0001',
        poNumber: 'DCC-PO-2026-0001',
        date: '2026-10-29',
        supplierId: 'sup-1',
        supplierName: 'Elite Pack',
        destination: 'Factory',
        items: [{ id: 'poi-1', description: 'Acrylic & Laser Sheets', quantity: 100, unitPrice: 500, amount: 50000 }],
        totalAmount: 50000,
        grandTotal: 50000,
        paidAmount: 50000,
        dueAmount: 0,
        status: 'Received',
        paymentStatus: 'Paid',
        paymentMethod: 'Southeast Bank'
    };
    purchaseOrders.push(po1);
    rawStockValuation = 50000;

    transactions.push({
        id: 'tx-po1-bank',
        date: '2026-10-29',
        type: 'EXPENSE',
        amount: 30000,
        account: 'Southeast Bank',
        paymentAccount: 'Southeast Bank',
        paymentMethod: 'Southeast Bank',
        refNo: po1.poNo,
        category: 'Raw Materials & Supplies',
        description: 'Payment for Purchase Order DCC-PO-2026-0001 (Partial) - Elite Pack'
    });
    transactions.push({
        id: 'tx-po1-cash',
        date: '2026-10-29',
        type: 'EXPENSE',
        amount: 20000,
        account: 'Cash in Hand',
        paymentAccount: 'Cash in Hand',
        paymentMethod: 'Cash',
        refNo: po1.poNo,
        category: 'Raw Materials & Supplies',
        description: 'Payment for Purchase Order DCC-PO-2026-0001 (Partial) - Elite Pack'
    });

    audit('Step 1: After Supply Purchase (Inventory ৳50,000, Bank/Cash Outflows ৳50,000)');

    // -------------------------------------------------------------
    // 2. SALES & ORDERS (Retail POS Sale)
    // -------------------------------------------------------------
    console.log('\n--- 2. SALES & ORDERS MODULE ---');
    console.log('Action: Sales Invoice DCC-INV-2026-0001 for Rahim Traders: ৳80,000. Paid ৳40,000 Cash + ৳40,000 Southeast Bank. COGS consumed: ৳30,000.');

    const inv1: SalesInvoice = {
        id: 'inv-001',
        invoiceNo: 'DCC-INV-2026-0001',
        customerName: 'Rahim Traders',
        customerId: 'cust-1',
        date: '2026-10-29',
        items: [{ id: 'item-1', name: 'Custom Acrylic Signboard', qty: 2, unitPrice: 40000, total: 80000 }],
        subtotal: 80000,
        grandTotal: 80000,
        paidAmount: 80000,
        dueAmount: 0,
        discount: 0,
        tax: 0,
        status: 'Completed',
        paymentStatus: 'Paid',
        paymentMethod: 'Multi-Channel',
        splitPayments: { 'Cash': 40000, 'Southeast Bank': 40000 }
    };
    invoices.push(inv1);

    transactions.push({
        id: 'tx-inv1-cash',
        date: '2026-10-29',
        type: 'INCOME',
        amount: 40000,
        account: 'Cash in Hand',
        paymentAccount: 'Cash in Hand',
        paymentMethod: 'Cash',
        refNo: inv1.invoiceNo,
        category: 'Sales Revenue',
        description: `Sales Invoice Payment: Cash (Paid) - ${inv1.invoiceNo}`
    });
    transactions.push({
        id: 'tx-inv1-bank',
        date: '2026-10-29',
        type: 'INCOME',
        amount: 40000,
        account: 'Southeast Bank',
        paymentAccount: 'Southeast Bank',
        paymentMethod: 'Southeast Bank',
        refNo: inv1.invoiceNo,
        category: 'Sales Revenue',
        description: `Sales Invoice Payment: Southeast Bank (Paid) - ${inv1.invoiceNo}`
    });

    rawStockValuation -= 30000; // Remaining raw materials in factory = ৳20,000
    journalEntries.push({
        id: 'jnl-cogs-1',
        entryNo: 'JNL-2026-0001',
        date: '2026-10-29',
        refNo: inv1.invoiceNo,
        debitAccountId: 'coa-5001',
        debitAccountName: 'Cost of Goods Sold - Raw Materials',
        creditAccountId: 'coa-1002',
        creditAccountName: 'Raw Materials & Inventory',
        amount: 30000,
        narration: 'COGS consumed for Invoice DCC-INV-2026-0001',
        source: 'SALES'
    });

    audit('Step 2: After Sales & Orders (Revenue ৳80,000, COGS ৳30,000, Remaining Inventory ৳20,000)');

    // -------------------------------------------------------------
    // 3. PROJECT MANAGEMENT (Project Contract, Sales & Expenses)
    // -------------------------------------------------------------
    console.log('\n--- 3. PROJECT MANAGEMENT MODULE ---');
    console.log('Action: Project PRJ-2026-0001 (City Mega Billboard) Budget ৳25,000. Paid ৳15,000 City Bank + ৳10,000 Nagad. Add Expense ৳5,000 from Cash.');

    const prj1: Project = {
        id: 'prj-001',
        code: 'PRJ-2026-0001',
        name: 'City Mega Billboard',
        clientName: 'Apex Footwear',
        startDate: '2026-10-29',
        budget: 25000,
        totalSales: 25000,
        totalCollected: 25000,
        totalExpenses: 5000,
        netProfit: 20000,
        status: 'In Progress',
        invoiceNo: 'DCC-INV-2026-0002',
        salesItems: [
            {
                id: 'ps-1',
                description: 'Contract Milestone 1 Billing',
                amount: 25000,
                date: '2026-10-29',
                clientName: 'Apex Footwear',
                paymentMethod: 'Multi-Channel',
                paymentBreakdown: [
                    { id: 'pb-1', method: 'City Bank PLC', amount: 15000 },
                    { id: 'pb-2', method: 'Nagad', amount: 10000 }
                ],
                paidAmount: 25000,
                dueAmount: 0,
                invoiceNo: 'DCC-INV-2026-0002'
            }
        ],
        expenseItems: [
            {
                id: 'pe-1',
                description: 'Site Structure Fabrication & Labor',
                amount: 5000,
                category: 'Project Expense',
                date: '2026-10-29',
                paymentMethod: 'Cash'
            }
        ]
    };
    projects.push(prj1);

    invoices.push({
        id: 'inv-002',
        invoiceNo: 'DCC-INV-2026-0002',
        customerName: 'Apex Footwear',
        date: '2026-10-29',
        items: [{ id: 'pitem-1', name: 'Billboard Structural Engineering', qty: 1, unitPrice: 25000, total: 25000 }],
        subtotal: 25000,
        grandTotal: 25000,
        paidAmount: 25000,
        dueAmount: 0,
        status: 'Completed',
        paymentStatus: 'Paid',
        projectId: prj1.id,
        projectCode: prj1.code
    });

    transactions.push({
        id: 'tx-prj1-city',
        date: '2026-10-29',
        type: 'INCOME',
        amount: 15000,
        account: 'City Bank PLC',
        paymentAccount: 'City Bank PLC',
        paymentMethod: 'City Bank PLC',
        refNo: prj1.code,
        category: 'Project Revenue',
        description: `Project Income: [${prj1.code}] Apex Footwear - Invoice #${prj1.invoiceNo} (City Bank PLC)`,
        projectId: prj1.id,
        projectCode: prj1.code
    });
    transactions.push({
        id: 'tx-prj1-nagad',
        date: '2026-10-29',
        type: 'INCOME',
        amount: 10000,
        account: 'Nagad',
        paymentAccount: 'Nagad',
        paymentMethod: 'Nagad',
        refNo: prj1.code,
        category: 'Project Revenue',
        description: `Project Income: [${prj1.code}] Apex Footwear - Invoice #${prj1.invoiceNo} (Nagad)`,
        projectId: prj1.id,
        projectCode: prj1.code
    });

    transactions.push({
        id: 'tx-prj1-exp',
        date: '2026-10-29',
        type: 'EXPENSE',
        amount: 5000,
        account: 'Cash in Hand',
        paymentAccount: 'Cash in Hand',
        paymentMethod: 'Cash',
        refNo: prj1.code,
        category: 'Project Expense',
        description: `Project Cost: [${prj1.code}] Site Structure Fabrication & Labor (Cash)`
    });

    audit('Step 3: After Project (Revenue +৳25,000, Expense +৳5,000, CityBank ৳15,000, Nagad ৳10,000)');

    // -------------------------------------------------------------
    // 4. FINANCIAL LEDGER (Record Operating Income & Expense)
    // -------------------------------------------------------------
    console.log('\n--- 4. FINANCIAL LEDGER DIRECT OPERATIONS ---');
    console.log('Action A: Record Operating Income ৳10,000 (Consulting) via Southeast Bank.');
    console.log('Action B: Record Operating Expense ৳4,000 (Head Office Rent) via Cash in Hand.');

    transactions.push({
        id: 'tx-inc-0001',
        date: '2026-10-29',
        type: 'INCOME',
        amount: 10000,
        account: 'Southeast Bank',
        paymentAccount: 'Southeast Bank',
        paymentMethod: 'Southeast Bank',
        refNo: 'INC-0001',
        category: 'Consulting & Direct Operating Income',
        description: 'Corporate Brand Consulting & Design Fee'
    });

    transactions.push({
        id: 'tx-exp-0001',
        date: '2026-10-29',
        type: 'EXPENSE',
        amount: 4000,
        account: 'Cash in Hand',
        paymentAccount: 'Cash in Hand',
        paymentMethod: 'Cash',
        refNo: 'EXP-0001',
        category: 'Head Office Rent',
        description: 'Head Office Monthly Rent Share'
    });

    audit('Step 4: After Direct Ledger Operations (Direct Income +৳10,000, Rent -৳4,000)');

    // -------------------------------------------------------------
    // 5. CUSTOMER ADVANCE LIABILITY
    // -------------------------------------------------------------
    console.log('\n--- 5. CUSTOMER ADVANCE DEPOSIT (Held as Liability) ---');
    console.log('Action: Customer Kabir & Co. gives ৳6,000 advance in Cash in Hand.');

    customers[1].advanceBalance = 6000;
    transactions.push({
        id: 'tx-adv-0001',
        date: '2026-10-29',
        type: 'INCOME',
        amount: 6000,
        account: 'Cash in Hand',
        paymentAccount: 'Cash in Hand',
        paymentMethod: 'Cash',
        refNo: 'ADV-0001',
        category: 'Customer Advance',
        description: 'Advance received from Kabir & Co. for upcoming seasonal display'
    });

    const finalReport = audit('Step 5: After Customer Advance (Cash +৳6,000, Liability +৳6,000)');
    return finalReport;
}

function runCreditScenario() {
    console.log(`\n================================================================`);
    console.log(`🔷 EXECUTING: SCENARIO B: Zero Initial Capital (Purchase on Credit, Then Sales)`);
    console.log(`================================================================`);

    const chartOfAccounts = createFreshAccounts(0);
    const transactions: AccountingTransaction[] = [];
    const invoices: SalesInvoice[] = [];
    const purchaseOrders: PurchaseOrder[] = [];
    const projects: Project[] = [];
    const journalEntries: JournalEntry[] = [];
    const suppliers: Supplier[] = [{ id: 'sup-1', name: 'Elite Pack', currentBalance: 0, totalPurchases: 0, totalPaid: 0 }];
    const customers: Customer[] = [
        { id: 'cust-1', name: 'Rahim Traders', dueBalance: 0, advanceBalance: 0, totalSales: 0 },
        { id: 'cust-2', name: 'Kabir & Co.', dueBalance: 0, advanceBalance: 0, totalSales: 0 }
    ];
    let rawStockValuation = 0;

    function audit(stepName: string) {
        const cashInHand = calculateSingleAccountBalance(chartOfAccounts.find(a => a.code === '1001')!, transactions, invoices, projects);
        const southeastBank = calculateSingleAccountBalance(chartOfAccounts.find(a => a.code === '1005')!, transactions, invoices, projects);
        const cityBank = calculateSingleAccountBalance(chartOfAccounts.find(a => a.code === '1004')!, transactions, invoices, projects);
        const nagad = calculateSingleAccountBalance(chartOfAccounts.find(a => a.code === '1006')!, transactions, invoices, projects);
        const inventory = rawStockValuation;
        const ar = calculateTotalCustomerReceivables(invoices, customers, projects);
        const totalAssets = cashInHand + southeastBank + cityBank + nagad + inventory + ar;

        const ap = calculateTotalSupplierPayables(suppliers, purchaseOrders);
        const customerAdvance = calculateTotalCustomerAdvances(customers, transactions, chartOfAccounts);
        const totalLiabilities = ap + customerAdvance;

        const nonPrjInvoices = invoices.filter(i => !i.projectId && !i.projectCode);
        const salesRevenue = nonPrjInvoices.reduce((s, i) => s + (i.grandTotal || 0), 0);
        const projectRevenue = projects.reduce((s, p) => s + (p.totalSales || 0), 0);
        const directRevenue = transactions
            .filter(t => t.type === 'INCOME' && !isInvoiceTransaction(t) && !isProjectTransaction(t) && !t.category?.toLowerCase().includes('advance'))
            .reduce((s, t) => s + (t.amount || 0), 0);
        const totalRevenue = salesRevenue + projectRevenue + directRevenue;

        const cogs = journalEntries
            .filter(j => j.debitAccountId === 'coa-5001')
            .reduce((s, j) => s + j.amount, 0);

        const opex = transactions
            .filter(t => t.type === 'EXPENSE' && !isSupplierPaymentTransaction(t) && !t.category?.toLowerCase().includes('cogs'))
            .reduce((s, t) => s + (t.amount || 0), 0);
        const totalExpenses = cogs + opex;

        const netProfit = totalRevenue - totalExpenses;
        const totalEquity = netProfit;

        const diff = Math.abs(totalAssets - (totalLiabilities + totalEquity));
        const isBalanced = diff < 0.01;

        console.log(`\n📌 ${stepName}`);
        console.log(`  Assets: ৳${totalAssets.toLocaleString()} (Cash: ৳${cashInHand}, SEBank: ৳${southeastBank}, CityBank: ৳${cityBank}, Nagad: ৳${nagad}, Inventory: ৳${inventory})`);
        console.log(`  Liabilities: ৳${totalLiabilities.toLocaleString()} (AP: ৳${ap}, Advance: ৳${customerAdvance})`);
        console.log(`  Revenue: ৳${totalRevenue.toLocaleString()} | Expenses: ৳${totalExpenses.toLocaleString()} | Net Profit: ৳${netProfit.toLocaleString()} | Equity: ৳${totalEquity.toLocaleString()}`);
        console.log(`  ⚖️ Accounting Equation: Assets (${totalAssets}) === Liabilities (${totalLiabilities}) + Equity (${totalEquity}) -> ${isBalanced ? '✅ 100% BALANCED' : '❌ UNBALANCED'}`);

        if (!isBalanced) throw new Error(`CRITICAL: Scenario B equation failed at ${stepName}`);
        return { totalAssets, totalLiabilities, totalEquity };
    }

    audit('Step 0: Zero Baseline');

    // 1. Purchase on Credit (Due)
    console.log('\n--- 1. Purchase on Credit (Accounts Payable) ---');
    const poCredit: PurchaseOrder = {
        id: 'po-cred-1',
        poNo: 'DCC-PO-2026-9001',
        poNumber: 'DCC-PO-2026-9001',
        date: '2026-10-29',
        supplierId: 'sup-1',
        supplierName: 'Elite Pack',
        destination: 'Factory',
        items: [{ id: 'poi-1', description: 'Raw Sheets', quantity: 100, unitPrice: 500, amount: 50000 }],
        totalAmount: 50000,
        grandTotal: 50000,
        paidAmount: 0,
        dueAmount: 50000,
        status: 'Received',
        paymentStatus: 'Unpaid',
        paymentMethod: 'Due'
    };
    purchaseOrders.push(poCredit);
    suppliers[0].dueBalance = 50000;
    suppliers[0].currentBalance = 50000;
    suppliers[0].totalPurchases = 50000;
    rawStockValuation = 50000;
    audit('Step 1: Raw Materials Received on Credit (Inventory ৳50,000, Accounts Payable ৳50,000)');

    // 2. Retail Sale & Settlement of Supplier Due
    console.log('\n--- 2. Retail Sale & Supplier Payment ---');
    const invSale: SalesInvoice = {
        id: 'inv-cred-1',
        invoiceNo: 'DCC-INV-2026-9001',
        customerName: 'Rahim Traders',
        customerId: 'cust-1',
        date: '2026-10-29',
        items: [{ id: 'item-1', name: 'Signboard', qty: 2, unitPrice: 40000, total: 80000 }],
        subtotal: 80000,
        grandTotal: 80000,
        paidAmount: 80000,
        dueAmount: 0,
        discount: 0,
        tax: 0,
        status: 'Completed',
        paymentStatus: 'Paid',
        paymentMethod: 'Cash'
    };
    invoices.push(invSale);
    transactions.push({
        id: 'tx-inv-cash',
        date: '2026-10-29',
        type: 'INCOME',
        amount: 80000,
        account: 'Cash in Hand',
        paymentAccount: 'Cash in Hand',
        paymentMethod: 'Cash',
        refNo: invSale.invoiceNo,
        category: 'Sales Revenue',
        description: `Sales Invoice Payment: Cash - ${invSale.invoiceNo}`
    });

    rawStockValuation -= 30000;
    journalEntries.push({
        id: 'jnl-cogs-cred',
        entryNo: 'JNL-2026-9001',
        date: '2026-10-29',
        refNo: invSale.invoiceNo,
        debitAccountId: 'coa-5001',
        debitAccountName: 'Cost of Goods Sold',
        creditAccountId: 'coa-1002',
        creditAccountName: 'Raw Materials',
        amount: 30000,
        narration: 'COGS consumed',
        source: 'SALES'
    });

    // Pay supplier from collected cash
    poCredit.paidAmount = 50000;
    poCredit.dueAmount = 0;
    poCredit.paymentStatus = 'Paid';
    suppliers[0].dueBalance = 0;
    suppliers[0].currentBalance = 0;
    suppliers[0].totalPaid = 50000;
    transactions.push({
        id: 'tx-pay-sup',
        date: '2026-10-29',
        type: 'EXPENSE',
        amount: 50000,
        account: 'Cash in Hand',
        paymentAccount: 'Cash in Hand',
        paymentMethod: 'Cash',
        refNo: poCredit.poNo,
        category: 'Raw Materials & Supplies',
        description: `Payment for Purchase Order ${poCredit.poNo} - Elite Pack`
    });
    audit('Step 2: After Sale (৳80,000) & Supplier Payoff (৳50,000) [Net Cash: ৳30,000, AP: ৳0, Stock: ৳20,000]');

    // 3. Project Sales & Expense
    console.log('\n--- 3. Project Milestone Sales & Site Expense ---');
    projects.push({
        id: 'prj-cred-1',
        code: 'PRJ-2026-9001',
        name: 'City Mega Billboard',
        clientName: 'Apex Footwear',
        startDate: '2026-10-29',
        budget: 25000,
        totalSales: 25000,
        totalCollected: 25000,
        totalExpenses: 5000,
        netProfit: 20000,
        status: 'In Progress',
        salesItems: [{
            id: 'ps-1',
            description: 'Contract Billing',
            amount: 25000,
            date: '2026-10-29',
            clientName: 'Apex Footwear',
            paymentMethod: 'Multi-Channel',
            paymentBreakdown: [
                { id: 'pb-1', method: 'City Bank PLC', amount: 15000 },
                { id: 'pb-2', method: 'Nagad', amount: 10000 }
            ],
            paidAmount: 25000,
            dueAmount: 0
        }],
        expenseItems: [{
            id: 'pe-1',
            description: 'Site Structure',
            amount: 5000,
            category: 'Project Expense',
            date: '2026-10-29',
            paymentMethod: 'Cash'
        }]
    });
    transactions.push({
        id: 'tx-prj-city',
        date: '2026-10-29',
        type: 'INCOME',
        amount: 15000,
        account: 'City Bank PLC',
        paymentAccount: 'City Bank PLC',
        paymentMethod: 'City Bank PLC',
        refNo: 'PRJ-2026-9001',
        category: 'Project Revenue',
        description: 'Project Income City Bank'
    });
    transactions.push({
        id: 'tx-prj-nagad',
        date: '2026-10-29',
        type: 'INCOME',
        amount: 10000,
        account: 'Nagad',
        paymentAccount: 'Nagad',
        paymentMethod: 'Nagad',
        refNo: 'PRJ-2026-9001',
        category: 'Project Revenue',
        description: 'Project Income Nagad'
    });
    transactions.push({
        id: 'tx-prj-exp',
        date: '2026-10-29',
        type: 'EXPENSE',
        amount: 5000,
        account: 'Cash in Hand',
        paymentAccount: 'Cash in Hand',
        paymentMethod: 'Cash',
        refNo: 'PRJ-2026-9001',
        category: 'Project Expense',
        description: 'Project Cost'
    });
    audit('Step 3: After Project Operations (CityBank ৳15k, Nagad ৳10k, Cash -৳5k)');

    // 4. Financial Ledger Direct Operations
    console.log('\n--- 4. Direct Ledger Operations (Record Income & Expense) ---');
    transactions.push({
        id: 'tx-inc-dir',
        date: '2026-10-29',
        type: 'INCOME',
        amount: 10000,
        account: 'Southeast Bank',
        paymentAccount: 'Southeast Bank',
        paymentMethod: 'Southeast Bank',
        refNo: 'INC-9001',
        category: 'Consulting Income',
        description: 'Brand Consulting'
    });
    transactions.push({
        id: 'tx-exp-dir',
        date: '2026-10-29',
        type: 'EXPENSE',
        amount: 4000,
        account: 'Cash in Hand',
        paymentAccount: 'Cash in Hand',
        paymentMethod: 'Cash',
        refNo: 'EXP-9001',
        category: 'Head Office Rent',
        description: 'Office Rent'
    });
    audit('Step 4: After Direct Ledger Operations (Consulting +৳10,000, Rent -৳4,000)');

    // 5. Customer Advance Liability
    console.log('\n--- 5. Customer Advance Received ---');
    customers[1].advanceBalance = 6000;
    transactions.push({
        id: 'tx-adv-dir',
        date: '2026-10-29',
        type: 'INCOME',
        amount: 6000,
        account: 'Cash in Hand',
        paymentAccount: 'Cash in Hand',
        paymentMethod: 'Cash',
        refNo: 'ADV-9001',
        category: 'Customer Advance',
        description: 'Advance received from Kabir & Co.'
    });
    audit('Step 5: After Customer Advance (Cash +৳6,000, Advance Liability +৳6,000)');
}

// RUN BOTH SCENARIOS
const reportA = runFullSimulation('SCENARIO A: Enterprise with Initial Owner Capital (৳100,000)', 100000);
runCreditScenario();

console.log('\n================================================================');
console.log('🎉 ALL SCENARIOS VERIFIED: 100.00% MATHEMATICAL INTEGRITY CONFIRMED!');
console.log('================================================================\n');
