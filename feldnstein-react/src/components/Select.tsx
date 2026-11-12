import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

export interface SelectOption {
  value: number
  label: string
}

/**
 * Branded dropdown in the shadcn Select pattern (trigger + floating listbox,
 * full keyboard nav, ARIA combobox) without adopting a second design system
 * (ADR-0022). Replaces the native <select>, whose popup can't be styled.
 */
export default function Select({ ariaLabel, options, value, onChange }: {
  ariaLabel: string
  options: SelectOption[]
  value: number
  onChange: (value: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(value)
  const [openUp, setOpenUp] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selected = options.find(o => o.value === value) ?? options[0]

  useEffect(() => setHighlight(value), [value])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const toggle = () => {
    const next = !open
    if (next && triggerRef.current) {
      // flip upward when the panel would overflow the viewport bottom
      setOpenUp(triggerRef.current.getBoundingClientRect().bottom > window.innerHeight - 300)
    }
    setOpen(next)
  }

  const pick = (v: number) => {
    onChange(v)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggle()
      }
      return
    }
    const idx = options.findIndex(o => o.value === highlight)
    if (e.key === 'Escape') {
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(options[Math.min(idx + 1, options.length - 1)].value)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(options[Math.max(idx - 1, 0)].value)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(highlight)
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        ref={triggerRef}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="input !flex items-center justify-between gap-2 text-left font-semibold"
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        <span className="truncate">{selected?.label}</span>
        <span
          className="material-symbols-outlined text-base text-brand-subtle transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute left-0 right-0 z-50 bg-white border border-brand-border rounded-xl shadow-2xl max-h-60 overflow-y-auto p-1 ${
            openUp ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                o.value === highlight ? 'bg-brand-warmCard' : ''
              } ${o.value === value ? 'font-bold text-brand-forest' : 'text-brand-charcoal'}`}
              onMouseEnter={() => setHighlight(o.value)}
              onClick={() => pick(o.value)}
            >
              <span>{o.label}</span>
              {o.value === value && <span className="material-symbols-outlined text-base text-brand-forest" aria-hidden="true">check</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
