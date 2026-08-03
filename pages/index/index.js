// pages/index/index.js
const { getConfig, getBillByMonth, saveBill, getLastReadings } = require('../../utils/storage');
const { calculateMonthlyBill, isSummerMonth } = require('../../utils/calculator');
const { getCurrentMonthStr } = require('../../utils/formatter');

Page({
  data: {
    selectedMonth: '',
    isSummer: false,
    config: null,
    // 读数与总用量表单
    readings: {
      prevTotalWater: '', // 总水表上月读数
      currTotalWater: '', // 总水表本月读数
      totalElecUsage: '', // 1602与1702当月总用电量 (度) (直接填例如1000度)

      prev1702Water: '',
      curr1702Water: '',
      prev1702Elec: '',
      curr1702Elec: '',

      prev1602Gas: '',
      curr1602Gas: '',
      prev1702Gas: '',
      curr1702Gas: ''
    },
    // 算出的中间用量
    calculatedUsage: {
      totalWater: 0,
      totalElec: 0,
      w1702: 0,
      e1702: 0,
      w1602: 0,
      e1602: 0,
      g1602: 0,
      g1702: 0
    },
    // 警告提示
    warningMessage: '',
    // 试算结果
    previewBill: null
  },

  onLoad: function () {
    const currentMonth = getCurrentMonthStr();
    this.setData({
      selectedMonth: currentMonth,
      isSummer: isSummerMonth(currentMonth)
    });
  },

  onShow: function () {
    const config = getConfig();
    this.setData({ config });
    this.loadMonthData(this.data.selectedMonth);
  },

  // 切换月份
  onMonthChange: function (e) {
    const month = e.detail.value;
    this.setData({
      selectedMonth: month,
      isSummer: isSummerMonth(month)
    });
    this.loadMonthData(month);
  },

  // 加载指定月份的数据
  loadMonthData: function (month) {
    const existingBill = getBillByMonth(month);

    if (existingBill) {
      // 存在当月已保存记录，直接回显
      const raw = existingBill.rawReadings;
      const readings = {};
      Object.keys(raw).forEach(key => {
        readings[key] = raw[key] !== undefined && raw[key] !== null ? raw[key].toString() : '';
      });
      this.setData({ readings }, () => this.recalculate());
      wx.showToast({ title: '已载入当月已有记录', icon: 'none' });
    } else {
      // 不存在，尝试自动填充上月读数
      const last = getLastReadings();
      if (last && last.readings) {
        const prev = last.readings;
        this.setData({
          readings: {
            prevTotalWater: (prev.currTotalWater || '').toString(),
            currTotalWater: '',
            totalElecUsage: '',

            prev1702Water: (prev.curr1702Water || '').toString(),
            curr1702Water: '',
            prev1702Elec: (prev.curr1702Elec || '').toString(),
            curr1702Elec: '',

            prev1602Gas: (prev.curr1602Gas || '').toString(),
            curr1602Gas: '',
            prev1702Gas: (prev.curr1702Gas || '').toString(),
            curr1702Gas: ''
          }
        }, () => this.recalculate());
      } else {
        this.recalculate();
      }
    }
  },

  // 处理输入框修改
  onInputReading: function (e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    this.setData({
      [`readings.${field}`]: value
    }, () => {
      this.recalculate();
    });
  },

  // 核心重新计算
  recalculate: function () {
    const r = this.data.readings;
    const num = (val) => parseFloat(val) || 0;

    const prevTotalWater = num(r.prevTotalWater);
    const currTotalWater = num(r.currTotalWater);
    const totalElecUsage = num(r.totalElecUsage);

    const prev1702Water = num(r.prev1702Water);
    const curr1702Water = num(r.curr1702Water);
    const prev1702Elec = num(r.prev1702Elec);
    const curr1702Elec = num(r.curr1702Elec);

    const prev1602Gas = num(r.prev1602Gas);
    const curr1602Gas = num(r.curr1602Gas);
    const prev1702Gas = num(r.prev1702Gas);
    const curr1702Gas = num(r.curr1702Gas);

    // 总水用量 = 本月水表 - 上月水表
    const totalWaterUsage = Math.max(0, currTotalWater - prevTotalWater);

    // 1702 用量
    const w1702 = Math.max(0, curr1702Water - prev1702Water);
    const e1702 = Math.max(0, curr1702Elec - prev1702Elec);

    // 1602 用量 = 总用量 - 1702用量
    const w1602 = Math.max(0, totalWaterUsage - w1702);
    const e1602 = Math.max(0, totalElecUsage - e1702);

    const g1602 = Math.max(0, curr1602Gas - prev1602Gas);
    const g1702 = Math.max(0, curr1702Gas - prev1702Gas);

    // 校验警示
    let warning = '';
    if (currTotalWater > 0 && curr1702Water > 0 && w1702 > totalWaterUsage) {
      warning = '⚠️ 警告：1702用水量大于算出的总水表用量，请检查水表读数！';
    } else if (totalElecUsage > 0 && curr1702Elec > 0 && e1702 > totalElecUsage) {
      warning = '⚠️ 警告：1702用电量大于输入的当月总用电量(例如1000度)，请核对！';
    }

    const inputData = {
      month: this.data.selectedMonth,
      prevTotalWater,
      currTotalWater,
      totalElecUsage,
      prev1702Water, curr1702Water,
      prev1702Elec, curr1702Elec,
      prev1602Gas, curr1602Gas,
      prev1702Gas, curr1702Gas
    };

    const bill = calculateMonthlyBill(inputData, this.data.config);

    this.setData({
      calculatedUsage: {
        totalWater: Number(totalWaterUsage.toFixed(2)),
        totalElec: Number(totalElecUsage.toFixed(2)),
        w1702: Number(w1702.toFixed(2)),
        e1702: Number(e1702.toFixed(2)),
        w1602: Number(w1602.toFixed(2)),
        e1602: Number(e1602.toFixed(2)),
        g1602: Number(g1602.toFixed(2)),
        g1702: Number(g1702.toFixed(2))
      },
      warningMessage: warning,
      previewBill: bill
    });
  },

  // 保存并查看当月账单
  onSaveAndDetail: function () {
    if (this.data.warningMessage) {
      wx.showModal({
        title: '读数异常提醒',
        content: this.data.warningMessage + '\n仍要继续保存吗？',
        success: (res) => {
          if (res.confirm) {
            this.doSave();
          }
        }
      });
    } else {
      this.doSave();
    }
  },

  doSave: function () {
    const bill = this.data.previewBill;
    if (!bill) return;

    const success = saveBill(bill);
    if (success) {
      wx.showToast({ title: '保存账单成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/bill-detail/bill-detail?month=${bill.month}`
        });
      }, 500);
    } else {
      wx.showToast({ title: '保存失败', icon: 'error' });
    }
  }
});
