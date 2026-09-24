-- Your original schema (MySQL). Run this once if the database does not exist yet.
CREATE DATABASE IF NOT EXISTS warehouse_db;
USE warehouse_db;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('owner', 'customer') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE storage_spaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    unique_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    total_capacity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    location VARCHAR(255) NOT NULL,
    availability ENUM('available', 'unavailable') NOT NULL DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id),
    CHECK (total_capacity > 0),
    CHECK (unit_price > 0)
);

CREATE TABLE rental_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    space_id INT NOT NULL,
    requested_capacity DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (space_id) REFERENCES storage_spaces(id),
    CHECK (requested_capacity > 0),
    CHECK (end_date > start_date)
);

CREATE TABLE rental_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rental_id INT NOT NULL,
    old_status ENUM('pending', 'approved', 'rejected', 'cancelled'),
    new_status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL,
    changed_by INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rental_id) REFERENCES rental_requests(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE TABLE import_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    total_rows INT NOT NULL DEFAULT 0,
    valid_rows INT NOT NULL DEFAULT 0,
    invalid_rows INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE import_errors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    row_num INT NOT NULL,
    error_message VARCHAR(500) NOT NULL,
    FOREIGN KEY (batch_id) REFERENCES import_batches(id)
);

-- OPTIONAL but recommended: every capacity check hits this index (spec section 3)
CREATE INDEX idx_rental_capacity ON rental_requests (space_id, start_date, end_date);
