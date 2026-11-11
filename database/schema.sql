-- ============================================================
-- FinGuard AI  |  MySQL 8.x schema
-- Run in MySQL Workbench (File > Open SQL Script > Execute)
-- Order: schema.sql -> indexes.sql -> seed.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS finguard
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE finguard;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Tenancy and identity
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  gstin         VARCHAR(15)  NULL,
  pan           VARCHAR(10)  NULL,
  address       VARCHAR(500) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_company_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS roles (
  id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(30)  NOT NULL,
  name        VARCHAR(60)  NOT NULL,
  description VARCHAR(255) NULL,
  UNIQUE KEY uq_role_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(60)  NOT NULL,
  description VARCHAR(255) NULL,
  UNIQUE KEY uq_permission_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       SMALLINT UNSIGNED NOT NULL,
  permission_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS departments (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id       BIGINT UNSIGNED NOT NULL,
  name             VARCHAR(100) NOT NULL,
  code             VARCHAR(20)  NOT NULL,
  monthly_budget   DECIMAL(15,2) NULL,
  spending_limit   DECIMAL(15,2) NULL COMMENT 'Per-invoice ceiling for this department; NULL = no department ceiling',
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dept_code (company_id, code),
  UNIQUE KEY uq_dept_name (company_id, name),
  CONSTRAINT fk_dept_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT chk_dept_budget CHECK (monthly_budget IS NULL OR monthly_budget >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS designations (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NOT NULL,
  name            VARCHAR(80) NOT NULL,
  level_rank      SMALLINT UNSIGNED NOT NULL COMMENT 'Higher = more senior',
  approval_limit  DECIMAL(15,2) NULL COMMENT 'NULL = unlimited authority',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_desig_name (company_id, name),
  CONSTRAINT fk_desig_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT chk_desig_limit CHECK (approval_limit IS NULL OR approval_limit >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NOT NULL,
  department_id   BIGINT UNSIGNED NULL,
  designation_id  BIGINT UNSIGNED NULL,
  role_id         SMALLINT UNSIGNED NOT NULL,
  employee_code   VARCHAR(30) NULL,
  full_name       VARCHAR(150) NOT NULL,
  email           VARCHAR(190) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at   DATETIME NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_email (email),
  UNIQUE KEY uq_user_empcode (company_id, employee_code),
  CONSTRAINT fk_user_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_user_desig FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE SET NULL,
  CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employee_hierarchy (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id   BIGINT UNSIGNED NOT NULL,
  employee_id  BIGINT UNSIGNED NOT NULL,
  manager_id   BIGINT UNSIGNED NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hierarchy_employee (employee_id),
  CONSTRAINT fk_eh_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_eh_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_eh_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_eh_self CHECK (employee_id <> manager_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS approval_delegations (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  delegator_id  BIGINT UNSIGNED NOT NULL,
  delegate_id   BIGINT UNSIGNED NOT NULL,
  starts_on     DATE NOT NULL,
  ends_on       DATE NOT NULL,
  reason        VARCHAR(255) NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dg_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_dg_delegator FOREIGN KEY (delegator_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_dg_delegate FOREIGN KEY (delegate_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_dg_dates CHECK (ends_on >= starts_on),
  CONSTRAINT chk_dg_self CHECK (delegator_id <> delegate_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  expires_at  DATETIME NOT NULL,
  revoked_at  DATETIME NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refresh_hash (token_hash),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Vendors
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id           BIGINT UNSIGNED NOT NULL,
  name                 VARCHAR(200) NOT NULL,
  gstin                VARCHAR(15) NULL,
  pan                  VARCHAR(10) NULL,
  address              VARCHAR(500) NULL,
  city                 VARCHAR(100) NULL,
  state                VARCHAR(100) NULL,
  contact_email        VARCHAR(190) NULL,
  contact_phone        VARCHAR(20) NULL,
  registration_date    DATE NULL,
  verification_status  ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',
  risk_score           DECIMAL(5,2) NULL COMMENT 'NULL = LIMITED HISTORY',
  risk_category        ENUM('low','moderate','high','critical','limited_history') NOT NULL DEFAULT 'limited_history',
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vendor_gstin (company_id, gstin),
  CONSTRAINT fk_vendor_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vendor_bank_accounts (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_id        BIGINT UNSIGNED NOT NULL,
  account_holder   VARCHAR(200) NOT NULL,
  account_number   VARBINARY(512) NOT NULL COMMENT 'Encrypted at application layer',
  account_last4    CHAR(4) NOT NULL,
  account_hash     CHAR(64) NOT NULL COMMENT 'SHA-256 for shared-account detection without exposing the number',
  ifsc             VARCHAR(11) NOT NULL,
  bank_name        VARCHAR(120) NULL,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  is_verified      TINYINT(1) NOT NULL DEFAULT 0,
  verified_by      BIGINT UNSIGNED NULL,
  verified_at      DATETIME NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deactivated_at   DATETIME NULL,
  CONSTRAINT fk_vba_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  CONSTRAINT fk_vba_verifier FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vendor_verification (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_id     BIGINT UNSIGNED NOT NULL,
  check_type    ENUM('gstin_format','gstin_registry','pan_format','bank_account','manual_review') NOT NULL,
  status        ENUM('passed','failed','pending','not_available') NOT NULL,
  source        VARCHAR(120) NULL COMMENT 'e.g. format-check, authorised registry, finance reviewer',
  notes         VARCHAR(500) NULL,
  verified_by   BIGINT UNSIGNED NULL,
  verified_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vv_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  CONSTRAINT fk_vv_user FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vendor_field_mappings (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_id      BIGINT UNSIGNED NOT NULL,
  standard_field VARCHAR(50) NOT NULL,
  label_text     VARCHAR(120) NOT NULL,
  times_confirmed INT UNSIGNED NOT NULL DEFAULT 1,
  last_confirmed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vfm (vendor_id, standard_field, label_text),
  CONSTRAINT fk_vfm_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Optional extraction hints only; never trusted blindly';

-- ------------------------------------------------------------
-- Categories, policies
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expense_categories (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id         BIGINT UNSIGNED NOT NULL,
  name               VARCHAR(80) NOT NULL,
  requires_po        TINYINT(1) NOT NULL DEFAULT 0,
  requires_grn       TINYINT(1) NOT NULL DEFAULT 0,
  po_threshold       DECIMAL(15,2) NULL COMMENT 'PO mandatory above this amount, if set',
  is_active          TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_cat_name (company_id, name),
  CONSTRAINT fk_cat_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS financial_policies (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(150) NOT NULL,
  policy_type   ENUM('spending_limit','mandatory_fields','po_requirement','duplicate_threshold','tolerance','risk_thresholds','category_restriction','other') NOT NULL,
  is_enabled    TINYINT(1) NOT NULL DEFAULT 1,
  created_by    BIGINT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_policy_name (company_id, name),
  CONSTRAINT fk_pol_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_pol_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS policy_versions (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  policy_id       BIGINT UNSIGNED NOT NULL,
  version_no      INT UNSIGNED NOT NULL,
  rules           JSON NOT NULL,
  effective_from  DATE NOT NULL,
  effective_to    DATE NULL,
  change_note     VARCHAR(255) NULL,
  created_by      BIGINT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_policy_version (policy_id, version_no),
  CONSTRAINT fk_pv_policy FOREIGN KEY (policy_id) REFERENCES financial_policies(id) ON DELETE CASCADE,
  CONSTRAINT fk_pv_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Purchase orders and GRNs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_orders (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id     BIGINT UNSIGNED NOT NULL,
  vendor_id      BIGINT UNSIGNED NOT NULL,
  department_id  BIGINT UNSIGNED NULL,
  po_number      VARCHAR(50) NOT NULL,
  order_date     DATE NOT NULL,
  total_amount   DECIMAL(15,2) NOT NULL,
  status         ENUM('open','partially_received','closed','cancelled') NOT NULL DEFAULT 'open',
  created_by     BIGINT UNSIGNED NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_po_number (company_id, po_number),
  CONSTRAINT fk_po_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_po_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  CONSTRAINT fk_po_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_po_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  po_id        BIGINT UNSIGNED NOT NULL,
  description  VARCHAR(300) NOT NULL,
  quantity     DECIMAL(12,3) NOT NULL,
  unit_price   DECIMAL(15,2) NOT NULL,
  tax_rate     DECIMAL(5,2) NOT NULL DEFAULT 0,
  line_total   DECIMAL(15,2) NOT NULL,
  CONSTRAINT fk_poi_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS goods_received_notes (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id     BIGINT UNSIGNED NOT NULL,
  po_id          BIGINT UNSIGNED NOT NULL,
  grn_number     VARCHAR(50) NOT NULL,
  received_date  DATE NOT NULL,
  received_by    BIGINT UNSIGNED NULL,
  total_amount   DECIMAL(15,2) NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_grn_number (company_id, grn_number),
  CONSTRAINT fk_grn_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_grn_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
  CONSTRAINT fk_grn_user FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS grn_items (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  grn_id             BIGINT UNSIGNED NOT NULL,
  po_item_id         BIGINT UNSIGNED NOT NULL,
  quantity_received  DECIMAL(12,3) NOT NULL,
  notes              VARCHAR(255) NULL,
  CONSTRAINT fk_gi_grn FOREIGN KEY (grn_id) REFERENCES goods_received_notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_gi_poi FOREIGN KEY (po_item_id) REFERENCES purchase_order_items(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Invoices
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id              BIGINT UNSIGNED NOT NULL,
  vendor_id               BIGINT UNSIGNED NULL,
  submitted_by            BIGINT UNSIGNED NOT NULL,
  department_id           BIGINT UNSIGNED NULL,
  category_id             BIGINT UNSIGNED NULL,
  po_id                   BIGINT UNSIGNED NULL,
  policy_version_id       BIGINT UNSIGNED NULL COMMENT 'Policy version in force at submission',
  invoice_number          VARCHAR(80) NULL,
  invoice_date            DATE NULL,
  due_date                DATE NULL,
  vendor_name_raw         VARCHAR(200) NULL,
  vendor_gstin            VARCHAR(15) NULL,
  buyer_gstin             VARCHAR(15) NULL,
  taxable_amount          DECIMAL(15,2) NULL,
  cgst                    DECIMAL(15,2) NULL,
  sgst                    DECIMAL(15,2) NULL,
  igst                    DECIMAL(15,2) NULL,
  total_amount            DECIMAL(15,2) NULL,
  currency                CHAR(3) NOT NULL DEFAULT 'INR',
  status                  ENUM('draft','submitted','under_validation','pending_approval','under_investigation',
                               'approved','rejected','payment_ready','processing','paid','failed')
                          NOT NULL DEFAULT 'draft',
  required_approval_level SMALLINT UNSIGNED NULL,
  current_approval_step   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  risk_score              DECIMAL(5,2) NULL,
  risk_category           ENUM('low','moderate','high','critical') NULL,
  hold_reason             VARCHAR(300) NULL,
  ocr_metadata            JSON NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
  CONSTRAINT fk_inv_user FOREIGN KEY (submitted_by) REFERENCES users(id),
  CONSTRAINT fk_inv_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_inv_cat FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_inv_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_inv_pv FOREIGN KEY (policy_version_id) REFERENCES policy_versions(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id   BIGINT UNSIGNED NOT NULL,
  line_no      SMALLINT UNSIGNED NOT NULL,
  description  VARCHAR(400) NULL,
  hsn_sac      VARCHAR(10) NULL,
  quantity     DECIMAL(12,3) NULL,
  unit_price   DECIMAL(15,2) NULL,
  tax_rate     DECIMAL(5,2) NULL,
  line_total   DECIMAL(15,2) NULL,
  CONSTRAINT fk_ili_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invoice_documents (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id         BIGINT UNSIGNED NOT NULL,
  original_filename  VARCHAR(255) NOT NULL,
  stored_path        VARCHAR(500) NOT NULL,
  mime_type          VARCHAR(80) NOT NULL,
  size_bytes         BIGINT UNSIGNED NOT NULL,
  sha256             CHAR(64) NOT NULL,
  page_count         SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  ocr_status         ENUM('pending','done','failed') NOT NULL DEFAULT 'pending',
  ocr_fields         JSON NULL COMMENT 'Per field: value, confidence, status(found|missing|needs_review), raw_text, page, bbox',
  uploaded_by        BIGINT UNSIGNED NULL,
  uploaded_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_idoc_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_idoc_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Approvals
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_rules (
  id                       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id               BIGINT UNSIGNED NOT NULL,
  department_id            BIGINT UNSIGNED NULL COMMENT 'NULL = all departments',
  category_id              BIGINT UNSIGNED NULL COMMENT 'NULL = all categories',
  min_amount               DECIMAL(15,2) NOT NULL DEFAULT 0,
  max_amount               DECIMAL(15,2) NULL COMMENT 'NULL = no upper bound',
  step_order               SMALLINT UNSIGNED NOT NULL,
  approver_designation_id  BIGINT UNSIGNED NOT NULL,
  escalation_hours         SMALLINT UNSIGNED NOT NULL DEFAULT 48,
  is_active                TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_ar_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_ar_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT fk_ar_cat FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE CASCADE,
  CONSTRAINT fk_ar_desig FOREIGN KEY (approver_designation_id) REFERENCES designations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS approval_history (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id         BIGINT UNSIGNED NOT NULL,
  step_order         SMALLINT UNSIGNED NOT NULL,
  approver_id        BIGINT UNSIGNED NULL,
  delegated_from_id  BIGINT UNSIGNED NULL,
  action             ENUM('pending','approved','rejected','escalated','reassigned') NOT NULL DEFAULT 'pending',
  comment            VARCHAR(1000) NULL,
  due_at             DATETIME NULL,
  acted_at           DATETIME NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ah_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_ah_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ah_delegator FOREIGN KEY (delegated_from_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Risk, duplicates, ML
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_assessments (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NOT NULL,
  invoice_id      BIGINT UNSIGNED NOT NULL,
  final_score     DECIMAL(5,2) NOT NULL,
  risk_category   ENUM('low','moderate','high','critical') NOT NULL,
  components      JSON NOT NULL COMMENT 'Normalised inputs and weights used for aggregation',
  reasons         JSON NOT NULL COMMENT 'List of {source, finding, evidence}',
  assessed_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ra_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_ra_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT chk_ra_score CHECK (final_score BETWEEN 0 AND 100)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS duplicate_detection_records (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id          BIGINT UNSIGNED NOT NULL,
  invoice_id          BIGINT UNSIGNED NOT NULL,
  matched_invoice_id  BIGINT UNSIGNED NOT NULL,
  match_type          ENUM('exact_number','fuzzy_number','same_document_hash','same_amount_date','similar_line_items') NOT NULL,
  similarity          DECIMAL(5,4) NOT NULL,
  matching_fields     JSON NULL,
  status              ENUM('open','confirmed_duplicate','dismissed') NOT NULL DEFAULT 'open',
  reviewed_by         BIGINT UNSIGNED NULL,
  reviewed_at         DATETIME NULL,
  review_note         VARCHAR(500) NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dd_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_dd_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_dd_matched FOREIGN KEY (matched_invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_dd_user FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ml_predictions (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id     BIGINT UNSIGNED NOT NULL,
  invoice_id     BIGINT UNSIGNED NOT NULL,
  model_name     ENUM('isolation_forest','xgboost') NOT NULL,
  model_version  VARCHAR(40) NOT NULL,
  prediction     VARCHAR(30) NOT NULL,
  score          DECIMAL(9,6) NOT NULL,
  features       JSON NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mlp_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_mlp_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dataset_versions (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  version       VARCHAR(40) NOT NULL,
  random_seed   INT NOT NULL,
  n_records     INT UNSIGNED NOT NULL,
  n_vendors     INT UNSIGNED NOT NULL,
  params        JSON NULL,
  output_path   VARCHAR(300) NULL,
  generated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dataset_version (version)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Payments, notifications, audit
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id         BIGINT UNSIGNED NOT NULL,
  invoice_id         BIGINT UNSIGNED NOT NULL,
  payment_reference  VARCHAR(40) NOT NULL,
  amount             DECIMAL(15,2) NOT NULL,
  status             ENUM('processing','paid','failed') NOT NULL,
  method             VARCHAR(30) NOT NULL DEFAULT 'SIMULATED',
  initiated_by       BIGINT UNSIGNED NULL,
  initiated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at       DATETIME NULL,
  failure_reason     VARCHAR(255) NULL,
  UNIQUE KEY uq_payment_ref (payment_reference),
  CONSTRAINT fk_pay_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_pay_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT fk_pay_user FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id          BIGINT UNSIGNED NOT NULL,
  user_id             BIGINT UNSIGNED NOT NULL,
  type                VARCHAR(40) NOT NULL,
  title               VARCHAR(200) NOT NULL,
  message             VARCHAR(500) NULL,
  related_invoice_id  BIGINT UNSIGNED NULL,
  related_vendor_id   BIGINT UNSIGNED NULL,
  is_read             TINYINT(1) NOT NULL DEFAULT 0,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_n_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_n_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_n_invoice FOREIGN KEY (related_invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_n_vendor FOREIGN KEY (related_vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NULL,
  user_id         BIGINT UNSIGNED NULL,
  action          VARCHAR(60) NOT NULL,
  entity_type     VARCHAR(40) NOT NULL,
  entity_id       BIGINT UNSIGNED NULL,
  previous_value  JSON NULL,
  new_value       JSON NULL,
  reason          VARCHAR(500) NULL,
  ip_address      VARCHAR(45) NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_al_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  CONSTRAINT fk_al_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- Audit log is append-only: block UPDATE and DELETE at DB level
-- (Workbench handles DELIMITER; with the mysql CLI it works as-is)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_logs_block_update;
DROP TRIGGER IF EXISTS audit_logs_block_delete;

DELIMITER $$
CREATE TRIGGER audit_logs_block_update BEFORE UPDATE ON audit_logs
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only';
END$$

CREATE TRIGGER audit_logs_block_delete BEFORE DELETE ON audit_logs
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only';
END$$
DELIMITER ;
