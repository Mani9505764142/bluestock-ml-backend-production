-- Bluestock ML Database Schema
-- Generated: August 20, 2025

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Database: bluestock_ml
CREATE DATABASE IF NOT EXISTS `bluestock_ml` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `bluestock_ml`;

-- Table structure for table `companies`
CREATE TABLE `companies` (
  `id` varchar(10) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `company_logo` text DEFAULT NULL,
  `about_company` text DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `nse_profile` varchar(255) DEFAULT NULL,
  `bse_profile` varchar(255) DEFAULT NULL,
  `sector` varchar(100) DEFAULT NULL,
  `market_cap` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for table `financial_metrics`
CREATE TABLE `financial_metrics` (
  `id` int(11) NOT NULL,
  `company_id` varchar(10) NOT NULL,
  `roce_percentage` decimal(10,2) DEFAULT NULL,
  `roe_percentage` decimal(10,2) DEFAULT NULL,
  `book_value` decimal(10,2) DEFAULT NULL,
  `face_value` decimal(10,2) DEFAULT NULL,
  `analysis_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for table `ml_analysis`
CREATE TABLE `ml_analysis` (
  `id` int(11) NOT NULL,
  `company_id` varchar(10) NOT NULL,
  `analysis_type` enum('strengths','risks','opportunities','threats') NOT NULL,
  `insight_text` text NOT NULL,
  `confidence_score` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes for table `companies`
ALTER TABLE `companies`
  ADD PRIMARY KEY (`id`);

-- Indexes for table `financial_metrics`
ALTER TABLE `financial_metrics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `company_id` (`company_id`);

-- Indexes for table `ml_analysis`
ALTER TABLE `ml_analysis`
  ADD PRIMARY KEY (`id`),
  ADD KEY `company_id` (`company_id`);

-- AUTO_INCREMENT for tables
ALTER TABLE `financial_metrics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `ml_analysis`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- Foreign key constraints
ALTER TABLE `financial_metrics`
  ADD CONSTRAINT `fk_financial_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

ALTER TABLE `ml_analysis`
  ADD CONSTRAINT `fk_ml_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

COMMIT;
