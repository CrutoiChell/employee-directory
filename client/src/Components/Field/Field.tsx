import { useState } from 'react';
import './Field.css';

export function Field({
  name,
  label,
  error,
  type = 'text',
  autoComplete,
  maxLength,
  hint,
  autoFocus = false,
}: {
  name: string;
  label: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
  hint?: string;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label className="field__label" htmlFor={name}>
        {label}{' '}
        <span className="field__required" aria-hidden="true">
          *
        </span>
      </label>
      <div className="field__control">
        <input
          className={`field__input${type === 'password' ? ' field__input--password' : ''}`}
          id={name}
          name={name}
          type={type === 'password' && visible ? 'text' : type}
          required
          maxLength={maxLength}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${name}-help` : undefined}
        />
        {type === 'password' && (
          <button
            className="field__reveal"
            type="button"
            aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
            aria-pressed={visible}
            onClick={function toggle() {
              setVisible(!visible);
            }}
          >
            {visible ? 'Скрыть' : 'Показать'}
          </button>
        )}
      </div>
      <div
        className={`field__help${error ? ' field__help--error' : ''}`}
        id={`${name}-help`}
      >
        {error || hint || '\u00a0'}
      </div>
    </div>
  );
}
