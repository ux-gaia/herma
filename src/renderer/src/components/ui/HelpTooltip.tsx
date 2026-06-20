import { CircleHelp } from 'lucide-react'

interface HelpTooltipProps {
  text: string
}

export function HelpTooltip({ text }: HelpTooltipProps): React.JSX.Element {
  return (
    <span className="group/help relative inline-flex shrink-0">
      <button
        type="button"
        tabIndex={0}
        className="cursor-help rounded-full text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:text-slate-600 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        aria-label={text}
      >
        <CircleHelp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className={[
          'pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2',
          'rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-normal',
          'normal-case leading-relaxed tracking-normal text-slate-600 shadow-lg',
          'invisible opacity-0 transition-opacity duration-150',
          'group-hover/help:visible group-hover/help:opacity-100',
          'group-focus-within/help:visible group-focus-within/help:opacity-100'
        ].join(' ')}
      >
        {text}
      </span>
    </span>
  )
}
