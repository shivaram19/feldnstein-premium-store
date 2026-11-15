import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import type { ComponentPropsWithoutRef } from 'react'

/**
 * Brand-styled Radix RadioGroup (ADR-0025). Business job: variant selection —
 * the PDP's most consequential interaction. Radix supplies roving tabindex,
 * full arrow-key navigation and ASTATE="checked" semantics that screen readers
 * announce as a true radio group ("1 litre, selected, 2 of 4").
 */

const Root = ({ className = '', ...props }: ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>) => (
  <RadioGroupPrimitive.Root className={className} {...props} />
)

const Item = ({ className = '', ...props }: ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>) => (
  <RadioGroupPrimitive.Item
    className={`group text-left rounded-xl border-2 bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ochre/60 data-[state=checked]:border-brand-forest data-[state=unchecked]:border-brand-border hover:data-[state=unchecked]:border-brand-forest/40 ${className}`}
    {...props}
  />
)

const Indicator = RadioGroupPrimitive.Indicator

export const RadioGroup = Object.assign(Root, { Item, Indicator })
