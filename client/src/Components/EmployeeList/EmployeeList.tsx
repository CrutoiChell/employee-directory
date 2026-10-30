import { Icon } from '../Icon/Icon';
import type { DirectoryData } from '../../types';
import './EmployeeList.css';

type Props = {
  data?: DirectoryData;
  loading: boolean;
  error: string;
  query: string;
  department: string;
  page: number;
  onRetry: () => void;
  onResetFilters: () => void;
  onAdd: () => void;
  onPageChange: (page: number) => void;
};

export function EmployeeList({
  data,
  loading,
  error,
  query,
  department,
  page,
  onRetry,
  onResetFilters,
  onAdd,
  onPageChange,
}: Props) {
  const resultKey = data
    ? `${data.page}:${data.total}:${data.employees
        .map(function id(employee) {
          return employee.id;
        })
        .join(',')}`
    : 'initial';
  return (
    <>
      <div className="employees" aria-busy={loading}>
        <div className="employees__content" key={resultKey}>
          {error ? (
            <div className="empty" role="alert">
              <span className="empty__symbol">!</span>
              <h2>Не удалось загрузить список</h2>
              <p>{error}</p>
              <button
                className="button button--secondary"
                onClick={function retry() {
                  onRetry();
                }}
              >
                Попробовать снова
              </button>
            </div>
          ) : loading && !data ? (
            <div className="empty" role="status">
              <span className="spinner" />
              <p>Загружаем справочник…</p>
            </div>
          ) : data && data.employees.length > 0 ? (
            <table className="employees__table">
              <caption className="sr-only">
                Список сотрудников: ФИО, должность и отдел
              </caption>
              <thead>
                <tr>
                  <th scope="col">ФИО</th>
                  <th scope="col">Должность</th>
                  <th scope="col">Отдел</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map(function row(employee) {
                  const initials = employee.fullName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map(function initial(word) {
                      return word[0];
                    })
                    .join('');
                  return (
                    <tr key={employee.id}>
                      <td>
                        <div className="employees__person">
                          <span
                            className="employees__avatar"
                            aria-hidden="true"
                          >
                            {initials}
                          </span>
                          <span className="employees__name">
                            {employee.fullName}
                          </span>
                        </div>
                      </td>
                      <td data-label="Должность">{employee.position}</td>
                      <td data-label="Отдел">
                        <span className="badge">{employee.department}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty">
              <span className="empty__symbol">
                <Icon name={query || department ? 'search' : 'people'} />
              </span>
              <h2>
                {query || department
                  ? 'Ничего не найдено'
                  : 'Начните с первого сотрудника'}
              </h2>
              <p>
                {query || department
                  ? 'Попробуйте другое имя или выберите другой отдел.'
                  : 'Добавьте коллегу, чтобы его было легко найти в справочнике.'}
              </p>
              <button
                className="button button--secondary"
                onClick={
                  query || department
                    ? onResetFilters
                    : function open() {
                        onAdd();
                      }
                }
              >
                {query || department
                  ? 'Сбросить фильтры'
                  : 'Добавить сотрудника'}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="directory__footer">
        <span>
          {!error && data && data.total > 0
            ? `${(data.page - 1) * 10 + 1}–${Math.min(data.page * 10, data.total)} из ${data.total}`
            : '\u00a0'}
        </span>
        <nav className="pagination" aria-label="Страницы сотрудников">
          <button
            className="button button--icon"
            aria-label="Предыдущая страница"
            disabled={loading || Boolean(error) || !data || data.page <= 1}
            onClick={function previous() {
              onPageChange(page - 1);
            }}
          >
            <Icon name="arrow" className="icon--back" />
          </button>
          <span>
            {data?.page ?? 1} / {data?.pages ?? 1}
          </span>
          <button
            className="button button--icon"
            aria-label="Следующая страница"
            disabled={
              loading || Boolean(error) || !data || data.page >= data.pages
            }
            onClick={function next() {
              onPageChange(page + 1);
            }}
          >
            <Icon name="arrow" />
          </button>
        </nav>
      </div>
    </>
  );
}
