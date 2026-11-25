import { useState } from 'react'
import { isSoundMuted, setSoundMuted } from '../../hooks/useSoundFeedback'

const FIND_US = [
  { label: 'Instagram', href: 'https://instagram.com/feldnstein' },
  { label: 'YouTube', href: 'https://youtube.com/@feldnstein' },
  { label: 'Google', href: 'https://www.google.com/maps/search/?api=1&query=Feldnstein+Mothadaka+Guntur' },
]

/**
 * Copyright bar at the foot of the footer (matches feldnstein.com), plus:
 * - the sound preference toggle — autonomy over the sensory layer (ADR-0027)
 * - the Find-us row — cross-platform trust (citations-verified §D tension 5):
 *   the buyer checks Instagram/Google before purchasing; we make the check easy
 * - the no-AI-imagery line — authenticity as counter-positioning (tension 4)
 */
export default function FooterBottom() {
  const [muted, setMuted] = useState(isSoundMuted())

  const toggle = () => {
    const next = !muted
    setMuted(next)
    setSoundMuted(next)
  }

  return (
    <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/60">
      <div className="flex flex-col gap-1.5 items-center md:items-start">
        <p>© 2026 Feldnstein. All Rights Reserved. | Crafted with care, pressed with tradition.</p>
        <p className="text-[10px] text-white/40">
          Every photo and video on this site was shot at our Mothadaka mill. No AI-generated imagery.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-white/40">Find us</span>
          {FIND_US.map(f => (
            <a key={f.label} href={f.href} target="_blank" rel="noopener noreferrer"
               className="hover:text-brand-ochre transition-colors underline-offset-2 hover:underline">
              {f.label}
            </a>
          ))}
        </span>
        <button
          onClick={toggle}
          aria-pressed={!muted}
          className="inline-flex items-center gap-1.5 hover:text-brand-ochre transition-colors uppercase tracking-wider text-[10px] font-bold"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            {muted ? 'volume_off' : 'volume_up'}
          </span>
          Sound {muted ? 'off' : 'on'}
        </button>
      </div>
    </div>
  )
}
