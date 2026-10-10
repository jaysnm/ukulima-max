import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Plus, Sprout, Layers, Pencil, Trash2 } from 'lucide-react'
import {
  SEEDLINGS,
  SEEDLING_PURCHASES,
  SOIL_INPUTS,
  SOIL_INPUT_PURCHASES,
  SOIL_TREATMENTS,
  CROPS,
  PLANTINGS,
} from '../../graphql/queries'
import {
  CREATE_SEEDLING,
  UPDATE_SEEDLING,
  DELETE_SEEDLING,
  RECORD_SEEDLING_PURCHASE,
  UPDATE_SEEDLING_PURCHASE,
  DELETE_SEEDLING_PURCHASE_ALLOCATION,
  CREATE_SOIL_INPUT,
  UPDATE_SOIL_INPUT,
  DELETE_SOIL_INPUT,
  RECORD_SOIL_INPUT_PURCHASE,
  UPDATE_SOIL_INPUT_PURCHASE,
  DELETE_SOIL_INPUT_PURCHASE_ALLOCATION,
  RECORD_SOIL_TREATMENT,
  UPDATE_SOIL_TREATMENT,
  DELETE_SOIL_TREATMENT_ALLOCATION,
} from '../../graphql/mutations'
import { useFarm } from '../../context/FarmContext'
import ImageUploadField from '../../components/ui/ImageUploadField'
import SubmitButton from '../../components/ui/SubmitButton'
import SupplierSelect from '../../components/ui/SupplierSelect'
import FarmAllocationEditor, { type Allocation } from '../../components/ui/FarmAllocationEditor'

const SEEDLING_UNITS = [
  'SEEDLINGS',
  'PACKETS',
  'TRAYS',
  'KG',
  'BAGS',
  'SACHETS',
  'TINS',
  'BUCKETS',
  'SACKS',
  'CARTONS',
  'CRATES',
]
const SOIL_INPUT_TYPES = [
  'LIME',
  'FERTILIZER_ORGANIC',
  'FERTILIZER_SYNTHETIC',
  'GYPSUM',
  'MULCH',
  'COMPOST',
  'OTHER',
]
const SOIL_UNITS = ['KG', 'BAGS', 'TONNES', 'LITRES']
const SOIL_PURCHASE_UNITS = ['KG', 'BAGS', 'SACKS', 'TINS', 'BUCKETS', 'TONNES', 'LITRES']
const CONTENT_UNITS = ['', 'KG', 'GRAMS', 'LITRES', 'ML', 'UNITS']

const emptySeedling = { name: '', cropId: '', maturityDays: '', notes: '', productUrl: '' }
const emptyPurchase = (farmId: string) => ({
  seedlingId: '',
  purchaseDate: '',
  quantity: '',
  unit: 'SEEDLINGS',
  unitCost: '',
  contentAmount: '',
  contentUnit: '',
  supplierId: '',
  notes: '',
  allocations: [{ farmId, quantity: '' }] as Allocation[],
})
const emptySoilInput = { name: '', inputType: 'FERTILIZER_SYNTHETIC', notes: '', productUrl: '' }
const emptySoilInputPurchase = (farmId: string) => ({
  soilInputId: '',
  purchaseDate: '',
  quantity: '',
  unit: 'KG',
  unitCost: '',
  contentAmount: '',
  contentUnit: '',
  supplierId: '',
  notes: '',
  allocations: [{ farmId, quantity: '' }] as Allocation[],
})
const emptyTreatment = (farmId: string) => ({
  soilInputId: '',
  dateApplied: '',
  quantity: '',
  unit: 'KG',
  areaCoveredAcres: '',
  unitCost: '',
  contentAmount: '',
  contentUnit: '',
  supplierId: '',
  notes: '',
  allocations: [{ farmId, quantity: '' }] as Allocation[],
})

export default function SeedlingsSoilPage() {
  const { activeFarmId, canEditActiveFarm, canEditCatalog } = useFarm()
  const skip = !activeFarmId

  const [showSeedlingModal, setShowSeedlingModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showSoilInputModal, setShowSoilInputModal] = useState(false)
  const [showSoilInputPurchaseModal, setShowSoilInputPurchaseModal] = useState(false)
  const [showTreatmentModal, setShowTreatmentModal] = useState(false)
  const [editingSeedling, setEditingSeedling] = useState<any | null>(null)
  const [editingPurchase, setEditingPurchase] = useState<any | null>(null)
  const [editingSoilInput, setEditingSoilInput] = useState<any | null>(null)
  const [editingSoilInputPurchase, setEditingSoilInputPurchase] = useState<any | null>(null)
  const [editingTreatment, setEditingTreatment] = useState<any | null>(null)

  const { data: cropData } = useQuery(CROPS)
  const { data: seedlingData, refetch: refetchSeedlings } = useQuery(SEEDLINGS)
  const { data: purchaseData, refetch: refetchPurchases } = useQuery(SEEDLING_PURCHASES, {
    variables: { farmId: activeFarmId },
    skip,
  })
  const { data: soilInputData, refetch: refetchSoilInputs } = useQuery(SOIL_INPUTS)
  const { data: plantingsData } = useQuery(PLANTINGS, {
    variables: { farmId: activeFarmId },
    skip,
  })
  const { data: soilInputPurchaseData, refetch: refetchSoilInputPurchases } = useQuery(
    SOIL_INPUT_PURCHASES,
    { variables: { farmId: activeFarmId }, skip }
  )
  const { data: treatmentData, refetch: refetchTreatments } = useQuery(SOIL_TREATMENTS, {
    variables: { farmId: activeFarmId },
    skip,
  })

  const [createSeedling, { loading: creatingSeedling }] = useMutation(CREATE_SEEDLING, {
    onCompleted: () => {
      refetchSeedlings()
      setShowSeedlingModal(false)
    },
  })
  const [updateSeedling, { loading: updatingSeedling }] = useMutation(UPDATE_SEEDLING, {
    onCompleted: () => {
      refetchSeedlings()
      setEditingSeedling(null)
    },
  })
  const [deleteSeedling] = useMutation(DELETE_SEEDLING, { onCompleted: () => refetchSeedlings() })
  const [recordPurchase, { loading: recordingPurchase }] = useMutation(RECORD_SEEDLING_PURCHASE, {
    onCompleted: () => {
      refetchPurchases()
      setShowPurchaseModal(false)
    },
  })
  const [updatePurchase, { loading: updatingPurchase }] = useMutation(UPDATE_SEEDLING_PURCHASE, {
    onCompleted: () => {
      refetchPurchases()
      setEditingPurchase(null)
    },
  })
  const [deletePurchaseAllocation] = useMutation(DELETE_SEEDLING_PURCHASE_ALLOCATION, {
    onCompleted: () => refetchPurchases(),
  })
  const [createSoilInput, { loading: creatingSoilInput }] = useMutation(CREATE_SOIL_INPUT, {
    onCompleted: () => {
      refetchSoilInputs()
      setShowSoilInputModal(false)
    },
  })
  const [updateSoilInput, { loading: updatingSoilInput }] = useMutation(UPDATE_SOIL_INPUT, {
    onCompleted: () => {
      refetchSoilInputs()
      setEditingSoilInput(null)
    },
  })
  const [deleteSoilInput] = useMutation(DELETE_SOIL_INPUT, {
    onCompleted: () => refetchSoilInputs(),
  })
  const [recordSoilInputPurchase, { loading: recordingSoilInputPurchase }] = useMutation(
    RECORD_SOIL_INPUT_PURCHASE,
    {
      onCompleted: () => {
        refetchSoilInputPurchases()
        setShowSoilInputPurchaseModal(false)
      },
    }
  )
  const [updateSoilInputPurchase, { loading: updatingSoilInputPurchase }] = useMutation(
    UPDATE_SOIL_INPUT_PURCHASE,
    {
      onCompleted: () => {
        refetchSoilInputPurchases()
        setEditingSoilInputPurchase(null)
      },
    }
  )
  const [deleteSoilInputPurchaseAllocation] = useMutation(DELETE_SOIL_INPUT_PURCHASE_ALLOCATION, {
    onCompleted: () => refetchSoilInputPurchases(),
  })
  const [recordTreatment, { loading: recordingTreatment }] = useMutation(RECORD_SOIL_TREATMENT, {
    onCompleted: () => {
      refetchTreatments()
      setShowTreatmentModal(false)
    },
  })
  const [updateTreatment, { loading: updatingTreatment }] = useMutation(UPDATE_SOIL_TREATMENT, {
    onCompleted: () => {
      refetchTreatments()
      setEditingTreatment(null)
    },
  })
  const [deleteTreatmentAllocation] = useMutation(DELETE_SOIL_TREATMENT_ALLOCATION, {
    onCompleted: () => refetchTreatments(),
  })

  const crops = cropData?.crops ?? []
  const seedlings = seedlingData?.seedlings ?? []
  const purchases = purchaseData?.seedlingPurchases ?? []
  const soilInputs = soilInputData?.soilInputs ?? []
  const soilInputPurchases = soilInputPurchaseData?.soilInputPurchases ?? []
  const treatments = treatmentData?.soilTreatments ?? []
  const plantings = plantingsData?.plantings ?? []

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

  // How much seedling (in kg) has actually gone into the ground, per crop —
  // pulled from plantings rather than purchases, since a purchase can sit
  // unused or be split across several plantings.
  const seedlingKgByCrop = plantings.reduce((acc: Record<string, number>, p: any) => {
    if (p.seedlingQuantityKg == null) return acc
    const key = p.crop.name
    acc[key] = (acc[key] ?? 0) + Number(p.seedlingQuantityKg)
    return acc
  }, {})

  const [sf, setSf] = useState(emptySeedling)
  const [pf, setPf] = useState(() => emptyPurchase(activeFarmId ?? ''))
  const [sif, setSif] = useState(emptySoilInput)
  const [sipf, setSipf] = useState(() => emptySoilInputPurchase(activeFarmId ?? ''))
  const [tf, setTf] = useState(() => emptyTreatment(activeFarmId ?? ''))
  const [sfImage, setSfImage] = useState<File | null>(null)
  const [sifImage, setSifImage] = useState<File | null>(null)

  const handleDeleteSeedling = (s: any) => {
    if (!window.confirm(`Delete seedling type "${s.name}"?`)) return
    deleteSeedling({ variables: { seedlingId: s.id } })
  }
  const handleDeletePurchase = (p: any) => {
    if (!window.confirm("Remove this farm's share of this seedling purchase?")) return
    deletePurchaseAllocation({ variables: { allocationId: p.id } })
  }
  const handleDeleteSoilInput = (s: any) => {
    if (!window.confirm(`Delete soil input "${s.name}"?`)) return
    deleteSoilInput({ variables: { soilInputId: s.id } })
  }
  const handleDeleteSoilInputPurchase = (p: any) => {
    if (!window.confirm("Remove this farm's share of this soil input purchase?")) return
    deleteSoilInputPurchaseAllocation({ variables: { allocationId: p.id } })
  }
  const handleDeleteTreatment = (t: any) => {
    if (!window.confirm("Remove this farm's share of this soil treatment?")) return
    deleteTreatmentAllocation({ variables: { allocationId: t.id } })
  }

  if (!activeFarmId)
    return <div className="text-gray-400 text-center mt-20">Select a farm first.</div>

  return (
    <div className="space-y-6">
      {/* Seedlings */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          <Sprout className="w-4 h-4 text-primary-600" /> Seedlings
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSf(emptySeedling)
              setSfImage(null)
              setShowSeedlingModal(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            <Plus size={14} /> Add Seedling Type
          </button>
          <button
            onClick={() => {
              setPf(emptyPurchase(activeFarmId))
              setShowPurchaseModal(true)
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
          >
            <Plus size={14} /> Record Purchase
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {seedlings.map((s: any) => (
            <div key={s.id} className="border rounded-xl p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  {s.imageUrl && (
                    <img
                      src={s.imageUrl}
                      alt=""
                      className="w-9 h-9 object-cover rounded-lg border border-gray-200 shrink-0"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{s.name}</p>
                    <p className="text-xs text-primary-600 mt-0.5">
                      {s.crop?.name || 'Unspecified crop'}
                    </p>
                    {s.maturityDays && (
                      <p className="text-xs text-gray-400 mt-0.5">{s.maturityDays} days</p>
                    )}
                    {s.notes && (
                      <p
                        className="text-xs text-gray-400 mt-0.5 truncate max-w-[16rem]"
                        title={s.notes}
                      >
                        {s.notes}
                      </p>
                    )}
                  </div>
                </div>
                {canEditCatalog && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingSeedling(s)
                        setSf({
                          name: s.name,
                          cropId: s.crop?.id ?? '',
                          maturityDays: s.maturityDays ?? '',
                          notes: s.notes ?? '',
                          productUrl: s.productUrl ?? '',
                        })
                        setSfImage(null)
                      }}
                      className="text-gray-400 hover:text-primary-600"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSeedling(s)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {seedlings.length === 0 && (
            <p className="text-gray-400 text-sm col-span-4">No seedling types added</p>
          )}
        </div>
      </div>

      {Object.keys(seedlingKgByCrop).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Seedlings Planted by Crop</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(seedlingKgByCrop).map(([cropName, kg]) => (
              <div key={cropName} className="border rounded-xl p-3">
                <p className="text-xs text-gray-400">{cropName}</p>
                <p className="text-xl font-bold text-gray-800">
                  {(kg as number).toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                  <span className="text-sm font-normal text-gray-400">kg</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-700">Seedling Purchases</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              {[
                'Seedling',
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
            {purchases.map((p: any) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-5 py-2.5 font-medium">{p.purchase.seedling.name}</td>
                <td className="px-5 py-2.5">{p.purchase.purchaseDate}</td>
                <td className="px-5 py-2.5">
                  {p.quantity} {p.purchase.unit}
                  {p.purchase.allocations.length > 1 && (
                    <span className="ml-1.5 text-xs text-gray-400">
                      (of {p.purchase.quantity} shared)
                    </span>
                  )}
                </td>
                <td className="px-5 py-2.5">
                  {p.purchase.unitCost
                    ? `KES ${Number(p.purchase.unitCost).toLocaleString()}`
                    : '–'}
                </td>
                <td className="px-5 py-2.5 font-medium">
                  {p.totalCost ? `KES ${Number(p.totalCost).toLocaleString()}` : '–'}
                </td>
                <td className="px-5 py-2.5 text-gray-500">{p.purchase.supplier?.name || '–'}</td>
                <td
                  className="px-5 py-2.5 text-gray-400 truncate max-w-xs"
                  title={p.purchase.notes}
                >
                  {p.purchase.notes || '–'}
                </td>
                <td className="px-5 py-2.5 text-right">
                  {canEditActiveFarm && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingPurchase(p)
                          setPf({
                            seedlingId: p.purchase.seedling.id,
                            purchaseDate: p.purchase.purchaseDate,
                            quantity: String(p.purchase.quantity),
                            unit: p.purchase.unit,
                            unitCost:
                              p.purchase.unitCost != null ? String(p.purchase.unitCost) : '',
                            contentAmount:
                              p.purchase.contentAmount != null
                                ? String(p.purchase.contentAmount)
                                : '',
                            contentUnit: p.purchase.contentUnit ?? '',
                            supplierId: p.purchase.supplier?.id ?? '',
                            notes: p.purchase.notes ?? '',
                            allocations: p.purchase.allocations.map((a: any) => ({
                              farmId: a.farm.id,
                              quantity: String(a.quantity),
                              plantingId: a.planting?.id,
                            })),
                          })
                        }}
                        className="text-gray-400 hover:text-primary-600"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePurchase(p)}
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
            {purchases.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">
                  No seedling purchases recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Soil inputs */}
      <div className="flex items-center justify-between pt-4">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          <Layers className="w-4 h-4 text-earth-600" /> Soil Inputs
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSif(emptySoilInput)
              setSifImage(null)
              setShowSoilInputModal(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            <Plus size={14} /> Add Soil Input Type
          </button>
          <button
            onClick={() => {
              setSipf(emptySoilInputPurchase(activeFarmId))
              setShowSoilInputPurchaseModal(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            <Plus size={14} /> Record Purchase
          </button>
          <button
            onClick={() => {
              setTf(emptyTreatment(activeFarmId))
              setShowTreatmentModal(true)
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
          >
            <Plus size={14} /> Record Application
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {soilInputs.map((s: any) => (
            <div key={s.id} className="border rounded-xl p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  {s.imageUrl && (
                    <img
                      src={s.imageUrl}
                      alt=""
                      className="w-9 h-9 object-cover rounded-lg border border-gray-200 shrink-0"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{s.name}</p>
                    <p className="text-xs text-primary-600 mt-0.5">
                      {s.inputType.replace(/_/g, ' ')}
                    </p>
                    {s.notes && (
                      <p
                        className="text-xs text-gray-400 mt-0.5 truncate max-w-[16rem]"
                        title={s.notes}
                      >
                        {s.notes}
                      </p>
                    )}
                  </div>
                </div>
                {canEditCatalog && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingSoilInput(s)
                        setSif({
                          name: s.name,
                          inputType: s.inputType,
                          notes: s.notes ?? '',
                          productUrl: s.productUrl ?? '',
                        })
                        setSifImage(null)
                      }}
                      className="text-gray-400 hover:text-primary-600"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSoilInput(s)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {soilInputs.length === 0 && (
            <p className="text-gray-400 text-sm col-span-4">No soil input types added</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-700">Soil Input Purchases</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              {[
                'Soil Input',
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
            {soilInputPurchases.map((p: any) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-5 py-2.5 font-medium">{p.purchase.soilInput.name}</td>
                <td className="px-5 py-2.5">{p.purchase.purchaseDate}</td>
                <td className="px-5 py-2.5">
                  {p.quantity} {p.purchase.unit}
                  {p.purchase.allocations.length > 1 && (
                    <span className="ml-1.5 text-xs text-gray-400">
                      (of {p.purchase.quantity} shared)
                    </span>
                  )}
                </td>
                <td className="px-5 py-2.5">
                  {p.purchase.unitCost
                    ? `KES ${Number(p.purchase.unitCost).toLocaleString()}`
                    : '–'}
                </td>
                <td className="px-5 py-2.5 font-medium">
                  {p.totalCost ? `KES ${Number(p.totalCost).toLocaleString()}` : '–'}
                </td>
                <td className="px-5 py-2.5 text-gray-500">{p.purchase.supplier?.name || '–'}</td>
                <td
                  className="px-5 py-2.5 text-gray-400 truncate max-w-xs"
                  title={p.purchase.notes}
                >
                  {p.purchase.notes || '–'}
                </td>
                <td className="px-5 py-2.5 text-right">
                  {canEditActiveFarm && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingSoilInputPurchase(p)
                          setSipf({
                            soilInputId: p.purchase.soilInput.id,
                            purchaseDate: p.purchase.purchaseDate,
                            quantity: String(p.purchase.quantity),
                            unit: p.purchase.unit,
                            unitCost:
                              p.purchase.unitCost != null ? String(p.purchase.unitCost) : '',
                            contentAmount:
                              p.purchase.contentAmount != null
                                ? String(p.purchase.contentAmount)
                                : '',
                            contentUnit: p.purchase.contentUnit ?? '',
                            supplierId: p.purchase.supplier?.id ?? '',
                            notes: p.purchase.notes ?? '',
                            allocations: p.purchase.allocations.map((a: any) => ({
                              farmId: a.farm.id,
                              quantity: String(a.quantity),
                              plantingId: a.planting?.id,
                            })),
                          })
                        }}
                        className="text-gray-400 hover:text-primary-600"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSoilInputPurchase(p)}
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
            {soilInputPurchases.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">
                  No soil input purchases recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-700">Soil Treatments</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              {[
                'Input',
                'Date',
                'Quantity',
                'Area (ac)',
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
            {treatments.map((t: any) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-5 py-2.5 font-medium">{t.purchase.soilInput.name}</td>
                <td className="px-5 py-2.5">{t.purchase.dateApplied}</td>
                <td className="px-5 py-2.5">
                  {t.quantity} {t.purchase.unit}
                  {t.purchase.allocations.length > 1 && (
                    <span className="ml-1.5 text-xs text-gray-400">
                      (of {t.purchase.quantity} shared)
                    </span>
                  )}
                </td>
                <td className="px-5 py-2.5">{t.purchase.areaCoveredAcres ?? '–'}</td>
                <td className="px-5 py-2.5">
                  {t.purchase.unitCost
                    ? `KES ${Number(t.purchase.unitCost).toLocaleString()}`
                    : '–'}
                </td>
                <td className="px-5 py-2.5 font-medium">
                  {t.totalCost ? `KES ${Number(t.totalCost).toLocaleString()}` : '–'}
                </td>
                <td className="px-5 py-2.5 text-gray-500">{t.purchase.supplier?.name || '–'}</td>
                <td
                  className="px-5 py-2.5 text-gray-400 truncate max-w-xs"
                  title={t.purchase.notes}
                >
                  {t.purchase.notes || '–'}
                </td>
                <td className="px-5 py-2.5 text-right">
                  {canEditActiveFarm && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingTreatment(t)
                          setTf({
                            soilInputId: t.purchase.soilInput.id,
                            dateApplied: t.purchase.dateApplied,
                            quantity: String(t.purchase.quantity),
                            unit: t.purchase.unit,
                            areaCoveredAcres:
                              t.purchase.areaCoveredAcres != null
                                ? String(t.purchase.areaCoveredAcres)
                                : '',
                            unitCost:
                              t.purchase.unitCost != null ? String(t.purchase.unitCost) : '',
                            contentAmount:
                              t.purchase.contentAmount != null
                                ? String(t.purchase.contentAmount)
                                : '',
                            contentUnit: t.purchase.contentUnit ?? '',
                            supplierId: t.purchase.supplier?.id ?? '',
                            notes: t.purchase.notes ?? '',
                            allocations: t.purchase.allocations.map((a: any) => ({
                              farmId: a.farm.id,
                              quantity: String(a.quantity),
                              plantingId: a.planting?.id,
                            })),
                          })
                        }}
                        className="text-gray-400 hover:text-primary-600"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTreatment(t)}
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
            {treatments.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-10 text-gray-400">
                  No soil treatments recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Seedling type modal */}
      {(showSeedlingModal || editingSeedling) && (
        <Modal
          title={editingSeedling ? 'Edit Seedling Type' : 'Add Seedling Type'}
          onClose={() => {
            setShowSeedlingModal(false)
            setEditingSeedling(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = { ...sf, cropId: sf.cropId || null, image: sfImage }
              if (editingSeedling) {
                updateSeedling({ variables: { seedlingId: editingSeedling.id, input } })
              } else {
                createSeedling({ variables: { input } })
              }
            }}
            className="space-y-4"
          >
            <F label="Name" required>
              <input
                required
                value={sf.name}
                onChange={(e) => setSf((f) => ({ ...f, name: e.target.value }))}
                className={inp}
                placeholder="e.g. TSAVO 4141 2kg packets"
              />
            </F>
            <F label="Crop Type">
              <select
                value={sf.cropId}
                onChange={(e) => setSf((f) => ({ ...f, cropId: e.target.value }))}
                className={sel}
              >
                <option value="">— unspecified —</option>
                {crops.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </F>
            <F label="Maturity (days)">
              <input
                value={sf.maturityDays}
                onChange={(e) => setSf((f) => ({ ...f, maturityDays: e.target.value }))}
                className={inp}
                placeholder="e.g. 90-120"
              />
            </F>
            <F label="Product URL">
              <input
                type="url"
                value={sf.productUrl}
                onChange={(e) => setSf((f) => ({ ...f, productUrl: e.target.value }))}
                className={inp}
                placeholder="https://..."
              />
            </F>
            <F label="Description">
              <textarea
                value={sf.notes}
                onChange={(e) => setSf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </F>
            <ImageUploadField existingUrl={editingSeedling?.imageUrl} onChange={setSfImage} />
            <SubmitButton
              loading={editingSeedling ? updatingSeedling : creatingSeedling}
              className={btn}
            >
              {editingSeedling ? 'Save Changes' : 'Save'}
            </SubmitButton>
          </form>
        </Modal>
      )}

      {/* Seedling purchase modal */}
      {(showPurchaseModal || editingPurchase) && (
        <Modal
          title={editingPurchase ? 'Edit Seedling Purchase' : 'Record Seedling Purchase'}
          onClose={() => {
            setShowPurchaseModal(false)
            setEditingPurchase(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = {
                ...pf,
                quantity: +pf.quantity,
                unitCost: pf.unitCost ? +pf.unitCost : null,
                contentAmount: pf.contentAmount ? +pf.contentAmount : null,
                allocations: pf.allocations
                  .filter((a) => a.farmId && a.quantity)
                  .map((a) => ({
                    farmId: a.farmId,
                    quantity: +a.quantity,
                    plantingId: a.plantingId || null,
                  })),
              }
              if (input.allocations.length === 0) {
                window.alert('Select at least one farm to allocate this purchase to.')
                return
              }
              if (editingPurchase) {
                updatePurchase({
                  variables: { purchaseId: editingPurchase.purchase.id, input },
                })
              } else {
                recordPurchase({ variables: { input } })
              }
            }}
            className="space-y-4"
          >
            <F label="Seedling" required>
              <select
                required
                value={pf.seedlingId}
                onChange={(e) => setPf((f) => ({ ...f, seedlingId: e.target.value }))}
                className={sel}
              >
                <option value="">— select —</option>
                {seedlings.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Date" required>
                <input
                  required
                  type="date"
                  value={pf.purchaseDate}
                  onChange={(e) => setPf((f) => ({ ...f, purchaseDate: e.target.value }))}
                  className={inp}
                />
              </F>
              <F label="Quantity" required>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={pf.quantity}
                  onChange={(e) => setPf((f) => ({ ...f, quantity: e.target.value }))}
                  className={inp}
                />
              </F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Unit">
                <select
                  value={pf.unit}
                  onChange={(e) => setPf((f) => ({ ...f, unit: e.target.value }))}
                  className={sel}
                >
                  {SEEDLING_UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </F>
              <F label="Unit Cost (KES)">
                <input
                  type="number"
                  value={pf.unitCost}
                  onChange={(e) => setPf((f) => ({ ...f, unitCost: e.target.value }))}
                  className={inp}
                />
              </F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Net content per unit">
                <input
                  type="number"
                  step="0.001"
                  value={pf.contentAmount}
                  onChange={(e) => setPf((f) => ({ ...f, contentAmount: e.target.value }))}
                  className={inp}
                  placeholder="e.g. 2 for '1 packet = 2kg'"
                />
              </F>
              <F label="Content Unit">
                <select
                  value={pf.contentUnit}
                  onChange={(e) => setPf((f) => ({ ...f, contentUnit: e.target.value }))}
                  className={sel}
                >
                  {CONTENT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u || '— n/a —'}
                    </option>
                  ))}
                </select>
              </F>
            </div>
            <F label="Supplier">
              <SupplierSelect
                value={pf.supplierId}
                onChange={(id) => setPf((f) => ({ ...f, supplierId: id }))}
                className={sel}
              />
            </F>
            {pf.unitCost && pf.quantity && (
              <p className="text-xs text-gray-400">
                Total cost: KES {(Number(pf.unitCost) * Number(pf.quantity)).toLocaleString()}
              </p>
            )}
            <F label="Notes">
              <textarea
                value={pf.notes}
                onChange={(e) => setPf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </F>
            <F label="Allocate across farms">
              <FarmAllocationEditor
                value={pf.allocations}
                onChange={(allocations) => setPf((f) => ({ ...f, allocations }))}
                totalQuantity={pf.quantity}
                unit={pf.unit}
                plantingsByFarm={plantingsByFarm}
              />
            </F>
            <SubmitButton
              loading={editingPurchase ? updatingPurchase : recordingPurchase}
              className={btn}
            >
              {editingPurchase ? 'Save Changes' : 'Save Purchase'}
            </SubmitButton>
          </form>
        </Modal>
      )}

      {/* Soil input type modal */}
      {(showSoilInputModal || editingSoilInput) && (
        <Modal
          title={editingSoilInput ? 'Edit Soil Input Type' : 'Add Soil Input Type'}
          onClose={() => {
            setShowSoilInputModal(false)
            setEditingSoilInput(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = { ...sif, image: sifImage }
              if (editingSoilInput) {
                updateSoilInput({ variables: { soilInputId: editingSoilInput.id, input } })
              } else {
                createSoilInput({ variables: { input } })
              }
            }}
            className="space-y-4"
          >
            <F label="Name" required>
              <input
                required
                value={sif.name}
                onChange={(e) => setSif((f) => ({ ...f, name: e.target.value }))}
                className={inp}
                placeholder="e.g. DAP Fertilizer"
              />
            </F>
            <F label="Type">
              <select
                value={sif.inputType}
                onChange={(e) => setSif((f) => ({ ...f, inputType: e.target.value }))}
                className={sel}
              >
                {SOIL_INPUT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </F>
            <F label="Product URL">
              <input
                type="url"
                value={sif.productUrl}
                onChange={(e) => setSif((f) => ({ ...f, productUrl: e.target.value }))}
                className={inp}
                placeholder="https://..."
              />
            </F>
            <F label="Description">
              <textarea
                value={sif.notes}
                onChange={(e) => setSif((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </F>
            <ImageUploadField existingUrl={editingSoilInput?.imageUrl} onChange={setSifImage} />
            <SubmitButton
              loading={editingSoilInput ? updatingSoilInput : creatingSoilInput}
              className={btn}
            >
              {editingSoilInput ? 'Save Changes' : 'Save'}
            </SubmitButton>
          </form>
        </Modal>
      )}

      {/* Soil input purchase modal */}
      {(showSoilInputPurchaseModal || editingSoilInputPurchase) && (
        <Modal
          title={
            editingSoilInputPurchase ? 'Edit Soil Input Purchase' : 'Record Soil Input Purchase'
          }
          onClose={() => {
            setShowSoilInputPurchaseModal(false)
            setEditingSoilInputPurchase(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = {
                ...sipf,
                quantity: +sipf.quantity,
                unitCost: sipf.unitCost ? +sipf.unitCost : null,
                contentAmount: sipf.contentAmount ? +sipf.contentAmount : null,
                allocations: sipf.allocations
                  .filter((a) => a.farmId && a.quantity)
                  .map((a) => ({
                    farmId: a.farmId,
                    quantity: +a.quantity,
                    plantingId: a.plantingId || null,
                  })),
              }
              if (input.allocations.length === 0) {
                window.alert('Select at least one farm to allocate this purchase to.')
                return
              }
              if (editingSoilInputPurchase) {
                updateSoilInputPurchase({
                  variables: { purchaseId: editingSoilInputPurchase.purchase.id, input },
                })
              } else {
                recordSoilInputPurchase({ variables: { input } })
              }
            }}
            className="space-y-4"
          >
            <F label="Soil Input" required>
              <select
                required
                value={sipf.soilInputId}
                onChange={(e) => setSipf((f) => ({ ...f, soilInputId: e.target.value }))}
                className={sel}
              >
                <option value="">— select —</option>
                {soilInputs.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Date" required>
                <input
                  required
                  type="date"
                  value={sipf.purchaseDate}
                  onChange={(e) => setSipf((f) => ({ ...f, purchaseDate: e.target.value }))}
                  className={inp}
                />
              </F>
              <F label="Quantity" required>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={sipf.quantity}
                  onChange={(e) => setSipf((f) => ({ ...f, quantity: e.target.value }))}
                  className={inp}
                />
              </F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Unit">
                <select
                  value={sipf.unit}
                  onChange={(e) => setSipf((f) => ({ ...f, unit: e.target.value }))}
                  className={sel}
                >
                  {SOIL_PURCHASE_UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </F>
              <F label="Unit Cost (KES)">
                <input
                  type="number"
                  value={sipf.unitCost}
                  onChange={(e) => setSipf((f) => ({ ...f, unitCost: e.target.value }))}
                  className={inp}
                />
              </F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Net content per unit">
                <input
                  type="number"
                  step="0.001"
                  value={sipf.contentAmount}
                  onChange={(e) => setSipf((f) => ({ ...f, contentAmount: e.target.value }))}
                  className={inp}
                  placeholder="e.g. 50 for '1 bag = 50kg'"
                />
              </F>
              <F label="Content Unit">
                <select
                  value={sipf.contentUnit}
                  onChange={(e) => setSipf((f) => ({ ...f, contentUnit: e.target.value }))}
                  className={sel}
                >
                  {CONTENT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u || '— n/a —'}
                    </option>
                  ))}
                </select>
              </F>
            </div>
            <F label="Supplier">
              <SupplierSelect
                value={sipf.supplierId}
                onChange={(id) => setSipf((f) => ({ ...f, supplierId: id }))}
                className={sel}
              />
            </F>
            {sipf.unitCost && sipf.quantity && (
              <p className="text-xs text-gray-400">
                Total cost: KES {(Number(sipf.unitCost) * Number(sipf.quantity)).toLocaleString()}
              </p>
            )}
            <F label="Notes">
              <textarea
                value={sipf.notes}
                onChange={(e) => setSipf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </F>
            <F label="Allocate across farms">
              <FarmAllocationEditor
                value={sipf.allocations}
                onChange={(allocations) => setSipf((f) => ({ ...f, allocations }))}
                totalQuantity={sipf.quantity}
                unit={sipf.unit}
                plantingsByFarm={plantingsByFarm}
              />
            </F>
            <SubmitButton
              loading={
                editingSoilInputPurchase ? updatingSoilInputPurchase : recordingSoilInputPurchase
              }
              className={btn}
            >
              {editingSoilInputPurchase ? 'Save Changes' : 'Save Purchase'}
            </SubmitButton>
          </form>
        </Modal>
      )}

      {/* Soil treatment modal */}
      {(showTreatmentModal || editingTreatment) && (
        <Modal
          title={editingTreatment ? 'Edit Soil Application' : 'Record Soil Application'}
          onClose={() => {
            setShowTreatmentModal(false)
            setEditingTreatment(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = {
                ...tf,
                quantity: +tf.quantity,
                areaCoveredAcres: tf.areaCoveredAcres ? +tf.areaCoveredAcres : null,
                unitCost: tf.unitCost ? +tf.unitCost : null,
                contentAmount: tf.contentAmount ? +tf.contentAmount : null,
                allocations: tf.allocations
                  .filter((a) => a.farmId && a.quantity)
                  .map((a) => ({
                    farmId: a.farmId,
                    quantity: +a.quantity,
                    plantingId: a.plantingId || null,
                  })),
              }
              if (input.allocations.length === 0) {
                window.alert('Select at least one farm to allocate this application to.')
                return
              }
              if (editingTreatment) {
                updateTreatment({
                  variables: { treatmentId: editingTreatment.purchase.id, input },
                })
              } else {
                recordTreatment({ variables: { input } })
              }
            }}
            className="space-y-4"
          >
            <F label="Soil Input" required>
              <select
                required
                value={tf.soilInputId}
                onChange={(e) => setTf((f) => ({ ...f, soilInputId: e.target.value }))}
                className={sel}
              >
                <option value="">— select —</option>
                {soilInputs.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Date" required>
                <input
                  required
                  type="date"
                  value={tf.dateApplied}
                  onChange={(e) => setTf((f) => ({ ...f, dateApplied: e.target.value }))}
                  className={inp}
                />
              </F>
              <F label="Quantity" required>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={tf.quantity}
                  onChange={(e) => setTf((f) => ({ ...f, quantity: e.target.value }))}
                  className={inp}
                />
              </F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Unit">
                <select
                  value={tf.unit}
                  onChange={(e) => setTf((f) => ({ ...f, unit: e.target.value }))}
                  className={sel}
                >
                  {SOIL_UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </F>
              <F label="Area Covered (ac)">
                <input
                  type="number"
                  step="0.01"
                  value={tf.areaCoveredAcres}
                  onChange={(e) => setTf((f) => ({ ...f, areaCoveredAcres: e.target.value }))}
                  className={inp}
                />
              </F>
            </div>
            <F label="Unit Cost (KES)">
              <input
                type="number"
                value={tf.unitCost}
                onChange={(e) => setTf((f) => ({ ...f, unitCost: e.target.value }))}
                className={inp}
              />
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Net content per unit">
                <input
                  type="number"
                  step="0.001"
                  value={tf.contentAmount}
                  onChange={(e) => setTf((f) => ({ ...f, contentAmount: e.target.value }))}
                  className={inp}
                  placeholder="e.g. 50 for '1 bag = 50kg'"
                />
              </F>
              <F label="Content Unit">
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
              </F>
            </div>
            <F label="Supplier">
              <SupplierSelect
                value={tf.supplierId}
                onChange={(id) => setTf((f) => ({ ...f, supplierId: id }))}
                className={sel}
              />
            </F>
            {tf.unitCost && tf.quantity && (
              <p className="text-xs text-gray-400">
                Total cost: KES {(Number(tf.unitCost) * Number(tf.quantity)).toLocaleString()}
              </p>
            )}
            <F label="Notes">
              <textarea
                value={tf.notes}
                onChange={(e) => setTf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </F>
            <F label="Allocate across farms">
              <FarmAllocationEditor
                value={tf.allocations}
                onChange={(allocations) => setTf((f) => ({ ...f, allocations }))}
                totalQuantity={tf.quantity}
                unit={tf.unit}
                plantingsByFarm={plantingsByFarm}
              />
            </F>
            <SubmitButton
              loading={editingTreatment ? updatingTreatment : recordingTreatment}
              className={btn}
            >
              {editingTreatment ? 'Save Changes' : 'Save Application'}
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
