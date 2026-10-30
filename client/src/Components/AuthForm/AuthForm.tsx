import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Field } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import { Link } from 'react-router-dom';
import './AuthForm.css';
import { getErrors, focusError, type Errors } from '../Field/validation';
import {
  authenticate,
  errorMessage,
  useRegisterMutation,
  useLoginMutation,
} from '../../App/apiSlice';
import { credentialsSchema } from '../../../../shared/validation';

export function AuthForm({
  mode,
  notice = '',
}: {
  mode: 'login' | 'registration';
  notice?: string;
}) {
  const register = mode === 'registration';
  const [registerUser] = useRegisterMutation();
  const [login] = useLoginMutation();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  useEffect(
    function title() {
      document.title = `${register ? 'Регистрация' : 'Вход'} — Сотрудники`;
    },
    [register],
  );
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    const form = event.currentTarget;
    const result = credentialsSchema.safeParse(
      Object.fromEntries(new FormData(form)),
    );
    if (!result.success) {
      const fields = getErrors(result.error.issues);
      setErrors(fields);
      focusError(form, fields);
      return;
    }
    setErrors({});
    setError('');
    setBusy(true);
    busyRef.current = true;
    try {
      await authenticate(register ? registerUser : login, result.data);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }
  return (
    <main className="auth">
      <div className="auth__brand">
        <span className="brand__mark">
          <Icon name="people" />
        </span>
        <span>Сотрудники</span>
      </div>
      <section className="auth__card" aria-labelledby="auth-title">
        <h1 id="auth-title" className="auth__title">
          {register ? 'Создайте аккаунт' : 'Добро пожаловать'}
        </h1>
        <p className="auth__description">
          {register
            ? 'Создайте аккаунт для доступа к справочнику.'
            : 'Введите email и пароль.'}
        </p>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        <form
          noValidate
          onSubmit={handleSubmit}
          onChange={function clearError(event) {
            const name =
              event.target instanceof HTMLInputElement ? event.target.name : '';
            setErrors(function clear(previous) {
              return { ...previous, [name]: '' };
            });
            setError('');
          }}
          aria-busy={busy}
        >
          <Field
            name="email"
            label="Email"
            type="email"
            autoComplete="username"
            maxLength={254}
            error={errors.email}
          />
          <Field
            name="password"
            label="Пароль"
            type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            maxLength={128}
            hint={register ? 'От 8 до 128 символов.' : undefined}
            error={errors.password}
          />
          <div className="auth__feedback" aria-live="polite">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
          <button
            className="button button--primary auth__submit"
            disabled={busy}
            type="submit"
          >
            {busy ? 'Подождите…' : register ? 'Зарегистрироваться' : 'Войти'}
            {!busy && <Icon name="arrow" />}
          </button>
        </form>
        <p className="auth__switch">
          {register ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
          <Link
            className="link"
            aria-disabled={busy}
            tabIndex={busy ? -1 : undefined}
            to={register ? '/login' : '/registration'}
            onClick={function handleSwitch(event) {
              if (busy) event.preventDefault();
            }}
          >
            {register ? 'Войти' : 'Зарегистрироваться'}
          </Link>
        </p>
      </section>
    </main>
  );
}
