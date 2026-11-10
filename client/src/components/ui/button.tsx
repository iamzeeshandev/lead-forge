import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:border-border disabled:bg-background disabled:text-subtle aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border-input bg-popover text-foreground hover:bg-secondary',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-divider',
        ghost: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        destructive:
          'border-destructive bg-destructive text-white hover:bg-destructive/90',
        'destructive-outline':
          'border-destructive bg-popover text-destructive hover:bg-destructive/5',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-3.5 text-sm',
        sm: 'h-7 px-2.5 text-xs',
        lg: 'h-9 px-4 text-sm',
        icon: 'size-8',
        'icon-sm': "size-7 [&_svg:not([class*='size-'])]:size-3",
      },
    },
    compoundVariants: [
      // Sizes set a height and padding; a text link should keep neither.
      { variant: 'link', className: 'h-auto px-0' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/**
 * For navigation, style a link instead: `<Link href="…" className={buttonVariants()}>`.
 * Rendering this Button as a link (`render={<Link />}`) makes Base UI add
 * role="button", so screen readers announce the link as a button.
 */
function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
