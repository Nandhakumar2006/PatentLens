CREATE DATABASE IF NOT EXISTS patentlens
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE patentlens;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patent_id VARCHAR(64) NOT NULL UNIQUE,
  publication_number VARCHAR(64),
  title VARCHAR(1000),
  abstract TEXT,
  claims_text LONGTEXT,
  description LONGTEXT,
  publication_date DATE,
  ipc_cpc_codes VARCHAR(500),
  inventor VARCHAR(500),
  applicant VARCHAR(500),
  country VARCHAR(16),
  source_url VARCHAR(1000),
  is_synthetic TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_patents_pub (publication_number),
  INDEX idx_patents_date (publication_date),
  INDEX idx_patents_country (country),
  INDEX idx_patents_ipc (ipc_cpc_codes)
);

CREATE TABLE IF NOT EXISTS claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patent_id INT NOT NULL,
  claim_number INT NOT NULL,
  claim_text TEXT NOT NULL,
  CONSTRAINT fk_claims_patent FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
  CONSTRAINT uq_patent_claim_number UNIQUE (patent_id, claim_number)
);

CREATE TABLE IF NOT EXISTS patent_chunks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patent_id INT NOT NULL,
  chunk_index INT NOT NULL,
  chunk_type VARCHAR(32) NOT NULL,
  text TEXT NOT NULL,
  vector_id INT,
  CONSTRAINT fk_chunks_patent FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
  CONSTRAINT uq_patent_chunk_index UNIQUE (patent_id, chunk_index),
  INDEX idx_chunks_vector (vector_id)
);

CREATE TABLE IF NOT EXISTS searches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(1000),
  description TEXT NOT NULL,
  technical_features TEXT,
  model_name VARCHAR(255) NOT NULL,
  filters_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_searches_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS search_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  search_id INT NOT NULL,
  patent_id INT NOT NULL,
  similarity_score FLOAT NOT NULL,
  `rank` INT NOT NULL,
  excerpts_json TEXT,
  CONSTRAINT fk_results_search FOREIGN KEY (search_id) REFERENCES searches(id) ON DELETE CASCADE,
  CONSTRAINT fk_results_patent FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
  CONSTRAINT uq_search_patent UNIQUE (search_id, patent_id)
);

CREATE TABLE IF NOT EXISTS saved_patents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  patent_id INT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_saved_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_patent FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_saved_patent UNIQUE (user_id, patent_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  search_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  filepath VARCHAR(1000) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_search FOREIGN KEY (search_id) REFERENCES searches(id) ON DELETE CASCADE
);
