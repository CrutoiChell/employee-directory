import { z } from 'zod';

export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Введите корректный email.')
    .max(254, 'Не более 254 символов.'),
  password: z
    .string()
    .min(8, 'Используйте не менее 8 символов.')
    .max(128, 'Не более 128 символов.'),
});

export const employeeSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Введите ФИО: не менее 2 символов.')
    .max(150, 'Не более 150 символов.'),
  position: z
    .string()
    .trim()
    .min(2, 'Введите должность: не менее 2 символов.')
    .max(100, 'Не более 100 символов.'),
  department: z
    .string()
    .trim()
    .min(2, 'Введите отдел: не менее 2 символов.')
    .max(100, 'Не более 100 символов.'),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
export type Employee = EmployeeInput & { id: number };
export type User = { id: number; email: string };
