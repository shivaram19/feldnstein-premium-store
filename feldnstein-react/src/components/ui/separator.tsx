import * as SeparatorPrimitive from '@radix-ui/react-separator'

/** Accessible horizontal/vertical rule with brand styling. */
export function Separator({ className = '', ...props }: Parameters<typeof SeparatorPrimitive.Root>[0]) {
  return (
    <SeparatorPrimitive.Root
      decorative
      orientation="horizontal"
      className={`h-px w-full bg-brand-border ${className}`}
      {...props}
    />
  )
}
