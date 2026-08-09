/**
 * 本地存储 (wx.getStorageSync / wx.setStorageSync) 封装模块
 */

const { DEFAULT_PRICING } = require('./calculator.js');

const KEYS = {
  CONFIG: 'RENT_APP_CONFIG',
  HISTORY: 'RENT_APP_HISTORY',
  LAST_READINGS: 'RENT_APP_LAST_READINGS'
};

// 默认基础配置
const DEFAULT_CONFIG = {
  houses: {
    '1602': { baseRent: 7000, propertyFee: 150 },
    '1702': { baseRent: 6800, propertyFee: 150 }
  },
  pricing: DEFAULT_PRICING
};

/**
 * 获取系统配置
 */
function getConfig() {
  try {
    const config = wx.getStorageSync(KEYS.CONFIG);
    if (config) {
      return config;
    }
  } catch (e) {
    console.error('Failed to get config from storage', e);
  }
  return DEFAULT_CONFIG;
}

/**
 * 保存系统配置
 */
function saveConfig(config) {
  try {
    wx.setStorageSync(KEYS.CONFIG, config);
    return true;
  } catch (e) {
    console.error('Failed to save config', e);
    return false;
  }
}

/**
 * 获取所有历史账单（以月份降序排列）
 */
function getHistory() {
  try {
    const list = wx.getStorageSync(KEYS.HISTORY) || [];
    return list.sort((a, b) => (a.month > b.month ? -1 : 1));
  } catch (e) {
    console.error('Failed to get history', e);
    return [];
  }
}

/**
 * 获取特定月份的账单
 */
function getBillByMonth(month) {
  const history = getHistory();
  return history.find(item => item.month === month) || null;
}

/**
 * 保存/更新某月账单
 */
function saveBill(bill) {
  try {
    const history = getHistory();
    const index = history.findIndex(item => item.month === bill.month);
    const record = {
      month: bill.month,
      billData: bill,
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      history[index] = record;
    } else {
      history.push(record);
    }

    wx.setStorageSync(KEYS.HISTORY, history);

    // 更新最近一次读数
    if (bill.rawReadings) {
      wx.setStorageSync(KEYS.LAST_READINGS, {
        month: bill.month,
        readings: bill.rawReadings
      });
    }

    return true;
  } catch (e) {
    console.error('Failed to save bill', e);
    return false;
  }
}

/**
 * 删除某月账单
 */
function deleteBill(month) {
  try {
    let history = getHistory();
    history = history.filter(item => item.month !== month);
    wx.setStorageSync(KEYS.HISTORY, history);
    return true;
  } catch (e) {
    console.error('Failed to delete bill', e);
    return false;
  }
}

/**
 * 获取最新一次已录入的读数（用于下月自动推算/填入“上月读数”）
 */
function getLastReadings() {
  try {
    return wx.getStorageSync(KEYS.LAST_READINGS) || null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  getConfig,
  saveConfig,
  getHistory,
  getBillByMonth,
  saveBill,
  deleteBill,
  getLastReadings,
  DEFAULT_CONFIG
};
