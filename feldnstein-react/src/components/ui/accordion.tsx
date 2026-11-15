import * as AccordionPrimitive from '@radix-ui/react-accordion'
import type { ComponentPropsWithoutRef, ElementRef, ReactNode } from 'react'

/**
 * Brand-styled Radix Accordion (ADR-0025). Business job: content organization
 * that respects mobile scanning — FAQ answers and dense product facts stay
 * collapsed until asked for. Single-item-open by default (FAQ); pass
 * `type="multiple"` where independent scanning matters (product info tabs).
 */

const Root = AccordionPrimitive.Root

const Item = ({ className = '', ...props }: ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>) => (
  <AccordionPrimitive.Item
    className={`border-b border-brand-border ${className}`}
    {...props}
  />
)

const Trigger = ({ className = '', children, ...props }: ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      className={`group flex flex-1 items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-brand-forest transition-colors hover:text-brand-ochreDeep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ochre/50 rounded ${className}`}
      {...props}
    >
      {children}
      <span className="material-symbols-outlined shrink-0 text-brand-forest/60 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true">
        expand_more
      </span>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
)

const Content = ({ className = '', children, ...props }: ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>) => (
  <AccordionPrimitive.Content
    className="overflow-hidden data-[state=open]:animate-[accordionDown_200ms_ease-out] data-[state=closed]:animate-[accordionUp_160ms_ease-in]"
    {...props}
  >
    <div className={`pb-4 text-sm leading-relaxed text-brand-charcoal/80 ${className}`}>{children}</div>
  </AccordionPrimitive.Content>
)

// Keyframe names referenced above are registered in index.css.
export const Accordion = Object.assign(Root, { Item, Trigger, Content })
export type { ReactNode }
export type AccordionElement = ElementRef<typeof AccordionPrimitive.Root>
