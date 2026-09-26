import { Request, Response, NextFunction } from 'express';
import { employeeService } from '../services/employee.service';

export async function listEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = req.query.search as string | undefined;
    const department = req.query.department as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await employeeService.listEmployees({ search, department, status, limit, offset });

    res.status(200).json({
      success: true,
      data: result.employees,
      meta: {
        total: result.total,
        limit,
        offset,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employee = await employeeService.getEmployeeById(req.params.id);
    res.status(200).json({
      success: true,
      data: employee,
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employee = await employeeService.createEmployee(req.body);
    res.status(201).json({
      success: true,
      data: employee,
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employee = await employeeService.updateEmployee(req.params.id, req.body);
    res.status(200).json({
      success: true,
      data: employee,
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employee = await employeeService.deleteEmployee(req.params.id);
    res.status(200).json({
      success: true,
      data: employee,
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function bulkImportEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employees = Array.isArray(req.body) ? req.body : req.body.employees;
    if (!Array.isArray(employees)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Expected an array of employees' },
      });
      return;
    }

    const result = await employeeService.bulkUpsert(employees);
    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}
