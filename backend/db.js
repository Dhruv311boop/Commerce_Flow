import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'data/commerceflow.db');

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false, // Turn off logging for performance and clean output
  define: {
    timestamps: false, // Schema columns manually define created_at / updated_at
    freezeTableName: true, // Use exactly defined table names
  }
});

export const Product = sequelize.define('products', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sku: {
    type: DataTypes.STRING,
  },
  category: {
    type: DataTypes.STRING,
  },
  price: {
    type: DataTypes.FLOAT,
  },
  stock: {
    type: DataTypes.INTEGER,
  },
  source_import_id: {
    type: DataTypes.STRING,
  },
  extra_fields: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  }
});

export const Customer = sequelize.define('customers', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
  },
  email: {
    type: DataTypes.STRING,
  },
  phone: {
    type: DataTypes.STRING,
  },
  city: {
    type: DataTypes.STRING,
  },
  state: {
    type: DataTypes.STRING,
  },
  acquisition_date: {
    type: DataTypes.STRING,
  },
  source_import_id: {
    type: DataTypes.STRING,
  },
  extra_fields: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  }
});

export const Order = sequelize.define('orders', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  customer_id: {
    type: DataTypes.STRING,
  },
  customer: {
    type: DataTypes.STRING,
  },
  product: {
    type: DataTypes.STRING,
  },
  quantity: {
    type: DataTypes.INTEGER,
  },
  amount: {
    type: DataTypes.FLOAT,
  },
  order_date: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.STRING,
  },
  source_import_id: {
    type: DataTypes.STRING,
  },
  extra_fields: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  }
});

export const CustomFieldDefinition = sequelize.define('custom_field_definitions', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  entity_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  field_key: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  display_name: {
    type: DataTypes.STRING,
  },
  sample_value: {
    type: DataTypes.STRING,
  },
  source_import_id: {
    type: DataTypes.STRING,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  },
});

export const ImportReport = sequelize.define('import_reports', {
  import_id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  report_json: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  },
});

export const CustomerAcquisition = sequelize.define('customer_acquisition', {
  customer_id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  customer_name: {
    type: DataTypes.STRING,
  },
  acquisition_date: {
    type: DataTypes.STRING,
  },
  first_order_date: {
    type: DataTypes.STRING,
  },
  first_order_value: {
    type: DataTypes.FLOAT,
  },
  acquisition_source: {
    type: DataTypes.STRING,
  },
  location: {
    type: DataTypes.STRING,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  }
});

export const Inventory = sequelize.define('inventory', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  product: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  stock: {
    type: DataTypes.INTEGER,
  },
  reorder_level: {
    type: DataTypes.INTEGER,
  },
  source_import_id: {
    type: DataTypes.STRING,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  }
});

export const Import = sequelize.define('imports', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  source_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dataset_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  row_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  saved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  metadata_json: {
    type: DataTypes.TEXT,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
});

// Sync function to ensure schema columns are altered/created if not existing
export async function initDatabase() {
  await sequelize.authenticate();
  await sequelize.sync();
  
  // Custom schema check to alter tables if needed (SQLite specific queries if columns are missing)
  const queryInterface = sequelize.getQueryInterface();
  const tableDescriptions = await Promise.all([
    queryInterface.describeTable('customers'),
    queryInterface.describeTable('orders')
  ]);
  
  const customersDesc = tableDescriptions[0];
  const ordersDesc = tableDescriptions[1];
  
  // Handle migrations for customers table
  if (!customersDesc.city) {
    await queryInterface.addColumn('customers', 'city', { type: DataTypes.STRING });
  }
  if (!customersDesc.state) {
    await queryInterface.addColumn('customers', 'state', { type: DataTypes.STRING });
  }
  if (!customersDesc.acquisition_date) {
    await queryInterface.addColumn('customers', 'acquisition_date', { type: DataTypes.STRING });
  }
  if (!customersDesc.updated_at) {
    await queryInterface.addColumn('customers', 'updated_at', { type: DataTypes.DATE, defaultValue: Sequelize.NOW });
  }
  
  // Handle migrations for orders table
  if (!ordersDesc.customer_id) {
    await queryInterface.addColumn('orders', 'customer_id', { type: DataTypes.STRING });
  }
  if (!ordersDesc.order_date) {
    await queryInterface.addColumn('orders', 'order_date', { type: DataTypes.STRING });
  }
  if (!ordersDesc.updated_at) {
    await queryInterface.addColumn('orders', 'updated_at', { type: DataTypes.DATE, defaultValue: Sequelize.NOW });
  }

  const productsDesc = await queryInterface.describeTable('products');
  if (!productsDesc.extra_fields) {
    await queryInterface.addColumn('products', 'extra_fields', { type: DataTypes.TEXT, defaultValue: '{}' });
  }
  if (!customersDesc.extra_fields) {
    await queryInterface.addColumn('customers', 'extra_fields', { type: DataTypes.TEXT, defaultValue: '{}' });
  }
  if (!ordersDesc.extra_fields) {
    await queryInterface.addColumn('orders', 'extra_fields', { type: DataTypes.TEXT, defaultValue: '{}' });
  }
}
