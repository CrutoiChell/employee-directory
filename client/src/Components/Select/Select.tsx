import * as RadixSelect from '@radix-ui/react-select';
import { Icon } from '../Icon/Icon';
import './Select.css';

type SelectOption = { value: string; label: string };

type SelectProps = {
  id: string;
  label: string;
  value: string;
  options: readonly SelectOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
};

function encodeValue(value: string) {
  // Radix reserves the empty string; keep the application's empty filter valid.
  return value === '' ? 'empty:' : `value:${value}`;
}

export function Select({
  id,
  label,
  value,
  options,
  onValueChange,
  disabled = false,
}: SelectProps) {
  function handleValueChange(encoded: string) {
    onValueChange(encoded === 'empty:' ? '' : encoded.slice('value:'.length));
  }

  return (
    <RadixSelect.Root
      value={encodeValue(value)}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <RadixSelect.Trigger
        className="select__trigger"
        id={id}
        aria-label={label}
      >
        <span className="select__value">
          <RadixSelect.Value />
        </span>
        <RadixSelect.Icon asChild>
          <Icon name="arrow" className="select__arrow" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="select__content"
          aria-label={label}
          position="popper"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          avoidCollisions
        >
          <RadixSelect.Viewport className="select__viewport">
            {options.map(function option(item) {
              return (
                <RadixSelect.Item
                  className="select__item"
                  key={item.value}
                  value={encodeValue(item.value)}
                >
                  <RadixSelect.ItemText>{item.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="select__indicator">
                    <Icon name="check" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              );
            })}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
