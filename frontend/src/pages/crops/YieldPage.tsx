import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Plus, BarChart3, Pencil, Trash2 } from 'lucide-react'
import { PLANTINGS } from '../../graphql/queries'
import { RECORD_YIELD, UPDATE_YIELD, DELETE_YIELD } from '../../graphql/mutations'
import { useFarm } from '../../context/FarmContext'
import SubmitButton from '../../components/ui/SubmitButton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const UNITS = ['KG', 'BAGS_90KG', 'BAGS_50KG', 'TONNES', 'CRATES', 'BUNCHES', 'UNITS']

const emptyForm = {
  plantingId: '',
  harvestDate: '',
  quantity: '',
  unit: 'KG',
  qualityGrade: '',
  unitPrice: '',
  notes: '',
}

export default function YieldPage() {
  const { activeFarmId, canEditActiveFarm } = useFarm()
  const skip = !activeFarmId
  const [showModal, setShowModal] = useState(false)
  const [editingYield, setEditingYield] = useState<any | null>(null)

  const { data, refetch } = useQuery(PLANTINGS, { variables: { farmId: activeFarmId }, skip })
  const [recordYield, { loading: recording }] = useMutation(RECORD_YIELD, {
    onCompleted: () => {
      refetch()
      setShowModal(false)
    },
  })
  const [updateYield, { loading: updating }] = useMutation(UPDATE_YIELD, {
    onCompleted: () => {
      refetch()
      setEditingYield(null)
    },
  })
  const [deleteYield] = useMutation(DELETE_YIELD, { onCompleted: () => refetch() })

  const plantings = data?.plantings ?? []
  const allYields = plantings
    .flatMap((p: any) =>
      (p.yields ?? []).map((y: any) => ({
        ...y,
        cropName: p.crop.name,
        plantingId: p.id,
        yieldPerAcre: p.acreage ? (Number(y.quantity) / Number(p.acreage)).toFixed(2) : '–',
      }))
    )
    .sort((a: any, b: any) => b.harvestDate.localeCompare(a.harvestDate))

  const chartData = [...allYields]
    .slice(0, 10)
    .reverse()
    .map((y: any) => ({
      name: `${y.cropName} (${y.harvestDate})`,
      qty: Number(y.quantity),
      unit: y.unit,
    }))

  const [form, setForm] = useState(emptyForm)

  const totalRevenue = allYields.reduce(
    (s: number, y: any) => s + (y.totalRevenue ? Number(y.totalRevenue) : 0),
    0
  )

  const handleDelete = (y: any) => {
    if (!window.confirm('Delete this yield record?')) return
    deleteYield({ variables: { yieldId: y.id } })
  }

  if (!activeFarmId)
    return <div className="text-gray-400 text-center mt-20">Select a farm first.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm text-gray-500">
          <span>
            <strong className="text-gray-800 text-xl">{allYields.length}</strong> yield records
          </span>
          <span>|</span>
          <span>
            Total revenue:{' '}
            <strong className="text-primary-700">KES {totalRevenue.toLocaleString()}</strong>
          </span>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm)
            setShowModal(true)
          }}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
        >
          <Plus size={14} /> Record Yield
        </button>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary-600" />
            <h2 className="font-semibold text-gray-700">Yield by Harvest</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => v.toLocaleString()} />
              <Bar dataKey="qty" fill="#22c55e" radius={[4, 4, 0, 0]} name="Quantity" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              {[
                'Crop',
                'Harvest Date',
                'Quantity',
                'Unit',
                'Yield/Acre',
                'Grade',
                'Unit Price',
                'Revenue',
                'Notes',
                '',
              ].map((h) => (
                <th key={h} className="px-5 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allYields.map((y: any) => (
              <tr key={y.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-5 py-2.5 font-medium">{y.cropName}</td>
                <td className="px-5 py-2.5">{y.harvestDate}</td>
                <td className="px-5 py-2.5 font-semibold text-primary-700">
                  {Number(y.quantity).toLocaleString()}
                </td>
                <td className="px-5 py-2.5 text-gray-500">{y.unit}</td>
                <td className="px-5 py-2.5">{y.yieldPerAcre}</td>
                <td className="px-5 py-2.5">{y.qualityGrade || '–'}</td>
                <td className="px-5 py-2.5">
                  {y.unitPrice ? `KES ${Number(y.unitPrice).toLocaleString()}` : '–'}
                </td>
                <td className="px-5 py-2.5">
                  {y.totalRevenue ? `KES ${Number(y.totalRevenue).toLocaleString()}` : '–'}
                </td>
                <td className="px-5 py-2.5 text-gray-400 truncate max-w-xs" title={y.notes}>
                  {y.notes || '–'}
                </td>
                <td className="px-5 py-2.5">
                  {canEditActiveFarm && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingYield(y)
                          setForm({
                            plantingId: y.plantingId,
                            harvestDate: y.harvestDate,
                            quantity: String(y.quantity),
                            unit: y.unit,
                            qualityGrade: y.qualityGrade ?? '',
                            unitPrice: y.unitPrice != null ? String(y.unitPrice) : '',
                            notes: y.notes ?? '',
                          })
                        }}
                        className="text-gray-400 hover:text-primary-600"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(y)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {allYields.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-12 text-gray-400">
                  No yield records yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(showModal || editingYield) &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold">{editingYield ? 'Edit Yield' : 'Record Yield'}</h3>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingYield(null)
                  }}
                  className="text-gray-400 text-xl"
                >
                  ×
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const input = {
                    ...form,
                    quantity: +form.quantity,
                    unitPrice: form.unitPrice ? +form.unitPrice : null,
                  }
                  if (editingYield) {
                    updateYield({ variables: { yieldId: editingYield.id, input } })
                  } else {
                    recordYield({ variables: { input } })
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Planting *</label>
                  <select
                    required
                    value={form.plantingId}
                    onChange={(e) => setForm((f) => ({ ...f, plantingId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 select-field pr-8"
                  >
                    <option value="">— select —</option>
                    {plantings
                      .filter((p: any) => p.status === 'ACTIVE' || p.id === form.plantingId)
                      .map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.crop.name} ({p.plantingDate}, {p.acreage}ac)
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Harvest Date *
                    </label>
                    <input
                      required
                      type="date"
                      value={form.harvestDate}
                      onChange={(e) => setForm((f) => ({ ...f, harvestDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select
                      value={form.unit}
                      onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 select-field pr-8"
                    >
                      {UNITS.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={form.quantity}
                      onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quality Grade
                    </label>
                    <input
                      value={form.qualityGrade}
                      onChange={(e) => setForm((f) => ({ ...f, qualityGrade: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g. Grade A"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price (KES per {form.unit.toLowerCase()})
                  </label>
                  <input
                    type="number"
                    value={form.unitPrice}
                    onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {form.unitPrice && form.quantity && (
                    <p className="text-xs text-gray-400 mt-1">
                      Total revenue: KES{' '}
                      {(Number(form.unitPrice) * Number(form.quantity)).toLocaleString()}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={2}
                  />
                </div>
                <SubmitButton
                  loading={editingYield ? updating : recording}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg text-sm"
                >
                  {editingYield ? 'Save Changes' : 'Record Yield'}
                </SubmitButton>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
