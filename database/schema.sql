-- Create Database (if not exists)
CREATE DATABASE IF NOT EXISTS cbs;
USE cbs;


-- Customer Table
CREATE TABLE Customer (
    CustomerID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    CNIC VARCHAR(15) UNIQUE NOT NULL,
    Contact VARCHAR(20) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Account Table
CREATE TABLE Account (
    AccountNo INT PRIMARY KEY AUTO_INCREMENT,
    CustomerID INT NOT NULL,
    Type ENUM('Savings', 'Current', 'Fixed') NOT NULL,
    Balance DECIMAL(15, 2) DEFAULT 0.00,
    Status ENUM('Active', 'Inactive', 'Blocked') DEFAULT 'Active',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID) ON DELETE CASCADE
);

-- Transaction Table
CREATE TABLE Transaction (
    TransID INT PRIMARY KEY AUTO_INCREMENT,
    FromAccount INT NULL,
    ToAccount INT NULL,
    Amount DECIMAL(15, 2) NOT NULL,
    Type ENUM('Deposit', 'Withdraw', 'Transfer', 'Test', 'Test2') NOT NULL,
    DateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (FromAccount) REFERENCES Account(AccountNo) ON DELETE SET NULL,
    FOREIGN KEY (ToAccount) REFERENCES Account(AccountNo) ON DELETE SET NULL
);

-- AuditLog Table
CREATE TABLE AuditLog (
    LogID INT PRIMARY KEY AUTO_INCREMENT,
    Operation VARCHAR(50) NOT NULL,
    TableAffected VARCHAR(50) NOT NULL,
    RecordID INT NULL,
    User VARCHAR(100) DEFAULT 'system',
    Details TEXT NULL,
    DateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
