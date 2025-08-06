const puppeteer = require('puppeteer');
const Database = require('./database.js');

(async () => {
  // 初始化数据库
  const db = new Database();
  let dbConnected = false;
  
  try {
    await db.connect();
    dbConnected = true;
  } catch (error) {
    console.error('⚠️ 数据库连接失败，将只保存到JSON文件:', error.message);
  }
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // 设置真实的用户代理
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  let targetData = null;
  
  // 监听所有网络响应
  page.on('response', async (response) => {
    const url = response.url();
    
    if (url.includes('/defi/quotation/v1/rank/bsc/wallets/7d')) {
      console.log(`🎯 发现目标接口: ${url}`);
      console.log(`状态码: ${response.status()}`);
      
      try {
        if (response.status() === 200) {
          const data = await response.json();
          console.log('✅ 成功获取数据!');
          targetData = data;
          
          // 保存数据到文件
          const fs = require('fs');
          fs.writeFileSync('./gmgn_data.json', JSON.stringify(data, null, 2));
          console.log('📁 数据已保存到 gmgn_data.json');
          
          // 保存到数据库
          if (dbConnected && data.data && Array.isArray(data.data.rank)) {
            console.log('💾 正在保存到数据库...');
            try {
              const insertedCount = await db.insertSmartMoneyData(data.data.rank);
              console.log(`✅ 成功插入 ${insertedCount} 条记录到数据库`);
              
              // 显示数据库统计
              const stats = await db.getStats();
              console.log('📈 数据库统计:', stats);
              
            } catch (dbError) {
              console.error('❌ 数据库保存失败:', dbError.message);
            }
          }
          
          // 显示摘要
          if (data.data && Array.isArray(data.data)) {
            console.log(`📊 获取到 ${data.data.length} 条钱包数据`);
            console.log('前5个钱包:', data.data.slice(0, 5).map(w => ({
              address: w.address?.substring(0, 10) + '...',
              pnl_1d: w.pnl_1d,
              winrate: w.winrate
            })));
          }
        } else {
          console.log(`❌ 接口返回错误状态: ${response.status()}`);
        }
      } catch (error) {
        console.log('解析响应失败:', error.message);
      }
    }
  });
  
  try {
    console.log('🌐 正在访问 GMGN 主页...');
    await page.goto('https://gmgn.ai/discover/vDlyNEME?chain=bsc&tab=renowned', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    // 等待页面完全加载
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('✅ 主页加载完成');
  } catch (error) {
    console.error('发生错误:', error);
  } finally {
    // 关闭数据库连接
    if (dbConnected) {
      await db.close();
    }
    
    if (targetData) {
      console.log('🎉 任务完成，浏览器即将关闭');
      await browser.close();
    } else {
      console.log('保持浏览器打开以便调试...');
    }
  }
})().catch(console.error);
