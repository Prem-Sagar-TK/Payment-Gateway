import { z } from 'zod';

export const createEmployeeSchema = z.object({
  employeeId: z.string().min(1).max(50).optional(),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(30).optional(),
  department: z.string().min(1, 'Department is required').max(100),
  designation: z.string().min(1, 'Designation is required').max(100),
  salary: z.number().int().positive('Salary must be a positive number'),
  currency: z.string().length(3).optional(),
  bankName: z.string().max(100).optional(),
  accountNumber: z.string().max(50).optional(),
  ifscCode: z.string().max(30).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().max(30).optional().nullable(),
  department: z.string().min(1).max(100).optional(),
  designation: z.string().min(1).max(100).optional(),
  salary: z.number().int().positive('Salary must be a positive number').optional(),
  currency: z.string().length(3).optional(),
  bankName: z.string().max(100).optional().nullable(),
  accountNumber: z.string().max(50).optional().nullable(),
  ifscCode: z.string().max(30).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export const processPayrollSchema = z.object({
  title: z.string().max(200).optional(),
  employeeIds: z.array(z.string()).optional(),
});
