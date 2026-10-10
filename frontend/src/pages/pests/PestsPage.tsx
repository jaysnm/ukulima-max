import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Plus, Bug, Sprout, Pencil, Trash2 } from 'lucide-react'
import { PLANTINGS, PESTICIDES, PESTICIDE_APPLICATIONS } from '../../graphql/queries'
import {
  REPORT_PEST_INCIDENT,
  UPDATE_PEST_INCIDENT,
  DELETE_PEST_INCIDENT,
  APPLY_PESTICIDE,
  UPDATE_PESTICIDE_APPLICATION,
  DELETE_PESTICIDE_APPLICATION_ALLOCATION,
  CREATE_PESTICIDE,
  UPDATE_PESTICIDE,
  DELETE_PESTICIDE,
} from '../../graphql/mutations'
import { useFarm } from '../../context/FarmContext'
import ImageUploadField from '../../components/ui/ImageUploadField'
import SubmitButton from '../../components/ui/SubmitButton'
import SupplierSelect from '../../components/ui/SupplierSelect'
import FarmAllocationEditor, { type Allocation } from '../../components/ui/FarmAllocationEditor'

const SEVERITY_BADGE: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}
const CONTENT_UNITS = ['', 'KG', 'GRAMS', 'LITRES', 'ML', 'UNITS']

const emptyIncident = {
  plantingId: '',
  pestName: '',
  dateObserved: '',
  severity: 'LOW',
  areaAffectedAcres: '',
  actionTaken: '',
  notes: '',
}
const emptyApplication = (farmId: string) => ({
  pesticideId: '',
  dateApplied: '',
  quantity: '',
  unit: 'LITRES',
  unitCost: '',
  contentAmount: '',
  contentUnit: '',
  supplierId: '',
  notes: '',
  allocations: [{ farmId, quantity: '' }] as Allocation[],
})
const emptyPesticide = {
  name: '',
  pesticideType: 'INSECTICIDE',
  activeIngredient: '',
  targetPests: '',
  preHarvestIntervalDays: '',
  notes: '',
  productUrl: '',
}

export default function PestsPage() {
  const { activeFarmId, canEditActiveFarm, canEditCatalog } = useFarm()
  const skip = !activeFarmId
  const [showIncidentModal, setShowIncidentModal] = useState(false)
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [showPesticideModal, setShowPesticideModal] = useState(false)
  const [editingIncident, setEditingIncident] = useState<any | null>(null)
  const [editingApplication, setEditingApplication] = useState<any | null>(null)
  const [editingPesticide, setEditingPesticide] = useState<any | null>(null)

  const { data: plantData, refetch: refetchPlantings } = useQuery(PLANTINGS, {
    variables: { farmId: activeFarmId },
    skip,
  })
  const { data: pestData, refetch: refetchPesticides } = useQuery(PESTICIDES)
  const { data: appData, refetch: refetchApplications } = useQuery(PESTICIDE_APPLICATIONS, {
    variables: { farmId: activeFarmId },
    skip,
  })

  const [reportPest, { loading: reportingPest }] = useMutation(REPORT_PEST_INCIDENT, {
    onCompleted: () => {
      refetchPlantings()
      setShowIncidentModal(false)
    },
  })
  const [updateIncident, { loading: updatingIncident }] = useMutation(UPDATE_PEST_INCIDENT, {
    onCompleted: () => {
      refetchPlantings()
      setEditingIncident(null)
    },
  })
  const [deleteIncident] = useMutation(DELETE_PEST_INCIDENT, {
    onCompleted: () => refetchPlantings(),
  })
  const [applyPesticide, { loading: applyingPesticide }] = useMutation(APPLY_PESTICIDE, {
    onCompleted: () => {
      refetchApplications()
      refetchPlantings()
      setShowApplicationModal(false)
    },
  })
  const [updateApplication, { loading: updatingApplication }] = useMutation(
    UPDATE_PESTICIDE_APPLICATION,
    {
      onCompleted: () => {
        refetchApplications()
        refetchPlantings()
        setEditingApplication(null)
      },
    }
  )
  const [deleteApplicationAllocation] = useMutation(DELETE_PESTICIDE_APPLICATION_ALLOCATION, {
    onCompleted: () => {
      refetchApplications()
      refetchPlantings()
    },
  })
  const [createPesticide, { loading: creatingPesticide }] = useMutation(CREATE_PESTICIDE, {
    onCompleted: () => {
      refetchPesticides()
      setShowPesticideModal(false)
    },
  })
  const [updatePesticide, { loading: updatingPesticide }] = useMutation(UPDATE_PESTICIDE, {
    onCompleted: () => {
      refetchPesticides()
      setEditingPesticide(null)
    },
  })
  const [deletePesticide] = useMutation(DELETE_PESTICIDE, {
    onCompleted: () => refetchPesticides(),
  })

  const plantings = plantData?.plantings ?? []
  const pesticides = pestData?.pesticides ?? []
  const allApplications = [...(appData?.pesticideApplications ?? [])].sort((a: any, b: any) =>
    b.purchase.dateApplied.localeCompare(a.purchase.dateApplied)
  )

  // Only the active farm's plantings are loaded on this page, so that's the
  // only farm an allocation row can offer a specific planting for — other
  // farms in the split just get a farm + quantity.
  const plantingsByFarm = activeFarmId
    ? {
        [activeFarmId]: plantings.map((p: any) => ({
          id: p.id,
          label: `${p.crop.name} (${p.plantingDate})`,
        })),
      }
    : {}

  const allIncidents = plantings
    .flatMap((p: any) =>
      (p.pestIncidents ?? []).map((i: any) => ({ ...i, cropName: p.crop.name, plantingId: p.id }))
    )
    .sort((a: any, b: any) => b.dateObserved.localeCompare(a.dateObserved))

  const [pif, setPif] = useState(emptyIncident)
  const [paf, setPaf] = useState(() => emptyApplication(activeFarmId ?? ''))
  const [psf, setPsf] = useState(emptyPesticide)
  const [pifImage, setPifImage] = useState<File | null>(null)
  const [psfImage, setPsfImage] = useState<File | null>(null)

  const handleDeleteIncident = (i: any) => {
    if (!window.confirm('Delete this pest incident?')) return
    deleteIncident({ variables: { incidentId: i.id } })
  }
  const handleDeleteApplication = (a: any) => {
    if (!window.confirm("Remove this farm's share of this pesticide application?")) return
    deleteApplicationAllocation({ variables: { allocationId: a.id } })
  }
  const handleDeletePesticide = (p: any) => {
    if (!window.confirm(`Delete pesticide "${p.name}"?`)) return
    deletePesticide({ variables: { pesticideId: p.id } })
  }

  if (!activeFarmId)
    return <div className="text-gray-400 text-center mt-20">Select a farm first.</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            setPsf(emptyPesticide)
            setPsfImage(null)
            setShowPesticideModal(true)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border text-gray-700 rounded-lg text-sm hover:bg-gray-50"
        >
          <Plus size={14} /> Add Pesticide
        </button>
        <button
          onClick={() => {
            setPaf(emptyApplication(activeFarmId))
            setShowApplicationModal(true)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border text-gray-700 rounded-lg text-sm hover:bg-gray-50"
        >
          <Sprout size={14} /> Log Application
        </button>
        <button
          onClick={() => {
            setPif(emptyIncident)
            setPifImage(null)
            setShowIncidentModal(true)
          }}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
        >
          <Bug size={14} /> Report Pest
        </button>
      </div>

      {/* Pesticide catalog */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 mb-4">Pesticide Catalog</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pesticides.map((p: any) => (
            <div key={p.id} className="border rounded-xl p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="w-9 h-9 object-cover rounded-lg border border-gray-200 shrink-0"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{p.name}</p>
                    <p className="text-xs text-primary-600 mt-0.5">{p.pesticideType}</p>
                    {p.notes && (
                      <p
                        className="text-xs text-gray-400 mt-0.5 truncate max-w-[16rem]"
                        title={p.notes}
                      >
                        {p.notes}
                      </p>
                    )}
                  </div>
                </div>
                {canEditCatalog && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingPesticide(p)
                        setPsf({
                          name: p.name,
                          pesticideType: p.pesticideType,
                          activeIngredient: p.activeIngredient ?? '',
                          targetPests: p.targetPests ?? '',
                          preHarvestIntervalDays:
                            p.preHarvestIntervalDays != null
                              ? String(p.preHarvestIntervalDays)
                              : '',
                          notes: p.notes ?? '',
                          productUrl: p.productUrl ?? '',
                        })
                        setPsfImage(null)
                      }}
                      className="text-gray-400 hover:text-primary-600"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePesticide(p)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {pesticides.length === 0 && (
            <p className="text-gray-400 text-sm col-span-4">No pesticides added</p>
          )}
        </div>
      </div>

      {/* Incidents */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Bug className="w-4 h-4 text-red-500" />
          <h2 className="font-semibold text-gray-700">Pest Incidents</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              {[
                '',
                'Crop',
                'Pest',
                'Date',
                'Severity',
                'Area (ac)',
                'Action Taken',
                'Notes',
                '',
              ].map((h, i) => (
                <th key={i} className="px-5 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allIncidents.map((i: any) => (
              <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-5 py-2.5">
                  {i.imageUrl && (
                    <img
                      src={i.imageUrl}
                      alt=""
                      className="w-8 h-8 object-cover rounded border border-gray-200"
                    />
                  )}
                </td>
                <td className="px-5 py-2.5 font-medium">{i.cropName}</td>
                <td className="px-5 py-2.5">{i.pestName}</td>
                <td className="px-5 py-2.5">{i.dateObserved}</td>
                <td className="px-5 py-2.5">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_BADGE[i.severity]}`}
                  >
                    {i.severity}
                  </span>
                </td>
                <td className="px-5 py-2.5">{i.areaAffectedAcres}</td>
                <td className="px-5 py-2.5 text-gray-500">{i.actionTaken || '–'}</td>
                <td className="px-5 py-2.5 text-gray-400 truncate max-w-xs" title={i.notes}>
                  {i.notes || '–'}
                </td>
                <td className="px-5 py-2.5">
                  {canEditActiveFarm && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingIncident(i)
                          setPif({
                            plantingId: i.plantingId,
                            pestName: i.pestName,
                            dateObserved: i.dateObserved,
                            severity: i.severity,
                            areaAffectedAcres: String(i.areaAffectedAcres),
                            actionTaken: i.actionTaken ?? '',
                            notes: i.notes ?? '',
                          })
                          setPifImage(null)
                        }}
                        className="text-gray-400 hover:text-primary-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteIncident(i)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {allIncidents.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-10 text-gray-400">
                  No pest incidents
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Applications */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-700">Pesticide Applications</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              {[
                'Crop',
                'Pesticide',
                'Date',
                'Quantity',
                'Unit Cost',
                'Total Cost',
                'Supplier',
                'Notes',
                '',
              ].map((h, i) => (
                <th key={i} className="px-5 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allApplications.map((a: any) => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-5 py-2.5 font-medium">{a.planting?.crop?.name || '–'}</td>
                <td className="px-5 py-2.5">{a.purchase.pesticide.name}</td>
                <td className="px-5 py-2.5">{a.purchase.dateApplied}</td>
                <td className="px-5 py-2.5">
                  {a.quantity} {a.purchase.unit}
                  {a.purchase.allocations.length > 1 && (
                    <span className="ml-1.5 text-xs text-gray-400">
                      (of {a.purchase.quantity} shared)
                    </span>
                  )}
                </td>
                <td className="px-5 py-2.5">
                  {a.purchase.unitCost
                    ? `KES ${Number(a.purchase.unitCost).toLocaleString()}`
                    : '–'}
                </td>
                <td className="px-5 py-2.5 font-medium">
                  {a.totalCost ? `KES ${Number(a.totalCost).toLocaleString()}` : '–'}
                </td>
                <td className="px-5 py-2.5 text-gray-500">{a.purchase.supplier?.name || '–'}</td>
                <td
                  className="px-5 py-2.5 text-gray-400 truncate max-w-xs"
                  title={a.purchase.notes}
                >
                  {a.purchase.notes || '–'}
                </td>
                <td className="px-5 py-2.5">
                  {canEditActiveFarm && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingApplication(a)
                          setPaf({
                            pesticideId: a.purchase.pesticide.id,
                            dateApplied: a.purchase.dateApplied,
                            quantity: String(a.purchase.quantity),
                            unit: a.purchase.unit,
                            unitCost:
                              a.purchase.unitCost != null ? String(a.purchase.unitCost) : '',
                            contentAmount:
                              a.purchase.contentAmount != null
                                ? String(a.purchase.contentAmount)
                                : '',
                            contentUnit: a.purchase.contentUnit ?? '',
                            supplierId: a.purchase.supplier?.id ?? '',
                            notes: a.purchase.notes ?? '',
                            allocations: a.purchase.allocations.map((al: any) => ({
                              farmId: al.farm.id,
                              quantity: String(al.quantity),
                              plantingId: al.planting?.id,
                            })),
                          })
                        }}
                        className="text-gray-400 hover:text-primary-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteApplication(a)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {allApplications.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-10 text-gray-400">
                  No applications logged
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Incident Modal */}
      {(showIncidentModal || editingIncident) && (
        <Modal
          title={editingIncident ? 'Edit Pest Incident' : 'Report Pest Incident'}
          onClose={() => {
            setShowIncidentModal(false)
            setEditingIncident(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = { ...pif, areaAffectedAcres: +pif.areaAffectedAcres, image: pifImage }
              if (editingIncident) {
                updateIncident({ variables: { incidentId: editingIncident.id, input } })
              } else {
                reportPest({ variables: { input } })
              }
            }}
            className="space-y-4"
          >
            <Field label="Planting / Crop" required>
              <select
                required
                value={pif.plantingId}
                onChange={(e) => setPif((f) => ({ ...f, plantingId: e.target.value }))}
                className={sel}
              >
                <option value="">— select —</option>
                {plantings.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.crop.name} ({p.plantingDate})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pest Name" required>
              <input
                required
                value={pif.pestName}
                onChange={(e) => setPif((f) => ({ ...f, pestName: e.target.value }))}
                className={inp}
                placeholder="e.g. Fall Armyworm"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date Observed" required>
                <input
                  required
                  type="date"
                  value={pif.dateObserved}
                  onChange={(e) => setPif((f) => ({ ...f, dateObserved: e.target.value }))}
                  className={inp}
                />
              </Field>
              <Field label="Severity">
                <select
                  value={pif.severity}
                  onChange={(e) => setPif((f) => ({ ...f, severity: e.target.value }))}
                  className={sel}
                >
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Area Affected (acres)" required>
              <input
                required
                type="number"
                step="0.01"
                value={pif.areaAffectedAcres}
                onChange={(e) => setPif((f) => ({ ...f, areaAffectedAcres: e.target.value }))}
                className={inp}
              />
            </Field>
            <Field label="Action Taken">
              <input
                value={pif.actionTaken}
                onChange={(e) => setPif((f) => ({ ...f, actionTaken: e.target.value }))}
                className={inp}
              />
            </Field>
            <Field label="Notes">
              <textarea
                value={pif.notes}
                onChange={(e) => setPif((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </Field>
            <ImageUploadField existingUrl={editingIncident?.imageUrl} onChange={setPifImage} />
            <SubmitButton
              loading={editingIncident ? updatingIncident : reportingPest}
              className={btn}
            >
              {editingIncident ? 'Save Changes' : 'Report Incident'}
            </SubmitButton>
          </form>
        </Modal>
      )}

      {/* Application Modal */}
      {(showApplicationModal || editingApplication) && (
        <Modal
          title={editingApplication ? 'Edit Pesticide Application' : 'Log Pesticide Application'}
          onClose={() => {
            setShowApplicationModal(false)
            setEditingApplication(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = {
                ...paf,
                quantity: +paf.quantity,
                unitCost: paf.unitCost ? +paf.unitCost : null,
                contentAmount: paf.contentAmount ? +paf.contentAmount : null,
                allocations: paf.allocations
                  .filter((a) => a.farmId && a.quantity)
                  .map((a) => ({
                    farmId: a.farmId,
                    quantity: +a.quantity,
                    plantingId: a.plantingId || null,
                  })),
              }
              if (editingApplication) {
                updateApplication({
                  variables: { applicationId: editingApplication.purchase.id, input },
                })
              } else {
                applyPesticide({ variables: { input } })
              }
            }}
            className="space-y-4"
          >
            <Field label="Pesticide" required>
              <select
                required
                value={paf.pesticideId}
                onChange={(e) => setPaf((f) => ({ ...f, pesticideId: e.target.value }))}
                className={sel}
              >
                <option value="">— select —</option>
                {pesticides.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" required>
                <input
                  required
                  type="date"
                  value={paf.dateApplied}
                  onChange={(e) => setPaf((f) => ({ ...f, dateApplied: e.target.value }))}
                  className={inp}
                />
              </Field>
              <Field label="Quantity">
                <input
                  type="number"
                  step="0.001"
                  value={paf.quantity}
                  onChange={(e) => setPaf((f) => ({ ...f, quantity: e.target.value }))}
                  className={inp}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit">
                <select
                  value={paf.unit}
                  onChange={(e) => setPaf((f) => ({ ...f, unit: e.target.value }))}
                  className={sel}
                >
                  {['LITRES', 'ML', 'KG', 'GRAMS', 'SACHETS'].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </Field>
              <Field label="Unit Cost (KES)">
                <input
                  type="number"
                  value={paf.unitCost}
                  onChange={(e) => setPaf((f) => ({ ...f, unitCost: e.target.value }))}
                  className={inp}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Net content per unit">
                <input
                  type="number"
                  step="0.001"
                  value={paf.contentAmount}
                  onChange={(e) => setPaf((f) => ({ ...f, contentAmount: e.target.value }))}
                  className={inp}
                  placeholder="e.g. 1 for '1 sachet = 1 litre'"
                />
              </Field>
              <Field label="Content Unit">
                <select
                  value={paf.contentUnit}
                  onChange={(e) => setPaf((f) => ({ ...f, contentUnit: e.target.value }))}
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
                value={paf.supplierId}
                onChange={(id) => setPaf((f) => ({ ...f, supplierId: id }))}
                className={sel}
              />
            </Field>
            {paf.unitCost && paf.quantity && (
              <p className="text-xs text-gray-400">
                Total cost: KES {(Number(paf.unitCost) * Number(paf.quantity)).toLocaleString()}
              </p>
            )}
            <Field label="Notes">
              <textarea
                value={paf.notes}
                onChange={(e) => setPaf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </Field>
            <Field label="Allocate across farms">
              <FarmAllocationEditor
                value={paf.allocations}
                onChange={(allocations) => setPaf((f) => ({ ...f, allocations }))}
                totalQuantity={paf.quantity}
                unit={paf.unit}
                plantingsByFarm={plantingsByFarm}
              />
            </Field>
            <SubmitButton
              loading={editingApplication ? updatingApplication : applyingPesticide}
              className={btn}
            >
              {editingApplication ? 'Save Changes' : 'Log Application'}
            </SubmitButton>
          </form>
        </Modal>
      )}

      {/* Pesticide Modal */}
      {(showPesticideModal || editingPesticide) && (
        <Modal
          title={editingPesticide ? 'Edit Pesticide' : 'Add Pesticide'}
          onClose={() => {
            setShowPesticideModal(false)
            setEditingPesticide(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = {
                ...psf,
                preHarvestIntervalDays: psf.preHarvestIntervalDays
                  ? +psf.preHarvestIntervalDays
                  : null,
                image: psfImage,
              }
              if (editingPesticide) {
                updatePesticide({ variables: { pesticideId: editingPesticide.id, input } })
              } else {
                createPesticide({ variables: { input } })
              }
            }}
            className="space-y-4"
          >
            <Field label="Product Name" required>
              <input
                required
                value={psf.name}
                onChange={(e) => setPsf((f) => ({ ...f, name: e.target.value }))}
                className={inp}
              />
            </Field>
            <Field label="Type">
              <select
                value={psf.pesticideType}
                onChange={(e) => setPsf((f) => ({ ...f, pesticideType: e.target.value }))}
                className={sel}
              >
                {[
                  'INSECTICIDE',
                  'HERBICIDE',
                  'FUNGICIDE',
                  'RODENTICIDE',
                  'NEMATICIDE',
                  'BIOLOGICAL',
                  'OTHER',
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Active Ingredient">
              <input
                value={psf.activeIngredient}
                onChange={(e) => setPsf((f) => ({ ...f, activeIngredient: e.target.value }))}
                className={inp}
              />
            </Field>
            <Field label="Target Pests">
              <input
                value={psf.targetPests}
                onChange={(e) => setPsf((f) => ({ ...f, targetPests: e.target.value }))}
                className={inp}
              />
            </Field>
            <Field label="PHI (days)">
              <input
                type="number"
                value={psf.preHarvestIntervalDays}
                onChange={(e) => setPsf((f) => ({ ...f, preHarvestIntervalDays: e.target.value }))}
                className={inp}
              />
            </Field>
            <Field label="Product URL">
              <input
                type="url"
                value={psf.productUrl}
                onChange={(e) => setPsf((f) => ({ ...f, productUrl: e.target.value }))}
                className={inp}
                placeholder="https://..."
              />
            </Field>
            <Field label="Description">
              <textarea
                value={psf.notes}
                onChange={(e) => setPsf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </Field>
            <ImageUploadField existingUrl={editingPesticide?.imageUrl} onChange={setPsfImage} />
            <SubmitButton
              loading={editingPesticide ? updatingPesticide : creatingPesticide}
              className={btn}
            >
              {editingPesticide ? 'Save Changes' : 'Save Pesticide'}
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
