import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Plus, Wallet, Pencil, Trash2 } from 'lucide-react'
import { OPERATIONAL_COSTS } from '../../graphql/queries'
import {
  RECORD_OPERATIONAL_COST,
  UPDATE_OPERATIONAL_COST,
  DELETE_OPERATIONAL_COST,
} from '../../graphql/mutations'
import { useFarm } from '../../context/FarmContext'
import SubmitButton from '../../components/ui/SubmitButton'

const emptyForm = {
  category: 'CASUAL_LABOUR',
  description: '',
  amount: '',
  dateIncurred: '',
  payee: '',
  notes: '',
}

const CATEGORIES = [
  'CASUAL_LABOUR',
  'WAGES',
  'EQUIPMENT',
  'UTILITIES',
  'MAINTENANCE',
  'TRANSPORT',
  'OTHER',
]

const CATEGORY_LABELS: Record<string, string> = {
  CASUAL_LABOUR: 'Casual Labour',
  WAGES: 'Staff / Manager Wages',
  EQUIPMENT: 'Equipment & Amenities',
  UTILITIES: 'Utilities',
  MAINTENANCE: 'Repairs & Maintenance',
  TRANSPORT: 'Transport',
  OTHER: 'Other',
}

const CATEGORY_BADGE: Record<string, string> = {
  CASUAL_LABOUR: 'bg-blue-100 text-blue-700',
  WAGES: 'bg-purple-100 text-purple-700',
  EQUIPMENT: 'bg-orange-100 text-orange-700',
  UTILITIES: 'bg-yellow-100 text-yellow-700',
  MAINTENANCE: 'bg-red-100 text-red-700',
  TRANSPORT: 'bg-teal-100 text-teal-700',
  OTHER: 'bg-gray-100 text-gray-700',
}

export default function OperationalCostsPage() {
  const { activeFarmId, canEditActiveFarm } = useFarm()
  const skip = !activeFarmId
  const [showModal, setShowModal] = useState(false)
  const [editingCost, setEditingCost] = useState<any | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')

  const { data, refetch } = useQuery(OPERATIONAL_COSTS, {
    variables: { farmId: activeFarmId, category: categoryFilter || null },
    skip,
  })

  const [recordCost, { loading: recording }] = useMutation(RECORD_OPERATIONAL_COST, {
    onCompleted: () => {
      refetch()
      setShowModal(false)
    },
  })
  const [updateCost, { loading: updating }] = useMutation(UPDATE_OPERATIONAL_COST, {
    onCompleted: () => {
      refetch()
      setEditingCost(null)
    },
  })
  const [deleteCost] = useMutation(DELETE_OPERATIONAL_COST, {
    onCompleted: () => refetch(),
  })

  const costs = data?.operationalCosts ?? []
  const total = costs.reduce((s: number, c: any) => s + Number(c.amount), 0)

  const [form, setForm] = useState(emptyForm)

  if (!activeFarmId)
    return <div className="text-gray-400 text-center mt-20">Select a farm first.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Total costs: <strong className="text-gray-800">KES {total.toLocaleString()}</strong>
          <span className="mx-2">·</span>
          {costs.length} entries
        </div>
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm select-field pr-8"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setForm(emptyForm)
              setShowModal(true)
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
          >
            <Plus size={14} /> Record Cost
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary-600" />
          <h2 className="font-semibold text-gray-700">Operational Costs</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              {['Description', 'Category', 'Date', 'Payee', 'Amount', 'Notes', ''].map((h) => (
                <th key={h} className="px-5 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {costs.map((c: any) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-5 py-2.5 font-medium">{c.description}</td>
                <td className="px-5 py-2.5">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_BADGE[c.category]}`}
                  >
                    {CATEGORY_LABELS[c.category] ?? c.category}
                  </span>
                </td>
                <td className="px-5 py-2.5">{c.dateIncurred}</td>
                <td className="px-5 py-2.5 text-gray-500">{c.payee || '–'}</td>
                <td className="px-5 py-2.5 font-semibold">
                  KES {Number(c.amount).toLocaleString()}
                </td>
                <td className="px-5 py-2.5 text-gray-400 truncate max-w-xs" title={c.notes}>
                  {c.notes || '–'}
                </td>
                <td className="px-5 py-2.5 text-right">
                  {canEditActiveFarm && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingCost(c)
                          setForm({
                            category: c.category,
                            description: c.description,
                            amount: String(c.amount),
                            dateIncurred: c.dateIncurred,
                            payee: c.payee ?? '',
                            notes: c.notes ?? '',
                          })
                        }}
                        className="text-gray-400 hover:text-primary-600"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCost({ variables: { costId: c.id } })}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {costs.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  No operational costs recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(showModal || editingCost) && (
        <Modal
          title={editingCost ? 'Edit Operational Cost' : 'Record Operational Cost'}
          onClose={() => {
            setShowModal(false)
            setEditingCost(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (editingCost) {
                updateCost({
                  variables: {
                    costId: editingCost.id,
                    input: { ...form, amount: +form.amount },
                  },
                })
              } else {
                recordCost({
                  variables: {
                    input: { ...form, farmId: activeFarmId, amount: +form.amount },
                  },
                })
              }
            }}
            className="space-y-4"
          >
            <F label="Category">
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={sel}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </F>
            <F label="Description" required>
              <input
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={inp}
                placeholder="e.g. Weeding - 3 casual workers"
              />
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Amount (KES)" required>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className={inp}
                />
              </F>
              <F label="Date Incurred" required>
                <input
                  required
                  type="date"
                  value={form.dateIncurred}
                  onChange={(e) => setForm((f) => ({ ...f, dateIncurred: e.target.value }))}
                  className={inp}
                />
              </F>
            </div>
            <F label="Payee / Supplier">
              <input
                value={form.payee}
                onChange={(e) => setForm((f) => ({ ...f, payee: e.target.value }))}
                className={inp}
                placeholder="e.g. worker name or shop"
              />
            </F>
            <F label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </F>
            <SubmitButton loading={editingCost ? updating : recording} className={btn}>
              {editingCost ? 'Save Changes' : 'Save Cost'}
            </SubmitButton>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: any) {
  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
function F({ label, children, required }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && ' *'}
      </label>
      {children}
    </div>
  )
}
const inp =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
const sel = `${inp} select-field pr-8`
const btn =
  'w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors'
