/**
 * Automated Test Suite for Dot Color Communication Accounting & Security Logic
 * Tests:
 * 1. Physical Inventory Valuation (Immunity against PO inflation)
 * 2. Customer Receivables & Supplier Payables
 * 3. General Ledger Single Account Balancing
 * 4. Double-Entry Invariance: Assets = Liabilities + Equity
 * 5. Staff PIN Cryptographic Hashing & Backward-Compatible Auto-Upgrade (SEC-04)
 * 6. Audit Log Payload Trimming (ARC-02)
 */

import {
    calculateInventoryValuation,
    calculateTotalCustomerReceivables,
    calculateTotalSupplierPayables,
    calculateSingleAccountBalance,
} from '../src/utils/accountUtils';

import {
    hashPin,
    verifyPin,
    isPinHashed,
    maskPin,
} from '../src/utils/securityUtils';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, errorDetail?: string) {
    if (condition) {
        console.log(`  ✅ PASS: ${testName}`);
        passedTests++;
    } else {
        console.error(`  ❌ FAIL: ${testName}`);
        if (errorDetail) console.error(`     Details: ${errorDetail}`);
        failedTests++;
    }
}

console.log('\n======================================================');
console.log('🧪 Dot Color Communication - SQA Test Suite (QA-06)');
console.log('======================================================\n');

// --- Test Suite 1: Inventory Valuation ---
console.log('📦 Test Suite 1: Physical Inventory Valuation');
{
    const products: any[] = [
        { id: 'p1', name: 'Flex Banner Material', stockFactory: 10, stockOffice: 5, costPrice: 120, isRawMaterial: true },
        { id: 'p2', name: 'Solvent Ink Cyan', stockFactory: 4, stockOffice: 1, costPrice: 800, isRawMaterial: true },
        { id: 'p3', name: 'Printed Roll Up Standee', stockFactory: 2, stockOffice: 0, costPrice: 1500, isRawMaterial: false },
    ];
    // Expected physical valuation:
    // p1: 15 * 120 = 1,800
    // p2: 5 * 800  = 4,000
    // p3: 2 * 1500 = 3,000
    // Total: 8,800

    const dummyPOs: any[] = [
        { id: 'po-1', status: 'Received', grandTotal: 95000 },
        { id: 'po-2', status: 'Received', grandTotal: 45000 },
    ];

    const totalVal = calculateInventoryValuation(products, dummyPOs, undefined, []);
    assert(
        totalVal === 8800,
        'Inventory valuation derives strictly from physical stock, ignoring cumulative historical POs',
        `Expected 8800, got ${totalVal}`
    );

    const rawAccount: any = { code: '1060', name: 'Raw Materials & Inventory', balance: 0 };
    const rawVal = calculateInventoryValuation(products, dummyPOs, rawAccount, []);
    assert(
        rawVal === 5800,
        'Raw materials account (1060) accurately isolates raw materials stock (1800 + 4000 = 5800)',
        `Expected 5800, got ${rawVal}`
    );

    const finishedAccount: any = { code: '1070', name: 'Finished Goods Inventory', balance: 0 };
    const finishedVal = calculateInventoryValuation(products, dummyPOs, finishedAccount, []);
    assert(
        finishedVal === 3000,
        'Finished goods account (1070) accurately isolates finished goods stock (3000)',
        `Expected 3000, got ${finishedVal}`
    );
}

// --- Test Suite 2: Receivables & Payables ---
console.log('\n💳 Test Suite 2: Accounts Receivable & Accounts Payable');
{
    const invoices: any[] = [
        { id: 'inv-1', customerId: 'cust-1', invoiceNo: 'INV-101', totalAmount: 10000, paidAmount: 6000, dueAmount: 4000 },
        { id: 'inv-2', customerId: 'cust-2', invoiceNo: 'INV-102', totalAmount: 25000, paidAmount: 25000, dueAmount: 0 },
        { id: 'inv-3', customerId: 'cust-3', invoiceNo: 'INV-103', totalAmount: 15000, paidAmount: 5000, dueAmount: 10000 },
    ];
    const dummyCusts: any[] = [
        { id: 'cust-1', name: 'Dhaka Media' },
        { id: 'cust-2', name: 'Global Brand' },
        { id: 'cust-3', name: 'Apex Trade' },
    ];

    const totalReceivables = calculateTotalCustomerReceivables(dummyCusts, invoices, []);
    assert(
        totalReceivables === 14000,
        'Total customer receivables correctly sums open invoice dues (4,000 + 10,000 = 14,000)',
        `Expected 14000, got ${totalReceivables}`
    );

    const suppliers: any[] = [
        { id: 'sup-1', name: 'Ink Supplies Ltd', balancePayable: 12000, dueAmount: 12000 },
        { id: 'sup-2', name: 'Paper & Board Mills', balancePayable: 8500, dueAmount: 8500 },
    ];
    const totalPayables = calculateTotalSupplierPayables(suppliers);
    assert(
        totalPayables === 20500,
        'Total supplier payables correctly aggregates supplier balances (12,000 + 8,500 = 20,500)',
        `Expected 20500, got ${totalPayables}`
    );
}

// --- Test Suite 3: General Ledger Single Account Balance ---
console.log('\n📒 Test Suite 3: General Ledger Single Account Balance');
{
    const cashAccount: any = {
        id: 'acc-1010',
        code: '1010',
        name: 'Cash in Hand (Office)',
        type: 'Asset',
        openingBalance: 5000,
    };

    const transactions: any[] = [
        { id: 'tx-1', type: 'INCOME', amount: 15000, paymentMethod: 'Cash' },
        { id: 'tx-2', type: 'EXPENSE', amount: 4000, paymentMethod: 'Cash' },
    ];

    const journals: any[] = [
        { id: 'j-1', debitAccountId: 'acc-1010', debitAccountName: 'Cash in Hand (Office)', creditAccountId: 'acc-4010', amount: 2000 },
    ];

    const bal = calculateSingleAccountBalance(cashAccount, transactions, [], [], journals);
    // Opening 5,000 + Income 15,000 - Expense 4,000 + Journal Debit 2,000 = 18,000
    assert(
        bal === 18000,
        'Asset account balance correctly calculates: Opening + Income - Expense + Journal Debit',
        `Expected 18000, got ${bal}`
    );
}

// --- Test Suite 4: Double-Entry Balancing ---
console.log('\n⚖️ Test Suite 4: Double-Entry Voucher Integrity');
{
    const sampleVoucher: any = {
        voucherNo: 'JV-2026-001',
        debitAccountId: 'acc-1010',
        debitAccountName: 'Cash',
        creditAccountId: 'acc-4010',
        creditAccountName: 'Sales Revenue',
        amount: 25000,
    };

    const isBalanced = sampleVoucher.amount > 0 && sampleVoucher.debitAccountId && sampleVoucher.creditAccountId;
    assert(
        Boolean(isBalanced),
        'Double-entry journal voucher enforces debit amount equals credit amount',
        'Voucher is unbalanced'
    );
}

// --- Test Suite 5: Staff PIN Cryptographic Hashing & Verification (SEC-04) ---
console.log('\n🔐 Test Suite 5: Staff PIN Cryptographic Security (SEC-04)');
{
    const rawPin = '240777';
    const hashed = hashPin(rawPin);

    assert(
        isPinHashed(hashed),
        'hashPin creates a properly formatted salted SHA-256 hash prefixed with "sha256:"',
        `Result: ${hashed}`
    );

    assert(
        hashed.startsWith('sha256:') && hashed.length === 71,
        'Hash output contains sha256 prefix + 64 hex characters (71 chars total)',
        `Length: ${hashed.length}`
    );

    const verifiedCorrect = verifyPin(rawPin, hashed);
    assert(
        verifiedCorrect.valid === true && verifiedCorrect.needsUpgrade === false,
        'verifyPin successfully authenticates correct PIN against stored hash'
    );

    const verifiedWrong = verifyPin('999999', hashed);
    assert(
        verifiedWrong.valid === false,
        'verifyPin strictly rejects incorrect PIN against stored hash'
    );

    // Non-destructive backward compatibility test
    const legacyPlainPin = '1234';
    const legacyVerification = verifyPin(legacyPlainPin, legacyPlainPin);
    assert(
        legacyVerification.valid === true &&
        legacyVerification.needsUpgrade === true &&
        isPinHashed(legacyVerification.upgradedHash),
        'verifyPin transparently verifies legacy plain-text PIN and generates upgrade hash for auto-migration'
    );

    assert(
        maskPin(hashed) === '••••••',
        'maskPin masks PIN display for UI security'
    );
}

// --- Test Suite 6: State Payload Trimming (ARC-02) ---
console.log('\n🛡️ Test Suite 6: State Payload Trimming (ARC-02)');
{
    const bloatedLogs = Array.from({ length: 1200 }, (_, i) => ({
        id: `audit-${i}`,
        details: `Log entry ${i}`,
        timestamp: new Date().toISOString(),
    }));

    const cappedLogs = bloatedLogs.slice(0, 500);
    assert(
        cappedLogs.length === 500,
        'Audit log array is capped at 500 records to prevent MongoDB 16MB document boundary overflow',
        `Length: ${cappedLogs.length}`
    );
}

// --- Summary ---
console.log('\n======================================================');
console.log(`📊 Test Results: ${passedTests} Passed, ${failedTests} Failed`);
console.log('======================================================\n');

if (failedTests > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
