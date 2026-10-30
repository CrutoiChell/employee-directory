import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { employeeSchema, type Employee } from '../../shared/validation.js';
import { createAuthorization } from '../middleware/authorize.js';

export function createEmployeesRouter(db: DatabaseSync) {
  const router = Router();
  router.use(createAuthorization(db));
  router.get('/', function list(req, res) {
    const search = String(req.query.search || '')
      .trim()
      .slice(0, 150)
      .toLocaleLowerCase('ru');
    const department = String(req.query.department || '').slice(0, 100);
    const page = Math.max(1, Math.min(100000, Number(req.query.page) || 1));
    // SQLite LOWER is ASCII-only; use Russian-aware matching for this small directory.
    const all = db
      .prepare('SELECT * FROM employees ORDER BY id DESC')
      .all() as unknown as Employee[];
    const filtered = all.filter(function matches(e) {
      return (
        e.fullName.toLocaleLowerCase('ru').includes(search) &&
        (!department || e.department === department)
      );
    });
    const pages = Math.max(1, Math.ceil(filtered.length / 10));
    const currentPage = Math.min(Math.floor(page), pages);
    res.json({
      employees: filtered.slice((currentPage - 1) * 10, currentPage * 10),
      total: filtered.length,
      overall: all.length,
      page: currentPage,
      pages,
      departments: [
        ...new Set(
          all.map(function getDepartment(e) {
            return e.department;
          }),
        ),
      ].sort(function sort(a, b) {
        return a.localeCompare(b, 'ru');
      }),
    });
  });
  router.post('/', function create(req, res) {
    const result = employeeSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        message: 'Проверьте поля сотрудника.',
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }
    const { fullName, position, department } = result.data;
    const row = db
      .prepare(
        'INSERT INTO employees (fullName, position, department) VALUES (?, ?, ?)',
      )
      .run(fullName, position, department);
    res
      .status(201)
      .json({ employee: { id: Number(row.lastInsertRowid), ...result.data } });
  });
  return router;
}
