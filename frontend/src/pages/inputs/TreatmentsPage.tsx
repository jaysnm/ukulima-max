import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Plus, FlaskConical, Pencil, Trash2 } from 'lucide-react'
import { VET_DRUGS, TREATMENTS } from '../../graphql/queries'
import {
  CREATE_VET_DRUG,
  UPDATE_VET_DRUG,
  DELETE_VET_DRUG,
  RECORD_TREATMENT,
  UPDATE_TREATMENT,
  DELETE_TREATMENT_ALLOCATION,
} from '../../graphql/mutations'
import { useFarm } from '../../context/FarmContext'
import ImageUploadField from '../../components/ui/ImageUploadField'
import SubmitButton from '../../components/ui/SubmitButton'
import SupplierSelect from '../../components/ui/SupplierSelect'
import FarmAllocationEditor, { type Allocation } from '../../components/ui/FarmAllocationEditor'

const ALL_ANIMALS = ['COW', 'GOAT', 'SHEEP', 'CHICKEN', 'DUCK', 'TURKEY']
const DRUG_TYPES = [
  'VACCINE',
  'ANTIBIOTIC',
  'ANTIPARASITIC',
  'SUPPLEMENT',
  'HORMONE',
  'DISINFECTANT',
  'OTHER',
]
const CONTENT_UNITS = ['', 'KG', 'GRAMS', 'LITRES', 'ML', 'UNITS']

const emptyDrug = {
  name: '',
  drugType: 'VACCINE',
  activeIngredient: '',
  targetSpecies: '',
  withdrawalPeriodDays: '',
  notes: '',
  productUrl: '',
}
const emptyTx = (farmId: string) => ({
  animalType: 'COW',
  drugId: '',
  treatmentDate: '',
  animalCountTreated: '1',
  quantityUsed: '',
  unit: 'ML',
  unitCost: '',
  contentAmount: '',
  contentUnit: '',
  supplierId: '',
  conditionTreated: '',
  outcome: '',
  notes: '',
  allocations: [{ farmId, quantity: '' }] as Allocation[],
})

export default function TreatmentsPage() {
  const { activeFarmId, canEditActiveFarm, canEditCatalog } = useFarm()
  const skip = !activeFarmId
  const [showDrugModal, setShowDrugModal] = useState(false)
  const [showTxModal, setShowTxModal] = useState(false)
  const [editingDrug, setEditingDrug] = useState<any | null>(null)
  const [editingTx, setEditingTx] = useState<any | null>(null)

  const { data: drugData, refetch: rd } = useQuery(VET_DRUGS)
  const { data: txData, refetch: rt } = useQuery(TREATMENTS, {
    variables: { farmId: activeFarmId },
    skip,
  })

  const [createDrug, { loading: creatingDrug }] = useMutation(CREATE_VET_DRUG, {
    onCompleted: () => {
      rd()
      setShowDrugModal(false)
    },
  })
  const [updateDrug, { loading: updatingDrug }] = useMutation(UPDATE_VET_DRUG, {
    onCompleted: () => {
      rd()
      setEditingDrug(null)
    },
  })
  const [deleteDrug] = useMutation(DELETE_VET_DRUG, { onCompleted: () => rd() })
  const [recordTx, { loading: recordingTx }] = useMutation(RECORD_TREATMENT, {
    onCompleted: () => {
      rt()
      setShowTxModal(false)
    },
  })
  const [updateTx, { loading: updatingTx }] = useMutation(UPDATE_TREATMENT, {
    onCompleted: () => {
      rt()
      setEditingTx(null)
    },
  })
  const [deleteTxAllocation] = useMutation(DELETE_TREATMENT_ALLOCATION, { onCompleted: () => rt() })

  const drugs = drugData?.vetDrugs ?? []
  const treatments = txData?.treatments ?? []

  const [df, setDf] = useState(emptyDrug)
  const [tf, setTf] = useState(() => emptyTx(activeFarmId ?? ''))
  const [dfImage, setDfImage] = useState<File | null>(null)

  const handleDeleteDrug = (d: any) => {
    if (!window.confirm(`Delete drug "${d.name}"?`)) return
    deleteDrug({ variables: { drugId: d.id } })
  }
  const handleDeleteTx = (t: any) => {
    if (!window.confirm("Remove this farm's share of this treatment record?")) return
    deleteTxAllocation({ variables: { allocationId: t.id } })
  }

  if (!activeFarmId)
    return <div className="text-gray-400 text-center mt-20">Select a farm first.</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            setDf(emptyDrug)
            setDfImage(null)
            setShowDrugModal(true)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border text-gray-700 rounded-lg text-sm hover:bg-gray-50"
        >
          <Plus size={14} /> Add Drug
        </button>
        <button
          onClick={() => {
            setTf(emptyTx(activeFarmId))
            setShowTxModal(true)
          }}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
        >
          <Plus size={14} /> Record Treatment
        </button>
      </div>

      {/* Treatments table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary-600" />
          <h2 className="font-semibold text-gray-700">Treatment Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                {[
                  'Animal',
                  'Drug',
                  'Date',
                  'Count',
                  'Qty',
                  'Unit Cost',
                  'Total Cost',
                  'Supplier',
                  'Condition',
                  'Outcome',
                  'Notes',
                  '',
                ].map((h, i) => (
                  <th key={i} className="px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {treatments.map((t: any) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 capitalize font-medium">
                    {t.purchase.animalType.toLowerCase()}
                  </td>
                  <td className="px-4 py-2.5">
                    <div>{t.purchase.drug.name}</div>
                    <div className="text-xs text-gray-400">{t.purchase.drug.drugType}</div>
                  </td>
                  <td className="px-4 py-2.5">{t.purchase.treatmentDate}</td>
                  <td className="px-4 py-2.5">{t.purchase.animalCountTreated}</td>
                  <td className="px-4 py-2.5">
                    {t.quantity} {t.purchase.unit}
                    {t.purchase.allocations.length > 1 && (
                      <span className="ml-1.5 text-xs text-gray-400">
                        (of {t.purchase.quantityUsed} shared)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {t.purchase.unitCost
                      ? `KES ${Number(t.purchase.unitCost).toLocaleString()}`
                      : '–'}
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    {t.totalCost ? `KES ${Number(t.totalCost).toLocaleString()}` : '–'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{t.purchase.supplier?.name || '–'}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {t.purchase.conditionTreated || '–'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{t.purchase.outcome || '–'}</td>
                  <td
                    className="px-4 py-2.5 text-gray-400 truncate max-w-xs"
                    title={t.purchase.notes}
                  >
                    {t.purchase.notes || '–'}
                  </td>
                  <td className="px-4 py-2.5">
                    {canEditActiveFarm && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingTx(t)
                            setTf({
                              animalType: t.purchase.animalType,
                              drugId: t.purchase.drug.id,
                              treatmentDate: t.purchase.treatmentDate,
                              animalCountTreated: String(t.purchase.animalCountTreated),
                              quantityUsed: String(t.purchase.quantityUsed),
                              unit: t.purchase.unit,
                              unitCost:
                                t.purchase.unitCost != null ? String(t.purchase.unitCost) : '',
                              contentAmount:
                                t.purchase.contentAmount != null
                                  ? String(t.purchase.contentAmount)
                                  : '',
                              contentUnit: t.purchase.contentUnit ?? '',
                              supplierId: t.purchase.supplier?.id ?? '',
                              conditionTreated: t.purchase.conditionTreated ?? '',
                              outcome: t.purchase.outcome ?? '',
                              notes: t.purchase.notes ?? '',
                              allocations: t.purchase.allocations.map((a: any) => ({
                                farmId: a.farm.id,
                                quantity: String(a.quantity),
                              })),
                            })
                          }}
                          className="text-gray-400 hover:text-primary-600"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTx(t)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {treatments.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-gray-400">
                    No treatments recorded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drugs list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 mb-4">Drug Inventory</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {drugs.map((d: any) => (
            <div key={d.id} className="border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  {d.imageUrl && (
                    <img
                      src={d.imageUrl}
                      alt=""
                      className="w-9 h-9 object-cover rounded-lg border border-gray-200 shrink-0"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-800">{d.name}</p>
                    <p className="text-xs text-primary-600 mt-0.5">{d.drugType}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {d.activeIngredient || 'No active ingredient listed'}
                    </p>
                    {d.withdrawalPeriodDays && (
                      <p className="text-xs text-orange-500 mt-1">
                        ⚠ {d.withdrawalPeriodDays}d withdrawal
                      </p>
                    )}
                    {d.notes && (
                      <p
                        className="text-xs text-gray-400 mt-1 truncate max-w-[16rem]"
                        title={d.notes}
                      >
                        {d.notes}
                      </p>
                    )}
                  </div>
                </div>
                {canEditCatalog && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingDrug(d)
                        setDf({
                          name: d.name,
                          drugType: d.drugType,
                          activeIngredient: d.activeIngredient ?? '',
                          targetSpecies: d.targetSpecies ?? '',
                          withdrawalPeriodDays:
                            d.withdrawalPeriodDays != null ? String(d.withdrawalPeriodDays) : '',
                          notes: d.notes ?? '',
                          productUrl: d.productUrl ?? '',
                        })
                        setDfImage(null)
                      }}
                      className="text-gray-400 hover:text-primary-600"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDrug(d)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {drugs.length === 0 && (
            <p className="text-gray-400 text-sm col-span-3">No drugs added yet</p>
          )}
        </div>
      </div>

      {/* Drug Modal */}
      {(showDrugModal || editingDrug) && (
        <Modal
          title={editingDrug ? 'Edit Veterinary Drug' : 'Add Veterinary Drug'}
          onClose={() => {
            setShowDrugModal(false)
            setEditingDrug(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = {
                ...df,
                withdrawalPeriodDays: df.withdrawalPeriodDays ? +df.withdrawalPeriodDays : null,
                image: dfImage,
              }
              if (editingDrug) {
                updateDrug({ variables: { drugId: editingDrug.id, input } })
              } else {
                createDrug({ variables: { input } })
              }
            }}
            className="space-y-4"
          >
            <Field label="Drug Name" required>
              <input
                required
                value={df.name}
                onChange={(e) => setDf((f) => ({ ...f, name: e.target.value }))}
                className={inp}
              />
            </Field>
            <Field label="Type">
              <select
                value={df.drugType}
                onChange={(e) => setDf((f) => ({ ...f, drugType: e.target.value }))}
                className={sel}
              >
                {DRUG_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Active Ingredient">
              <input
                value={df.activeIngredient}
                onChange={(e) => setDf((f) => ({ ...f, activeIngredient: e.target.value }))}
                className={inp}
              />
            </Field>
            <Field label="Target Species">
              <input
                value={df.targetSpecies}
                onChange={(e) => setDf((f) => ({ ...f, targetSpecies: e.target.value }))}
                className={inp}
                placeholder="e.g. Cattle, All"
              />
            </Field>
            <Field label="Withdrawal (days)">
              <input
                type="number"
                value={df.withdrawalPeriodDays}
                onChange={(e) => setDf((f) => ({ ...f, withdrawalPeriodDays: e.target.value }))}
                className={inp}
              />
            </Field>
            <Field label="Product URL">
              <input
                type="url"
                value={df.productUrl}
                onChange={(e) => setDf((f) => ({ ...f, productUrl: e.target.value }))}
                className={inp}
                placeholder="https://..."
              />
            </Field>
            <Field label="Description">
              <textarea
                value={df.notes}
                onChange={(e) => setDf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </Field>
            <ImageUploadField existingUrl={editingDrug?.imageUrl} onChange={setDfImage} />
            <SubmitButton loading={editingDrug ? updatingDrug : creatingDrug} className={btn}>
              {editingDrug ? 'Save Changes' : 'Save Drug'}
            </SubmitButton>
          </form>
        </Modal>
      )}

      {/* Treatment Modal */}
      {(showTxModal || editingTx) && (
        <Modal
          title={editingTx ? 'Edit Treatment' : 'Record Treatment'}
          onClose={() => {
            setShowTxModal(false)
            setEditingTx(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = {
                ...tf,
                animalCountTreated: +tf.animalCountTreated,
                quantityUsed: +tf.quantityUsed,
                unitCost: tf.unitCost ? +tf.unitCost : null,
                contentAmount: tf.contentAmount ? +tf.contentAmount : null,
                allocations: tf.allocations
                  .filter((a) => a.farmId && a.quantity)
                  .map((a) => ({ farmId: a.farmId, quantity: +a.quantity })),
              }
              if (editingTx) {
                updateTx({ variables: { treatmentId: editingTx.purchase.id, input } })
              } else {
                recordTx({ variables: { input } })
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Animal Type">
                <select
                  value={tf.animalType}
                  onChange={(e) => setTf((f) => ({ ...f, animalType: e.target.value }))}
                  className={sel}
                >
                  {ALL_ANIMALS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </Field>
              <Field label="Drug" required>
                <select
                  required
                  value={tf.drugId}
                  onChange={(e) => setTf((f) => ({ ...f, drugId: e.target.value }))}
                  className={sel}
                >
                  <option value="">— select —</option>
                  {drugs.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" required>
                <input
                  required
                  type="date"
                  value={tf.treatmentDate}
                  onChange={(e) => setTf((f) => ({ ...f, treatmentDate: e.target.value }))}
                  className={inp}
                />
              </Field>
              <Field label="Animals Treated">
                <input
                  type="number"
                  value={tf.animalCountTreated}
                  onChange={(e) => setTf((f) => ({ ...f, animalCountTreated: e.target.value }))}
                  className={inp}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity Used">
                <input
                  type="number"
                  step="0.01"
                  value={tf.quantityUsed}
                  onChange={(e) => setTf((f) => ({ ...f, quantityUsed: e.target.value }))}
                  className={inp}
                />
              </Field>
              <Field label="Unit">
                <select
                  value={tf.unit}
                  onChange={(e) => setTf((f) => ({ ...f, unit: e.target.value }))}
                  className={sel}
                >
                  {['ML', 'LITRES', 'MG', 'GRAMS', 'TABLETS', 'VIALS', 'SACHETS'].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Unit Cost (KES)">
              <input
                type="number"
                value={tf.unitCost}
                onChange={(e) => setTf((f) => ({ ...f, unitCost: e.target.value }))}
                className={inp}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Net content per unit">
                <input
                  type="number"
                  step="0.001"
                  value={tf.contentAmount}
                  onChange={(e) => setTf((f) => ({ ...f, contentAmount: e.target.value }))}
                  className={inp}
                  placeholder="e.g. 10 for '1 vial = 10ml'"
                />
              </Field>
              <Field label="Content Unit">
                <select
                  value={tf.contentUnit}
                  onChange={(e) => setTf((f) => ({ ...f, contentUnit: e.target.value }))}
                  className={sel}
                >
                  {CONTENT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u || '— n/a —'}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Supplier">
              <SupplierSelect
                value={tf.supplierId}
                onChange={(id) => setTf((f) => ({ ...f, supplierId: id }))}
                className={sel}
              />
            </Field>
            {tf.unitCost && tf.quantityUsed && (
              <p className="text-xs text-gray-400">
                Total cost: KES {(Number(tf.unitCost) * Number(tf.quantityUsed)).toLocaleString()}
              </p>
            )}
            <Field label="Condition Treated">
              <input
                value={tf.conditionTreated}
                onChange={(e) => setTf((f) => ({ ...f, conditionTreated: e.target.value }))}
                className={inp}
              />
            </Field>
            <Field label="Outcome">
              <input
                value={tf.outcome}
                onChange={(e) => setTf((f) => ({ ...f, outcome: e.target.value }))}
                className={inp}
              />
            </Field>
            <Field label="Notes">
              <textarea
                value={tf.notes}
                onChange={(e) => setTf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </Field>
            <Field label="Allocate across farms">
              <FarmAllocationEditor
                value={tf.allocations}
                onChange={(allocations) => setTf((f) => ({ ...f, allocations }))}
                totalQuantity={tf.quantityUsed}
                unit={tf.unit}
              />
            </Field>
            <SubmitButton loading={editingTx ? updatingTx : recordingTx} className={btn}>
              {editingTx ? 'Save Changes' : 'Record Treatment'}
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
