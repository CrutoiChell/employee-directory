import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Icon } from '../../Components/Icon/Icon';
import { Header } from '../../Components/Header/Header';
import { EmployeeForm } from '../../Components/EmployeeForm/EmployeeForm';
import { EmployeeFilters } from '../../Components/EmployeeFilters/EmployeeFilters';
import { EmployeeList } from '../../Components/EmployeeList/EmployeeList';
import { errorMessage, useGetEmployeesQuery } from '../../App/apiSlice';
import type { User } from '../../types';
import './Employees.css';

const employeePlural = new Intl.PluralRules('ru-RU');

function formatEmployeeCount(count: number) {
  const form = employeePlural.select(count);
  const noun =
    form === 'one'
      ? 'сотрудник'
      : form === 'few'
        ? 'сотрудника'
        : 'сотрудников';
  return `${count.toLocaleString('ru-RU')} ${noun}`;
}

export function Employees() {
  const user = useOutletContext<User>();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const {
    data,
    isFetching: loading,
    error: queryError,
    refetch,
  } = useGetEmployeesQuery({ search: query, department, page });
  const error = queryError ? errorMessage(queryError) : '';
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);
  const [composing, setComposing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(function title() {
    document.title = 'Сотрудники — Корпоративный справочник';
  }, []);
  useEffect(
    function debounce() {
      if (composing) return;
      const timer = setTimeout(
        function commit() {
          setQuery(search.trim());
          setPage(1);
        },
        search ? 300 : 0,
      );
      return function cleanup() {
        clearTimeout(timer);
      };
    },
    [search, composing],
  );
  useEffect(
    function clampPage() {
      if (!loading && data && data.page !== page) setPage(data.page);
    },
    [data, page, loading],
  );
  function resetFilters() {
    setSearch('');
    setQuery('');
    setDepartment('');
    setPage(1);
    searchRef.current?.focus();
  }
  return (
    <div className="app">
      <Header user={user} />
      <main className="directory">
        <div className="directory__heading">
          <div>
            <h1>Сотрудники</h1>
            <p className="directory__summary">
              {data ? formatEmployeeCount(data.overall) : '\u00a0'}
            </p>
          </div>
          <button
            className="button button--primary directory__add"
            onClick={function open() {
              setAdding(true);
            }}
          >
            <Icon name="plus" />
            Добавить сотрудника
          </button>
        </div>
        <section
          className="directory__panel"
          aria-label="Справочник сотрудников"
        >
          <EmployeeFilters
            search={search}
            setSearch={setSearch}
            department={department}
            setDepartment={setDepartment}
            composing={composing}
            setComposing={setComposing}
            departments={data?.departments ?? []}
            searchRef={searchRef}
            onCommit={setQuery}
            onResetPage={function resetPage() {
              setPage(1);
            }}
          />
          <div className="directory__results" aria-live="polite">
            <span>
              {loading
                ? data
                  ? 'Обновление…'
                  : 'Загрузка сотрудников…'
                : error
                  ? 'Не удалось обновить список'
                  : query || department
                    ? `Найдено: ${data?.total ?? 0}`
                    : ''}
            </span>
            {(search || department) && (
              <button className="link" onClick={resetFilters}>
                Сбросить фильтры
              </button>
            )}
          </div>
          <EmployeeList
            data={data}
            loading={loading}
            error={error}
            query={query}
            department={department}
            page={page}
            onRetry={function retry() {
              void refetch();
            }}
            onResetFilters={resetFilters}
            onAdd={function open() {
              setAdding(true);
            }}
            onPageChange={setPage}
          />
        </section>
      </main>
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {notice && (
          <div className="toast">
            <Icon name="check" />
            <span>{notice}</span>
            <button
              className="button button--icon"
              aria-label="Закрыть уведомление"
              onClick={function close() {
                setNotice('');
              }}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
      </div>
      {adding && (
        <EmployeeForm
          onClose={function close() {
            setAdding(false);
          }}
          onAdded={function added() {
            setAdding(false);
            setNotice('Сотрудник добавлен в справочник.');
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
