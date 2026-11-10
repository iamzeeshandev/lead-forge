import type * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'field-sizing-content min-h-24 w-full resize-y rounded-md border border-input bg-popover px-2.5 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-subtle focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-background disabled:text-subtle aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
