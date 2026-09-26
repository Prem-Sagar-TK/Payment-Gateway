import { Employee } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { NotFoundError } from '../utils/errors';
import { EmployeeInput } from '../types';

export class EmployeeService {

  async initializeSeedIfEmpty(): Promise<void> {
    try {
      const count = await prisma.employee.count();
      if (count > 0) return;

      const initialEmployees = [
        {
          employeeId: 'EMP-101',
          name: 'Aarav Sharma',
          email: 'aarav.sharma@paygate.corp',
          phone: '+91 98765 43210',
          department: 'Engineering',
          designation: 'Staff Software Engineer',
          salary: 14500000,
          currency: 'INR',
          bankName: 'HDFC Bank',
          accountNumber: '•••• 4821',
          ifscCode: 'HDFC0001234',
          status: 'ACTIVE',
          paymentStatus: 'PAID',
        },
        {
          employeeId: 'EMP-102',
          name: 'Priya Patel',
          email: 'priya.patel@paygate.corp',
          phone: '+91 98765 43211',
          department: 'Product',
          designation: 'Senior Product Manager',
          salary: 12000000,
          currency: 'INR',
          bankName: 'ICICI Bank',
          accountNumber: '•••• 7712',
          ifscCode: 'ICIC0000987',
          status: 'ACTIVE',
          paymentStatus: 'PENDING',
        },
        {
          employeeId: 'EMP-103',
          name: 'Rohan Verma',
          email: 'rohan.verma@paygate.corp',
          phone: '+91 98765 43212',
          department: 'Engineering',
          designation: 'Frontend Lead',
          salary: 11000000,
          currency: 'INR',
          bankName: 'Axis Bank',
          accountNumber: '•••• 9104',
          ifscCode: 'UTIB0000542',
          status: 'ACTIVE',
          paymentStatus: 'PENDING',
        },
        {
          employeeId: 'EMP-104',
          name: 'Ananya Iyer',
          email: 'ananya.iyer@paygate.corp',
          phone: '+91 98765 43213',
          department: 'Design',
          designation: 'Principal Product Designer',
          salary: 9500000,
          currency: 'INR',
          bankName: 'State Bank of India',
          accountNumber: '•••• 3349',
          ifscCode: 'SBIN0004567',
          status: 'ACTIVE',
          paymentStatus: 'PAID',
        },
        {
          employeeId: 'EMP-105',
          name: 'Vikram Malhotra',
          email: 'vikram.m@paygate.corp',
          phone: '+91 98765 43214',
          department: 'Finance',
          designation: 'Finance Controller',
          salary: 10500000,
          currency: 'INR',
          bankName: 'HDFC Bank',
          accountNumber: '•••• 6620',
          ifscCode: 'HDFC0001234',
          status: 'ACTIVE',
          paymentStatus: 'PENDING',
        },
        {
          employeeId: 'EMP-106',
          name: 'Sneha Kulkarni',
          email: 'sneha.k@paygate.corp',
          phone: '+91 98765 43215',
          department: 'Marketing',
          designation: 'Growth Marketing Lead',
          salary: 8200000,
          currency: 'INR',
          bankName: 'Kotak Mahindra Bank',
          accountNumber: '•••• 1892',
          ifscCode: 'KKBK0000112',
          status: 'ACTIVE',
          paymentStatus: 'PENDING',
        },
        {
          employeeId: 'EMP-107',
          name: 'Devraj Sen',
          email: 'devraj.sen@paygate.corp',
          phone: '+91 98765 43216',
          department: 'Operations',
          designation: 'Operations Manager',
          salary: 7800000,
          currency: 'INR',
          bankName: 'IndusInd Bank',
          accountNumber: '•••• 5031',
          ifscCode: 'INDB0000331',
          status: 'ACTIVE',
          paymentStatus: 'PENDING',
        },
        {
          employeeId: 'EMP-108',
          name: 'Meera Nambiar',
          email: 'meera.n@paygate.corp',
          phone: '+91 98765 43217',
          department: 'Human Resources',
          designation: 'Head of People Ops',
          salary: 9200000,
          currency: 'INR',
          bankName: 'HDFC Bank',
          accountNumber: '•••• 8823',
          ifscCode: 'HDFC0001234',
          status: 'ACTIVE',
          paymentStatus: 'PAID',
        },
        {
          employeeId: 'EMP-109',
          name: 'Kavita Reddy',
          email: 'kavita.reddy@paygate.corp',
          phone: '+91 98765 43218',
          department: 'Engineering',
          designation: 'DevOps & Cloud Architect',
          salary: 13000000,
          currency: 'INR',
          bankName: 'ICICI Bank',
          accountNumber: '•••• 2911',
          ifscCode: 'ICIC0000987',
          status: 'ACTIVE',
          paymentStatus: 'PENDING',
        },
        {
          employeeId: 'EMP-110',
          name: 'Siddharth Roy',
          email: 'siddharth.roy@paygate.corp',
          phone: '+91 98765 43219',
          department: 'Sales',
          designation: 'Enterprise Account Executive',
          salary: 8800000,
          currency: 'INR',
          bankName: 'Yes Bank',
          accountNumber: '•••• 4120',
          ifscCode: 'YESB0000456',
          status: 'ACTIVE',
          paymentStatus: 'PENDING',
        },
      ];

      for (const emp of initialEmployees) {
        await prisma.employee.create({ data: emp });
      }
      logger.info('Initialized default company employees');
    } catch (err) {
      logger.error('Failed to seed initial employees', { error: err });
    }
  }

  async listEmployees(params?: {
    search?: string;
    department?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ employees: Employee[]; total: number }> {
    await this.initializeSeedIfEmpty();

    const limit = params?.limit ?? 100;
    const offset = params?.offset ?? 0;

    const where: any = {};

    if (params?.department && params.department !== 'ALL') {
      where.department = params.department;
    }

    if (params?.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { employeeId: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { designation: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [employees, total] = await prisma.$transaction([
      prisma.employee.findMany({
        where,
        orderBy: { employeeId: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.employee.count({ where }),
    ]);

    return { employees, total };
  }

  async getEmployeeById(id: string): Promise<Employee> {
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id }, { employeeId: id }],
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee', id);
    }

    return employee;
  }

  async createEmployee(input: EmployeeInput): Promise<Employee> {
    let employeeId = input.employeeId?.trim();
    if (!employeeId) {
      const count = await prisma.employee.count();
      employeeId = `EMP-${(count + 101).toString()}`;
    }

    const existing = await prisma.employee.findUnique({
      where: { employeeId },
    });

    if (existing) {
      throw new Error(`Employee with ID ${employeeId} already exists`);
    }

    return prisma.employee.create({
      data: {
        employeeId,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        department: input.department,
        designation: input.designation,
        salary: Number(input.salary),
        currency: (input.currency || 'INR').toUpperCase(),
        bankName: input.bankName || null,
        accountNumber: input.accountNumber || null,
        ifscCode: input.ifscCode || null,
        status: input.status || 'ACTIVE',
        paymentStatus: 'PENDING',
      },
    });
  }

  async updateEmployee(id: string, input: Partial<EmployeeInput>): Promise<Employee> {
    const employee = await this.getEmployeeById(id);

    return prisma.employee.update({
      where: { id: employee.id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.email ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.department ? { department: input.department } : {}),
        ...(input.designation ? { designation: input.designation } : {}),
        ...(input.salary !== undefined ? { salary: Number(input.salary) } : {}),
        ...(input.currency ? { currency: input.currency.toUpperCase() } : {}),
        ...(input.bankName !== undefined ? { bankName: input.bankName } : {}),
        ...(input.accountNumber !== undefined ? { accountNumber: input.accountNumber } : {}),
        ...(input.ifscCode !== undefined ? { ifscCode: input.ifscCode } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    });
  }

  async deleteEmployee(id: string): Promise<Employee> {
    const employee = await this.getEmployeeById(id);
    return prisma.employee.delete({
      where: { id: employee.id },
    });
  }

  async bulkUpsert(employees: EmployeeInput[]): Promise<{
    imported: number;
    created: number;
    updated: number;
    errors: Array<{ index: number; row: EmployeeInput; error: string }>;
  }> {
    let created = 0;
    let updated = 0;
    const errors: Array<{ index: number; row: EmployeeInput; error: string }> = [];

    for (let i = 0; i < employees.length; i++) {
      const row = employees[i];
      try {
        if (!row.name || !row.department || !row.salary) {
          throw new Error('Missing required fields: name, department, salary');
        }

        let empId = row.employeeId?.trim();
        if (!empId) {
          empId = `EMP-${(100 + i + Math.floor(Math.random() * 900))}`;
        }

        const existing = await prisma.employee.findUnique({
          where: { employeeId: empId },
        });

        if (existing) {
          await prisma.employee.update({
            where: { id: existing.id },
            data: {
              name: row.name,
              email: row.email || existing.email,
              phone: row.phone || existing.phone,
              department: row.department,
              designation: row.designation || existing.designation,
              salary: Number(row.salary),
              currency: (row.currency || existing.currency).toUpperCase(),
              bankName: row.bankName || existing.bankName,
              accountNumber: row.accountNumber || existing.accountNumber,
              ifscCode: row.ifscCode || existing.ifscCode,
              status: row.status || existing.status,
            },
          });
          updated++;
        } else {
          await prisma.employee.create({
            data: {
              employeeId: empId,
              name: row.name,
              email: row.email || `${empId.toLowerCase()}@paygate.corp`,
              phone: row.phone || null,
              department: row.department,
              designation: row.designation || 'Staff Member',
              salary: Number(row.salary),
              currency: (row.currency || 'INR').toUpperCase(),
              bankName: row.bankName || 'HDFC Bank',
              accountNumber: row.accountNumber || '•••• ' + Math.floor(1000 + Math.random() * 9000),
              ifscCode: row.ifscCode || 'HDFC0001234',
              status: row.status || 'ACTIVE',
              paymentStatus: 'PENDING',
            },
          });
          created++;
        }
      } catch (err: any) {
        errors.push({
          index: i + 1,
          row,
          error: err.message || 'Validation error',
        });
      }
    }

    return {
      imported: created + updated,
      created,
      updated,
      errors,
    };
  }
}

export const employeeService = new EmployeeService();
