import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

/**
 * Brand-styled Radix Dialog (ADR-0025). Business job: immersive media
 * inspection (gallery lightbox) without leaving the page. Radix provides
 * focus trapping, Escape-to-close, scroll locking and ARIA wiring.
 */

const Root = DialogPrimitive.Root
const Trigger = DialogPrimitive.Trigger
const Close = DialogPrimitive.Close

const Overlay = ({ className = '', ...props }: ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) => (
  <DialogPrimitive.Overlay
    className={`fixed inset-0 z-[90] bg-brand-charcoal/70 backdrop-blur-sm data-[state=open]:animate-[fadeIn_180ms_ease-out] ${className}`}
    {...props}
  />
)

const Content = ({ className = '', children, ...props }: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) => (
  <DialogPrimitive.Portal>
    <Overlay />
    <DialogPrimitive.Content
      className={`fixed z-[95] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-4xl w-[92vw] outline-none data-[state=open]:animate-[dialogIn_200ms_ease-out] ${className}`}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white text-brand-forest shadow-xl flex items-center justify-center hover:bg-brand-warmCard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ochre"
        aria-label="Close dialog"
      >
        <span className="material-symbols-outlined">close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
)

/** Accessible title for screen readers when the visible UI carries no heading. */
const HiddenTitle = ({ children }: { children: ReactNode }) => (
  <VisuallyHidden.Root asChild>
    <DialogPrimitive.Title>{children}</DialogPrimitive.Title>
  </VisuallyHidden.Root>
)

const HiddenDescription = ({ children }: { children: ReactNode }) => (
  <VisuallyHidden.Root asChild>
    <DialogPrimitive.Description>{children}</DialogPrimitive.Description>
  </VisuallyHidden.Root>
)

export const Dialog = Object.assign(Root, { Trigger, Close, Content, HiddenTitle, HiddenDescription })
