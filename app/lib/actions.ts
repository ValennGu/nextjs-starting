'use server';

import postgres from 'postgres';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
      invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.'}),
    status: z.enum(['pending', 'paid'], {
      invalid_type_error: 'Please select an invoice status.'
    }),
    date: z.string()
});

export type State = {
  errors?: {
    customerId?: string[],
    amount?: string[],
    status?: string[],
  };
  message?: string | null;
}

/**
 * CREATE INVOICE
 */
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(_prevState: State, formData: FormData) {
  // Validate form data using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // Early return if validation fails
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to create invoice. Missing fields.'
    }
  }

  // Preare data for insertion
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  // Database insertion
  try {
    await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      `;
  } catch (error) {
    console.log('Error creating invoice:', error);
  }

  // Revalidate cache and redirect
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices')
}

/**
 * UPDATE INVOICE
 */
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
  // Validate form data using Zod
  const validatedFields = UpdateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });

  // Early return if validation fails
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Failed to create invoice. Missing fields.'
    }
  }
  
  // Prepare data for update
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  
  // Database update
  try {
    await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
      `;
  } catch (error) {
    console.log('Error updating invoice:', error);
  }

  // Revalidate cache and redirect
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

/**
 * DELTE INVOICE
 */
export async function deleteInvoice(id: string) {
  throw new Error('Error deleting invoice.');
  
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
}