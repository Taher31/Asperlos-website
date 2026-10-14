-- Inquiries from the website form (public/api/inquiry.php).
-- Run once in cPanel > phpMyAdmin on the database created for the site.

CREATE TABLE IF NOT EXISTS inquiries (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lang        CHAR(2) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  company     VARCHAR(150) NULL,
  phone       VARCHAR(40) NOT NULL,
  product     VARCHAR(64) NOT NULL,
  quantity    VARCHAR(20) NULL,
  message     TEXT NULL,
  ip_hash     CHAR(64) NOT NULL,
  user_agent  VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_ip_time (ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
