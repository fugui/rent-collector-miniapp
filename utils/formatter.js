/**
 * 账单文本格式化与 CSV 数据导出转换器
 */

/**
 * 生成单套房屋发送给租客的格式化微信文本消息
 * @param {Object} houseData 单套房屋算好的数据 (house1602 或 house1702)
 * @param {string} month 年月 e.g. "2026-08"
 * @param {Object} rawReadings 读数全集
 */
function generateTenantText(houseData, month, rawReadings) {
  const { roomName, baseRent, propertyFee, water, elec, gas, readings, totalAmount } = houseData;
  
  // 提取年月显示
  const parts = month.split('-');
  const yearStr = parts[0];
  const monthStr = parts[1];

  let text = `🏠 【${roomName}房 ${yearStr}年${monthStr}月费用清单】\n`;
  text += `--------------------------------\n`;
  text += `💰 基础房租：${baseRent.toFixed(2)} 元\n`;
  text += `🏢 物业管理费：${propertyFee.toFixed(2)} 元\n\n`;

  // 水费部分
  text += `💧 水费明细（用量：${water.usage} m³）：\n`;
  text += `   读数：${readings.prevWater} ➔ ${readings.currWater}\n`;
  water.breakdown.forEach(b => {
    text += `   - ${b.name}: ${b.used}m³ × ${b.price}元 = ${b.cost.toFixed(2)}元\n`;
  });
  text += `   水费小计：${water.totalCost.toFixed(2)} 元\n\n`;

  // 电费部分
  const seasonTag = elec.isSummer ? ' (夏季标准)' : ' (非夏季标准)';
  text += `⚡ 电费明细（用量：${elec.usage} 度${seasonTag}）：\n`;
  text += `   读数：${readings.prevElec} ➔ ${readings.currElec}\n`;
  elec.breakdown.forEach(b => {
    text += `   - ${b.name}: ${b.used}度 × ${b.price}元 = ${b.cost.toFixed(2)}元\n`;
  });
  text += `   电费小计：${elec.totalCost.toFixed(2)} 元\n\n`;

  // 煤气部分
  text += `🔥 煤气费明细（用量：${gas.usage} m³）：\n`;
  text += `   读数：${readings.prevGas} ➔ ${readings.currGas}\n`;
  gas.breakdown.forEach(b => {
    text += `   - ${b.name}: ${b.used}m³ × ${b.price}元 = ${b.cost.toFixed(2)}元\n`;
  });
  text += `   煤气费小计：${gas.totalCost.toFixed(2)} 元\n`;

  text += `--------------------------------\n`;
  text += `👉 本月应缴合计：${totalAmount.toFixed(2)} 元\n`;
  text += `📅 请于收到后及时核对转账，感谢配合！`;

  return text;
}

/**
 * 导出全部历史账单为 CSV 格式文本
 * @param {Array} historyList 历史账单数组
 */
function exportHistoryToCSV(historyList) {
  if (!historyList || historyList.length === 0) {
    return '无历史数据';
  }

  const headers = [
    '月份',
    '1602房总额', '1602房租', '1602物业费', '1602水用量(m³)', '1602水费', '1602电用量(度)', '1602电费', '1602气用量(m³)', '1602气费',
    '1702房总额', '1702房租', '1702物业费', '1702水用量(m³)', '1702水费', '1702电用量(度)', '1702电费', '1702气用量(m³)', '1702气费',
    '总水表用量(m³)', '总电表用量(度)'
  ];

  const rows = [headers.join(',')];

  historyList.forEach(item => {
    const b = item.billData;
    if (!b) return;
    const h16 = b.house1602;
    const h17 = b.house1702;
    const s = b.summary;

    const row = [
      b.month,
      h16.totalAmount, h16.baseRent, h16.propertyFee, h16.water.usage, h16.water.totalCost, h16.elec.usage, h16.elec.totalCost, h16.gas.usage, h16.gas.totalCost,
      h17.totalAmount, h17.baseRent, h17.propertyFee, h17.water.usage, h17.water.totalCost, h17.elec.usage, h17.elec.totalCost, h17.gas.usage, h17.gas.totalCost,
      s.totalWaterUsage, s.totalElecUsage
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

/**
 * 格式化当前年月 e.g. "2026-08"
 */
function getCurrentMonthStr() {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

module.exports = {
  generateTenantText,
  exportHistoryToCSV,
  getCurrentMonthStr
};
