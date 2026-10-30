import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useGetMeQuery, errorMessage } from '../../App/apiSlice';
import './SessionGate.css';

export function SessionGate() {
  const { data, error, isLoading, refetch } = useGetMeQuery();
  const { pathname } = useLocation();
  const unauthorized =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 401;
  if (isLoading)
    return (
      <main className="session-state" role="status">
        <span className="spinner" />
        <p>Проверяем сессию…</p>
      </main>
    );
  if (error && !unauthorized)
    return (
      <main className="session-state">
        <h1>Не удалось открыть справочник</h1>
        <p className="error" role="alert">
          {errorMessage(error)}
        </p>
        <button
          className="button button--primary"
          onClick={function retry() {
            void refetch();
          }}
        >
          Попробовать снова
        </button>
      </main>
    );
  const user = error ? null : data?.user;
  const authPage = pathname === '/login' || pathname === '/registration';
  if (!user && !authPage) return <Navigate to="/login" replace />;
  if (user && (authPage || pathname === '/'))
    return <Navigate to="/employees" replace />;
  return <Outlet context={user} />;
}
