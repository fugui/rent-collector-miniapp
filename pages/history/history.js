// pages/history/history.js
const { getHistory } = require('../../utils/storage');
const { exportHistoryToCSV } = require('../../utils/formatter');

Page({
  data: {
    historyList: [],
    stats: {
      totalRevenue: '0.00',
      totalWater: '0.00',
      totalElec: '0.00',
      monthCount: 0
    }
  },

  onShow: function () {
    this.loadHistory();
  },

  loadHistory: function () {
    const list = getHistory();

    let rev = 0;
    let w = 0;
    let e = 0;

    list.forEach(item => {
      if (item.billData) {
        const b = item.billData;
        rev += (b.house1602?.totalAmount || 0) + (b.house1702?.totalAmount || 0);
        w += (b.summary?.totalWaterUsage || 0);
        e += (b.summary?.totalElecUsage || 0);
      }
    });

    this.setData({
      historyList: list,
      stats: {
        totalRevenue: rev.toFixed(2),
        totalWater: w.toFixed(2),
        totalElec: e.toFixed(2),
        monthCount: list.length
      }
    });
  },

  // 跳转账单详情
  onViewDetail: function (e) {
    const month = e.currentTarget.dataset.month;
    wx.navigateTo({
      url: `/pages/bill-detail/bill-detail?month=${month}`
    });
  },

  // 一键导出 CSV
  onExportCSV: function () {
    if (this.data.historyList.length === 0) {
      wx.showToast({ title: '暂无历史账单可导出', icon: 'none' });
      return;
    }

    const csvText = exportHistoryToCSV(this.data.historyList);
    wx.setClipboardData({
      data: csvText,
      success: () => {
        wx.showModal({
          title: '导出成功',
          content: `已成功生成 CSV 表格文本并复制到剪贴板！\n您可以直接粘贴到微信发送给电脑端，保存为 .csv 文件用 Excel 打开。`,
          showCancel: false
        });
      }
    });
  }
});
