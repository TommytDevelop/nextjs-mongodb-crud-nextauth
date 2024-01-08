import mongoose from 'mongoose';
const Schema = mongoose.Schema;

export const usersCollection = new Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    password: {
      type: String,
    },
  },

  { collection: 'users' },
);

export const customersCollection = new Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    image_url: {
      type: String,
    },
  },

  { collection: 'customers' },
);
export const invoicesCollection = new Schema(
  {
    customerId: {
      type: String,
    },
    amount: {
      type: Number,
    },
    status: {
      type: String,
    },
    Date: {
      type: Date,
    },
  },

  { collection: 'invoices' },
);
export const revenueCollection = new Schema(
  {
    Month: {
      type: Number,
    },
    Revenue: {
      type: Number,
    },
  },

  { collection: 'revenue' },
);

export const usersModel =
  mongoose.models.users || mongoose.model('users', usersCollection);
export const customersModel =
  mongoose.models.customers || mongoose.model('customers', customersCollection);
export const invoicesModel =
  mongoose.models.invoices || mongoose.model('invoices', invoicesCollection);
export const revenueModel =
  mongoose.models.revenue || mongoose.model('revenue', revenueCollection);
