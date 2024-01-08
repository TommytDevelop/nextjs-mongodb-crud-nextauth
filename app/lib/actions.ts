'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import dbConnect from './db/dbConnect';
const bcrypt = require('bcrypt');

import {
  usersModel,
  customersModel,
  revenueModel,
  invoicesModel,
} from './db/dbModel';
export type InvoiceState = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
export type CustomerState = {
  errors?: {
    name?: string[];
    email?: string[];
    image_url?: string[];
  };
  message?: string | null;
};

const InvoiceFormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CustomerFormSchema = z.object({
  id: z.string(),
  name: z.string({
    invalid_type_error: 'Please enter a customer name.',
  }),
  email: z.string({ invalid_type_error: 'Please enter a customer email.' }),
  image_url: z.string({ invalid_type_error: 'Please enter a customer email.' }),
});

/// Invoice CRUD
const CreateInvoice = InvoiceFormSchema.omit({ id: true, date: true });
export async function createInvoice(
  prevState: InvoiceState,
  formData: FormData,
) {
  // Validate form using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  // Insert data into the database
  try {
    dbConnect();
    const data = {
      customerId: customerId,
      amount: amount,
      status: status,
    };
    await invoicesModel.insertMany(data);
  } catch (error) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

const UpdateInvoice = InvoiceFormSchema.omit({ id: true, date: true });
export async function updateInvoice(
  id: string,
  prevState: InvoiceState,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  try {
    await invoicesModel.findByIdAndUpdate(id, {
      customer_id: customerId,
      amount: amountInCents,
      status: status,
    });
  } catch (error) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  try {
    await invoicesModel.findByIdAndDelete(id);
    revalidatePath('/dashboard/invoices');
    return { message: 'Deleted Invoice.' };
  } catch (error) {
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}

/// Customer CRUD
const CreateCustomer = CustomerFormSchema.omit({ id: true, date: true });
export async function createCustomer(
  prevState: CustomerState,
  formData: FormData,
) {
  // Validate form using Zod
  const validatedFields = CreateCustomer.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    image_url: formData.get('image_url'),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  // Prepare data for insertion into the database
  const { name, email, image_url } = validatedFields.data;

  // Insert data into the database
  try {
    dbConnect();
    const data = {
      name: name,
      email: email,
      image_url: image_url,
    };
    await customersModel.insertMany(data);
  } catch (error) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath('/dashboard/customers');
  redirect('/dashboard/customers');
}

const UpdateCustomer = CustomerFormSchema.omit({ id: true, date: true });
export async function updateCustomer(
  id: string,
  prevState: CustomerState,
  formData: FormData,
) {
  const validatedFields = UpdateCustomer.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    image_url: formData.get('image_url'),
  });
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }
  const { name, email, image_url } = validatedFields.data;
  try {
    dbConnect();
    await customersModel.findByIdAndUpdate(
      id,
      { name: name, email: email, image_url: image_url },
      { new: true },
    );
  } catch (error) {
    return { message: 'Database Error: Failed to Update Customer.' };
  }
  revalidatePath('/dashboard/customers');
  redirect('/dashboard/customers');
}

export async function deleteCustomer(id: string) {
  try {
    dbConnect();
    await customersModel.findByIdAndDelete(id);

    revalidatePath('/dashboard/customers');
    return { message: 'Deleted Customer.' };
  } catch (error) {
    return { message: 'Database Error: Failed to Delete Customer.' };
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
export async function otherauthenticate() {
  try {
    await signIn('google');
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

export async function createAccount(
  prevState: string | undefined,
  formData: FormData,
) {
  dbConnect();

  const hashedPassword = await bcrypt.hash(formData.get('password'), 10);

  const json = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: hashedPassword,
  };
  try {
    await usersModel.insertMany(json);
  } catch (error) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
    throw error;
  }
  revalidatePath('/');
  redirect('/');
}
