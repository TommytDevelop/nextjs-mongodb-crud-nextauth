import { User } from './definitions';
import { formatCurrency } from './utils';
import dbConnect from './db/dbConnect';
import {
  usersModel,
  customersModel,
  invoicesModel,
  revenueModel,
} from './db/dbModel';

const ITEMS_PER_PAGE = 6;

export async function fetchRevenue() {
  try {
    dbConnect();
    const revenues = await revenueModel.find({});
    const revenuesJSON = revenues.map((revenue) => revenue.toJSON());
    return revenuesJSON;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    const data = await invoicesModel.aggregate([
      { $addFields: { customerId: { $toObjectId: '$customer_id' } } },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customerInfo',
        },
      },
      { $unwind: '$customerInfo' },
      {
        $project: {
          name: '$customerInfo.name',
          email: '$customerInfo.email',
          image_url: '$customerInfo.image_url',
          amount: 1,
        },
      },
    ]);
    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  //noStore();
  try {
    const invoiceCountPromise = await invoicesModel.find({});
    const customerCountPromise = await customersModel.find({});

    const invoicePaidPromise = await invoicesModel.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]);
    const invoicePendingPromise = await invoicesModel.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]);
    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoicePaidPromise,
      invoicePendingPromise,
    ]);

    const numberOfInvoices = Number(data[0].length ?? '0');
    const numberOfCustomers = Number(data[1].length ?? '0');
    const totalPaidInvoices = formatCurrency(data[2][0].sum ?? '0');
    const totalPendingInvoices = formatCurrency(data[3][0].sum ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

/// Invoice
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  //noStore();

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await invoicesModel
      .aggregate([
        { $addFields: { customerId: { $toObjectId: '$customer_id' } } },
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customerInfo',
          },
        },
        { $unwind: '$customerInfo' },
        {
          $match: {
            $or: [
              { 'customerInfo.name': { $regex: query, $options: 'i' } },
              { 'customerInfo.email': { $regex: query, $options: 'i' } },
              { amount: { $regex: query, $options: 'i' } },
              { date: { $regex: query, $options: 'i' } },
              { status: { $regex: query, $options: 'i' } },
            ],
          },
        },
        {
          $project: {
            id: { $toString: '$_id' }, // Convert _id to string and include in the result
            amount: 1,
            date: 1,
            status: 1,
            name: '$customerInfo.name',
            email: '$customerInfo.email',
            image_url: '$customerInfo.image_url',
          },
        },
      ])
      .skip(offset)
      .limit(ITEMS_PER_PAGE);

    return invoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  //noStore();
  try {
    const invoices = await invoicesModel.aggregate([
      { $addFields: { customerId: { $toObjectId: '$customer_id' } } },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customerInfo',
        },
      },
      { $unwind: '$customerInfo' },
      {
        $match: {
          $or: [
            { 'customerInfo.name': { $regex: query, $options: 'i' } },
            { 'customerInfo.email': { $regex: query, $options: 'i' } },
            { amount: { $regex: query, $options: 'i' } },
            { date: { $regex: query, $options: 'i' } },
            { status: { $regex: query, $options: 'i' } },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          amount: 1,
          date: 1,
          status: 1,
          name: '$customerInfo.name',
          email: '$customerInfo.email',
          image_url: '$customerInfo.image_url',
        },
      },
    ]);

    const totalPages = Math.ceil(Number(invoices.length) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  //noStore();
  try {
    const data = await invoicesModel.findById(id);

    const invoice = {
      id: data.id,
      customer_id: data.customer_id,
      status: data.status,
      date: data.date,
      // Convert amount from cents to dollars
      amount: data.amount / 100,
    };
    console.log(invoice); // Invoice is an empty array []
    return invoice;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    let customers = await customersModel.find();
    customers = customers.map((customer) => customer.toJSON());
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    dbConnect();
    const customers = await customersModel
      .find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { image_url: { $regex: query, $options: 'i' } },
        ],
      })
      .skip(offset)
      .limit(ITEMS_PER_PAGE);
    return customers;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch customers.');
  }
}
export async function fetchCustomersPage(query: string) {
  try {
    dbConnect();
    const count = await customersModel
      .find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { image_url: { $regex: query, $options: 'i' } },
        ],
      })
      .countDocuments();
    const totalPages = Math.ceil(Number(count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}
export async function fetchCustomerById(id: string) {
  //noStore();
  try {
    dbConnect();
    const { name, email, image_url } = await customersModel.findById(id);
    const customer = {
      id: id,
      name: name,
      email: email,
      image_url: image_url,
    };
    return customer;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch customer.');
  }
}

export async function getUser(email: string) {
  try {
    const user = await usersModel.findOne({ email: email });

    return user as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
