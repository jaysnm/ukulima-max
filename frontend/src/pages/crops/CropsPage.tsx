import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Plus, Trash2, Pencil, Leaf } from 'lucide-react'
import { PLANTINGS, CROPS, SEEDLINGS, SEEDLING_PURCHASES } from '../../graphql/queries'
import {
  CREATE_CROP,
  UPDATE_CROP,
  DELETE_CROP,
  CREATE_PLANTING,
  UPDATE_PLANTING,
  UPDATE_PLANTING_STATUS,
  DELETE_PLANTING,
} from '../../graphql/mutations'
import { useFarm } from '../../context/FarmContext'
import SubmitButton from '../../components/ui/SubmitButton'

const CATEGORIES = ['GRAIN', 'VEGETABLE', 'FRUIT', 'LEGUME', 'ROOT', 'CASH_CROP', 'FORAGE', 'OTHER']
const STATUSES = ['ACTIVE', 'HARVESTED', 'FAILED']

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  HARVESTED: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
}

const money = (v: any) => (v == null ? '–' : `KES ${Number(v).toLocaleString()}`)

export default function CropsPage() {
  const { activeFarmId, canEditActiveFarm, canEditCatalog } = useFarm()
  const skip = !activeFarmId

  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [showPlantModal, setShowPlantModal] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [editingCrop, setEditingCrop] = useState<any | null>(null)
  const [editingPlanting, setEditingPlanting] = useState<any | null>(null)

  // Crops are a global catalog shared by every farm — fixing a naming error
  // here corrects it everywhere the crop is used, so this query takes no
  // farmId and isn't gated on a farm being selected.
  const { data: cropData, refetch: refetchCrops } = useQuery(CROPS)
  const { data, refetch } = useQuery(PLANTINGS, {
    variables: { farmId: activeFarmId, status: statusFilter },
    skip,
  })
  const { data: seedlingData } = useQuery(SEEDLINGS)
  const { data: purchaseData } = useQuery(SEEDLING_PURCHASES, {
    variables: { farmId: activeFarmId },
    skip,
  })

  const [createCrop, { loading: creatingCrop }] = useMutation(CREATE_CROP, {
    onCompleted: () => {
      refetchCrops()
      setShowCropModal(false)
    },
  })
  const [updateCrop, { loading: updatingCrop }] = useMutation(UPDATE_CROP, {
    onCompleted: () => {
      refetchCrops()
      setEditingCrop(null)
    },
  })
  const [deleteCrop] = useMutation(DELETE_CROP, { onCompleted: () => refetchCrops() })
  const [createPlanting, { loading: creatingPlanting }] = useMutation(CREATE_PLANTING, {
    onCompleted: () => {
      refetch()
      setShowPlantModal(false)
    },
  })
  const [updatePlanting, { loading: updatingPlanting }] = useMutation(UPDATE_PLANTING, {
    onCompleted: () => {
      refetch()
      setEditingPlanting(null)
    },
  })
  const [updateStatus] = useMutation(UPDATE_PLANTING_STATUS, { onCompleted: () => refetch() })
  const [deletePlanting] = useMutation(DELETE_PLANTING, { onCompleted: () => refetch() })

  const plantings = data?.plantings ?? []
  const crops = cropData?.crops ?? []
  const seedlings = seedlingData?.seedlings ?? []
  const purchasedSeedlingIds = new Set(
    (purchaseData?.seedlingPurchases ?? []).map((p: any) => p.purchase.seedling.id)
  )

  const [cropForm, setCropForm] = useState({ name: '', category: 'GRAIN', notes: '' })
  const [plantForm, setPlantForm] = useState({
    cropId: '',
    seedlingId: '',
    seedlingQuantityKg: '',
    acreage: '',
    plantingDate: '',
    expectedHarvestDate: '',
    season: '',
    notes: '',
  })
  // Seedlings that were actually bought (have a purchase record) and match
  // the crop currently selected — that's the pool a planting can draw from.
  const seedlingOptionsFor = (cropId: string) =>
    seedlings.filter((s: any) => s.crop?.id === cropId && purchasedSeedlingIds.has(s.id))

  const handleDeleteCrop = (crop: any) => {
    if (!window.confirm(`Delete crop type "${crop.name}"? This cannot be undone.`)) return
    deleteCrop({ variables: { cropId: crop.id } })
  }

  const handleDeletePlanting = (planting: any) => {
    if (!window.confirm('Delete this planting and all its records?')) return
    deletePlanting({ variables: { plantingId: planting.id } })
  }

  if (!activeFarmId)
    return <div className="text-gray-400 text-center mt-20">Select a farm first.</div>

  return (
    <div className="space-y-6">
      {/* Crop catalog — shared across all farms */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary-600" /> Crop Types
          </h2>
          <button
            onClick={() => setShowCropModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            <Plus size={14} /> New Crop Type
          </button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {crops.map((c: any) => (
            <div key={c.id} className="border rounded-xl p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                  <p className="text-xs text-primary-600 mt-0.5">{c.category}</p>
                  {c.notes && (
                    <p
                      className="text-xs text-gray-400 mt-1 truncate max-w-[16rem]"
                      title={c.notes}
                    >
                      {c.notes}
                    </p>
                  )}
                </div>
                {canEditCatalog && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingCrop(c)}
                      className="text-gray-400 hover:text-primary-600"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCrop(c)}
                      className="text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {crops.length === 0 && (
            <p className="text-gray-400 text-sm col-span-4">No crop types added yet</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[undefined, 'ACTIVE', 'HARVESTED', 'FAILED'].map((s) => (
            <button
              key={String(s)}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
            >
              {s ?? 'All'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowPlantModal(true)}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
        >
          <Plus size={14} /> New Planting
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              <th className="px-5 py-3 font-medium">Crop</th>
              <th className="px-5 py-3 font-medium">Acreage</th>
              <th className="px-5 py-3 font-medium">Planted</th>
              <th className="px-5 py-3 font-medium">Expected Harvest</th>
              <th className="px-5 py-3 font-medium">Season</th>
              <th className="px-5 py-3 font-medium">Cost</th>
              <th className="px-5 py-3 font-medium">Revenue</th>
              <th className="px-5 py-3 font-medium">Profit</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Notes</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plantings.map((p: any) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-5 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-primary-500" />
                    {p.crop.name}
                  </div>
                </td>
                <td className="px-5 py-3">{p.acreage} ac</td>
                <td className="px-5 py-3">{p.plantingDate}</td>
                <td className="px-5 py-3">{p.expectedHarvestDate || '–'}</td>
                <td className="px-5 py-3">{p.season || '–'}</td>
                <td className="px-5 py-3">{money(p.totalCost)}</td>
                <td className="px-5 py-3">{money(p.totalRevenue)}</td>
                <td
                  className={`px-5 py-3 font-medium ${
                    p.profit == null
                      ? ''
                      : Number(p.profit) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                  }`}
                >
                  {money(p.profit)}
                </td>
                <td className="px-5 py-3">
                  {canEditActiveFarm ? (
                    <select
                      value={p.status}
                      onChange={(e) =>
                        updateStatus({ variables: { plantingId: p.id, status: e.target.value } })
                      }
                      className={`text-xs font-medium pl-2 pr-6 py-1 rounded-full border-0 select-pill ${statusBadge[p.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge[p.status]}`}
                    >
                      {p.status}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-400 truncate max-w-xs" title={p.notes}>
                  {p.notes || '–'}
                </td>
                <td className="px-5 py-3">
                  {canEditActiveFarm && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingPlanting(p)}
                        className="text-gray-400 hover:text-primary-600"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDeletePlanting(p)}
                        className="text-red-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {plantings.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center py-12 text-gray-400">
                  No plantings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Crop Create Modal */}
      {showCropModal && (
        <Modal title="Add Crop Type" onClose={() => setShowCropModal(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createCrop({ variables: { input: cropForm } })
            }}
            className="space-y-4"
          >
            <Field label="Crop Name" required>
              <input
                required
                value={cropForm.name}
                onChange={(e) => setCropForm((f) => ({ ...f, name: e.target.value }))}
                className={inp}
                placeholder="e.g. Maize"
              />
            </Field>
            <Field label="Category">
              <select
                value={cropForm.category}
                onChange={(e) => setCropForm((f) => ({ ...f, category: e.target.value }))}
                className={sel}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <textarea
                value={cropForm.notes}
                onChange={(e) => setCropForm((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </Field>
            <SubmitButton loading={creatingCrop} className={btn}>
              Save Crop
            </SubmitButton>
          </form>
        </Modal>
      )}

      {/* Crop Edit Modal */}
      {editingCrop && (
        <CropEditModal
          crop={editingCrop}
          saving={updatingCrop}
          onClose={() => setEditingCrop(null)}
          onSave={(input: any) => updateCrop({ variables: { cropId: editingCrop.id, input } })}
        />
      )}

      {/* Planting Modal */}
      {showPlantModal && (
        <Modal title="New Planting" onClose={() => setShowPlantModal(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createPlanting({
                variables: {
                  input: {
                    ...plantForm,
                    seedlingId: plantForm.seedlingId || null,
                    seedlingQuantityKg: plantForm.seedlingQuantityKg
                      ? +plantForm.seedlingQuantityKg
                      : null,
                    expectedHarvestDate: plantForm.expectedHarvestDate || null,
                    farmId: activeFarmId,
                    acreage: parseFloat(plantForm.acreage),
                  },
                },
              })
            }}
            className="space-y-4"
          >
            <Field label="Crop" required>
              <select
                required
                value={plantForm.cropId}
                onChange={(e) =>
                  setPlantForm((f) => ({ ...f, cropId: e.target.value, seedlingId: '' }))
                }
                className={inp}
              >
                <option value="">— select —</option>
                {crops.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            {plantForm.cropId && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Seedling Used">
                  <select
                    value={plantForm.seedlingId}
                    onChange={(e) => setPlantForm((f) => ({ ...f, seedlingId: e.target.value }))}
                    className={sel}
                  >
                    <option value="">— none —</option>
                    {seedlingOptionsFor(plantForm.cropId).map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {seedlingOptionsFor(plantForm.cropId).length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      No purchased seedlings recorded for this crop yet
                    </p>
                  )}
                </Field>
                <Field label="Quantity Used (kg)">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={plantForm.seedlingQuantityKg}
                    onChange={(e) =>
                      setPlantForm((f) => ({ ...f, seedlingQuantityKg: e.target.value }))
                    }
                    className={inp}
                    placeholder="e.g. 2.75"
                  />
                </Field>
              </div>
            )}
            <Field label="Acreage" required>
              <input
                required
                type="number"
                step="0.01"
                value={plantForm.acreage}
                onChange={(e) => setPlantForm((f) => ({ ...f, acreage: e.target.value }))}
                className={inp}
                placeholder="e.g. 2.5"
              />
            </Field>
            <Field label="Planting Date" required>
              <input
                required
                type="date"
                value={plantForm.plantingDate}
                onChange={(e) => setPlantForm((f) => ({ ...f, plantingDate: e.target.value }))}
                className={inp}
              />
            </Field>
            <Field label="Expected Harvest">
              <input
                type="date"
                value={plantForm.expectedHarvestDate}
                onChange={(e) =>
                  setPlantForm((f) => ({ ...f, expectedHarvestDate: e.target.value }))
                }
                className={inp}
              />
            </Field>
            <Field label="Season">
              <input
                value={plantForm.season}
                onChange={(e) => setPlantForm((f) => ({ ...f, season: e.target.value }))}
                className={inp}
                placeholder="e.g. Long Rains 2026"
              />
            </Field>
            <Field label="Notes">
              <textarea
                value={plantForm.notes}
                onChange={(e) => setPlantForm((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </Field>
            <SubmitButton loading={creatingPlanting} className={btn}>
              Create Planting
            </SubmitButton>
          </form>
        </Modal>
      )}

      {/* Planting Edit Modal */}
      {editingPlanting && (
        <PlantingEditModal
          planting={editingPlanting}
          crops={crops}
          seedlingOptionsFor={seedlingOptionsFor}
          saving={updatingPlanting}
          onClose={() => setEditingPlanting(null)}
          onSave={(input: any) =>
            updatePlanting({ variables: { plantingId: editingPlanting.id, input } })
          }
        />
      )}
    </div>
  )
}

function CropEditModal({ crop, saving, onClose, onSave }: any) {
  const [form, setForm] = useState({
    name: crop.name,
    category: crop.category,
    notes: crop.notes ?? '',
  })
  return (
    <Modal title="Edit Crop Type" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
        className="space-y-4"
      >
        <Field label="Crop Name" required>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inp}
          />
        </Field>
        <Field label="Category">
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className={sel}
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className={inp}
            rows={2}
          />
        </Field>
        <SubmitButton loading={saving} className={btn}>
          Save Changes
        </SubmitButton>
      </form>
    </Modal>
  )
}

function PlantingEditModal({ planting, crops, seedlingOptionsFor, saving, onClose, onSave }: any) {
  const [form, setForm] = useState({
    cropId: planting.crop.id,
    seedlingId: planting.seedling?.id ?? '',
    seedlingQuantityKg:
      planting.seedlingQuantityKg != null ? String(planting.seedlingQuantityKg) : '',
    acreage: String(planting.acreage),
    plantingDate: planting.plantingDate,
    expectedHarvestDate: planting.expectedHarvestDate ?? '',
    season: planting.season ?? '',
    status: planting.status,
    notes: planting.notes ?? '',
  })
  return (
    <Modal title="Edit Planting" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSave({
            ...form,
            seedlingId: form.seedlingId || null,
            seedlingQuantityKg: form.seedlingQuantityKg ? +form.seedlingQuantityKg : null,
            acreage: parseFloat(form.acreage),
            expectedHarvestDate: form.expectedHarvestDate || null,
          })
        }}
        className="space-y-4"
      >
        <Field label="Crop" required>
          <select
            required
            value={form.cropId}
            onChange={(e) => setForm((f) => ({ ...f, cropId: e.target.value, seedlingId: '' }))}
            className={sel}
          >
            {crops.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Seedling Used">
            <select
              value={form.seedlingId}
              onChange={(e) => setForm((f) => ({ ...f, seedlingId: e.target.value }))}
              className={sel}
            >
              <option value="">— none —</option>
              {seedlingOptionsFor(form.cropId).map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity Used (kg)">
            <input
              type="number"
              step="0.001"
              min="0"
              value={form.seedlingQuantityKg}
              onChange={(e) => setForm((f) => ({ ...f, seedlingQuantityKg: e.target.value }))}
              className={inp}
            />
          </Field>
        </div>
        <Field label="Acreage" required>
          <input
            required
            type="number"
            step="0.01"
            value={form.acreage}
            onChange={(e) => setForm((f) => ({ ...f, acreage: e.target.value }))}
            className={inp}
          />
        </Field>
        <Field label="Planting Date" required>
          <input
            required
            type="date"
            value={form.plantingDate}
            onChange={(e) => setForm((f) => ({ ...f, plantingDate: e.target.value }))}
            className={inp}
          />
        </Field>
        <Field label="Expected Harvest">
          <input
            type="date"
            value={form.expectedHarvestDate}
            onChange={(e) => setForm((f) => ({ ...f, expectedHarvestDate: e.target.value }))}
            className={inp}
          />
        </Field>
        <Field label="Season">
          <input
            value={form.season}
            onChange={(e) => setForm((f) => ({ ...f, season: e.target.value }))}
            className={inp}
          />
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className={sel}
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className={inp}
            rows={2}
          />
        </Field>
        <SubmitButton loading={saving} className={btn}>
          Save Changes
        </SubmitButton>
      </form>
    </Modal>
  )
}

// ── Small helpers ────────────────────────────────────────────────────────────
function Modal({ title, children, onClose }: any) {
  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
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
