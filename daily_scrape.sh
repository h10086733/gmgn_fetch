#!/bin/bash

# GMGN 数据爬虫定时任务脚本
# 用法: ./daily_scrape.sh

# 设置项目路径
PROJECT_DIR="/data/duoduo/gmgn_fetch"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/scrape_$(date +%Y%m%d).log"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 记录开始时间
echo "$(date '+%Y-%m-%d %H:%M:%S') - 开始执行GMGN数据爬虫" >> "$LOG_FILE"

# 切换到项目目录
cd "$PROJECT_DIR"

# 执行爬虫脚本
timeout 1800 node simple_scrape.js >> "$LOG_FILE" 2>&1

# 检查执行结果
if [ $? -eq 0 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 爬虫执行成功" >> "$LOG_FILE"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 爬虫执行失败" >> "$LOG_FILE"
fi

# 清理7天前的日志
find "$LOG_DIR" -name "scrape_*.log" -mtime +7 -delete

echo "$(date '+%Y-%m-%d %H:%M:%S') - 任务执行完成" >> "$LOG_FILE"
