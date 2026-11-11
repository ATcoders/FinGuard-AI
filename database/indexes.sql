-- FinGuard AI | secondary indexes for frequently queried fields
USE finguard;

CREATE INDEX idx_users_company_role     ON users (company_id, role_id, is_active);
CREATE INDEX idx_users_department       ON users (department_id);
CREATE INDEX idx_vendors_company_name   ON vendors (company_id, name);
CREATE INDEX idx_vendors_status         ON vendors (company_id, verification_status, risk_category);
CREATE INDEX idx_vba_vendor_active      ON vendor_bank_accounts (vendor_id, is_active);
CREATE INDEX idx_vba_hash               ON vendor_bank_accounts (account_hash);

CREATE INDEX idx_inv_company_status     ON invoices (company_id, status, created_at);
CREATE INDEX idx_inv_vendor_number      ON invoices (company_id, vendor_id, invoice_number);
CREATE INDEX idx_inv_vendor_date        ON invoices (vendor_id, invoice_date);
CREATE INDEX idx_inv_dept_date          ON invoices (company_id, department_id, invoice_date);
CREATE INDEX idx_inv_submitter          ON invoices (submitted_by, status);
CREATE INDEX idx_inv_risk               ON invoices (company_id, risk_category);
CREATE INDEX idx_idoc_hash              ON invoice_documents (sha256);
CREATE INDEX idx_ili_invoice            ON invoice_line_items (invoice_id);

CREATE INDEX idx_ah_invoice             ON approval_history (invoice_id, step_order);
CREATE INDEX idx_ah_approver_pending    ON approval_history (approver_id, action);
CREATE INDEX idx_ar_lookup              ON approval_rules (company_id, is_active, step_order);

CREATE INDEX idx_ra_invoice             ON risk_assessments (invoice_id, assessed_at);
CREATE INDEX idx_dd_invoice             ON duplicate_detection_records (invoice_id, status);
CREATE INDEX idx_mlp_invoice            ON ml_predictions (invoice_id, model_name);
CREATE INDEX idx_pay_invoice            ON payments (invoice_id);
CREATE INDEX idx_notif_user_unread      ON notifications (user_id, is_read, created_at);
CREATE INDEX idx_audit_company_time     ON audit_logs (company_id, created_at);
CREATE INDEX idx_audit_entity           ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_po_vendor              ON purchase_orders (vendor_id);
CREATE INDEX idx_grn_po                 ON goods_received_notes (po_id);
