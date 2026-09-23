INSERT INTO users (name, email, password_hash, role) VALUES
  ('Owner One', 'owner@example.com', 'hashed_password', 'owner'),
  ('Customer One', 'customer@example.com', 'hashed_password', 'customer');

INSERT INTO spaces (owner_id, title, location, size_sqft, price_per_month, category, description, status) VALUES
  (1, 'Central Logistics Hub', 'Nairobi', 1200, 2500.00, 'warehouse', 'Ready-to-use warehouse with loading bay.', 'available'),
  (1, 'Cold Storage Unit', 'Mombasa', 800, 1800.00, 'cold-storage', 'Climate controlled unit', 'available');
