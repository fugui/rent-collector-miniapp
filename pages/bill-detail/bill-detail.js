// pages/bill-detail/bill-detail.js
const { getBillByMonth, deleteBill } = require('../../utils/storage');
const { generateTenantText } = require('../../utils/formatter');

Page({
  data: {
    month: '',
    bill: null,
    activeTab: '1602', // '1602' | '1702'
    text1602: '',
    text1702: '',
    isGeneratingImage: false
  },

  onLoad: function (options) {
    const month = options.month;
    if (month) {
      this.setData({ month });
      this.loadBill(month);
    }
  },

  loadBill: function (month) {
    const record = getBillByMonth(month);
    if (record && record.billData) {
      const bill = record.billData;
      const text1602 = generateTenantText(bill.house1602, month, bill.rawReadings);
      const text1702 = generateTenantText(bill.house1702, month, bill.rawReadings);

      this.setData({
        bill,
        text1602,
        text1702
      });
    } else {
      wx.showToast({ title: '未找到账单记录', icon: 'error' });
    }
  },

  // 切换房间 Tab
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 复制文本给租客
  copyTenantText: function () {
    const room = this.data.activeTab;
    const text = room === '1602' ? this.data.text1602 : this.data.text1702;

    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: `已复制 ${room} 账单文本，可粘贴发送给微信租客`,
          icon: 'none',
          duration: 2500
        });
      }
    });
  },

  // 删除账单
  onDeleteBill: function () {
    wx.showModal({
      title: '提示',
      content: `确定要删除 ${this.data.month} 月份的账单记录吗？`,
      success: (res) => {
        if (res.confirm) {
          deleteBill(this.data.month);
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack();
          }, 800);
        }
      }
    });
  },

  // 使用 Canvas 绘制并导出海报卡片图片
  generateImagePoster: function () {
    const room = this.data.activeTab;
    const bill = this.data.bill;
    if (!bill) return;

    const houseData = room === '1602' ? bill.house1602 : bill.house1702;
    this.setData({ isGeneratingImage: true });

    const ctx = wx.createCanvasContext('posterCanvas', this);
    const width = 360;
    const height = 540;

    // 背景色及阴影边框
    ctx.setFillStyle('#f8fafc');
    ctx.fillRect(0, 0, width, height);

    // 头部 Banner 渐变色
    const grd = ctx.createLinearGradient(0, 0, width, 100);
    grd.addColorStop(0, '#3730a3');
    grd.addColorStop(1, '#4f46e5');
    ctx.setFillStyle(grd);
    ctx.fillRect(0, 0, width, 100);

    // 头部文字
    ctx.setFillStyle('#ffffff');
    ctx.setFontSize(20);
    ctx.fillText(`🏠 ${houseData.roomName} 房费用清单`, 20, 45);
    ctx.setFontSize(14);
    ctx.fillText(`计费月份：${this.data.month}`, 20, 75);

    // 卡片白框主体
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(15, 110, width - 30, height - 130);

    let y = 140;
    ctx.setFillStyle('#1e293b');
    ctx.setFontSize(14);

    // 房租与物业
    ctx.fillText(`基础房租：¥${houseData.baseRent.toFixed(2)}`, 30, y);
    y += 24;
    ctx.fillText(`物业管理费：¥${houseData.propertyFee.toFixed(2)}`, 30, y);
    y += 30;

    // 分割线
    ctx.setStrokeStyle('#e2e8f0');
    ctx.setLineWidth(1);
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(width - 30, y);
    ctx.stroke();
    y += 24;

    // 水费
    ctx.setFillStyle('#0284c7');
    ctx.setFontSize(14);
    ctx.fillText(`💧 水费小计：¥${houseData.water.totalCost.toFixed(2)} (用量: ${houseData.water.usage}m³)`, 30, y);
    y += 20;
    ctx.setFillStyle('#64748b');
    ctx.setFontSize(12);
    houseData.water.breakdown.forEach(b => {
      ctx.fillText(`  - ${b.name}: ${b.used}m³ × ¥${b.price}`, 30, y);
      y += 18;
    });
    y += 10;

    // 电费
    ctx.setFillStyle('#d97706');
    ctx.setFontSize(14);
    ctx.fillText(`⚡ 电费小计：¥${houseData.elec.totalCost.toFixed(2)} (用量: ${houseData.elec.usage}度)`, 30, y);
    y += 20;
    ctx.setFillStyle('#64748b');
    ctx.setFontSize(12);
    houseData.elec.breakdown.forEach(b => {
      ctx.fillText(`  - ${b.name}: ${b.used}度 × ¥${b.price}`, 30, y);
      y += 18;
    });
    y += 10;

    // 煤气费
    ctx.setFillStyle('#ea580c');
    ctx.setFontSize(14);
    ctx.fillText(`🔥 煤气费小计：¥${houseData.gas.totalCost.toFixed(2)} (用量: ${houseData.gas.usage}m³)`, 30, y);
    y += 20;
    ctx.setFillStyle('#64748b');
    ctx.setFontSize(12);
    houseData.gas.breakdown.forEach(b => {
      ctx.fillText(`  - ${b.name}: ${b.used}m³ × ¥${b.price}`, 30, y);
      y += 18;
    });
    y += 16;

    // 分割线
    ctx.setStrokeStyle('#e2e8f0');
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(width - 30, y);
    ctx.stroke();
    y += 30;

    // 合计大字
    ctx.setFillStyle('#4f46e5');
    ctx.setFontSize(18);
    ctx.fillText(`👉 应缴总计：¥ ${houseData.totalAmount.toFixed(2)}`, 30, y);

    ctx.draw(false, () => {
      setTimeout(() => {
        wx.canvasToTempFilePath({
          canvasId: 'posterCanvas',
          success: (res) => {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                wx.showToast({ title: '已保存账单图片到相册', icon: 'success' });
              },
              fail: () => {
                wx.showToast({ title: '保存失败或授权被拒绝', icon: 'none' });
              },
              complete: () => {
                this.setData({ isGeneratingImage: false });
              }
            });
          },
          fail: () => {
            this.setData({ isGeneratingImage: false });
            wx.showToast({ title: '生成图片失败', icon: 'none' });
          }
        }, this);
      }, 300);
    });
  }
});
