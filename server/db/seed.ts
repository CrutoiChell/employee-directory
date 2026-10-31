import type { DatabaseSync } from 'node:sqlite';
import type { EmployeeInput } from '../../shared/validation.js';

const demoEmployees: EmployeeInput[] = [
  {
    fullName: 'Морозов Алексей Сергеевич',
    position: 'Frontend-разработчик',
    department: 'Разработка',
  },
  {
    fullName: 'Волкова Мария Андреевна',
    position: 'Продуктовый дизайнер',
    department: 'Дизайн',
  },
  {
    fullName: 'Соколов Дмитрий Алексеевич',
    position: 'Руководитель проектов',
    department: 'Управление проектами',
  },
  {
    fullName: 'Кузнецова Елена Викторовна',
    position: 'HR-менеджер',
    department: 'Персонал',
  },
  {
    fullName: 'Орлов Никита Павлович',
    position: 'Инженер по тестированию',
    department: 'Разработка',
  },
];

export function seedDatabase(db: DatabaseSync) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const applied = db
      .prepare('SELECT name FROM migrations WHERE name = ?')
      .get('demo-employees-v1');
    if (!applied) {
      const insert =
        db.prepare(`INSERT INTO employees (fullName, position, department)
        SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM employees WHERE fullName = ? AND position = ? AND department = ?)`);
      for (const employee of demoEmployees) {
        const { fullName, position, department } = employee;
        insert.run(
          fullName,
          position,
          department,
          fullName,
          position,
          department,
        );
      }
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(
        'demo-employees-v1',
      );
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
