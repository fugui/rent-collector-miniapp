// pages/settings/settings.js
const { getConfig, saveConfig, DEFAULT_CONFIG } = require('../../utils/storage');

Page({
  data: {
    // 房屋配置
    rent1602: '7000',
    propFee1602: '150',
    rent1702: '6800',
    propFee1702: '150',

    // 水费单价
    waterP1: '3.47',
    waterP2: '4.83',
    waterP3: '8.91',

    // 夏季电费单价
    elecSumP1: '0.5986',
    elecSumP2: '0.6486',
    elecSumP3: '0.8986',

    // 非夏季电费单价
    elecNonSumP1: '0.5986',
    elecNonSumP2: '0.6486',
    elecNonSumP3: '0.8986',

    // 煤气单价
    gasP1: '3.50',
    gasP2: '4.025',
    gasP3: '5.25'
  },

  onShow: function () {
    const config = getConfig();
    this.populateConfig(config);
  },

  populateConfig: function (config) {
    const h16 = config.houses['1602'] || {};
    const h17 = config.houses['1702'] || {};
    const wp = config.pricing.water.tiers;
    const epSum = config.pricing.electricity.summerTiers;
    const epNonSum = config.pricing.electricity.nonSummerTiers;
    const gp = config.pricing.gas.tiers;

    this.setData({
      rent1602: h16.baseRent.toString(),
      propFee1602: h16.propertyFee.toString(),
      rent1702: h17.baseRent.toString(),
      propFee1702: h17.propertyFee.toString(),

      waterP1: wp[0].price.toString(),
      waterP2: wp[1].price.toString(),
      waterP3: wp[2].price.toString(),

      elecSumP1: epSum[0].price.toString(),
      elecSumP2: epSum[1].price.toString(),
      elecSumP3: epSum[2].price.toString(),

      elecNonSumP1: epNonSum[0].price.toString(),
      elecNonSumP2: epNonSum[1].price.toString(),
      elecNonSumP3: epNonSum[2].price.toString(),

      gasP1: gp[0].price.toString(),
      gasP2: gp[1].price.toString(),
      gasP3: gp[2].price.toString()
    });
  },

  onInputChange: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [field]: e.detail.value
    });
  },

  saveCurrentConfig: function () {
    const num = (v) => parseFloat(v) || 0;

    const newConfig = {
      houses: {
        '1602': { baseRent: num(this.data.rent1602), propertyFee: num(this.data.propFee1602) },
        '1702': { baseRent: num(this.data.rent1702), propertyFee: num(this.data.propFee1702) }
      },
      pricing: {
        water: {
          tiers: [
            { max: 22, price: num(this.data.waterP1), name: '一档(0-22m³)' },
            { max: 30, price: num(this.data.waterP2), name: '二档(22-30m³)' },
            { max: Infinity, price: num(this.data.waterP3), name: '三档(30m³以上)' }
          ]
        },
        electricity: {
          summerTiers: [
            { max: 260, price: num(this.data.elecSumP1), name: '一档(0-260度)' },
            { max: 600, price: num(this.data.elecSumP2), name: '二档(260-600度)' },
            { max: Infinity, price: num(this.data.elecSumP3), name: '三档(600度以上)' }
          ],
          nonSummerTiers: [
            { max: 200, price: num(this.data.elecNonSumP1), name: '一档(0-200度)' },
            { max: 400, price: num(this.data.elecNonSumP2), name: '二档(201-400度)' },
            { max: Infinity, price: num(this.data.elecNonSumP3), name: '三档(401度以上)' }
          ]
        },
        gas: {
          tiers: [
            { max: 30, price: num(this.data.gasP1), name: '一档(0-30m³)' },
            { max: 40, price: num(this.data.gasP2), name: '二档(30-40m³)' },
            { max: Infinity, price: num(this.data.gasP3), name: '三档(40m³以上)' }
          ]
        }
      }
    };

    const ok = saveConfig(newConfig);
    if (ok) {
      wx.showToast({ title: '参数保存成功', icon: 'success' });
    } else {
      wx.showToast({ title: '保存失败', icon: 'error' });
    }
  },

  resetToDefault: function () {
    wx.showModal({
      title: '提示',
      content: '确定要恢复为深圳市默认标准单价吗？',
      success: (res) => {
        if (res.confirm) {
          saveConfig(DEFAULT_CONFIG);
          this.populateConfig(DEFAULT_CONFIG);
          wx.showToast({ title: '已恢复默认标准', icon: 'success' });
        }
      }
    });
  }
});
