import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Plus, Tractor, Pencil, Trash2 } from 'lucide-react'
import { ANIMAL_FEEDS, FEED_RECORDS } from '../../graphql/queries'
import {
  CREATE_FEED,
  UPDATE_FEED,
  DELETE_FEED,
  RECORD_FEEDING,
  UPDATE_FEED_RECORD,
  DELETE_FEED_RECORD_ALLOCATION,
} from '../../graphql/mutations'
import { useFarm } from '../../context/FarmContext'
import ImageUploadField from '../../components/ui/ImageUploadField'
import SubmitButton from '../../components/ui/SubmitButton'
import SupplierSelect from '../../components/ui/SupplierSelect'
import FarmAllocationEditor, { type Allocation } from '../../components/ui/FarmAllocationEditor'

const ALL_ANIMALS = ['COW', 'GOAT', 'SHEEP', 'CHICKEN', 'DUCK', 'TURKEY']
const FEED_TYPES = [
  'CONCENTRATE',
  'HAY',
  'SILAGE',
  'PASTURE',
  'GRAIN',
  'MINERAL_BLOCK',
  'SUPPLEMENT',
  'CRUMBS',
  'KITCHEN_WASTE',
  'OTHER',
]
const UNITS = ['KG', 'GRAMS', 'LITRES', 'BAGS', 'BALES', 'TONNES']
const CONTENT_UNITS = ['', 'KG', 'GRAMS', 'LITRES', 'ML', 'UNITS']

const emptyFeed = {
  name: '',
  feedType: 'CONCENTRATE',
  targetSpecies: '',
  nutritionalInfo: '',
  notes: '',
  productUrl: '',
}
const emptyRecord = (farmId: string) => ({
  animalType: 'COW',
  feedId: '',
  feedDate: '',
  quantity: '',
  unit: 'KG',
  unitCost: '',
  contentAmount: '',
  contentUnit: '',
  supplierId: '',
  animalCountFed: '',
  notes: '',
  allocations: [{ farmId, quantity: '' }] as Allocation[],
})

export default function FeedPage() {
  const { activeFarmId, canEditActiveFarm, canEditCatalog } = useFarm()
  const skip = !activeFarmId
  const [showFeedModal, setShowFeedModal] = useState(false)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [editingFeed, setEditingFeed] = useState<any | null>(null)
  const [editingRecord, setEditingRecord] = useState<any | null>(null)

  const { data: feedData, refetch: rf } = useQuery(ANIMAL_FEEDS)
  const { data: recordData, refetch: rr } = useQuery(FEED_RECORDS, {
    variables: { farmId: activeFarmId },
    skip,
  })

  const [createFeed, { loading: creatingFeed }] = useMutation(CREATE_FEED, {
    onCompleted: () => {
      rf()
      setShowFeedModal(false)
    },
  })
  const [updateFeed, { loading: updatingFeed }] = useMutation(UPDATE_FEED, {
    onCompleted: () => {
      rf()
      setEditingFeed(null)
    },
  })
  const [deleteFeed] = useMutation(DELETE_FEED, { onCompleted: () => rf() })
  const [recordFeeding, { loading: recordingFeeding }] = useMutation(RECORD_FEEDING, {
    onCompleted: () => {
      rr()
      setShowRecordModal(false)
    },
  })
  const [updateRecord, { loading: updatingRecord }] = useMutation(UPDATE_FEED_RECORD, {
    onCompleted: () => {
      rr()
      setEditingRecord(null)
    },
  })
  const [deleteRecordAllocation] = useMutation(DELETE_FEED_RECORD_ALLOCATION, {
    onCompleted: () => rr(),
  })

  const feeds = feedData?.animalFeeds ?? []
  const records = recordData?.feedRecords ?? []

  const [ff, setFf] = useState(emptyFeed)
  const [recf, setRecf] = useState(() => emptyRecord(activeFarmId ?? ''))
  const [ffImage, setFfImage] = useState<File | null>(null)

  const handleDeleteFeed = (f: any) => {
    if (!window.confirm(`Delete feed type "${f.name}"?`)) return
    deleteFeed({ variables: { feedId: f.id } })
  }
  const handleDeleteRecord = (r: any) => {
    if (!window.confirm("Remove this farm's share of this feeding record?")) return
    deleteRecordAllocation({ variables: { allocationId: r.id } })
  }

  if (!activeFarmId)
    return <div className="text-gray-400 text-center mt-20">Select a farm first.</div>

  const totalCost = records.reduce(
    (s: number, r: any) => s + (r.totalCost ? Number(r.totalCost) : 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Total feed cost:{' '}
          <strong className="text-gray-800">KES {totalCost.toLocaleString()}</strong>
          <span className="mx-2">·</span>
          {records.length} records
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setFf(emptyFeed)
              setFfImage(null)
              setShowFeedModal(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            <Plus size={14} /> Add Feed Type
          </button>
          <button
            onClick={() => {
              setRecf(emptyRecord(activeFarmId))
              setShowRecordModal(true)
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
          >
            <Plus size={14} /> Record Feeding
          </button>
        </div>
      </div>

      {/* Feed types */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Tractor className="w-4 h-4 text-primary-600" />
          <h2 className="font-semibold text-gray-700">Feed & Supplement Types</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {feeds.map((f: any) => (
            <div key={f.id} className="border rounded-xl p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  {f.imageUrl && (
                    <img
                      src={f.imageUrl}
                      alt=""
                      className="w-9 h-9 object-cover rounded-lg border border-gray-200 shrink-0"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{f.name}</p>
                    <p className="text-xs text-primary-600 mt-0.5">
                      {f.feedType.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{f.targetSpecies || 'All animals'}</p>
                    {f.notes && (
                      <p
                        className="text-xs text-gray-400 mt-1 truncate max-w-[16rem]"
                        title={f.notes}
                      >
                        {f.notes}
                      </p>
                    )}
                  </div>
                </div>
                {canEditCatalog && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingFeed(f)
                        setFf({
                          name: f.name,
                          feedType: f.feedType,
                          targetSpecies: f.targetSpecies ?? '',
                          nutritionalInfo: f.nutritionalInfo ?? '',
                          notes: f.notes ?? '',
                          productUrl: f.productUrl ?? '',
                        })
                        setFfImage(null)
                      }}
                      className="text-gray-400 hover:text-primary-600"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFeed(f)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {feeds.length === 0 && (
            <p className="text-gray-400 text-sm col-span-4">No feed types added</p>
          )}
        </div>
      </div>

      {/* Records table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-700">Feeding Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                {[
                  'Animal',
                  'Feed',
                  'Date',
                  'Quantity',
                  'Animals Fed',
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
              {records.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-2.5 capitalize font-medium">
                    {r.purchase.animalType.toLowerCase()}
                  </td>
                  <td className="px-5 py-2.5">
                    {r.purchase.feed.name}{' '}
                    <span className="text-xs text-gray-400">({r.purchase.feed.feedType})</span>
                  </td>
                  <td className="px-5 py-2.5">{r.purchase.feedDate}</td>
                  <td className="px-5 py-2.5 font-semibold">
                    {r.quantity} {r.purchase.unit}
                    {r.purchase.allocations.length > 1 && (
                      <span className="ml-1.5 text-xs text-gray-400 font-normal">
                        (of {r.purchase.quantity} shared)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2.5">{r.purchase.animalCountFed ?? '–'}</td>
                  <td className="px-5 py-2.5">
                    {r.purchase.unitCost
                      ? `KES ${Number(r.purchase.unitCost).toLocaleString()}`
                      : '–'}
                  </td>
                  <td className="px-5 py-2.5 font-medium">
                    {r.totalCost ? `KES ${Number(r.totalCost).toLocaleString()}` : '–'}
                  </td>
                  <td className="px-5 py-2.5 text-gray-500">{r.purchase.supplier?.name || '–'}</td>
                  <td
                    className="px-5 py-2.5 text-gray-400 truncate max-w-xs"
                    title={r.purchase.notes}
                  >
                    {r.purchase.notes || '–'}
                  </td>
                  <td className="px-5 py-2.5">
                    {canEditActiveFarm && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingRecord(r)
                            setRecf({
                              animalType: r.purchase.animalType,
                              feedId: r.purchase.feed.id,
                              feedDate: r.purchase.feedDate,
                              quantity: String(r.purchase.quantity),
                              unit: r.purchase.unit,
                              unitCost:
                                r.purchase.unitCost != null ? String(r.purchase.unitCost) : '',
                              contentAmount:
                                r.purchase.contentAmount != null
                                  ? String(r.purchase.contentAmount)
                                  : '',
                              contentUnit: r.purchase.contentUnit ?? '',
                              supplierId: r.purchase.supplier?.id ?? '',
                              animalCountFed:
                                r.purchase.animalCountFed != null
                                  ? String(r.purchase.animalCountFed)
                                  : '',
                              notes: r.purchase.notes ?? '',
                              allocations: r.purchase.allocations.map((a: any) => ({
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
                          onClick={() => handleDeleteRecord(r)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    No feeding records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feed Type Modal */}
      {(showFeedModal || editingFeed) && (
        <Modal
          title={editingFeed ? 'Edit Feed Type' : 'Add Feed Type'}
          onClose={() => {
            setShowFeedModal(false)
            setEditingFeed(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = { ...ff, image: ffImage }
              if (editingFeed) {
                updateFeed({ variables: { feedId: editingFeed.id, input } })
              } else {
                createFeed({ variables: { input } })
              }
            }}
            className="space-y-4"
          >
            <F label="Name" required>
              <input
                required
                value={ff.name}
                onChange={(e) => setFf((f) => ({ ...f, name: e.target.value }))}
                className={inp}
              />
            </F>
            <F label="Type">
              <select
                value={ff.feedType}
                onChange={(e) => setFf((f) => ({ ...f, feedType: e.target.value }))}
                className={sel}
              >
                {FEED_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </F>
            <F label="Target Species">
              <input
                value={ff.targetSpecies}
                onChange={(e) => setFf((f) => ({ ...f, targetSpecies: e.target.value }))}
                className={inp}
                placeholder="e.g. Cattle, All"
              />
            </F>
            <F label="Product URL">
              <input
                type="url"
                value={ff.productUrl}
                onChange={(e) => setFf((f) => ({ ...f, productUrl: e.target.value }))}
                className={inp}
                placeholder="https://..."
              />
            </F>
            <F label="Description">
              <textarea
                value={ff.notes}
                onChange={(e) => setFf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </F>
            <ImageUploadField existingUrl={editingFeed?.imageUrl} onChange={setFfImage} />
            <SubmitButton loading={editingFeed ? updatingFeed : creatingFeed} className={btn}>
              {editingFeed ? 'Save Changes' : 'Save'}
            </SubmitButton>
          </form>
        </Modal>
      )}

      {/* Record Modal */}
      {(showRecordModal || editingRecord) && (
        <Modal
          title={editingRecord ? 'Edit Feeding Record' : 'Record Feeding'}
          onClose={() => {
            setShowRecordModal(false)
            setEditingRecord(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = {
                ...recf,
                quantity: +recf.quantity,
                unitCost: recf.unitCost ? +recf.unitCost : null,
                animalCountFed: recf.animalCountFed ? +recf.animalCountFed : null,
                contentAmount: recf.contentAmount ? +recf.contentAmount : null,
                allocations: recf.allocations
                  .filter((a) => a.farmId && a.quantity)
                  .map((a) => ({ farmId: a.farmId, quantity: +a.quantity })),
              }
              if (editingRecord) {
                updateRecord({ variables: { recordId: editingRecord.purchase.id, input } })
              } else {
                recordFeeding({ variables: { input } })
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <F label="Animal Type">
                <select
                  value={recf.animalType}
                  onChange={(e) => setRecf((f) => ({ ...f, animalType: e.target.value }))}
                  className={sel}
                >
                  {ALL_ANIMALS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </F>
              <F label="Feed" required>
                <select
                  required
                  value={recf.feedId}
                  onChange={(e) => setRecf((f) => ({ ...f, feedId: e.target.value }))}
                  className={sel}
                >
                  <option value="">— select —</option>
                  {feeds.map((fd: any) => (
                    <option key={fd.id} value={fd.id}>
                      {fd.name}
                    </option>
                  ))}
                </select>
              </F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Date" required>
                <input
                  required
                  type="date"
                  value={recf.feedDate}
                  onChange={(e) => setRecf((f) => ({ ...f, feedDate: e.target.value }))}
                  className={inp}
                />
              </F>
              <F label="Animals Fed">
                <input
                  type="number"
                  value={recf.animalCountFed}
                  onChange={(e) => setRecf((f) => ({ ...f, animalCountFed: e.target.value }))}
                  className={inp}
                />
              </F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Quantity" required>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={recf.quantity}
                  onChange={(e) => setRecf((f) => ({ ...f, quantity: e.target.value }))}
                  className={inp}
                />
              </F>
              <F label="Unit">
                <select
                  value={recf.unit}
                  onChange={(e) => setRecf((f) => ({ ...f, unit: e.target.value }))}
                  className={sel}
                >
                  {UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </F>
            </div>
            <F label="Unit Cost (KES)">
              <input
                type="number"
                value={recf.unitCost}
                onChange={(e) => setRecf((f) => ({ ...f, unitCost: e.target.value }))}
                className={inp}
              />
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Net content per unit">
                <input
                  type="number"
                  step="0.001"
                  value={recf.contentAmount}
                  onChange={(e) => setRecf((f) => ({ ...f, contentAmount: e.target.value }))}
                  className={inp}
                  placeholder="e.g. 50 for '1 bag = 50kg'"
                />
              </F>
              <F label="Content Unit">
                <select
                  value={recf.contentUnit}
                  onChange={(e) => setRecf((f) => ({ ...f, contentUnit: e.target.value }))}
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
                value={recf.supplierId}
                onChange={(id) => setRecf((f) => ({ ...f, supplierId: id }))}
                className={sel}
              />
            </F>
            {recf.unitCost && recf.quantity && (
              <p className="text-xs text-gray-400">
                Total cost: KES {(Number(recf.unitCost) * Number(recf.quantity)).toLocaleString()}
              </p>
            )}
            <F label="Notes">
              <textarea
                value={recf.notes}
                onChange={(e) => setRecf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </F>
            <F label="Allocate across farms">
              <FarmAllocationEditor
                value={recf.allocations}
                onChange={(allocations) => setRecf((f) => ({ ...f, allocations }))}
                totalQuantity={recf.quantity}
                unit={recf.unit}
              />
            </F>
            <SubmitButton
              loading={editingRecord ? updatingRecord : recordingFeeding}
              className={btn}
            >
              {editingRecord ? 'Save Changes' : 'Save Record'}
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
