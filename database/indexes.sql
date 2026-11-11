-- FinGuard AI | secondary indexes (safe to re-run: existing indexes are skipped)
USE finguard;

DROP PROCEDURE IF EXISTS fg_add_index;
DELIMITER $$
CREATE PROCEDURE fg_add_index(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN cols VARCHAR(255))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = tbl AND index_name = idx) THEN
    SET @sql = CONCAT('CREATE INDEX ', idx, ' ON ', tbl, ' (', cols, ')');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL fg_add_index('users', 'idx_users_company_role', 'company_id, role_id, is_active');
CALL fg_add_index('users', 'idx_users_department', 'department_id');
CALL fg_add_index('vendors', 'idx_vendors_company_name', 'company_id, name');
CALL fg_add_index('vendors', 'idx_vendors_status', 'company_id, verification_status, risk_category');
CALL fg_add_index('vendor_bank_accounts', 'idx_vba_vendor_active', 'vendor_id, is_active');
CALL fg_add_index('vendor_bank_accounts', 'idx_vba_hash', 'account_hash');
CALL fg_add_index('invoices', 'idx_inv_company_status', 'company_id, status, created_at');
CALL fg_add_index('invoices', 'idx_inv_vendor_number', 'company_id, vendor_id, invoice_number');
CALL fg_add_index('invoices', 'idx_inv_vendor_date', 'vendor_id, invoice_date');
CALL fg_add_index('invoices', 'idx_inv_dept_date', 'company_id, department_id, invoice_date');
CALL fg_add_index('invoices', 'idx_inv_submitter', 'submitted_by, status');
CALL fg_add_index('invoices', 'idx_inv_risk', 'company_id, risk_category');
CALL fg_add_index('invoice_documents', 'idx_idoc_hash', 'sha256');
CALL fg_add_index('invoice_line_items', 'idx_ili_invoice', 'invoice_id');
CALL fg_add_index('approval_history', 'idx_ah_invoice', 'invoice_id, step_order');
CALL fg_add_index('approval_history', 'idx_ah_approver_pending', 'approver_id, action');
CALL fg_add_index('approval_rules', 'idx_ar_lookup', 'company_id, is_active, step_order');
CALL fg_add_index('risk_assessments', 'idx_ra_invoice', 'invoice_id, assessed_at');
CALL fg_add_index('duplicate_detection_records', 'idx_dd_invoice', 'invoice_id, status');
CALL fg_add_index('ml_predictions', 'idx_mlp_invoice', 'invoice_id, model_name');
CALL fg_add_index('payments', 'idx_pay_invoice', 'invoice_id');
CALL fg_add_index('notifications', 'idx_notif_user_unread', 'user_id, is_read, created_at');
CALL fg_add_index('audit_logs', 'idx_audit_company_time', 'company_id, created_at');
CALL fg_add_index('audit_logs', 'idx_audit_entity', 'entity_type, entity_id');
CALL fg_add_index('purchase_orders', 'idx_po_vendor', 'vendor_id');
CALL fg_add_index('goods_received_notes', 'idx_grn_po', 'po_id');

DROP PROCEDURE fg_add_index;
