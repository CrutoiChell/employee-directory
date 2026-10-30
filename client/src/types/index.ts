import type { Employee } from '../../../shared/validation';
export type { Employee, EmployeeInput, User } from '../../../shared/validation';

export type DirectoryData = {
  employees: Employee[];
  total: number;
  overall: number;
  departments: string[];
  page: number;
  pages: number;
};
