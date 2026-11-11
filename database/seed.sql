-- FinGuard AI | reference data (roles, permissions)
-- Company-specific defaults (departments, designations, categories) are created
-- automatically when a company registers. The first admin account is created by:
--     python backend/scripts/create_admin.py
-- (so no password hash is ever stored in a script checked into Git).
USE finguard;

INSERT IGNORE INTO roles (code, name, description) VALUES
 ('employee', 'Employee',  'Submits invoices and tracks their status'),
 ('manager',  'Manager',   'Approves within authority, views team spend'),
 ('finance',  'Finance',   'Verifies invoices, vendors and releases payments'),
 ('director', 'Director',  'Approves high-value invoices'),
 ('cfo',      'CFO',       'Final approval authority and full financial visibility'),
 ('admin',    'Administrator', 'Configures users, policies, hierarchy and audit review');

INSERT IGNORE INTO permissions (code, description) VALUES
 ('invoice.submit',    'Submit invoices'),
 ('invoice.view_own',  'View own invoices'),
 ('invoice.view_all',  'View all company invoices'),
 ('invoice.edit_ocr',  'Correct OCR-extracted fields'),
 ('invoice.approve',   'Approve or reject invoices within authority'),
 ('vendor.view',       'View vendor directory'),
 ('vendor.manage',     'Create and edit vendors'),
 ('vendor.verify',     'Verify vendors and bank details'),
 ('policy.manage',     'Create and edit financial policies'),
 ('hierarchy.manage',  'Configure approval hierarchy'),
 ('user.manage',       'Manage users, departments and designations'),
 ('payment.release',   'Release simulated payments'),
 ('audit.view',        'View audit logs'),
 ('report.view',       'View analytics and reports');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p
WHERE (r.code, p.code) IN (
 ('employee','invoice.submit'), ('employee','invoice.view_own'),

 ('manager','invoice.submit'), ('manager','invoice.view_own'), ('manager','invoice.approve'),
 ('manager','report.view'),

 ('finance','invoice.submit'), ('finance','invoice.view_all'), ('finance','invoice.edit_ocr'),
 ('finance','vendor.view'), ('finance','vendor.manage'), ('finance','vendor.verify'),
 ('finance','payment.release'), ('finance','report.view'),

 ('director','invoice.view_all'), ('director','invoice.approve'), ('director','vendor.view'),
 ('director','report.view'), ('director','audit.view'),

 ('cfo','invoice.view_all'), ('cfo','invoice.approve'), ('cfo','vendor.view'),
 ('cfo','report.view'), ('cfo','audit.view'), ('cfo','payment.release'),

 ('admin','invoice.view_all'), ('admin','vendor.view'), ('admin','vendor.manage'),
 ('admin','policy.manage'), ('admin','hierarchy.manage'), ('admin','user.manage'),
 ('admin','audit.view'), ('admin','report.view')
);
