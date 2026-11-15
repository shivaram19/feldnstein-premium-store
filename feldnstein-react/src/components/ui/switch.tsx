import * as SwitchPrimitive from '@radix-ui/react-switch'

/**
 * Brand-styled Radix Switch (ADR-0025). Business job: the Kitchen Reserve
 * "Subscribe & Save" commitment — one tap converts a single purchase into a
 * standing 10% benefit. Radix gives keyboard toggle (Space), focus ring and
 * ARIA switch semantics; the label always states the real terms beside it.
 */
export default function Switch({ checked, onCheckedChange, ariaLabel }: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  ariaLabel: string
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      className="relative h-7 w-12 shrink-0 rounded-full bg-brand-border transition-colors data-[state=checked]:bg-brand-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ochre/60"
    >
      <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-6" />
    </SwitchPrimitive.Root>
  )
}
