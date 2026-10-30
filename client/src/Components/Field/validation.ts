export type Errors = Record<string, string>;

export function getErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Errors = {};
  for (const issue of issues)
    if (!errors[String(issue.path[0])])
      errors[String(issue.path[0])] = issue.message;
  return errors;
}

export function focusError(form: HTMLFormElement, errors: Errors) {
  const field = form.elements.namedItem(Object.keys(errors)[0]);
  if (field instanceof HTMLElement) field.focus();
}
