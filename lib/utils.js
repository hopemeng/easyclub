/**
 * 通用工具库
 */

const createError = require('http-errors');

function resError(status, message) {
    if (typeof status === 'object') {
        status = status.status || 500;
        message = status.message || '服务器错误';
    } 
    
    let errs = createError(status,message);
    throw(errs);
}

function formatTime(time) {
  if (!time instanceof Date) {
    time = new Date(time);
  }
  let interval = Math.floor((Date.now() - time) / 1000);
  let temp = 0;
  if(interval < 60) {
    return interval +' 秒前';
  }
  if((temp = interval / 60 ) < 60){
    return Math.floor(temp) + ' 分钟前';
  }
  if((temp = temp / 60 ) < 24){
    return Math.floor(temp) + ' 小时前';
  }
  if((temp = temp / 24 ) < 30){
    return Math.floor(temp) + ' 天前';
  }
  if((temp = temp / 30 ) < 12){
    return Math.floor(temp) + ' 月前';
  }
  return Math.floor(temp / 12) + ' 年前';
}

module.exports = {
    resError,
    formatTime,
}