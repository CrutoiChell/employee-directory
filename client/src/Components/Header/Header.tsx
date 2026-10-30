import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../Icon/Icon';
import { errorMessage, useLogoutMutation } from '../../App/apiSlice';
import type { User } from '../../types';
import './Header.css';

export function Header({ user }: { user: User }) {
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();
  const [logoutError, setLogoutError] = useState('');
  async function handleLogout() {
    if (loggingOut) return;
    setLogoutError('');
    try {
      await logout().unwrap();
    } catch (error) {
      setLogoutError(errorMessage(error));
    }
  }
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link
          className="brand"
          to="/employees"
          aria-label="Сотрудники — главная"
        >
          <span className="brand__mark">
            <Icon name="people" />
          </span>
          Сотрудники
        </Link>
        <div className="topbar__account">
          <span className="topbar__email">{user.email}</span>
          <button
            className="button button--quiet"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <Icon name="logout" />
            {loggingOut ? 'Выход…' : 'Выйти'}
          </button>
        </div>
      </div>
      {logoutError && (
        <p className="topbar__error error" role="alert">
          {logoutError}
        </p>
      )}
    </header>
  );
}
