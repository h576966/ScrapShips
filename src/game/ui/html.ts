export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderSelectOptions<T extends string>(
  options: readonly SelectOption<T>[],
  selected: T
): string {
  return options
    .map(
      (option) =>
        `<option value="${escapeHtml(option.value)}" ${
          option.value === selected ? "selected" : ""
        }>${escapeHtml(option.label)}</option>`
    )
    .join("");
}
