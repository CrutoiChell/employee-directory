import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Field } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import './EmployeeForm.css';
import { getErrors, focusError, type Errors } from '../Field/validation';
import { errorMessage, useAddEmployeeMutation } from '../../App/apiSlice';
import { employeeSchema } from '../../../../shared/validation';

export function EmployeeForm({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [addEmployee] = useAddEmployeeMutation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  useEffect(function open() {
    const dialog = dialogRef.current;
    const previous = document.activeElement;
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>('input')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function cleanup() {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const controls = event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled)',
    );
    const first = controls[0];
    const last = controls[controls.length - 1];
    const focused = document.activeElement;
    if (
      event.shiftKey &&
      (focused === first || focused === event.currentTarget)
    ) {
      event.preventDefault();
      last?.focus();
    } else if (
      !event.shiftKey &&
      (focused === last || focused === event.currentTarget)
    ) {
      event.preventDefault();
      first?.focus();
    }
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    const form = event.currentTarget;
    const result = employeeSchema.safeParse(
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
      await addEmployee(result.data).unwrap();
      onAdded();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }
  return (
    <dialog
      className="dialog"
      ref={dialogRef}
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      onKeyDown={handleKeyDown}
      onCancel={function cancel(event) {
        event.preventDefault();
        if (!busyRef.current) onClose();
      }}
    >
      <div className="dialog__heading">
        <div>
          <h2 id="dialog-title">Новый сотрудник</h2>
          <p id="dialog-description">
            Добавьте коллегу в корпоративный справочник.
          </p>
        </div>
        <button
          className="button button--icon"
          type="button"
          aria-label="Закрыть форму"
          disabled={busy}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <form
        noValidate
        onSubmit={handleSubmit}
        aria-busy={busy}
        onChange={function clearError(event) {
          const name =
            event.target instanceof HTMLInputElement ? event.target.name : '';
          setErrors(function clear(previous) {
            return { ...previous, [name]: '' };
          });
          setError('');
        }}
      >
        <p className="dialog__required">
          Все поля обязательны <span aria-hidden="true">*</span>
        </p>
        <Field
          name="fullName"
          label="ФИО"
          autoComplete="name"
          maxLength={150}
          error={errors.fullName}
          autoFocus
        />
        <Field
          name="position"
          label="Должность"
          autoComplete="organization-title"
          maxLength={100}
          error={errors.position}
        />
        <Field
          name="department"
          label="Отдел"
          maxLength={100}
          error={errors.department}
        />
        {error && (
          <p className="error dialog__error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog__actions">
          <button
            className="button button--secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className="button button--primary"
            disabled={busy}
            type="submit"
          >
            {busy ? 'Сохранение…' : 'Добавить'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
