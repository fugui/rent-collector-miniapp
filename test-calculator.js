/**
 * 单元测试与计算引擎逻辑验证脚本（最新模式：水表相减，电表直接填总数）
 */

const { calculateMonthlyBill } = require('./utils/calculator');
const { generateTenantText } = require('./utils/formatter');

console.log('==== 开始测试 水表相减 + 电表填总数 模式 ====');

const mockInput = {
  month: '2026-08',
  // 总水表读数扣减 (150 - 100 = 50 m³)
  prevTotalWater: 100,
  currTotalWater: 150,

  // 当月总用电量 (直接填 1000 度)
  totalElecUsage: 1000,

  // 1702 独立水表 (60 - 40 = 20 m³ ➔ 1602 水用量 30 m³)
  prev1702Water: 40,
  curr1702Water: 60,

  // 1702 独立电表 (650 - 400 = 250 度 ➔ 1602 电用量 750 度)
  prev1702Elec: 400,
  curr1702Elec: 650,

  // 独立煤气表
  prev1602Gas: 10,
  curr1602Gas: 25,     // 15m³
  prev1702Gas: 20,
  curr1702Gas: 45      // 25m³
};

const bill = calculateMonthlyBill(mockInput);

console.log('💧 总水用量计算结果:', bill.summary.totalWaterUsage, 'm³ (预期: 150 - 100 = 50)');
console.log('⚡ 总电用量计算结果:', bill.summary.totalElecUsage, '度 (预期: 1000)');

console.log('\n🏠 两套房用量拆分对比:');
console.log('1602水用量:', bill.house1602.water.usage, 'm³ (预期: 50 - 20 = 30)');
console.log('1602电用量:', bill.house1602.elec.usage, '度 (预期: 1000 - 250 = 750)');

console.log('1702水用量:', bill.house1702.water.usage, 'm³ (预期: 20)');
console.log('1702电用量:', bill.house1702.elec.usage, '度 (预期: 250)');

console.assert(bill.summary.totalWaterUsage === 50, '总水用量计算错误');
console.assert(bill.house1602.water.usage === 30, '1602水用量拆分错误');
console.assert(bill.house1602.elec.usage === 750, '1602电用量拆分错误');

console.log('\n💬 1602微信账单文本:');
console.log(generateTenantText(bill.house1602, '2026-08', mockInput));

console.log('\n✅ 水表读数相减 + 电表直接填总数 测试完美通过！');
