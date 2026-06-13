/**
 * customerIntelligence.js — advanced customer analytics and dynamic cohorts.
 */

import { normalizeSku } from './dataImportEngine.js';

const today = () => new Date();

const COMPLETED_STATUSES = new Set([
  'delivered', 'completed', 'done', 'success', 'paid', 'none',
]);

export const isCompletedOrderStatus = (status) => (
  COMPLETED_STATUSES.has(String(status || '').trim().toLowerCase())
);

const daysSince = (dateStr) => {
  if (!dateStr) return 9999;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 9999;
  return Math.floor((today() - d) / 86_400_000);
};

const safePct = (num, den) => den > 0 ? (num / den) * 100 : 0;

const ageCohort = (age) => {
  const n = Number(age);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 27) return 'Gen Z';
  if (n < 43) return 'Millennial';
  if (n < 59) return 'Gen X';
  return 'Senior';
};

const genderCohort = (gender) => {
  const g = String(gender || '').trim().toLowerCase();
  if (['m', 'male'].includes(g)) return 'Male';
  if (['f', 'female'].includes(g)) return 'Female';
  return null;
};

const segmentCohort = (customer) => {
  const segment = String(customer.customerSegment || customer.segment || customer.extraFields?.customerSegment || '').trim();
  if (!segment) return null;
  const lower = segment.toLowerCase();
  if (lower.includes('premium') || lower.includes('vip')) return 'Premium';
  if (lower.includes('enterprise')) return 'Enterprise';
  if (lower.includes('vip')) return 'VIP';
  return 'Regular';
};

const deriveBehavioralCohorts = ({ deliveredCount, ltv, daysSinceLast, vipThreshold }) => {
  const tags = [];
  if (deliveredCount <= 0) return tags;
  if (deliveredCount === 1) tags.push('First-Time Buyer');
  if (deliveredCount >= 2) tags.push('Repeat Buyer');
  if (deliveredCount >= 3) tags.push('Loyal Customer');
  if (ltv >= vipThreshold && ltv > 0) tags.push('High Value Customer');
  if (daysSinceLast >= 90 && deliveredCount > 0) tags.push('At Risk Customer');
  return tags;
};

export function buildCustomerIntelligence(customers, orders, products) {
  const completedOrders = orders.filter(o => isCompletedOrderStatus(o.status));
  const totalStoreRevenue = completedOrders.reduce((s, o) => s + Number(o.total || o.amount || 0), 0);

  const enriched = customers.map(c => {
    const custOrders = orders.filter(o => o.customerId === c.id || o.customer === c.name || o.customer === c.email);
    const delivered = custOrders.filter(o => isCompletedOrderStatus(o.status));
    const totalOrderCount = custOrders.length;
    const ltv = delivered.reduce((s, o) => s + Number(o.total || o.amount || 0), 0);
    const deliveredCount = delivered.length;
    const aov = deliveredCount > 0 ? ltv / deliveredCount : 0;

    const dates = delivered.map(o => o.date || o.order_date).filter(Boolean).sort();
    const firstPurchase = dates[0] || null;
    const lastPurchase = dates[dates.length - 1] || null;
    const daysSinceLast = daysSince(lastPurchase);
    const customerAgeDays = daysSince(c.regDate || c.createdAt);

    const productCounts = {};
    const categoryCounts = {};
    delivered.forEach(o => {
      (o.items || []).forEach(item => {
        const prod = products.find(p =>
          p.id === item.productId ||
          p.sku === item.sku ||
          normalizeSku(p.sku) === normalizeSku(item.sku)
        );
        const productKey = prod?.id || item.productId || item.sku;
        if (productKey) productCounts[productKey] = (productCounts[productKey] || 0) + (item.qty || item.quantity || 1);
        if (prod?.category) categoryCounts[prod.category] = (categoryCounts[prod.category] || 0) + (item.qty || item.quantity || 1);
      });
    });
    const favProductId = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const favProduct = products.find(p => p.id === favProductId)?.name || null;
    const favCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const now = today();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now); prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthSpend = delivered.filter(o => String(o.date || o.order_date || '').startsWith(currentMonthKey)).reduce((s, o) => s + Number(o.total || o.amount || 0), 0);
    const prevMonthSpend = delivered.filter(o => String(o.date || o.order_date || '').startsWith(prevMonthKey)).reduce((s, o) => s + Number(o.total || o.amount || 0), 0);
    const spendGrowthPct = prevMonthSpend > 0 ? ((currentMonthSpend - prevMonthSpend) / prevMonthSpend) * 100 : null;
    const rawLoyalty = (deliveredCount * 40) + (customerAgeDays * 30) + (ltv * 30);
    const revenueContribution = safePct(ltv, totalStoreRevenue);

    return {
      ...c,
      ltv,
      totalOrderCount,
      deliveredCount,
      aov,
      firstPurchase,
      lastPurchase,
      daysSinceLast,
      customerAgeDays,
      favProduct,
      favCategory,
      spendGrowthPct,
      rawLoyalty,
      revenueContribution,
    };
  });

  const ltvValues = enriched.map(c => c.ltv).sort((a, b) => b - a);
  const vipThreshold = ltvValues[Math.floor(ltvValues.length * 0.1)] || Infinity;

  const withCohorts = enriched.map(c => {
    const tags = new Set();

    deriveBehavioralCohorts({
      deliveredCount: c.deliveredCount,
      ltv: c.ltv,
      daysSinceLast: c.daysSinceLast,
      vipThreshold,
    }).forEach(tag => tags.add(tag));

    const ageTag = ageCohort(c.age);
    if (ageTag) tags.add(ageTag);

    const genderTag = genderCohort(c.gender);
    if (genderTag) tags.add(genderTag);

    if (c.state?.trim()) tags.add(`${c.state.trim()} State`);
    if (c.city?.trim()) tags.add(`${c.city.trim()} City`);

    const segmentTag = segmentCohort(c);
    if (segmentTag) tags.add(segmentTag);

    if (c.ltv >= vipThreshold && c.ltv > 0) tags.add('VIP');
    if (c.daysSinceLast >= 180 && c.deliveredCount > 0) tags.add('Churned');
    else if (c.daysSinceLast <= 30 && c.deliveredCount > 0) tags.add('New');

    return { ...c, cohorts: Array.from(tags) };
  });

  const cohortGroups = {
    vip: withCohorts.filter(c => c.cohorts.includes('VIP') || c.cohorts.includes('High Value Customer')),
    loyal: withCohorts.filter(c => c.cohorts.includes('Loyal Customer')),
    repeatBuyer: withCohorts.filter(c => c.cohorts.includes('Repeat Buyer')),
    firstTimeBuyer: withCohorts.filter(c => c.cohorts.includes('First-Time Buyer')),
    highValue: withCohorts.filter(c => c.cohorts.includes('High Value Customer')),
    atRisk: withCohorts.filter(c => c.cohorts.includes('At Risk Customer')),
    churned: withCohorts.filter(c => c.cohorts.includes('Churned')),
    newCustomer: withCohorts.filter(c => c.cohorts.includes('New')),
    demographic: {
      genZ: withCohorts.filter(c => c.cohorts.includes('Gen Z')),
      millennial: withCohorts.filter(c => c.cohorts.includes('Millennial')),
      genX: withCohorts.filter(c => c.cohorts.includes('Gen X')),
      senior: withCohorts.filter(c => c.cohorts.includes('Senior')),
      male: withCohorts.filter(c => c.cohorts.includes('Male')),
      female: withCohorts.filter(c => c.cohorts.includes('Female')),
    },
    segment: {
      premium: withCohorts.filter(c => c.cohorts.includes('Premium')),
      regular: withCohorts.filter(c => c.cohorts.includes('Regular')),
      enterprise: withCohorts.filter(c => c.cohorts.includes('Enterprise')),
      vipSegment: withCohorts.filter(c => c.cohorts.includes('VIP')),
    },
  };

  const vipRevenue = cohortGroups.vip.reduce((s, c) => s + c.ltv, 0);
  const vipRevenuePct = safePct(vipRevenue, totalStoreRevenue).toFixed(1);

  const sorted = {
    byLtv: [...withCohorts].sort((a, b) => b.ltv - a.ltv),
    byAov: [...withCohorts].sort((a, b) => b.aov - a.aov),
    byOrders: [...withCohorts].sort((a, b) => b.deliveredCount - a.deliveredCount),
    byLoyalty: [...withCohorts].sort((a, b) => b.rawLoyalty - a.rawLoyalty),
    byGrowth: [...withCohorts].filter(c => c.spendGrowthPct !== null).sort((a, b) => b.spendGrowthPct - a.spendGrowthPct),
  };

  const stateData = {};
  const cityData = {};
  withCohorts.forEach(c => {
    const state = c.state?.trim();
    const city = c.city?.trim();
    if (state) {
      if (!stateData[state]) stateData[state] = { customers: 0, revenue: 0, orders: 0 };
      stateData[state].customers += 1;
      stateData[state].revenue += c.ltv;
      stateData[state].orders += c.deliveredCount;
    }
    if (city) {
      if (!cityData[city]) cityData[city] = { customers: 0, revenue: 0, orders: 0 };
      cityData[city].customers += 1;
      cityData[city].revenue += c.ltv;
      cityData[city].orders += c.deliveredCount;
    }
  });

  const geoEnrich = (map) => Object.entries(map).map(([name, d]) => ({
    name,
    customers: d.customers,
    revenue: d.revenue,
    orders: d.orders,
    aov: d.orders > 0 ? d.revenue / d.orders : 0,
    revenuePct: safePct(d.revenue, totalStoreRevenue).toFixed(1),
  }));

  const stateList = geoEnrich(stateData);
  const cityList = geoEnrich(cityData);
  const stateCounts = stateList.map(s => s.customers);
  const cityCounts = cityList.map(s => s.customers);
  const statesEqual = stateCounts.length > 0 && stateCounts.every(n => n === stateCounts[0]);
  const citiesEqual = cityCounts.length > 0 && cityCounts.every(n => n === cityCounts[0]);
  const statesByRevenue = [...stateList].sort((a, b) => b.revenue - a.revenue);
  const citiesByRevenue = [...cityList].sort((a, b) => b.revenue - a.revenue);
  const isSmallDataset = customers.length < 20;
  const allSingleOrder = withCohorts.every(c => c.deliveredCount <= 1);
  const hasRepeatData = !allSingleOrder && withCohorts.some(c => c.deliveredCount >= 2);

  const narratives = [];
  if (hasRepeatData) {
    if (sorted.byLtv[0]?.ltv > 0) narratives.push(`${sorted.byLtv[0].name} is your highest revenue customer with lifetime purchases of $${sorted.byLtv[0].ltv.toFixed(2)}.`);
    if (cohortGroups.atRisk.length > 0) narratives.push(`${cohortGroups.atRisk.length} customer(s) are at risk of churn.`);
    if (cohortGroups.highValue.length > 0) narratives.push(`${cohortGroups.highValue.length} high value customers identified.`);
  } else {
    narratives.push('Insufficient repeat purchase history for full loyalty analysis.');
  }

  return {
    enriched: withCohorts,
    cohortGroups,
    vipRevenuePct,
    rankings: {
      topRevenue: sorted.byLtv[0] || null,
      topAov: sorted.byAov[0] || null,
      topRepeat: sorted.byOrders[0] || null,
      topLoyal: sorted.byLoyalty[0] || null,
      topGrowth: sorted.byGrowth[0] || null,
    },
    geography: {
      statesByRevenue,
      citiesByRevenue,
      statesEqual,
      citiesEqual,
      isSmallDataset,
      stateList,
      cityList,
    },
    narratives,
    hasRepeatData,
    allSingleOrder,
    isSmallDataset,
    totalStoreRevenue,
  };
}
