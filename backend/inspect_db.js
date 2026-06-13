import { sequelize, Customer, Order, CustomerAcquisition } from './db.js';

async function run() {
  try {
    const customers = await Customer.findAll();
    console.log('Total customers in DB:', customers.length);
    
    // Test the destroy + insert
    console.log('Destroying customer_acquisition records...');
    await CustomerAcquisition.destroy({ where: {}, truncate: true });
    
    console.log('Running INSERT INTO query...');
    await sequelize.query(`
      WITH order_matches AS (
          SELECT
              c.id AS customer_id,
              COALESCE(o.order_date, date(o.created_at)) AS first_order_date,
              COALESCE(o.amount, 0) AS first_order_value,
              ROW_NUMBER() OVER (
                  PARTITION BY c.id
                  ORDER BY COALESCE(o.order_date, date(o.created_at), date('now')), o.created_at
              ) AS rn
          FROM customers c
          LEFT JOIN orders o
            ON o.customer_id = c.id
            OR lower(COALESCE(o.customer, '')) = lower(COALESCE(c.name, ''))
            OR lower(COALESCE(o.customer, '')) = lower(COALESCE(c.email, ''))
      )
      INSERT INTO customer_acquisition (
          customer_id,
          customer_name,
          acquisition_date,
          first_order_date,
          first_order_value,
          acquisition_source,
          location,
          created_at,
          updated_at
      )
      SELECT
          c.id,
          c.name,
          COALESCE(c.acquisition_date, om.first_order_date, date(c.created_at), date('now')) AS acquisition_date,
          om.first_order_date,
          om.first_order_value,
          COALESCE(c.source_import_id, 'direct'),
          trim(COALESCE(c.city, '') || CASE WHEN COALESCE(c.city, '') != '' AND COALESCE(c.state, '') != '' THEN ', ' ELSE '' END || COALESCE(c.state, '')),
          datetime('now'),
          datetime('now')
      FROM customers c
      LEFT JOIN order_matches om ON om.customer_id = c.id AND om.rn = 1
      WHERE c.id IS NOT NULL
    `);
    console.log('Insert query succeeded!');

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await sequelize.close();
  }
}

run();
