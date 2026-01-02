-- Create Database (if not exists)
CREATE DATABASE IF NOT EXISTS cbs;
USE cbs;


-- Core Banking System Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS AuditLog;
DROP TABLE IF EXISTS Transaction;
DROP TABLE IF EXISTS Account;
DROP TABLE IF EXISTS Customer;

-- Create Customer table
CREATE TABLE Customer (
    CustomerID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    CNIC VARCHAR(15) NOT NULL UNIQUE,
    Contact VARCHAR(15) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Account table
CREATE TABLE Account (
    AccountNo INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT NOT NULL,
    Type ENUM('Savings', 'Current') NOT NULL,
    Balance DECIMAL(15, 2) DEFAULT 0.00,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID) ON DELETE RESTRICT
);

-- Create Transaction table
CREATE TABLE Transaction (
    TransID INT AUTO_INCREMENT PRIMARY KEY,
    FromAccount INT NULL,
    ToAccount INT NULL,
    Amount DECIMAL(15, 2) NOT NULL,
    Type ENUM('Deposit', 'Withdraw', 'Transfer') NOT NULL,
    DateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (FromAccount) REFERENCES Account(AccountNo) ON DELETE RESTRICT,
    FOREIGN KEY (ToAccount) REFERENCES Account(AccountNo) ON DELETE RESTRICT
);

-- Create AuditLog table
CREATE TABLE AuditLog (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    Operation VARCHAR(50) NOT NULL,
    TableAffected VARCHAR(50) NOT NULL,
    User VARCHAR(100) NOT NULL,
    DateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data for testing
INSERT INTO Customer (Name, CNIC, Contact) VALUES
('Ali Ahmed', '12345-6789012-3', '0300-1234567'),
('Fatima Khan', '23456-7890123-4', '0321-2345678'),
('Hassan Raza', '34567-8901234-5', '0333-3456789');

INSERT INTO Account (CustomerID, Type, Balance) VALUES
(1, 'Savings', 5000.00),
(1, 'Current', 10000.00),
(2, 'Savings', 15000.00),
(3, 'Current', 8000.00);

INSERT INTO Transaction (FromAccount, ToAccount, Amount, Type) VALUES
(NULL, 1, 5000.00, 'Deposit'),
(NULL, 2, 10000.00, 'Deposit'),
(2, 3, 2000.00, 'Transfer');

-- Create indexes for better performance
CREATE INDEX idx_customer_cnic ON Customer(CNIC);
CREATE INDEX idx_account_customer ON Account(CustomerID);
CREATE INDEX idx_transaction_from ON Transaction(FromAccount);
CREATE INDEX idx_transaction_to ON Transaction(ToAccount);
CREATE INDEX idx_transaction_date ON Transaction(DateTime);
CREATE INDEX idx_audit_date ON AuditLog(DateTime);