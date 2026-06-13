// api/fetch-source.js
// Vercel Serverless Function — fetches from live Shopify or WooCommerce APIs
// Called from the frontend with credentials; proxied here to keep secrets server-side


async function fetchShopify({ shop, token }) {
  const url = `https://${shop}/admin/api/2024-01/orders.json?limit=250&status=any`;
  const res = await fetch(url, {
    headers: { 'X-Shopify-Access-Token': token },
  });
  if (!res.ok) throw new Error(`Shopify error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  // Flatten nested Shopify order structure
  return (data.orders || []).map(order => ({
    order_id      : String(order.id),
    order_date    : order.created_at,
    customer_name : order.billing_address?.name || order.customer?.first_name + ' ' + order.customer?.last_name || '',
    email         : order.email || '',
    phone         : order.phone || order.billing_address?.phone || '',
    address       : order.billing_address?.address1 || '',
    status        : order.fulfillment_status || order.financial_status || '',
    product       : order.line_items?.map(i => i.title).join(', ') || '',
    quantity      : order.line_items?.reduce((s, i) => s + i.quantity, 0) || 0,
    price         : parseFloat(order.total_price || 0),
  }));
}

async function fetchWooCommerce({ url, key, secret }) {
  const endpoint = `${url}/wp-json/wc/v3/orders?per_page=100&consumer_key=${key}&consumer_secret=${secret}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`WooCommerce error: ${res.status} ${res.statusText}`);
  const orders = await res.json();
  return orders.map(order => ({
    order_id      : String(order.id),
    order_date    : order.date_created,
    customer_name : `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim(),
    email         : order.billing?.email || '',
    phone         : order.billing?.phone || '',
    address       : order.billing?.address_1 || '',
    status        : order.status || '',
    product       : order.line_items?.map(i => i.name).join(', ') || '',
    quantity      : order.line_items?.reduce((s, i) => s + i.quantity, 0) || 0,
    price         : parseFloat(order.total || 0),
  }));
}

async function fetchGenericApi({ url, headers = {}, data_key = null }) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data_key ? data[data_key] : Object.values(data)[0] || []);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { kind, ...config } = req.body;

    let rows = [];

    if      (kind === 'shopify')      rows = await fetchShopify(config);
    else if (kind === 'woocommerce')  rows = await fetchWooCommerce(config);
    else if (kind === 'generic')      rows = await fetchGenericApi(config);
    else return res.status(400).json({ error: `Unknown source kind: "${kind}". Use shopify, woocommerce, or generic.` });

    return res.status(200).json({ rows, count: rows.length });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
