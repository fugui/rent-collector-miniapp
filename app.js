// app.js
const { getConfig, saveConfig } = require('./utils/storage');

App({
  onLaunch: function () {
    console.log('房租水电助手已启动');
    // 初始化默认配置（如果本地未设置）
    const config = getConfig();
    saveConfig(config);
  },
  globalData: {
    appName: '深圳房租水电收缴助手'
  }
});
