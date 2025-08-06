#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

class Scheduler {
  constructor() {
    this.isRunning = false;
  }

  // 执行爬虫脚本
  async runScraper() {
    if (this.isRunning) {
      console.log('⚠️ 脚本正在运行中，跳过本次执行');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    console.log(`🚀 开始执行爬虫任务 - ${startTime.toLocaleString()}`);

    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, 'simple_scrape.js');
      const child = spawn('node', [scriptPath], {
        stdio: 'inherit',
        cwd: __dirname
      });

      child.on('close', (code) => {
        this.isRunning = false;
        const endTime = new Date();
        const duration = Math.round((endTime - startTime) / 1000);
        
        if (code === 0) {
          console.log(`✅ 爬虫任务完成 - 耗时 ${duration}秒`);
          resolve();
        } else {
          console.log(`❌ 爬虫任务失败 - 退出码: ${code}`);
          reject(new Error(`脚本执行失败，退出码: ${code}`));
        }
      });

      child.on('error', (error) => {
        this.isRunning = false;
        console.error('❌ 执行脚本时发生错误:', error.message);
        reject(error);
      });
    });
  }

  // 计算距离下次执行的时间
  getTimeUntilNextRun(targetHour = 9, targetMinute = 0) {
    const now = new Date();
    const nextRun = new Date();
    
    nextRun.setHours(targetHour, targetMinute, 0, 0);
    
    // 如果今天的时间已过，则设置为明天
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun.getTime() - now.getTime();
  }

  // 启动定时器
  start(hour = 9, minute = 0) {
    console.log(`📅 定时爬虫启动 - 每天 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} 执行`);
    
    const scheduleNext = () => {
      const delay = this.getTimeUntilNextRun(hour, minute);
      const nextRunTime = new Date(Date.now() + delay);
      
      console.log(`⏰ 下次执行时间: ${nextRunTime.toLocaleString()}`);
      console.log(`⏳ 距离下次执行还有: ${Math.round(delay / 1000 / 60)} 分钟`);
      
      setTimeout(async () => {
        try {
          await this.runScraper();
        } catch (error) {
          console.error('❌ 定时任务执行失败:', error.message);
        }
        
        // 安排下次执行
        scheduleNext();
      }, delay);
    };
    
    // 启动第一次调度
    scheduleNext();
    
    // 可选：立即执行一次
    if (process.argv.includes('--run-now')) {
      console.log('🏃 立即执行一次...');
      this.runScraper().catch(console.error);
    }
  }

  // 停止定时器
  stop() {
    console.log('🛑 定时爬虫已停止');
    process.exit(0);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const scheduler = new Scheduler();
  
  // 监听退出信号
  process.on('SIGINT', () => {
    console.log('\n收到退出信号...');
    scheduler.stop();
  });
  
  process.on('SIGTERM', () => {
    console.log('\n收到终止信号...');
    scheduler.stop();
  });
  
  // 从命令行参数获取时间，默认每天上午9点
  const hour = parseInt(process.argv[2]) || 9;
  const minute = parseInt(process.argv[3]) || 0;
  
  scheduler.start(hour, minute);
}

module.exports = Scheduler;
