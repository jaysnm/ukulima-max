import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Plus, Bird, Egg, Pencil, Trash2 } from 'lucide-react'
import { EGG_PRODUCTIONS, LIVESTOCK_CENSUSES, LIVESTOCK_EVENTS } from '../../graphql/queries'
import {
  RECORD_EGG_PRODUCTION,
  UPDATE_EGG_PRODUCTION,
  DELETE_EGG_PRODUCTION,
  RECORD_CENSUS,
  UPDATE_CENSUS,
  RECORD_LIVESTOCK_EVENT,
  UPDATE_LIVESTOCK_EVENT,
  DELETE_LIVESTOCK_EVENT,
} from '../../graphql/mutations'
import { useFarm } from '../../context/FarmContext'
import ImageUploadField from '../../components/ui/ImageUploadField'
import SubmitButton from '../../components/ui/SubmitButton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import dayjs from 'dayjs'

const BIRD_TYPES = ['CHICKEN', 'DUCK', 'TURKEY']

const emptyEgg = {
  birdType: 'CHICKEN',
  productionDate: '',
  totalEggs: '',
  damagedEggs: '0',
  soldEggs: '0',
  unitPrice: '',
  notes: '',
}
const emptyCensus = {
  animalType: 'CHICKEN',
  censusDate: '',
  totalCount: '',
  maleCount: '0',
  femaleCount: '0',
  juvenileCount: '0',
  notes: '',
}
const emptyEvent = {
  animalType: 'CHICKEN',
  eventType: 'BIRTH',
  eventDate: '',
  count: '1',
  unitValue: '',
  notes: '',
}

export default function PoultryPage() {
  const { activeFarmId, canEditActiveFarm } = useFarm()
  const skip = !activeFarmId
  const [birdFilter, setBirdFilter] = useState<string | undefined>(undefined)
  const [showEggModal, setShowEggModal] = useState(false)
  const [showCensusModal, setShowCensusModal] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEgg, setEditingEgg] = useState<any | null>(null)
  const [editingCensus, setEditingCensus] = useState<any | null>(null)
  const [editingEvent, setEditingEvent] = useState<any | null>(null)

  const fromDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD')

  const { data: eggData, refetch: re } = useQuery(EGG_PRODUCTIONS, {
    variables: { farmId: activeFarmId, birdType: birdFilter, fromDate },
    skip,
  })
  const { data: censusData, refetch: rc } = useQuery(LIVESTOCK_CENSUSES, {
    variables: { farmId: activeFarmId, animalType: birdFilter ?? undefined },
    skip,
  })
  const { data: eventData, refetch: rev } = useQuery(LIVESTOCK_EVENTS, {
    variables: { farmId: activeFarmId, animalType: birdFilter },
    skip,
  })

  const [recordEgg, { loading: recordingEgg }] = useMutation(RECORD_EGG_PRODUCTION, {
    onCompleted: () => {
      re()
      setShowEggModal(false)
    },
  })
  const [updateEgg, { loading: updatingEgg }] = useMutation(UPDATE_EGG_PRODUCTION, {
    onCompleted: () => {
      re()
      setEditingEgg(null)
    },
  })
  const [deleteEgg] = useMutation(DELETE_EGG_PRODUCTION, { onCompleted: () => re() })
  const [recordCensus, { loading: recordingCensus }] = useMutation(RECORD_CENSUS, {
    onCompleted: () => {
      rc()
      setShowCensusModal(false)
    },
  })
  const [updateCensus, { loading: updatingCensus }] = useMutation(UPDATE_CENSUS, {
    onCompleted: () => {
      rc()
      setEditingCensus(null)
    },
  })
  const [recordEvent, { loading: recordingEvent }] = useMutation(RECORD_LIVESTOCK_EVENT, {
    onCompleted: () => {
      rev()
      setShowEventModal(false)
    },
  })
  const [updateEvent, { loading: updatingEvent }] = useMutation(UPDATE_LIVESTOCK_EVENT, {
    onCompleted: () => {
      rev()
      setEditingEvent(null)
    },
  })
  const [deleteEvent] = useMutation(DELETE_LIVESTOCK_EVENT, { onCompleted: () => rev() })

  const eggs = eggData?.eggProductions ?? []
  const poultryEvents = eventData?.livestockEvents ?? []
  const censuses = (censusData?.livestockCensuses ?? []).filter((c: any) =>
    BIRD_TYPES.includes(c.animalType)
  )
  const chartData = [...eggs]
    .reverse()
    .slice(-14)
    .map((e: any) => ({
      date: dayjs(e.productionDate).format('D MMM'),
      [e.birdType]: e.totalEggs,
      damaged: e.damagedEggs,
    }))

  const [ef, setEf] = useState(emptyEgg)
  const [cf, setCf] = useState(emptyCensus)
  const [evf, setEvf] = useState(emptyEvent)
  const [efImage, setEfImage] = useState<File | null>(null)
  const [cfImage, setCfImage] = useState<File | null>(null)
  const [evfImage, setEvfImage] = useState<File | null>(null)

  const handleDeleteEgg = (e: any) => {
    if (!window.confirm('Delete this egg production record?')) return
    deleteEgg({ variables: { recordId: e.id } })
  }
  const handleDeleteEvent = (e: any) => {
    if (!window.confirm('Delete this event?')) return
    deleteEvent({ variables: { eventId: e.id } })
  }

  if (!activeFarmId)
    return <div className="text-gray-400 text-center mt-20">Select a farm first.</div>

  const totalEggs30 = eggs.reduce((s: number, e: any) => s + e.totalEggs, 0)
  const goodEggs30 = eggs.reduce((s: number, e: any) => s + e.goodEggs, 0)
  const soldEggs30 = eggs.reduce((s: number, e: any) => s + e.soldEggs, 0)

  return (
    <div className="space-y-6">
      {/* Filter + actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[undefined, ...BIRD_TYPES].map((t) => (
            <button
              key={String(t)}
              onClick={() => setBirdFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium
                ${birdFilter === t ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
            >
              {t ?? 'All'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCf(emptyCensus)
              setCfImage(null)
              setShowCensusModal(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            <Plus size={14} /> Census
          </button>
          <button
            onClick={() => {
              setEvf(emptyEvent)
              setEvfImage(null)
              setShowEventModal(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            <Plus size={14} /> Event
          </button>
          <button
            onClick={() => {
              setEf(emptyEgg)
              setEfImage(null)
              setShowEggModal(true)
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
          >
            <Plus size={14} /> Record Eggs
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Total Eggs (30 days)',
            value: totalEggs30,
            color: 'bg-primary-50 text-primary-700',
          },
          { label: 'Good Eggs', value: goodEggs30, color: 'bg-green-50 text-green-700' },
          { label: 'Sold', value: soldEggs30, color: 'bg-blue-50 text-blue-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-5 ${s.color}`}>
            <p className="text-3xl font-bold">{s.value.toLocaleString()}</p>
            <p className="text-sm font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 mb-4">Egg Production (last 14 days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              {BIRD_TYPES.map((bt, i) => (
                <Bar
                  key={bt}
                  dataKey={bt}
                  fill={['#22c55e', '#f97316', '#8b5cf6'][i]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Flock counts */}
      <div className="grid sm:grid-cols-3 gap-4">
        {BIRD_TYPES.map((type) => {
          const latest = censuses.filter((c: any) => c.animalType === type)[0]
          return (
            <div
              key={type}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="bg-yellow-100 rounded-xl p-3">
                  <Bird className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="font-semibold capitalize">{type.toLowerCase()}s</p>
                  <p className="text-2xl font-bold text-gray-800">{latest?.totalCount ?? 0}</p>
                  <p className="text-xs text-gray-400">
                    {latest ? `as of ${latest.censusDate}` : 'No census'}
                  </p>
                  {latest?.notes && (
                    <p className="text-xs text-gray-400 mt-1 truncate" title={latest.notes}>
                      {latest.notes}
                    </p>
                  )}
                </div>
              </div>
              {latest && canEditActiveFarm && (
                <button
                  onClick={() => {
                    setEditingCensus(latest)
                    setCf({
                      animalType: latest.animalType,
                      censusDate: latest.censusDate,
                      totalCount: String(latest.totalCount),
                      maleCount: String(latest.maleCount),
                      femaleCount: String(latest.femaleCount),
                      juvenileCount: String(latest.juvenileCount),
                      notes: latest.notes ?? '',
                    })
                    setCfImage(null)
                  }}
                  className="text-gray-400 hover:text-primary-600"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Egg table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Egg className="w-4 h-4 text-yellow-500" />
          <h2 className="font-semibold text-gray-700">Egg Production Log</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              {[
                '',
                'Bird',
                'Date',
                'Total',
                'Good',
                'Damaged',
                'Sold',
                'Unit Price',
                'Revenue',
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
            {eggs.map((e: any) => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-5 py-2.5">
                  {e.imageUrl && (
                    <img
                      src={e.imageUrl}
                      alt=""
                      className="w-8 h-8 object-cover rounded border border-gray-200"
                    />
                  )}
                </td>
                <td className="px-5 py-2.5 capitalize">{e.birdType.toLowerCase()}</td>
                <td className="px-5 py-2.5">{e.productionDate}</td>
                <td className="px-5 py-2.5 font-semibold">{e.totalEggs}</td>
                <td className="px-5 py-2.5 text-green-600">{e.goodEggs}</td>
                <td className="px-5 py-2.5 text-red-500">{e.damagedEggs}</td>
                <td className="px-5 py-2.5 text-blue-500">{e.soldEggs}</td>
                <td className="px-5 py-2.5">
                  {e.unitPrice ? `KES ${Number(e.unitPrice).toLocaleString()}` : '–'}
                </td>
                <td className="px-5 py-2.5">
                  {e.totalRevenue ? `KES ${Number(e.totalRevenue).toLocaleString()}` : '–'}
                </td>
                <td className="px-5 py-2.5 text-gray-400 truncate max-w-xs" title={e.notes}>
                  {e.notes || '–'}
                </td>
                <td className="px-5 py-2.5">
                  {canEditActiveFarm && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingEgg(e)
                          setEf({
                            birdType: e.birdType,
                            productionDate: e.productionDate,
                            totalEggs: String(e.totalEggs),
                            damagedEggs: String(e.damagedEggs),
                            soldEggs: String(e.soldEggs),
                            unitPrice: e.unitPrice != null ? String(e.unitPrice) : '',
                            notes: e.notes ?? '',
                          })
                          setEfImage(null)
                        }}
                        className="text-gray-400 hover:text-primary-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteEgg(e)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {eggs.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center py-12 text-gray-400">
                  No egg records yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Poultry events table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-700">Poultry Events</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              {['', 'Bird', 'Event', 'Date', 'Count', 'Unit Value', 'Total Value', 'Notes', ''].map(
                (h, i) => (
                  <th key={i} className="px-5 py-3 font-medium">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {poultryEvents.map((e: any) => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-5 py-2.5">
                  {e.imageUrl && (
                    <img
                      src={e.imageUrl}
                      alt=""
                      className="w-8 h-8 object-cover rounded border border-gray-200"
                    />
                  )}
                </td>
                <td className="px-5 py-2.5 capitalize">{e.animalType.toLowerCase()}</td>
                <td className="px-5 py-2.5">{e.eventType}</td>
                <td className="px-5 py-2.5">{e.eventDate}</td>
                <td className="px-5 py-2.5 font-semibold">{e.count}</td>
                <td className="px-5 py-2.5">
                  {e.unitValue ? `KES ${Number(e.unitValue).toLocaleString()}` : '–'}
                </td>
                <td className="px-5 py-2.5">
                  {e.totalValue ? `KES ${Number(e.totalValue).toLocaleString()}` : '–'}
                </td>
                <td className="px-5 py-2.5 text-gray-400 truncate max-w-xs" title={e.notes}>
                  {e.notes || '–'}
                </td>
                <td className="px-5 py-2.5">
                  {canEditActiveFarm && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingEvent(e)
                          setEvf({
                            animalType: e.animalType,
                            eventType: e.eventType,
                            eventDate: e.eventDate,
                            count: String(e.count),
                            unitValue: e.unitValue != null ? String(e.unitValue) : '',
                            notes: e.notes ?? '',
                          })
                          setEvfImage(null)
                        }}
                        className="text-gray-400 hover:text-primary-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(e)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {poultryEvents.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-10 text-gray-400">
                  No poultry events recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Egg Modal */}
      {(showEggModal || editingEgg) && (
        <Modal
          title={editingEgg ? 'Edit Egg Production' : 'Record Egg Production'}
          onClose={() => {
            setShowEggModal(false)
            setEditingEgg(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = {
                ...ef,
                totalEggs: +ef.totalEggs,
                damagedEggs: +ef.damagedEggs,
                soldEggs: +ef.soldEggs,
                unitPrice: ef.unitPrice ? +ef.unitPrice : null,
                image: efImage,
              }
              if (editingEgg) {
                updateEgg({
                  variables: { recordId: editingEgg.id, input: { ...input, farmId: activeFarmId } },
                })
              } else {
                recordEgg({ variables: { input: { ...input, farmId: activeFarmId } } })
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bird Type">
                <select
                  value={ef.birdType}
                  onChange={(e) => setEf((f) => ({ ...f, birdType: e.target.value }))}
                  className={sel}
                >
                  {BIRD_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date" required>
                <input
                  required
                  type="date"
                  value={ef.productionDate}
                  onChange={(e) => setEf((f) => ({ ...f, productionDate: e.target.value }))}
                  className={inp}
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Total Eggs" required>
                <input
                  required
                  type="number"
                  value={ef.totalEggs}
                  onChange={(e) => setEf((f) => ({ ...f, totalEggs: e.target.value }))}
                  className={inp}
                />
              </Field>
              <Field label="Damaged">
                <input
                  type="number"
                  value={ef.damagedEggs}
                  onChange={(e) => setEf((f) => ({ ...f, damagedEggs: e.target.value }))}
                  className={inp}
                />
              </Field>
              <Field label="Sold">
                <input
                  type="number"
                  value={ef.soldEggs}
                  onChange={(e) => setEf((f) => ({ ...f, soldEggs: e.target.value }))}
                  className={inp}
                />
              </Field>
            </div>
            <Field label="Unit Price (KES per egg sold)">
              <input
                type="number"
                value={ef.unitPrice}
                onChange={(e) => setEf((f) => ({ ...f, unitPrice: e.target.value }))}
                className={inp}
              />
            </Field>
            {ef.unitPrice && ef.soldEggs && (
              <p className="text-xs text-gray-400">
                Total revenue: KES {(Number(ef.unitPrice) * Number(ef.soldEggs)).toLocaleString()}
              </p>
            )}
            <Field label="Notes">
              <textarea
                value={ef.notes}
                onChange={(e) => setEf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </Field>
            <ImageUploadField existingUrl={editingEgg?.imageUrl} onChange={setEfImage} />
            <SubmitButton loading={editingEgg ? updatingEgg : recordingEgg} className={btn}>
              {editingEgg ? 'Save Changes' : 'Save Record'}
            </SubmitButton>
          </form>
        </Modal>
      )}

      {/* Census Modal */}
      {(showCensusModal || editingCensus) && (
        <Modal
          title={editingCensus ? 'Edit Census' : 'Flock Census'}
          onClose={() => {
            setShowCensusModal(false)
            setEditingCensus(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = {
                ...cf,
                totalCount: +cf.totalCount,
                maleCount: +cf.maleCount,
                femaleCount: +cf.femaleCount,
                juvenileCount: +cf.juvenileCount,
                image: cfImage,
              }
              if (editingCensus) {
                updateCensus({
                  variables: {
                    censusId: editingCensus.id,
                    input: { ...input, farmId: activeFarmId },
                  },
                })
              } else {
                recordCensus({ variables: { input: { ...input, farmId: activeFarmId } } })
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bird Type">
                <select
                  value={cf.animalType}
                  onChange={(e) => setCf((f) => ({ ...f, animalType: e.target.value }))}
                  className={sel}
                >
                  {BIRD_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date" required>
                <input
                  required
                  type="date"
                  value={cf.censusDate}
                  onChange={(e) => setCf((f) => ({ ...f, censusDate: e.target.value }))}
                  className={inp}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Total Count" required>
                <input
                  required
                  type="number"
                  value={cf.totalCount}
                  onChange={(e) => setCf((f) => ({ ...f, totalCount: e.target.value }))}
                  className={inp}
                />
              </Field>
              <Field label="Females">
                <input
                  type="number"
                  value={cf.femaleCount}
                  onChange={(e) => setCf((f) => ({ ...f, femaleCount: e.target.value }))}
                  className={inp}
                />
              </Field>
            </div>
            <Field label="Notes">
              <textarea
                value={cf.notes}
                onChange={(e) => setCf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </Field>
            <ImageUploadField existingUrl={editingCensus?.imageUrl} onChange={setCfImage} />
            <SubmitButton
              loading={editingCensus ? updatingCensus : recordingCensus}
              className={btn}
            >
              {editingCensus ? 'Save Changes' : 'Save Census'}
            </SubmitButton>
          </form>
        </Modal>
      )}

      {/* Event Modal */}
      {(showEventModal || editingEvent) && (
        <Modal
          title={editingEvent ? 'Edit Poultry Event' : 'Record Poultry Event'}
          onClose={() => {
            setShowEventModal(false)
            setEditingEvent(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = {
                ...evf,
                count: +evf.count,
                unitValue: evf.unitValue ? +evf.unitValue : null,
                image: evfImage,
              }
              if (editingEvent) {
                updateEvent({
                  variables: {
                    eventId: editingEvent.id,
                    input: { ...input, farmId: activeFarmId },
                  },
                })
              } else {
                recordEvent({ variables: { input: { ...input, farmId: activeFarmId } } })
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bird Type">
                <select
                  value={evf.animalType}
                  onChange={(e) => setEvf((f) => ({ ...f, animalType: e.target.value }))}
                  className={sel}
                >
                  {BIRD_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Event">
                <select
                  value={evf.eventType}
                  onChange={(e) => setEvf((f) => ({ ...f, eventType: e.target.value }))}
                  className={sel}
                >
                  {['BIRTH', 'DEATH', 'PURCHASE', 'SALE', 'SLAUGHTER'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" required>
                <input
                  required
                  type="date"
                  value={evf.eventDate}
                  onChange={(e) => setEvf((f) => ({ ...f, eventDate: e.target.value }))}
                  className={inp}
                />
              </Field>
              <Field label="Count">
                <input
                  type="number"
                  min="1"
                  value={evf.count}
                  onChange={(e) => setEvf((f) => ({ ...f, count: e.target.value }))}
                  className={inp}
                />
              </Field>
            </div>
            <Field label="Unit Value (KES per bird)">
              <input
                type="number"
                value={evf.unitValue}
                onChange={(e) => setEvf((f) => ({ ...f, unitValue: e.target.value }))}
                className={inp}
              />
            </Field>
            {evf.unitValue && evf.count && (
              <p className="text-xs text-gray-400">
                Total value: KES {(Number(evf.unitValue) * Number(evf.count)).toLocaleString()}
              </p>
            )}
            <Field label="Notes">
              <textarea
                value={evf.notes}
                onChange={(e) => setEvf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </Field>
            <ImageUploadField existingUrl={editingEvent?.imageUrl} onChange={setEvfImage} />
            <SubmitButton loading={editingEvent ? updatingEvent : recordingEvent} className={btn}>
              {editingEvent ? 'Save Changes' : 'Record'}
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
