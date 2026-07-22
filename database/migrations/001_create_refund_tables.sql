-- =====================================================
-- Database Migration for Refund Management System
-- Database: rox_refund_management
-- =====================================================
-- IMPORTANT: Do NOT run this on the rox_app database
-- The subscription_fulfillment_requests table already exists there
-- =====================================================

-- Create database
CREATE DATABASE IF NOT EXISTS rox_refund_management 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE rox_refund_management;

-- =====================================================
-- Table: bulk_operations (Create first for FK reference)
-- =====================================================
CREATE TABLE IF NOT EXISTS bulk_operations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  operation_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'e.g., BO-2026-000001',
  
  -- Operation Details
  filename VARCHAR(255) DEFAULT NULL COMMENT 'Uploaded CSV filename',
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
  result_file_path VARCHAR(500) DEFAULT NULL COMMENT 'Path to result CSV',
  error_message TEXT DEFAULT NULL,
  
  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(100) DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  
  INDEX idx_operation_number (operation_number),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bulk CSV upload operations tracking';

-- =====================================================
-- Table: refund_cases
-- =====================================================
CREATE TABLE IF NOT EXISTS refund_cases (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  case_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'e.g., RC-2026-000001',
  
  -- Customer Info (from input)
  msisdn VARCHAR(15) NOT NULL COMMENT 'Customer phone number (923001234567)',
  amount DECIMAL(10, 2) NOT NULL COMMENT 'Refund amount',
  payment_method ENUM('Easy_Paisa', 'Jazz_Cash', 'Card') NOT NULL,
  account_number VARCHAR(255) DEFAULT NULL COMMENT 'Account number for Easy Paisa/Jazz Cash',
  package_code VARCHAR(100) DEFAULT NULL COMMENT 'Package trying to activate',
  order_id VARCHAR(255) DEFAULT NULL COMMENT 'Payment gateway order ID',
  transaction_datetime DATETIME DEFAULT NULL COMMENT 'Original payment time',
  
  -- Source Record Reference
  source_transaction_id BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK to subscription_fulfillment_requests',
  source_snapshot JSON DEFAULT NULL COMMENT 'Full record snapshot at verification time',
  
  -- Verification
  status ENUM('pending', 'verified', 'rejected', 'processing', 'completed', 'failed') DEFAULT 'pending',
  verification_result ENUM('approved', 'rejected', 'not_found') DEFAULT NULL,
  verification_comment TEXT DEFAULT NULL COMMENT 'Why approved/rejected',
  eligibility_checks JSON DEFAULT NULL COMMENT 'Result of each eligibility rule',
  verified_at DATETIME DEFAULT NULL,
  verified_by VARCHAR(100) DEFAULT NULL,
  
  -- Refund Processing
  refund_status ENUM('not_processed', 'success', 'failed', 'pending') DEFAULT 'not_processed',
  refund_description TEXT DEFAULT NULL,
  refund_raw_response TEXT DEFAULT NULL COMMENT 'Payment gateway API response',
  refund_processed_at DATETIME DEFAULT NULL,
  refund_processed_by VARCHAR(100) DEFAULT NULL,
  
  -- Bulk Operation Reference
  bulk_operation_id BIGINT UNSIGNED DEFAULT NULL COMMENT 'FK to bulk_operations if created from CSV',
  
  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(100) DEFAULT NULL,
  
  INDEX idx_case_number (case_number),
  INDEX idx_msisdn (msisdn),
  INDEX idx_order_id (order_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_bulk_operation_id (bulk_operation_id),
  
  FOREIGN KEY (bulk_operation_id) REFERENCES bulk_operations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Main refund cases tracking table';

-- =====================================================
-- Table: refund_audit_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS refund_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  refund_case_id BIGINT UNSIGNED NOT NULL,
  
  -- Action Details
  action VARCHAR(50) NOT NULL COMMENT 'created, verified, refunded, status_changed, etc.',
  old_value JSON DEFAULT NULL COMMENT 'Previous state',
  new_value JSON DEFAULT NULL COMMENT 'New state',
  description TEXT DEFAULT NULL COMMENT 'Human-readable description',
  
  -- User Context
  performed_by VARCHAR(100) NOT NULL COMMENT 'Username or system',
  ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IPv4 or IPv6',
  user_agent TEXT DEFAULT NULL COMMENT 'Browser/client info',
  
  -- Timestamp
  performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_refund_case_id (refund_case_id),
  INDEX idx_performed_at (performed_at),
  INDEX idx_action (action),
  
  FOREIGN KEY (refund_case_id) REFERENCES refund_cases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Audit trail for all refund case actions';

-- =====================================================
-- Table: refund_notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS refund_notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  refund_case_id BIGINT UNSIGNED NOT NULL,
  
  -- Notification Details
  notification_type ENUM('sms', 'email') NOT NULL,
  recipient VARCHAR(255) NOT NULL COMMENT 'Phone number or email',
  message TEXT NOT NULL,
  
  -- Status
  status ENUM('pending', 'sent', 'failed', 'retry') DEFAULT 'pending',
  error_message TEXT DEFAULT NULL COMMENT 'If failed',
  retry_count INT DEFAULT 0,
  
  -- Timestamps
  sent_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_refund_case_id (refund_case_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (refund_case_id) REFERENCES refund_cases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='SMS and email notifications for refund cases';

-- =====================================================
-- Verify Tables Created
-- =====================================================
SHOW TABLES;

-- =====================================================
-- Sample Data (Optional - for testing)
-- =====================================================
-- Uncomment below to insert sample data

/*
-- Create a sample bulk operation
INSERT INTO bulk_operations (
  operation_number, filename, total_cases, status, created_by
) VALUES
  ('BO-2026-000001', 'sample_refunds.csv', 3, 'completed', 'system');

-- Get the bulk operation ID
SET @bulk_op_id = LAST_INSERT_ID();

-- Create sample refund cases
INSERT INTO refund_cases (
  case_number, msisdn, amount, payment_method, order_id,
  transaction_datetime, status, bulk_operation_id, created_by
) VALUES
  ('RC-2026-000001', '923001234567', 2500.00, 'Easy_Paisa', 'INV1774811467196',
   '2026-03-30 10:30:00', 'pending', NULL, 'system'),
  ('RC-2026-000002', '923009876543', 1500.00, 'Jazz_Cash', 'JC123456789',
   '2026-03-29 14:20:00', 'pending', @bulk_op_id, 'system'),
  ('RC-2026-000003', '923005555555', 3000.00, 'Card', 'CARD987654',
   '2026-03-28 09:15:00', 'pending', @bulk_op_id, 'system');

-- Create sample audit logs
INSERT INTO refund_audit_logs (
  refund_case_id, action, new_value, performed_by, description
) VALUES
  (1, 'created', '{"status": "pending"}', 'system', 'Refund case created'),
  (2, 'created', '{"status": "pending"}', 'system', 'Refund case created from bulk operation'),
  (3, 'created', '{"status": "pending"}', 'system', 'Refund case created from bulk operation');

-- Create sample notifications
INSERT INTO refund_notifications (
  refund_case_id, notification_type, recipient, message, status
) VALUES
  (1, 'sms', '923001234567', 'Your refund request has been received.', 'pending');
*/

-- =====================================================
-- Grant Permissions (Update username as needed)
-- =====================================================
-- CREATE USER IF NOT EXISTS 'refund_user'@'localhost' IDENTIFIED BY 'refund_password';
-- GRANT ALL PRIVILEGES ON rox_refund_management.* TO 'refund_user'@'localhost';
-- FLUSH PRIVILEGES;

-- =====================================================
-- Migration Complete
-- =====================================================
SELECT 'Migration completed successfully! Tables created:' AS Status;
SHOW TABLES;
