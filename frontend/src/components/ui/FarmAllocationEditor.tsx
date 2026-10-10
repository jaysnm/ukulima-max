import { useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useQuery } from '@apollo/client'
import { MY_FARMS } from '../../graphql/queries'

export interface Allocation {
  farmId: string
  quantity: string
  plantingId?: string
}

interface PlantingOption {
  id: string
  label: string
}

interface FarmAllocationEditorProps {
  value: Allocation[]
  onChange: (next: Allocation[]) => void
  totalQuantity?: string
  unit?: string
  /** Plantings available per farm — a farm missing here gets no planting picker. */
  plantingsByFarm?: Record<string, PlantingOption[]>
}

/**
 * Purchases are often bought once and split across farms, so this lets a
 * farmer name each farm's explicit share instead of the purchase implicitly
 * belonging to whichever farm is active. Plantings can only be offered for
 * farms whose plantings this page has already loaded (normally just the
 * active farm) — other farms just get a farm + quantity row.
 *
 * With a single farm row there's nothing to split, so that row's quantity
 * is derived from the total automatically instead of asking for it a second
 * time — a purchase saved with zero allocations becomes permanently
 * invisible from every farm-scoped view, and the earlier design (a
 * separately-typed quantity per row, always) made that easy to trigger by
 * accident by filling in the total but not the row.
 */
export default function FarmAllocationEditor({
  value,
  onChange,
  totalQuantity,
  unit,
  plantingsByFarm,
}: FarmAllocationEditorProps) {
  const { data } = useQuery(MY_FARMS)
  const farms = data?.myFarms ?? []
  const singleRow = value.length === 1

  useEffect(() => {
    if (singleRow && totalQuantity !== undefined && value[0].quantity !== totalQuantity) {
      onChange([{ ...value[0], quantity: totalQuantity }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleRow, totalQuantity, value[0]?.quantity])

  const addRow = () => onChange([...value, { farmId: '', quantity: '' }])
  const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const updateRow = (i: number, patch: Partial<Allocation>) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))

  const allocatedTotal = value.reduce((s, a) => s + (Number(a.quantity) || 0), 0)

  return (
    <div className="space-y-2">
      {value.map((row, i) => {
        const plantingOptions = row.farmId ? plantingsByFarm?.[row.farmId] : undefined
        return (
          <div key={i} className="flex gap-2 items-start">
            <select
              value={row.farmId}
              onChange={(e) => updateRow(i, { farmId: e.target.value, plantingId: undefined })}
              className="flex-1 border border-gray-300 rounded-lg px-2.5 py-2 text-sm select-field"
            >
              <option value="">— select farm —</option>
              {farms.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {!singleRow && (
              <input
                type="number"
                step="0.001"
                value={row.quantity}
                onChange={(e) => updateRow(i, { quantity: e.target.value })}
                placeholder="Qty"
                className="w-24 border border-gray-300 rounded-lg px-2.5 py-2 text-sm"
              />
            )}
            {plantingOptions && plantingOptions.length > 0 && (
              <select
                value={row.plantingId ?? ''}
                onChange={(e) => updateRow(i, { plantingId: e.target.value || undefined })}
                className="flex-1 border border-gray-300 rounded-lg px-2.5 py-2 text-sm select-field"
              >
                <option value="">— no specific planting —</option>
                {plantingOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
            {!singleRow && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="shrink-0 p-2 text-gray-400 hover:text-red-600"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )
      })}
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:text-primary-700"
      >
        <Plus className="w-3.5 h-3.5" /> Split with another farm
      </button>
      {!singleRow && totalQuantity && Number(totalQuantity) > 0 && (
        <p
          className={`text-xs ${allocatedTotal === Number(totalQuantity) ? 'text-gray-400' : 'text-orange-500'}`}
        >
          Allocated {allocatedTotal} / {totalQuantity} {unit ?? ''}
        </p>
      )}
    </div>
  )
}
