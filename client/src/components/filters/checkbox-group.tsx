import { CheckboxGroup as CheckboxGroupPrimitive } from '@base-ui/react/checkbox-group';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface CheckboxGroupProps {
  legend: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string[];
  onValueChange: (value: string[]) => void;
  /** Monospace labels line up numeric ranges such as "51–200". */
  mono?: boolean;
}

export function CheckboxGroup({
  legend,
  options,
  value,
  onValueChange,
  mono,
}: CheckboxGroupProps) {
  return (
    <fieldset className="flex flex-col">
      <legend className="mb-2 label-caps">{legend}</legend>
      <CheckboxGroupPrimitive
        value={value}
        onValueChange={(next) => onValueChange(next)}
        className="grid grid-cols-2 gap-x-3 gap-y-2"
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2"
          >
            <Checkbox value={option.value} />
            <span className={cn(mono && 'font-mono text-xs')}>
              {option.label}
            </span>
          </label>
        ))}
      </CheckboxGroupPrimitive>
    </fieldset>
  );
}
