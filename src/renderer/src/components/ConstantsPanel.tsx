import { Plus, Tag, Variable } from 'lucide-react'
import { useState } from 'react'
import { isConstantNameAvailable } from '../../../shared/validation'
import { useProjectStore } from '../store/useProjectStore'
import { IconButton } from './ui/IconButton'
import { IconInput } from './ui/IconInput'
import { SectionHeader } from './ui/SectionHeader'

export function ConstantsPanel(): React.JSX.Element {
  const constants = useProjectStore((state) => state.constants)
  const addConstant = useProjectStore((state) => state.addConstant)
  const updateConstant = useProjectStore((state) => state.updateConstant)
  const removeConstant = useProjectStore((state) => state.removeConstant)

  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = (): void => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Constant name is required.')
      return
    }

    if (!isConstantNameAvailable(trimmedName, constants)) {
      setError(`Constant "${trimmedName}" already exists.`)
      return
    }

    const parsedValue = parseConstantValue(value)
    addConstant({ name: trimmedName, value: parsedValue })
    setName('')
    setValue('')
    setError(null)
  }

  return (
    <section className="glass-panel p-4">
      <SectionHeader
        title="Constants"
        icon={Variable}
        help="Define reusable named values for column filters and automations. Use them in rules instead of typing the same literal each time, or reference them as {NAME} in output file patterns."
      />

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
        <IconInput
          icon={Tag}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name (e.g. CATEGORIA)"
        />
        <IconInput
          icon={Variable}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder='Value (e.g. "Zapatos")'
        />
        <IconButton icon={Plus} variant="primary" onClick={handleAdd}>
          Add
        </IconButton>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {constants.length === 0 ? (
        <p className="text-sm text-slate-500">Define reusable values for column filters.</p>
      ) : (
        <ul className="divide-y divide-white/40 rounded-xl border border-white/45">
          {constants.map((constant) => (
            <li key={constant.id} className="flex items-center gap-2 px-3 py-2">
              <div className="relative w-40">
                <Tag className="input-icon pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" strokeWidth={2} />
                <input
                  value={constant.name}
                  onChange={(event) => updateConstant(constant.id, { name: event.target.value })}
                  className="glass-input w-full py-1 pl-7 pr-2 text-sm"
                />
              </div>
              <span className="text-slate-400">=</span>
              <div className="relative min-w-0 flex-1">
                <Variable className="input-icon pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" strokeWidth={2} />
                <input
                  value={String(constant.value)}
                  onChange={(event) =>
                    updateConstant(constant.id, { value: parseConstantValue(event.target.value) })
                  }
                  className="glass-input w-full py-1 pl-7 pr-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeConstant(constant.id)}
                className="glass-button-ghost glass-button-sm text-slate-600 hover:border-red-200 hover:bg-red-50/90 hover:text-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function parseConstantValue(raw: string): string | number | boolean {
  const trimmed = raw.trim()
  if (trimmed.toLowerCase() === 'true') return true
  if (trimmed.toLowerCase() === 'false') return false
  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) return Number(trimmed)
  return raw
}
