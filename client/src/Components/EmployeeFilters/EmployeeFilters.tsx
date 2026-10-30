import type { RefObject } from 'react';
import { Icon } from '../Icon/Icon';
import { Select as DepartmentSelect } from '../Select/Select';
import './EmployeeFilters.css';

type Props = {
  search: string;
  setSearch: (value: string) => void;
  department: string;
  setDepartment: (value: string) => void;
  composing: boolean;
  setComposing: (value: boolean) => void;
  departments: string[];
  searchRef: RefObject<HTMLInputElement | null>;
  onCommit: (value: string) => void;
  onResetPage: () => void;
};

export function EmployeeFilters({
  search,
  setSearch,
  department,
  setDepartment,
  composing,
  setComposing,
  departments,
  searchRef,
  onCommit,
  onResetPage,
}: Props) {
  return (
    <div className="filters">
      <form
        noValidate
        className="filters__search"
        role="search"
        onSubmit={function submit(event) {
          event.preventDefault();
          if (!composing) {
            onCommit(search.trim());
            onResetPage();
          }
        }}
      >
        <label className="sr-only" htmlFor="search">
          Поиск по ФИО
        </label>
        <Icon name="search" />
        <input
          ref={searchRef}
          id="search"
          className="filters__input"
          placeholder="Поиск по ФИО"
          value={search}
          maxLength={150}
          onCompositionStart={function start() {
            setComposing(true);
          }}
          onCompositionEnd={function end() {
            setComposing(false);
          }}
          onChange={function change(event) {
            setSearch(event.target.value);
          }}
        />
        {search && (
          <button
            className="filters__clear"
            type="button"
            aria-label="Очистить поиск"
            onClick={function clear() {
              setSearch('');
              onCommit('');
              onResetPage();
              searchRef.current?.focus();
            }}
          >
            <Icon name="close" />
          </button>
        )}
      </form>
      <div className="filters__department">
        <label className="sr-only" htmlFor="department-filter">
          Фильтр по отделу
        </label>
        <DepartmentSelect
          id="department-filter"
          label="Фильтр по отделу"
          value={department}
          onValueChange={function change(value) {
            setDepartment(value);
            onResetPage();
          }}
          options={[
            { value: '', label: 'Все отделы' },
            ...departments.map(function option(item) {
              return { value: item, label: item };
            }),
          ]}
        />
      </div>
    </div>
  );
}
