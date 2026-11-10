import { Input as InputPrimitive } from '@base-ui/react/input';
import type * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-8 w-full min-w-0 rounded-md border border-input bg-popover px-2.5 text-sm text-foreground transition-colors outline-none placeholder:text-subtle focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-background disabled:text-subtle aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
