CREATE TABLE IF NOT EXISTS whiteboard_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  whiteboard_id INT NOT NULL,
  user_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  data LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_wb_snapshot_wbid ON whiteboard_snapshots (whiteboard_id);
CREATE INDEX idx_wb_snapshot_uid ON whiteboard_snapshots (user_id);
CREATE INDEX idx_wb_snapshot_wbuid ON whiteboard_snapshots (whiteboard_id, user_id);