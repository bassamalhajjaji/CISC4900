INSERT INTO users (email,password_hash,full_name,role)
VALUES ('admin@retailflow.local',
        '$2a$10$S.4kA7B2gq7u5Z0iJ9md4u8kQO3N2bN8vXr5F4ZpQm1RkJ0Eo6C/y',
        'Admin User','ADMIN');

INSERT INTO categories(name) VALUES ('Beverages'), ('Snacks'), ('Household');

INSERT INTO suppliers(name,email,phone) VALUES
('Acme Foods','sales@acme.com','555-1111'),
('Global Snacks','contact@globalsnacks.com','555-2222');

INSERT INTO products (sku,name,category_id,supplier_id,unit_price,cost_price,reorder_level)
VALUES
('BEV-001','Orange Juice 1L',1,1,3.99,2.10,15),
('SNK-001','Potato Chips 200g',2,2,2.49,1.10,20),
('HHD-001','Paper Towels 6-pack',3,NULL,8.99,5.20,8);

INSERT INTO stock_levels (product_id, qty_on_hand)
SELECT product_id, 25 FROM products;