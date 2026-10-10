import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Loader2, Plus } from 'lucide-react'
import { SUPPLIERS } from '../../graphql/queries'
import { CREATE_SUPPLIER } from '../../graphql/mutations'

const emptySupplier = { name: '', phone: '', location: '', notes: '' }

interface SupplierSelectProps {
  value: string
  onChange: (supplierId: string) => void
  className: string
}

/**
 * Suppliers are a shared, farm-independent directory (see Supplier model) —
 * this dropdown lists them all and, since most purchases are made from a
 * handful of repeat suppliers, lets a new one be added inline without
 * leaving the record being created. It's self-contained (queries suppliers
 * and creates them itself) so any purchase/application/treatment form can
 * drop it in for its "Supplier" field.
 */
export default function SupplierSelect({ value, onChange, className }: SupplierSelectProps) {
  const { data } = useQuery(SUPPLIERS)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptySupplier)

  const [createSupplier, { loading: creating }] = useMutation(CREATE_SUPPLIER, {
    // Written straight into the cache so the new supplier is selectable
    // immediately, without waiting on a refetch.
    update(cache, { data }) {
      if (!data?.createSupplier) return
      const existing = cache.readQuery<{ suppliers: any[] }>({ query: SUPPLIERS })
      cache.writeQuery({
        query: SUPPLIERS,
        data: { suppliers: [...(existing?.suppliers ?? []), data.createSupplier] },
      })
    },
    onCompleted: (d) => {
      onChange(d.createSupplier.id)
      setShowAdd(false)
      setForm(emptySupplier)
    },
  })

  const suppliers = data?.suppliers ?? []

  const handleSave = () => {
    if (!form.name.trim() || creating) return
    createSupplier({ variables: { input: form } })
  }

  return (
    <>
      <div className="flex gap-2">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
          <option value="">— none —</option>
          {suppliers.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="shrink-0 px-2.5 rounded-lg border border-gray-300 text-gray-500 hover:text-primary-600 hover:border-primary-300"
          title="Add new supplier"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Not a nested <form> — this renders inside the record form that
          SupplierSelect is embedded in, and nested <form> elements are
          invalid HTML, so the "Save" button below just calls the mutation
          directly instead of relying on form submission. */}
      {showAdd &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAdd(false)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Add Supplier</h3>
                <button
                  onClick={() => setShowAdd(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    autoFocus
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. Wakulima Agrovet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <button
                  type="button"
                  disabled={!form.name.trim() || creating}
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Supplier
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
