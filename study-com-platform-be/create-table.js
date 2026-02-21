require('dotenv/config');
const mysql = require('mysql2');

const conn = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

conn.connect((err) => {
  if (err) {
    console.error('连接失败:', err);
    return;
  }
  
  console.log('数据库连接成功');
  
  const sql = `
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
    )
  `;
  
  conn.query(sql, (err, results) => {
    if (err) {
      console.error('创建表失败:', err);
      conn.end();
      return;
    }
    
    console.log('白板快照表创建成功');
    
    // 创建索引
    const indexes = [
      'CREATE INDEX idx_wb_snapshot_wbid ON whiteboard_snapshots (whiteboard_id)',
      'CREATE INDEX idx_wb_snapshot_uid ON whiteboard_snapshots (user_id)',
      'CREATE INDEX idx_wb_snapshot_wbuid ON whiteboard_snapshots (whiteboard_id, user_id)'
    ];
    
    let indexCount = 0;
    indexes.forEach(indexSql => {
      conn.query(indexSql, (indexErr) => {
        if (indexErr) {
          console.log('索引创建警告:', indexErr.message);
        } else {
          console.log('索引创建成功');
        }
        indexCount++;
        if (indexCount === indexes.length) {
          console.log('所有操作完成');
          conn.end();
        }
      });
    });
  });
});