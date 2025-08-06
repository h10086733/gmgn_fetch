require('dotenv').config();
const mysql = require('mysql2/promise');

// 数据库配置，优先读取环境变量
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gmgn_data',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  charset: 'utf8mb4'
};

class Database {
  constructor() {
    this.connection = null;
  }

  // 连接数据库
  async connect() {
    try {
      this.connection = await mysql.createConnection(dbConfig);
      console.log('✅ MySQL 数据库连接成功');
      
      // 创建数据库表（如果不存在）
      await this.createTables();
      
      return this.connection;
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      throw error;
    }
  }

  // 创建数据表
  async createTables() {
    try {
      // 创建聪明钱表（使用你的实际表结构）
      const createSmartMoneyTable = `
        CREATE TABLE IF NOT EXISTS chain_smart_money (
          id BIGINT(20) NOT NULL AUTO_INCREMENT,
          wallet_address VARCHAR(64) NOT NULL COMMENT '聪明钱地址',
          sync_date VARCHAR(20) DEFAULT NULL COMMENT '同步时间20220101',
          source VARCHAR(255) DEFAULT NULL COMMENT '来源',
          smart_tag VARCHAR(255) DEFAULT NULL COMMENT '标签',
          twitter_name VARCHAR(255) DEFAULT NULL COMMENT 'twitter名字',
          followers_count INT(11) DEFAULT NULL COMMENT '粉丝数',
          active_days INT(11) DEFAULT NULL,
          swap_count INT(11) DEFAULT NULL,
          total_bnb_volume DOUBLE DEFAULT NULL,
          smart_money_score DOUBLE DEFAULT NULL,
          avg_bnb_per_swap DOUBLE DEFAULT NULL,
          efficiency_ratio DOUBLE DEFAULT NULL,
          estimated_roi_percentage DOUBLE DEFAULT NULL,
          is_deleted TINYINT(4) NOT NULL DEFAULT '0' COMMENT '是否删除0正常1删除',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          PRIMARY KEY (id),
          UNIQUE KEY idx_wallet_address (wallet_address, smart_tag)
        ) ENGINE=InnoDB AUTO_INCREMENT=3004 DEFAULT CHARSET=utf8mb4 COMMENT='聪明钱';
      `;

      await this.connection.execute(createSmartMoneyTable);
      console.log('✅ chain_smart_money 表创建/检查完成');

    } catch (error) {
      console.error('❌ 创建数据表失败:', error.message);
      throw error;
    }
  }

  // 批量插入聪明钱数据
  async insertSmartMoneyData(wallets) {
    if (!Array.isArray(wallets) || wallets.length === 0) {
      console.log('⚠️ 没有数据需要插入');
      return 0;
    }

    try {
      // 获取当前日期作为同步日期
      const syncDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      
      const insertSQL = `
        INSERT INTO chain_smart_money (
          wallet_address, sync_date, source, smart_tag, twitter_name,
          followers_count, active_days, swap_count, total_bnb_volume,
          smart_money_score, avg_bnb_per_swap, efficiency_ratio,
          estimated_roi_percentage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          sync_date = VALUES(sync_date),
          twitter_name = VALUES(twitter_name),
          followers_count = VALUES(followers_count),
          active_days = VALUES(active_days),
          swap_count = VALUES(swap_count),
          total_bnb_volume = VALUES(total_bnb_volume),
          smart_money_score = VALUES(smart_money_score),
          avg_bnb_per_swap = VALUES(avg_bnb_per_swap),
          efficiency_ratio = VALUES(efficiency_ratio),
          estimated_roi_percentage = VALUES(estimated_roi_percentage),
          updated_at = CURRENT_TIMESTAMP
      `;

      let insertedCount = 0;
      
      for (const wallet of wallets) {
        const values = [
          wallet.address || wallet.wallet_address || '',
          syncDate,
          'gmgn.ai',
          (wallet.tags && Array.isArray(wallet.tags) && wallet.tags.length > 0) ? wallet.tags[0] : (wallet.tag || 'renowned'),
          wallet.twitter_name || wallet.username || null,
          parseInt(wallet.followers_count) || null,
          parseInt(wallet.active_days) || null,
          parseInt(wallet.swap_count) || parseInt(wallet.total_trades) || 0,
          parseFloat(wallet.total_bnb_volume) || parseFloat(wallet.total_volume) || 0,
          parseFloat(wallet.smart_money_score) || null,
          parseFloat(wallet.avg_bnb_per_swap) || null,
          parseFloat(wallet.efficiency_ratio) || parseFloat(wallet.winrate) || 0,
          parseFloat(wallet.estimated_roi_percentage) || parseFloat(wallet.pnl_1d) || 0
        ];

        try {
          await this.connection.execute(insertSQL, values);
          insertedCount++;
        } catch (error) {
          console.error(`❌ 插入钱包 ${wallet.address || wallet.wallet_address} 失败:`, error.message);
        }
      }

      console.log(`✅ 成功处理 ${insertedCount}/${wallets.length} 条聪明钱数据`);
      return insertedCount;

    } catch (error) {
      console.error('❌ 批量插入数据失败:', error.message);
      throw error;
    }
  }

  // 查询最新数据
  async getLatestData(limit = 10) {
    try {
      const [rows] = await this.connection.execute(
        'SELECT * FROM chain_smart_money ORDER BY updated_at DESC LIMIT ?',
        [limit]
      );
      return rows;
    } catch (error) {
      console.error('❌ 查询数据失败:', error.message);
      throw error;
    }
  }

  // 获取统计信息
  async getStats() {
    try {
      const [countResult] = await this.connection.execute(
        'SELECT COUNT(*) as total_wallets FROM chain_smart_money WHERE is_deleted = 0'
      );
      
      const [avgResult] = await this.connection.execute(
        'SELECT AVG(smart_money_score) as avg_smart_score, AVG(efficiency_ratio) as avg_efficiency FROM chain_smart_money WHERE is_deleted = 0'
      );

      return {
        total_wallets: countResult[0].total_wallets,
        avg_smart_score: parseFloat(avgResult[0].avg_smart_score) || 0,
        avg_efficiency: parseFloat(avgResult[0].avg_efficiency) || 0
      };
    } catch (error) {
      console.error('❌ 获取统计信息失败:', error.message);
      throw error;
    }
  }

  // 关闭连接
  async close() {
    if (this.connection) {
      await this.connection.end();
      console.log('📚 数据库连接已关闭');
    }
  }
}

module.exports = Database;
