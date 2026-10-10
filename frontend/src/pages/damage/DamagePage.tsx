import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Plus, AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { PLANTINGS } from '../../graphql/queries'
import { REPORT_CROP_DAMAGE, UPDATE_CROP_DAMAGE, DELETE_CROP_DAMAGE } from '../../graphql/mutations'
import { useFarm } from '../../context/FarmContext'
import ImageUploadField from '../../components/ui/ImageUploadField'
import SubmitButton from '../../components/ui/SubmitButton'

const DAMAGE_TYPES = [
  'PEST',
  'DISEASE',
  'WEATHER',
  'FLOOD',
  'DROUGHT',
  'FIRE',
  'THEFT',
  'FENCE',
  'OTHER',
]
const SEVERITY_BADGE: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  TOTAL_LOSS: 'bg-red-100 text-red-700',
}

export default function DamagePage() {
  const { activeFarmId, canEditActiveFarm } = useFarm()
  const skip = !activeFarmId
  const [showModal, setShowModal] = useState(false)
  const [editingDamage, setEditingDamage] = useState<any | null>(null)

  const { data, refetch } = useQuery(PLANTINGS, { variables: { farmId: activeFarmId }, skip })
  const [reportDamage, { loading: reporting }] = useMutation(REPORT_CROP_DAMAGE, {
    onCompleted: () => {
      refetch()
      setShowModal(false)
    },
  })
  const [updateDamage, { loading: updating }] = useMutation(UPDATE_CROP_DAMAGE, {
    onCompleted: () => {
      refetch()
      setEditingDamage(null)
    },
  })
  const [deleteDamage] = useMutation(DELETE_CROP_DAMAGE, { onCompleted: () => refetch() })

  const plantings = data?.plantings ?? []
  const allDamages = plantings
    .flatMap((p: any) =>
      (p.damages ?? []).map((d: any) => ({ ...d, cropName: p.crop.name, plantingId: p.id }))
    )
    .sort((a: any, b: any) => b.dateReported.localeCompare(a.dateReported))

  const emptyForm = {
    plantingId: '',
    damageType: 'PEST',
    severity: 'LOW',
    dateReported: '',
    areaAffectedAcres: '',
    estimatedLossValue: '',
    description: '',
  }
  const [form, setForm] = useState(emptyForm)
  const [formImage, setFormImage] = useState<File | null>(null)

  const handleDeleteDamage = (d: any) => {
    if (!window.confirm('Delete this damage report?')) return
    deleteDamage({ variables: { damageId: d.id } })
  }

  if (!activeFarmId)
    return <div className="text-gray-400 text-center mt-20">Select a farm first.</div>

  const totalLoss = allDamages.reduce(
    (s: number, d: any) => s + (d.estimatedLossValue ? Number(d.estimatedLossValue) : 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-6 text-sm text-gray-500">
          <span>
            <strong className="text-gray-800">{allDamages.length}</strong> damage reports
          </span>
          <span>
            Estimated total loss:{' '}
            <strong className="text-red-600">KES {totalLoss.toLocaleString()}</strong>
          </span>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm)
            setFormImage(null)
            setShowModal(true)
          }}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
        >
          <Plus size={14} /> Report Damage
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h2 className="font-semibold text-gray-700">Crop Damage Reports</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              {[
                '',
                'Crop',
                'Type',
                'Date',
                'Severity',
                'Area (ac)',
                'Estimated Loss',
                'Description',
                '',
              ].map((h, i) => (
                <th key={i} className="px-5 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allDamages.map((d: any) => (
              <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-5 py-2.5">
                  {d.imageUrl && (
                    <img
                      src={d.imageUrl}
                      alt=""
                      className="w-8 h-8 object-cover rounded border border-gray-200"
                    />
                  )}
                </td>
                <td className="px-5 py-2.5 font-medium">{d.cropName}</td>
                <td className="px-5 py-2.5">{d.damageType}</td>
                <td className="px-5 py-2.5">{d.dateReported}</td>
                <td className="px-5 py-2.5">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_BADGE[d.severity]}`}
                  >
                    {d.severity.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-5 py-2.5">{d.areaAffectedAcres}</td>
                <td className="px-5 py-2.5 text-red-600">
                  {d.estimatedLossValue
                    ? `KES ${Number(d.estimatedLossValue).toLocaleString()}`
                    : '–'}
                </td>
                <td className="px-5 py-2.5 text-gray-400 truncate max-w-xs">
                  {d.description || '–'}
                </td>
                <td className="px-5 py-2.5">
                  {canEditActiveFarm && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingDamage(d)
                          setForm({
                            plantingId: d.plantingId,
                            damageType: d.damageType,
                            severity: d.severity,
                            dateReported: d.dateReported,
                            areaAffectedAcres: String(d.areaAffectedAcres),
                            estimatedLossValue:
                              d.estimatedLossValue != null ? String(d.estimatedLossValue) : '',
                            description: d.description ?? '',
                          })
                          setFormImage(null)
                        }}
                        className="text-gray-400 hover:text-primary-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteDamage(d)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {allDamages.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400">
                  No damage reports
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(showModal || editingDamage) &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold">
                  {editingDamage ? 'Edit Crop Damage' : 'Report Crop Damage'}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingDamage(null)
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
                    areaAffectedAcres: +form.areaAffectedAcres,
                    estimatedLossValue: form.estimatedLossValue ? +form.estimatedLossValue : null,
                    image: formImage,
                  }
                  if (editingDamage) {
                    updateDamage({ variables: { damageId: editingDamage.id, input } })
                  } else {
                    reportDamage({ variables: { input } })
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
                    {plantings.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.crop.name} ({p.plantingDate})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Damage Type
                    </label>
                    <select
                      value={form.damageType}
                      onChange={(e) => setForm((f) => ({ ...f, damageType: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 select-field pr-8"
                    >
                      {DAMAGE_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                    <select
                      value={form.severity}
                      onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 select-field pr-8"
                    >
                      {['LOW', 'MEDIUM', 'HIGH', 'TOTAL_LOSS'].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      required
                      type="date"
                      value={form.dateReported}
                      onChange={(e) => setForm((f) => ({ ...f, dateReported: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area (acres) *
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={form.areaAffectedAcres}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, areaAffectedAcres: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Loss (KES)
                  </label>
                  <input
                    type="number"
                    value={form.estimatedLossValue}
                    onChange={(e) => setForm((f) => ({ ...f, estimatedLossValue: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={2}
                  />
                </div>
                <ImageUploadField existingUrl={editingDamage?.imageUrl} onChange={setFormImage} />
                <SubmitButton
                  loading={editingDamage ? updating : reporting}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg text-sm"
                >
                  {editingDamage ? 'Save Changes' : 'Report Damage'}
                </SubmitButton>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
