import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Plus, Fence, CheckCircle, AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { FENCE_DAMAGES } from '../../graphql/queries'
import {
  REPORT_FENCE_DAMAGE,
  UPDATE_FENCE_DAMAGE,
  DELETE_FENCE_DAMAGE,
  UPDATE_FENCE_REPAIR,
} from '../../graphql/mutations'
import { useFarm } from '../../context/FarmContext'
import ImageUploadField from '../../components/ui/ImageUploadField'
import SubmitButton from '../../components/ui/SubmitButton'

const statusBadge: Record<string, string> = {
  PENDING: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  REPAIRED: 'bg-green-100 text-green-700',
}
const severityBadge: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-600',
  MEDIUM: 'bg-orange-100 text-orange-700',
  HIGH: 'bg-red-100 text-red-700',
}

export default function FencePage() {
  const { activeFarmId, canEditActiveFarm } = useFarm()
  const skip = !activeFarmId
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [showReportModal, setShowReportModal] = useState(false)
  const [editingDamage, setEditingDamage] = useState<any | null>(null)
  const [repairModal, setRepairModal] = useState<string | null>(null)

  const { data, refetch } = useQuery(FENCE_DAMAGES, {
    variables: { farmId: activeFarmId, repairStatus: statusFilter },
    skip,
  })
  const [reportDamage, { loading: reporting }] = useMutation(REPORT_FENCE_DAMAGE, {
    onCompleted: () => {
      refetch()
      setShowReportModal(false)
    },
  })
  const [updateDamage, { loading: updatingDamage }] = useMutation(UPDATE_FENCE_DAMAGE, {
    onCompleted: () => {
      refetch()
      setEditingDamage(null)
    },
  })
  const [deleteDamage] = useMutation(DELETE_FENCE_DAMAGE, { onCompleted: () => refetch() })
  const [updateRepair, { loading: updatingRepair }] = useMutation(UPDATE_FENCE_REPAIR, {
    onCompleted: () => {
      refetch()
      setRepairModal(null)
    },
  })

  const damages = data?.fenceDamages ?? []
  const [rf, setRf] = useState({
    locationDescription: '',
    damageType: 'BROKEN_POSTS',
    dateReported: '',
    severity: 'MEDIUM',
    notes: '',
  })
  const [upf, setUpf] = useState({
    repairStatus: 'IN_PROGRESS',
    repairCost: '',
    dateRepaired: '',
    notes: '',
  })
  const [rfImage, setRfImage] = useState<File | null>(null)

  const handleDeleteDamage = (d: any) => {
    if (!window.confirm('Delete this fence damage record?')) return
    deleteDamage({ variables: { damageId: d.id } })
  }

  const pending = damages.filter((d: any) => d.repairStatus === 'PENDING').length
  const inProgress = damages.filter((d: any) => d.repairStatus === 'IN_PROGRESS').length
  const repaired = damages.filter((d: any) => d.repairStatus === 'REPAIRED').length

  if (!activeFarmId)
    return <div className="text-gray-400 text-center mt-20">Select a farm first.</div>

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Pending Repair',
            value: pending,
            color: 'bg-red-50 text-red-700',
            icon: AlertTriangle,
          },
          {
            label: 'In Progress',
            value: inProgress,
            color: 'bg-yellow-50 text-yellow-700',
            icon: Fence,
          },
          {
            label: 'Repaired',
            value: repaired,
            color: 'bg-green-50 text-green-700',
            icon: CheckCircle,
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-5 ${s.color} flex items-center gap-4`}>
            <s.icon className="w-7 h-7 opacity-70" />
            <div>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[undefined, 'PENDING', 'IN_PROGRESS', 'REPAIRED'].map((s) => (
            <button
              key={String(s)}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium
                ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
            >
              {s ?? 'All'}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setRf({
              locationDescription: '',
              damageType: 'BROKEN_POSTS',
              dateReported: '',
              severity: 'MEDIUM',
              notes: '',
            })
            setRfImage(null)
            setShowReportModal(true)
          }}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
        >
          <Plus size={14} /> Report Damage
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              {[
                '',
                'Location',
                'Type',
                'Date',
                'Severity',
                'Status',
                'Repair Cost',
                'Notes',
                'Actions',
              ].map((h) => (
                <th key={h} className="px-5 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {damages.map((d: any) => (
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
                <td className="px-5 py-2.5 font-medium max-w-xs truncate">
                  {d.locationDescription}
                </td>
                <td className="px-5 py-2.5 text-gray-600">{d.damageType.replace(/_/g, ' ')}</td>
                <td className="px-5 py-2.5">{d.dateReported}</td>
                <td className="px-5 py-2.5">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${severityBadge[d.severity]}`}
                  >
                    {d.severity}
                  </span>
                </td>
                <td className="px-5 py-2.5">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[d.repairStatus]}`}
                  >
                    {d.repairStatus.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-5 py-2.5">
                  {d.repairCost ? `KES ${Number(d.repairCost).toLocaleString()}` : '–'}
                </td>
                <td className="px-5 py-2.5 text-gray-400 truncate max-w-xs" title={d.notes}>
                  {d.notes || '–'}
                </td>
                <td className="px-5 py-2.5">
                  {canEditActiveFarm && (
                    <div className="flex items-center gap-3">
                      {d.repairStatus !== 'REPAIRED' && (
                        <button
                          onClick={() => {
                            setRepairModal(d.id)
                            setUpf({
                              repairStatus: 'IN_PROGRESS',
                              repairCost: '',
                              dateRepaired: '',
                              notes: '',
                            })
                          }}
                          className="text-xs text-primary-600 hover:underline"
                        >
                          Update Repair
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingDamage(d)
                          setRf({
                            locationDescription: d.locationDescription,
                            damageType: d.damageType,
                            dateReported: d.dateReported,
                            severity: d.severity,
                            notes: d.notes ?? '',
                          })
                          setRfImage(null)
                        }}
                        className="text-gray-400 hover:text-primary-600"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteDamage(d)}
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
            {damages.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400">
                  No fence damage records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Report / Edit Modal */}
      {(showReportModal || editingDamage) && (
        <Modal
          title={editingDamage ? 'Edit Fence Damage' : 'Report Fence Damage'}
          onClose={() => {
            setShowReportModal(false)
            setEditingDamage(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = { ...rf, image: rfImage }
              if (editingDamage) {
                updateDamage({ variables: { damageId: editingDamage.id, input } })
              } else {
                reportDamage({ variables: { input: { ...input, farmId: activeFarmId } } })
              }
            }}
            className="space-y-4"
          >
            <Field label="Location Description" required>
              <input
                required
                value={rf.locationDescription}
                onChange={(e) => setRf((f) => ({ ...f, locationDescription: e.target.value }))}
                className={inp}
                placeholder="e.g. North boundary near gate"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Damage Type">
                <select
                  value={rf.damageType}
                  onChange={(e) => setRf((f) => ({ ...f, damageType: e.target.value }))}
                  className={sel}
                >
                  {[
                    'BROKEN_POSTS',
                    'WIRE_CUT',
                    'GATE_DAMAGED',
                    'ANIMAL_BREACH',
                    'EROSION',
                    'THEFT',
                    'OTHER',
                  ].map((t) => (
                    <option key={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </Field>
              <Field label="Severity">
                <select
                  value={rf.severity}
                  onChange={(e) => setRf((f) => ({ ...f, severity: e.target.value }))}
                  className={sel}
                >
                  {['LOW', 'MEDIUM', 'HIGH'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Date Reported" required>
              <input
                required
                type="date"
                value={rf.dateReported}
                onChange={(e) => setRf((f) => ({ ...f, dateReported: e.target.value }))}
                className={inp}
              />
            </Field>
            <Field label="Notes">
              <textarea
                value={rf.notes}
                onChange={(e) => setRf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </Field>
            <ImageUploadField existingUrl={editingDamage?.imageUrl} onChange={setRfImage} />
            <SubmitButton loading={editingDamage ? updatingDamage : reporting} className={btn}>
              {editingDamage ? 'Save Changes' : 'Report Damage'}
            </SubmitButton>
          </form>
        </Modal>
      )}

      {/* Repair Modal */}
      {repairModal && (
        <Modal title="Update Repair Status" onClose={() => setRepairModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              updateRepair({
                variables: {
                  damageId: repairModal,
                  input: {
                    ...upf,
                    repairCost: upf.repairCost ? +upf.repairCost : null,
                    dateRepaired: upf.dateRepaired || null,
                  },
                },
              })
            }}
            className="space-y-4"
          >
            <Field label="Status">
              <select
                value={upf.repairStatus}
                onChange={(e) => setUpf((f) => ({ ...f, repairStatus: e.target.value }))}
                className={sel}
              >
                {['IN_PROGRESS', 'REPAIRED'].map((s) => (
                  <option key={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </Field>
            <Field label="Repair Cost (KES)">
              <input
                type="number"
                value={upf.repairCost}
                onChange={(e) => setUpf((f) => ({ ...f, repairCost: e.target.value }))}
                className={inp}
              />
            </Field>
            {upf.repairStatus === 'REPAIRED' && (
              <Field label="Date Repaired">
                <input
                  type="date"
                  value={upf.dateRepaired}
                  onChange={(e) => setUpf((f) => ({ ...f, dateRepaired: e.target.value }))}
                  className={inp}
                />
              </Field>
            )}
            <Field label="Repair Notes">
              <textarea
                value={upf.notes}
                onChange={(e) => setUpf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </Field>
            <SubmitButton loading={updatingRepair} className={btn}>
              Update
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
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
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
function Field({ label, children, required }: any) {
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
