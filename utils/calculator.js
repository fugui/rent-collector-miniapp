/**
 * 深圳市水电煤阶梯计价与用量拆分计算引擎
 */

// 默认深圳计价规则配置
const DEFAULT_PRICING = {
  // 水费阶梯（元/立方米）
  water: {
    tiers: [
      { max: 22, price: 3.47, name: '一档(0-22m³)' },
      { max: 30, price: 4.83, name: '二档(22-30m³)' },
      { max: Infinity, price: 8.91, name: '三档(30m³以上)' }
    ]
  },
  // 电费阶梯（元/度）
  electricity: {
    // 夏季：5月-10月
    summerTiers: [
      { max: 260, price: 0.5986, name: '一档(0-260度)' },
      { max: 600, price: 0.6486, name: '二档(260-600度)' },
      { max: Infinity, price: 0.8986, name: '三档(600度以上)' }
    ],
    // 非夏季：11月-次年4月
    nonSummerTiers: [
      { max: 200, price: 0.5986, name: '一档(0-200度)' },
      { max: 400, price: 0.6486, name: '二档(200-400度)' },
      { max: Infinity, price: 0.8986, name: '三档(401度以上)' }
    ]
  },
  // 管道天然气阶梯（元/立方米）
  gas: {
    tiers: [
      { max: 30, price: 3.50, name: '一档(0-30m³)' },
      { max: 40, price: 4.025, name: '二档(30-40m³)' },
      { max: Infinity, price: 5.25, name: '三档(40m³以上)' }
    ]
  }
};

/**
 * 判断指定月份是否为夏季电价（5月 - 10月）
 */
function isSummerMonth(month) {
  const m = parseInt(month.toString().split('-')[1] || month, 10);
  return m >= 5 && m <= 10;
}

/**
 * 通用阶梯计算方法
 */
function calculateTieredFee(usage, tiers) {
  let remaining = Math.max(0, usage);
  let totalCost = 0;
  let previousMax = 0;
  const breakdown = [];

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const tierCapacity = tier.max - previousMax;
    
    if (remaining <= 0) break;

    const usedInTier = Math.min(remaining, tierCapacity);
    const cost = usedInTier * tier.price;
    
    totalCost += cost;
    remaining -= usedInTier;

    breakdown.push({
      tierIndex: i + 1,
      name: tier.name,
      used: Number(usedInTier.toFixed(2)),
      price: tier.price,
      cost: Number(cost.toFixed(2))
    });

    previousMax = tier.max;
  }

  return {
    usage: Number(usage.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    breakdown
  };
}

/**
 * 计算水费
 */
function calculateWaterFee(usage, customWaterPricing) {
  const tiers = customWaterPricing?.tiers || DEFAULT_PRICING.water.tiers;
  return calculateTieredFee(usage, tiers);
}

/**
 * 计算电费
 */
function calculateElectricityFee(usage, month, customElecPricing) {
  const isSummer = isSummerMonth(month);
  const tiers = isSummer
    ? (customElecPricing?.summerTiers || DEFAULT_PRICING.electricity.summerTiers)
    : (customElecPricing?.nonSummerTiers || DEFAULT_PRICING.electricity.nonSummerTiers);

  const res = calculateTieredFee(usage, tiers);
  res.isSummer = isSummer;
  return res;
}

/**
 * 计算煤气费
 */
function calculateGasFee(usage, customGasPricing) {
  const tiers = customGasPricing?.tiers || DEFAULT_PRICING.gas.tiers;
  return calculateTieredFee(usage, tiers);
}

/**
 * 核心汇总计算
 * - 水表：按总水表上月/本月读数相减得出总用水量
 * - 电表：直接录入当月总用电量 (度)
 */
function calculateMonthlyBill(input, config) {
  const {
    month, // e.g. "2026-08"
    // 总水表读数
    prevTotalWater = 0,
    currTotalWater = 0,
    totalWaterUsage: directTotalWater = null,
    // 当月总用电量 (直接录入度数)
    totalElecUsage: directTotalElec = null,
    prevTotalElec = 0,
    currTotalElec = 0,

    // 1702 独立表读数
    prev1702Water = 0,
    curr1702Water = 0,
    prev1702Elec = 0,
    curr1702Elec = 0,

    // 独立煤气表读数
    prev1602Gas = 0,
    curr1602Gas = 0,
    prev1702Gas = 0,
    curr1702Gas = 0
  } = input;

  const monthNum = parseInt(month.toString().split('-')[1] || month, 10);

  // 1. 水表总用量计算 (本月读数 - 上月读数)
  let totalWaterUsage = 0;
  if (currTotalWater > 0 || prevTotalWater > 0) {
    totalWaterUsage = Math.max(0, currTotalWater - prevTotalWater);
  } else if (directTotalWater !== null && directTotalWater !== undefined && directTotalWater !== '') {
    totalWaterUsage = Math.max(0, parseFloat(directTotalWater) || 0);
  }

  // 2. 电表总用量计算 (直接取录入的当月总用电量，兼容读数差)
  let totalElecUsage = 0;
  if (directTotalElec !== null && directTotalElec !== undefined && directTotalElec !== '') {
    totalElecUsage = Math.max(0, parseFloat(directTotalElec) || 0);
  } else {
    totalElecUsage = Math.max(0, currTotalElec - prevTotalElec);
  }

  // 3. 1702 用量
  const water1702Usage = Math.max(0, curr1702Water - prev1702Water);
  const elec1702Usage = Math.max(0, curr1702Elec - prev1702Elec);

  // 4. 1602 用量 = 总用量 - 1702 用量
  const water1602Usage = Math.max(0, totalWaterUsage - water1702Usage);
  const elec1602Usage = Math.max(0, totalElecUsage - elec1702Usage);

  // 5. 煤气用量
  const gas1602Usage = Math.max(0, curr1602Gas - prev1602Gas);
  const gas1702Usage = Math.max(0, curr1702Gas - prev1702Gas);

  // 6. 梯级费用计算
  const pricing = config?.pricing || DEFAULT_PRICING;

  const water1602 = calculateWaterFee(water1602Usage, pricing.water);
  const water1702 = calculateWaterFee(water1702Usage, pricing.water);

  const elec1602 = calculateElectricityFee(elec1602Usage, monthNum, pricing.electricity);
  const elec1702 = calculateElectricityFee(elec1702Usage, monthNum, pricing.electricity);

  const gas1602 = calculateGasFee(gas1602Usage, pricing.gas);
  const gas1702 = calculateGasFee(gas1702Usage, pricing.gas);

  // 7. 基础租金与物业费
  const houseConfig = config?.houses || {
    '1602': { baseRent: 3500, propertyFee: 150 },
    '1702': { baseRent: 3800, propertyFee: 150 }
  };

  const rent1602 = Number(houseConfig['1602']?.baseRent || 0);
  const propFee1602 = Number(houseConfig['1602']?.propertyFee || 0);

  const rent1702 = Number(houseConfig['1702']?.baseRent || 0);
  const propFee1702 = Number(houseConfig['1702']?.propertyFee || 0);

  // 8. 总计计算
  const total1602 = Number((rent1602 + propFee1602 + water1602.totalCost + elec1602.totalCost + gas1602.totalCost).toFixed(2));
  const total1702 = Number((rent1702 + propFee1702 + water1702.totalCost + elec1702.totalCost + gas1702.totalCost).toFixed(2));

  return {
    month,
    rawReadings: { ...input },
    summary: {
      totalWaterUsage: Number(totalWaterUsage.toFixed(2)),
      totalElecUsage: Number(totalElecUsage.toFixed(2))
    },
    house1602: {
      roomName: '1602',
      baseRent: rent1602,
      propertyFee: propFee1602,
      water: water1602,
      elec: elec1602,
      gas: gas1602,
      readings: {
        prevWater: Number((prevTotalWater - prev1702Water).toFixed(2)),
        currWater: Number((currTotalWater - curr1702Water).toFixed(2)),
        prevElec: 0,
        currElec: Number((totalElecUsage - elec1702Usage).toFixed(2)),
        prevGas: prev1602Gas,
        currGas: curr1602Gas
      },
      totalAmount: total1602
    },
    house1702: {
      roomName: '1702',
      baseRent: rent1702,
      propertyFee: propFee1702,
      water: water1702,
      elec: elec1702,
      gas: gas1702,
      readings: {
        prevWater: prev1702Water,
        currWater: curr1702Water,
        prevElec: prev1702Elec,
        currElec: curr1702Elec,
        prevGas: prev1702Gas,
        currGas: curr1702Gas
      },
      totalAmount: total1702
    }
  };
}

module.exports = {
  DEFAULT_PRICING,
  isSummerMonth,
  calculateWaterFee,
  calculateElectricityFee,
  calculateGasFee,
  calculateMonthlyBill
};
