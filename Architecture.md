# PROJECT PROMPT: Simplified Refund Management System

## Business Context

We operate a mobile telecom service (Jazz/Vibe subscription bundles) where customers pay via various payment methods (EasyPaisa wallet, JazzCash wallet, or Credit/Debit Cards). Sometimes payments succeed but service fulfillment fails, requiring us to issue refunds.

**Current Pain Points:**
- Manual refund verification is time-consuming
- No centralized refund tracking system
- No audit trail for refund decisions
- Bulk refund processing requires running scripts manually
- No visibility into refund status for customer service team

**Goal:** Build a streamlined refund management system with frontend, backend, and database to manage the entire refund lifecycle using our primary fulfillment table as the single source of truth.

---

## Database Structure

We use a **single MySQL database** for verification and tracking:

### Database: `rox_app` (Main Application DB)

#### Table: `subscription_fulfillment_requests`
This is our **single source of truth** for subscription payment and fulfillment status.

```sql
-- Inferred structure based on code usage
CREATE TABLE subscription_fulfillment_requests (
  transaction_id BIGINT UNSIGNED PRIMARY KEY,
  payment_gateway_ref VARCHAR(255),        -- Order ID from payment gateway
  mobile_number VARCHAR(15),                -- Customer MSISDN (format: 923001234567)
  amount_deducted DECIMAL(10, 2),          -- Amount customer paid
  payment_method VARCHAR(50),               -- 'Easy_Paisa', 'Jazz_Cash', 'Card', 'jazz_balance', 'bnpl'
  payment_status VARCHAR(50),               -- 'pending', 'paid', 'verified', 'failed'
  fulfillment_status VARCHAR(50),           -- 'PENDING', 'RECHARGE_POSTED', 'SUCCESS', 'FAILED', etc.
  fulfillment_message TEXT,                 -- Message from fulfillment system
  error_message TEXT,                       -- Error details if failed
  service_type VARCHAR(50),                 -- 'VIBE_SUBSCRIPTION'
  service_code VARCHAR(50),                 -- Bundle code (e.g., 'BASIC_VIBE', 'INSANE_VIBE', 'SHAREVIBE')
  metadata JSON,                            -- Contains: { useJazzBalance: boolean, ... }
  created_at DATETIME,
  updated_at DATETIME,
  
  INDEX idx_payment_gateway_ref (payment_gateway_ref),
  INDEX idx_mobile_number (mobile_number),
  INDEX idx_payment_status (payment_status),
  INDEX idx_created_at (created_at)
);
```

**Key Fields:**
- `payment_gateway_ref`: Order ID from payment gateway (EasyPaisa/JazzCash)
- `payment_status`: Whether payment succeeded ('paid' or 'verified')
- `fulfillment_status`: Whether service was delivered ('RECHARGE_POSTED' or 'SUCCESS' = delivered)
- `service_type`: Must be 'VIBE_SUBSCRIPTION' for refund eligibility
- `service_code`: Excludes 'SHAREVIBE' from refunds
- `metadata.useJazzBalance`: If true, exclude from refunds (internal credit)

**Refund Eligibility Rules:**
1. ✅ `payment_status` IN ('paid', 'verified')
2. ✅ `fulfillment_status` NOT IN ('RECHARGE_POSTED', 'SUCCESS')
3. ✅ `payment_method` NOT IN ('jazz_balance', 'bnpl')
4. ✅ `service_type` = 'VIBE_SUBSCRIPTION'
5. ✅ `service_code` != 'SHAREVIBE'
6. ✅ `metadata.useJazzBalance` != true

---

## Verification Logic

### Simple Single-Source Verification Flow

We use a **direct verification approach**:

```
1. Check subscription_fulfillment_requests
   ├─ Match by: payment_gateway_ref (order ID) OR
   ├─ Match by: mobile_number + amount + transaction_date
   ├─ Apply refund eligibility rules (see above)
   └─ If found + eligible → APPROVE
       If found + not eligible → REJECT with reason
       If not found → REJECT (no record)
```

### Matching Logic

```sql
-- Primary match (if order ID provided)
SELECT * FROM rox_app.subscription_fulfillment_requests
WHERE payment_gateway_ref = ?
LIMIT 1;

-- Fallback match (if order ID not provided or not found)
SELECT * FROM rox_app.subscription_fulfillment_requests
WHERE mobile_number IN (?, ?, ?)           -- Try: 923xx, 03xx, 3xx formats
  AND ABS(amount_deducted - ?) < 0.01      -- Amount match (±1 cent tolerance)
  AND DATE(created_at) = DATE(?)           -- Same day as transaction
ORDER BY created_at DESC
LIMIT 1;
```

### Eligibility Check (Applied After Finding Record)

```typescript
function isEligibleForRefund(record: any): boolean {
  // Rule 1: Payment must be successful
  if (!['paid', 'verified'].includes(record.payment_status)) {
    return false; // Payment not successful
  }

  // Rule 2: Fulfillment must have failed (not delivered)
  if (['RECHARGE_POSTED', 'SUCCESS'].includes(record.fulfillment_status)) {
    return false; // Service was delivered successfully
  }

  // Rule 3: Payment method must be external (not internal credits)
  if (['jazz_balance', 'bnpl'].includes(record.payment_method)) {
    return false; // Internal payment methods not eligible
  }

  // Rule 4: Must be a subscription service
  if (record.service_type !== 'VIBE_SUBSCRIPTION') {
    return false; // Not a subscription service
  }

  // Rule 5: ShareVibe is excluded from refunds
  if (record.service_code === 'SHAREVIBE') {
    return false; // ShareVibe has different refund policy
  }

  // Rule 6: Must not use Jazz Balance
  const metadata = JSON.parse(record.metadata || '{}');
  if (metadata.useJazzBalance === true) {
    return false; // Used internal Jazz Balance
  }

  return true; // All checks passed
}
```

---

## What We Want to Build

### High-Level Requirements

A **streamlined refund management system** with:

1. **Database Layer**
   - New MySQL database: `rox_refund_management`
   - Tables for: refund cases, audit logs, notifications
   - Track source record from `subscription_fulfillment_requests`

2. **Backend API (Node.js/NestJS)**
   - RESTful API for case management
   - Background job queue for bulk processing
   - Integration with existing refund APIs (EasyPaisa, JazzCash, Card)
   - Read-only connection to `rox_app` database for verification
   - Service layer for verification, refund processing, notifications

3. **Frontend (React or Vue)**
   - Dashboard with statistics
   - Case management UI (list, create, view details)
   - Bulk upload interface (CSV)
   - Real-time progress tracking
   - Reports and exports
   - Audit trail viewer

### Functional Requirements

#### Case Management
1. **Individual Case Creation**
   - Input: MSISDN, amount, payment method,accountNumber, Package trying to activate, order ID (optional), transaction date
   - Auto-verify against `subscription_fulfillment_requests`
   - Show verification result and eligibility status
   - Manual review option before refund
   - Process refund with one click

2. **Bulk Case Processing**
   - Upload CSV with multiple cases
   - Background processing (queue-based)
   - Progress tracking (X verified, Y processed)
   - Download results with refund status
   - Individual case details accessible

3. **Verification Tracking**
   - Store snapshot of source record (from `subscription_fulfillment_requests`)
   - Track verification timestamp and user
   - Record which eligibility rules passed/failed

4. **Refund Processing**
   - Call appropriate payment gateway API based on payment method
   - Record refund status (success/failure)
   - Store raw API response for debugging
   - Record refund timestamp and processor
   - Retry mechanism for failed refunds

5. **Audit Trail**
   - Log every action (create, verify, refund, status change)
   - Store old/new values
   - Track user, timestamp, IP address
   - Full history visible in UI

6. **Notifications**
   - Send SMS/email confirmation on successful refund
   - Retry failed notifications
   - Track notification status

### Non-Functional Requirements

1. **Performance**
   - Verification: < 3 seconds per case
   - Bulk processing: Handle 10,000 cases in < 30 minutes
   - Real-time UI updates via WebSocket

2. **Data Integrity**
   - Store snapshot of source data (don't rely on live data)
   - Prevent duplicate refunds for same order ID
   - Idempotent refund operations

3. **Security**
   - Read-only access to `rox_app` database
   - Role-based access control in frontend
   - API authentication (JWT)
   - Audit logging for compliance


---

## New Database Schema

### Database: `rox_refund_management`

#### Table: `refund_cases`
```sql
CREATE TABLE refund_cases (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  case_number VARCHAR(50) UNIQUE NOT NULL,  -- e.g., 'RC-2026-000001'
  
  -- Customer Info (from input)
  msisdn VARCHAR(15) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('Easy_Paisa', 'Jazz_Cash', 'Card') NOT NULL,
  order_id VARCHAR(255),                     -- Payment gateway order ID
  transaction_datetime DATETIME,             -- Original payment time
  
  -- Source Record Reference
  source_transaction_id BIGINT UNSIGNED,     -- FK to subscription_fulfillment_requests
  source_snapshot JSON,                      -- Full record snapshot at verification time
  
  -- Verification
  status ENUM('pending', 'verified', 'rejected', 'processing', 'completed', 'failed') DEFAULT 'pending',
  verification_result ENUM('approved', 'rejected', 'not_found') DEFAULT NULL,
  verification_comment TEXT,                 -- Why approved/rejected
  eligibility_checks JSON,                   -- Result of each eligibility rule
  verified_at DATETIME,
  verified_by VARCHAR(100),
  
  -- Refund Processing
  refund_status ENUM('not_processed', 'success', 'failed', 'pending') DEFAULT 'not_processed',
  refund_description TEXT,
  refund_raw_response TEXT,                  -- Payment gateway API response
  refund_processed_at DATETIME,
  refund_processed_by VARCHAR(100),
  
  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  
  INDEX idx_case_number (case_number),
  INDEX idx_msisdn (msisdn),
  INDEX idx_order_id (order_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

#### Table: `refund_audit_logs`
```sql
CREATE TABLE refund_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  refund_case_id BIGINT UNSIGNED NOT NULL,
  
  -- Action Details
  action VARCHAR(50) NOT NULL,               -- 'created', 'verified', 'refunded', 'status_changed', etc.
  old_value JSON,                            -- Previous state
  new_value JSON,                            -- New state
  description TEXT,                          -- Human-readable description
  
  -- User Context
  performed_by VARCHAR(100),                 -- Username or 'system'
  ip_address VARCHAR(45),                    -- IPv4 or IPv6
  user_agent TEXT,                           -- Browser/client info
  
  -- Timestamp
  performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (refund_case_id) REFERENCES refund_cases(id) ON DELETE CASCADE,
  INDEX idx_refund_case_id (refund_case_id),
  INDEX idx_performed_at (performed_at)
);
```

#### Table: `refund_notifications`
```sql
CREATE TABLE refund_notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  refund_case_id BIGINT UNSIGNED NOT NULL,
  
  -- Notification Details
  notification_type ENUM('sms', 'email') NOT NULL,
  recipient VARCHAR(255) NOT NULL,           -- Phone number or email
  message TEXT NOT NULL,
  
  -- Status
  status ENUM('pending', 'sent', 'failed', 'retry') DEFAULT 'pending',
  error_message TEXT,                        -- If failed
  retry_count INT DEFAULT 0,
  
  -- Timestamps
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (refund_case_id) REFERENCES refund_cases(id) ON DELETE CASCADE,
  INDEX idx_refund_case_id (refund_case_id),
  INDEX idx_status (status)
);
```

#### Table: `bulk_operations`
```sql
CREATE TABLE bulk_operations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  operation_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'BO-2026-000001'
  
  -- Operation Details
  filename VARCHAR(255),                     -- Uploaded CSV filename
  total_cases INT DEFAULT 0,
  verified_cases INT DEFAULT 0,
  approved_cases INT DEFAULT 0,
  rejected_cases INT DEFAULT 0,
  processed_cases INT DEFAULT 0,
  successful_refunds INT DEFAULT 0,
  failed_refunds INT DEFAULT 0,
  
  -- Status
  status ENUM('uploading', 'verifying', 'processing', 'completed', 'failed') DEFAULT 'uploading',
  progress_percentage DECIMAL(5, 2) DEFAULT 0.00,
  
  -- Results
  result_file_path VARCHAR(500),             -- Path to result CSV
  
  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  completed_at DATETIME,
  
  INDEX idx_operation_number (operation_number),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

---

## Example Workflow

### Scenario: Customer reports failed subscription activation

1. **Create Case**
   ```json
   POST /api/cases
   {
     "msisdn": "923001234567",
     "amount": 2500,
     "paymentMethod": "Easy_Paisa",
     "orderId": "INV1774811467196",
     "transactionDate": "2026-03-30T10:30:00+05:00"
   }
   ```

2. **Auto-Verification Process**
   - System creates case: `RC-2026-000001`
   - Status: `pending`
   
   **Step 1:** Query `subscription_fulfillment_requests`
   ```sql
   SELECT * FROM rox_app.subscription_fulfillment_requests
   WHERE payment_gateway_ref = 'INV1774811467196'
     AND mobile_number IN ('923001234567', '03001234567', '3001234567')
     AND ABS(amount_deducted - 2500) < 0.01
     AND DATE(created_at) = '2026-03-30'
   LIMIT 1;
   ```
   
   **Result:** Found record
   ```json
   {
     "transaction_id": 12345,
     "payment_gateway_ref": "INV1774811467196",
     "mobile_number": "923001234567",
     "amount_deducted": 2500,
     "payment_status": "paid",
     "fulfillment_status": "FAILED",
     "payment_method": "Easy_Paisa",
     "service_type": "VIBE_SUBSCRIPTION",
     "service_code": "INSANE_VIBE",
     "metadata": "{}",
     "error_message": "HLR_QUOTA_EXCEEDED",
     "created_at": "2026-03-30 10:32:15"
   }
   ```
   
   **Step 2:** Eligibility Check
   ```json
   {
     "payment_status_check": true,        // 'paid' ✅
     "fulfillment_status_check": true,    // 'FAILED' (not SUCCESS) ✅
     "payment_method_check": true,        // 'Easy_Paisa' (not jazz_balance/bnpl) ✅
     "service_type_check": true,          // 'VIBE_SUBSCRIPTION' ✅
     "service_code_check": true,          // != 'SHAREVIBE' ✅
     "jazz_balance_check": true,          // metadata.useJazzBalance != true ✅
     "overall_result": "approved"
   }
   ```
   
3. **Update Case**
   ```sql
   UPDATE refund_cases SET
     status = 'verified',
     verification_result = 'approved',
     source_transaction_id = 12345,
     source_snapshot = '{"transaction_id": 12345, "payment_gateway_ref": "INV1774811467196", ...}',
     verification_comment = 'Found in fulfillment table. All eligibility checks passed.',
     eligibility_checks = '{"payment_status_check": true, ...}',
     verified_at = NOW(),
     verified_by = 'system';
   
   INSERT INTO refund_audit_logs 
     (refund_case_id, action, new_value, performed_by, description)
   VALUES 
     (1, 'verified', '{"status": "verified", "result": "approved"}', 'system', 
      'Case verified successfully against subscription_fulfillment_requests');
   ```

4. **Process Refund**
   ```json
   POST /api/cases/RC-2026-000001/refund
   ```
   
   - System calls EasyPaisa refund API
   - Receives response:
   ```json
   {
     "responseCode": "0000",
     "responseDesc": "Refund processed successfully",
     "reversalId": "REV123456789"
   }
   ```
   
5. **Update Case**
   ```sql
   UPDATE refund_cases SET
     status = 'completed',
     refund_status = 'success',
     refund_description = 'Success: Refund processed successfully',
     refund_raw_response = '{"responseCode":"0000", "reversalId":"REV123456789", ...}',
     refund_processed_at = NOW(),
     refund_processed_by = 'admin_user';
   
   INSERT INTO refund_audit_logs 
     (refund_case_id, action, new_value, performed_by, description)
   VALUES 
     (1, 'refunded', '{"refund_status": "success"}', 'admin_user', 
      'Refund processed successfully via EasyPaisa API');
   ```

6. **Send Notification**
   ```sql
   INSERT INTO refund_notifications
     (refund_case_id, notification_type, recipient, message, status)
   VALUES
     (1, 'sms', '923001234567', 
      'Your refund of Rs. 2500 has been processed and will reflect in your account within 24 hours.', 
      'pending');
   ```

---

## Data Fields Required

### Essential Fields to Track in `refund_cases`

1. **Input Data** (from user/CSV):
   - `msisdn` (customer phone)
   - `amount` (refund amount)
   - `payment_method` (Easy_Paisa / Jazz_Cash / Card)
   - `order_id` (optional - payment gateway reference)
   - `transaction_datetime` (when payment occurred)

2. **Verification Data**:
   - `source_transaction_id` (reference to subscription_fulfillment_requests)
   - `source_snapshot` (JSON snapshot of source record)
   - `verification_result` (approved/rejected/not_found)
   - `verification_comment` (explanation)
   - `eligibility_checks` (JSON of each rule result)
   - `verified_at`, `verified_by`

3. **Refund Processing Data**:
   - `refund_status` (not_processed/success/failed/pending)
   - `refund_description` (human-readable result)
   - `refund_raw_response` (full API response)
   - `refund_processed_at`, `refund_processed_by`

4. **Audit Data**:
   - `case_number` (unique identifier)
   - `status` (overall case status)
   - `created_at`, `updated_at`, `created_by`

---

## Technical Stack Recommendations

### Backend
- **Framework:** NestJS (TypeScript, enterprise-grade)
- **ORM:** TypeORM or Prisma (works with MySQL)
- **Job Queue:** Bull + Redis (background processing)
- **Database:** MySQL 5.7+
- **API Style:** RESTful + WebSocket for real-time updates
- **Validation:** class-validator + class-transformer

### Frontend
- **Framework:** React 18 + TypeScript
- **UI Library:** Material-UI or Ant Design
- **State Management:** React Query (TanStack Query)
- **Routing:** React Router v6
- **Forms:** React Hook Form + Zod validation
- **Real-time:** Socket.io-client for progress updates

### Infrastructure
- **Deployment:** Docker containers
- **Database:** 
  - `rox_app` (read-only connection for verification)
  - `rox_refund_management` (read-write for case tracking)
- **Caching:** Redis (for queue and session management)
- **File Storage:** Local filesystem or S3 for CSV files

---

## API Endpoints

### Case Management
```
POST   /api/cases                    - Create single case
GET    /api/cases                    - List all cases (with pagination)
GET    /api/cases/:id                - Get case details
PUT    /api/cases/:id                - Update case
POST   /api/cases/:id/verify         - Re-verify case
POST   /api/cases/:id/refund         - Process refund
DELETE /api/cases/:id                - Delete case
```

### Bulk Operations
```
POST   /api/bulk/upload              - Upload CSV for bulk processing
GET    /api/bulk                     - List bulk operations
GET    /api/bulk/:id                 - Get bulk operation details
GET    /api/bulk/:id/progress        - Get real-time progress
GET    /api/bulk/:id/download        - Download result CSV
```

### Dashboard & Reports
```
GET    /api/dashboard/stats          - Get dashboard statistics
GET    /api/reports/export           - Export cases to CSV
GET    /api/audit-logs/:caseId       - Get audit trail for case
```

---

## CSV Input Format (for Bulk Upload)

### Required Columns:
```csv
msisdn,amount,payment_method,order_id,transaction_date
923001234567,2500,Easy_Paisa,INV1774811467196,2026-03-30 10:30:00
923009876543,1500,Jazz_Cash,JC123456789,2026-03-29 14:20:00
923005555555,3000,Card,CARD987654,2026-03-28 09:15:00
```

### CSV Output Format (Result Download):
```csv
msisdn,amount,payment_method,order_id,transaction_date,case_number,verification_result,verification_comment,refund_status,refund_description
923001234567,2500,Easy_Paisa,INV1774811467196,2026-03-30 10:30:00,RC-2026-000001,approved,All checks passed,success,Refund processed successfully
923009876543,1500,Jazz_Cash,JC123456789,2026-03-29 14:20:00,RC-2026-000002,rejected,Service already delivered,not_processed,Not eligible for refund
```

---

## Success Criteria

### MVP (Minimum Viable Product) Must Have:

1. ✅ Create individual refund cases via UI
2. ✅ Auto-verify against `subscription_fulfillment_requests`
3. ✅ Display verification result with eligibility details
4. ✅ Process refund with one click
5. ✅ Track refund status (success/failure)
6. ✅ Upload CSV for bulk cases
7. ✅ Background processing with progress tracking
8. ✅ Download results CSV with verification & refund status
9. ✅ Dashboard with key metrics (total cases, success rate, etc.)
10. ✅ Audit trail viewer for each case

### Phase 2 Enhancements:
- Advanced filtering and search
- SMS/Email notifications
- Role-based access control
- Auto-retry mechanism for failed refunds
- Integration with customer service portal
- Analytics and reporting dashboards

---

## Implementation Notes

### Verification Algorithm Pseudocode

```typescript
async function verifyCase(input: RefundCaseInput): Promise<VerificationResult> {
  // Step 1: Query subscription_fulfillment_requests
  let record;
  
  if (input.orderId) {
    // Try by order ID first
    record = await db.query(
      'SELECT * FROM subscription_fulfillment_requests WHERE payment_gateway_ref = ?',
      [input.orderId]
    );
  }
  
  if (!record && input.msisdn) {
    // Fallback: Try by phone number + amount + date
    const phoneVariants = [
      input.msisdn,                           // 923001234567
      input.msisdn.replace(/^92/, '0'),       // 03001234567
      input.msisdn.replace(/^92/, '')         // 3001234567
    ];
    
    record = await db.query(`
      SELECT * FROM subscription_fulfillment_requests 
      WHERE mobile_number IN (?, ?, ?)
        AND ABS(amount_deducted - ?) < 0.01
        AND DATE(created_at) = DATE(?)
      ORDER BY created_at DESC
      LIMIT 1
    `, [...phoneVariants, input.amount, input.transactionDate]);
  }
  
  // Step 2: Check if record found
  if (!record) {
    return {
      result: 'not_found',
      comment: 'No matching record found in subscription_fulfillment_requests'
    };
  }
  
  // Step 3: Run eligibility checks
  const checks = {
    payment_status_check: ['paid', 'verified'].includes(record.payment_status),
    fulfillment_status_check: !['RECHARGE_POSTED', 'SUCCESS'].includes(record.fulfillment_status),
    payment_method_check: !['jazz_balance', 'bnpl'].includes(record.payment_method),
    service_type_check: record.service_type === 'VIBE_SUBSCRIPTION',
    service_code_check: record.service_code !== 'SHAREVIBE',
    jazz_balance_check: JSON.parse(record.metadata || '{}').useJazzBalance !== true
  };
  
  const allPassed = Object.values(checks).every(v => v === true);
  
  if (!allPassed) {
    const failedChecks = Object.entries(checks)
      .filter(([_, passed]) => !passed)
      .map(([check, _]) => check);
    
    return {
      result: 'rejected',
      comment: `Failed eligibility checks: ${failedChecks.join(', ')}`,
      checks,
      sourceRecord: record
    };
  }
  
  // Step 4: All checks passed
  return {
    result: 'approved',
    comment: 'Found in fulfillment table and passed all refund eligibility checks',
    checks,
    sourceRecord: record
  };
}
```

---

## Summary

This simplified refund management system:
- Uses **single source of truth**: `subscription_fulfillment_requests` table
- Implements **straightforward verification** with clear eligibility rules
- Provides **complete tracking** via new `rox_refund_management` database
- Offers **web UI** for case management, bulk processing, and reporting
- Integrates with **existing refund APIs** (EasyPaisa, JazzCash, Card)
- Maintains **full audit trail** for compliance
- Handles both **individual and bulk** refund scenarios

The system is simpler than the multi-database approach while maintaining reliability by using the application's primary fulfillment table as the definitive source for refund decisions.
