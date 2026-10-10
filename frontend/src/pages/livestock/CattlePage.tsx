import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Plus, Beef, Pencil, Trash2 } from 'lucide-react'
import { LIVESTOCK_CENSUSES, LIVESTOCK_EVENTS } from '../../graphql/queries'
import {
  RECORD_CENSUS,
  UPDATE_CENSUS,
  DELETE_CENSUS,
  RECORD_LIVESTOCK_EVENT,
  UPDATE_LIVESTOCK_EVENT,
  DELETE_LIVESTOCK_EVENT,
} from '../../graphql/mutations'
import { useFarm } from '../../context/FarmContext'
import ImageUploadField from '../../components/ui/ImageUploadField'
import SubmitButton from '../../components/ui/SubmitButton'

const CATTLE_TYPES = ['COW', 'GOAT', 'SHEEP']
const EVENT_TYPES = [
  'BIRTH',
  'DEATH',
  'PURCHASE',
  'SALE',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'SLAUGHTER',
]
const eventBadge: Record<string, string> = {
  BIRTH: 'bg-green-100 text-green-700',
  DEATH: 'bg-red-100 text-red-700',
  PURCHASE: 'bg-blue-100 text-blue-700',
  SALE: 'bg-orange-100 text-orange-700',
  TRANSFER_IN: 'bg-purple-100 text-purple-700',
  TRANSFER_OUT: 'bg-pink-100 text-pink-700',
  SLAUGHTER: 'bg-gray-100 text-gray-700',
}

const emptyCensus = {
  animalType: 'COW',
  censusDate: '',
  totalCount: '',
  maleCount: '',
  femaleCount: '',
  juvenileCount: '',
  notes: '',
}
const emptyEvent = {
  animalType: 'COW',
  eventType: 'BIRTH',
  eventDate: '',
  count: '1',
  unitValue: '',
  causeOfDeath: '',
  notes: '',
}

export default function CattlePage() {
  const { activeFarmId, canEditActiveFarm } = useFarm()
  const skip = !activeFarmId
  const [animalFilter, setAnimalFilter] = useState<string | undefined>(undefined)
  const [showCensusModal, setShowCensusModal] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingCensus, setEditingCensus] = useState<any | null>(null)
  const [editingEvent, setEditingEvent] = useState<any | null>(null)

  const { data: censusData, refetch: rc } = useQuery(LIVESTOCK_CENSUSES, {
    variables: { farmId: activeFarmId, animalType: animalFilter },
    skip,
  })
  const { data: eventData, refetch: re } = useQuery(LIVESTOCK_EVENTS, {
    variables: { farmId: activeFarmId, animalType: animalFilter },
    skip,
  })

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
  const [deleteCensus] = useMutation(DELETE_CENSUS, { onCompleted: () => rc() })
  const [recordEvent, { loading: recordingEvent }] = useMutation(RECORD_LIVESTOCK_EVENT, {
    onCompleted: () => {
      re()
      setShowEventModal(false)
    },
  })
  const [updateEvent, { loading: updatingEvent }] = useMutation(UPDATE_LIVESTOCK_EVENT, {
    onCompleted: () => {
      re()
      setEditingEvent(null)
    },
  })
  const [deleteEvent] = useMutation(DELETE_LIVESTOCK_EVENT, { onCompleted: () => re() })

  const censuses = censusData?.livestockCensuses ?? []
  const events = eventData?.livestockEvents ?? []

  const [cf, setCf] = useState(emptyCensus)
  const [ef, setEf] = useState(emptyEvent)
  const [cfImage, setCfImage] = useState<File | null>(null)
  const [efImage, setEfImage] = useState<File | null>(null)

  const handleDeleteCensus = (c: any) => {
    if (!window.confirm('Delete this census record?')) return
    deleteCensus({ variables: { censusId: c.id } })
  }
  const handleDeleteEvent = (e: any) => {
    if (!window.confirm('Delete this event?')) return
    deleteEvent({ variables: { eventId: e.id } })
  }

  if (!activeFarmId)
    return <div className="text-gray-400 text-center mt-20">Select a farm first.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[undefined, ...CATTLE_TYPES].map((t) => (
            <button
              key={String(t)}
              onClick={() => setAnimalFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium
                ${animalFilter === t ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
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
              setEf(emptyEvent)
              setEfImage(null)
              setShowEventModal(true)
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
          >
            <Plus size={14} /> Record Event
          </button>
        </div>
      </div>

      {/* Latest Censuses */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CATTLE_TYPES.map((type) => {
          const latest = censuses.filter((c: any) => c.animalType === type)[0]
          return (
            <div key={type} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-earth-100 rounded-xl p-2.5">
                    <Beef className="w-5 h-5 text-earth-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 capitalize">{type.toLowerCase()}s</p>
                    <p className="text-xs text-gray-400">Latest census</p>
                  </div>
                </div>
                {latest && canEditActiveFarm && (
                  <div className="flex gap-1">
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
                    <button
                      onClick={() => handleDeleteCensus(latest)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {latest ? (
                <div>
                  <p className="text-3xl font-bold text-gray-800">{latest.totalCount}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    ♂ {latest.maleCount} · ♀ {latest.femaleCount} · Juv {latest.juvenileCount}
                  </p>
                  <p className="text-xs text-gray-400">{latest.censusDate}</p>
                  {latest.notes && (
                    <p className="text-xs text-gray-400 mt-1 truncate" title={latest.notes}>
                      {latest.notes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No census yet</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Events table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-700">Livestock Events</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              {[
                '',
                'Animal',
                'Event',
                'Date',
                'Count',
                'Unit Value',
                'Total Value',
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
            {events.map((e: any) => (
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
                <td className="px-5 py-2.5">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${eventBadge[e.eventType] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {e.eventType}
                  </span>
                </td>
                <td className="px-5 py-2.5">{e.eventDate}</td>
                <td className="px-5 py-2.5 font-semibold">{e.count}</td>
                <td className="px-5 py-2.5">
                  {e.unitValue ? `KES ${Number(e.unitValue).toLocaleString()}` : '–'}
                </td>
                <td className="px-5 py-2.5">
                  {e.totalValue ? `KES ${Number(e.totalValue).toLocaleString()}` : '–'}
                </td>
                <td className="px-5 py-2.5 text-gray-400 truncate max-w-xs">
                  {e.causeOfDeath || e.notes || '–'}
                </td>
                <td className="px-5 py-2.5">
                  {canEditActiveFarm && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingEvent(e)
                          setEf({
                            animalType: e.animalType,
                            eventType: e.eventType,
                            eventDate: e.eventDate,
                            count: String(e.count),
                            unitValue: e.unitValue != null ? String(e.unitValue) : '',
                            causeOfDeath: e.causeOfDeath ?? '',
                            notes: e.notes ?? '',
                          })
                          setEfImage(null)
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
            {events.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400">
                  No events recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Census Modal */}
      {(showCensusModal || editingCensus) && (
        <Modal
          title={editingCensus ? 'Edit Census' : 'Record Census'}
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
            <Field label="Animal Type">
              <select
                value={cf.animalType}
                onChange={(e) => setCf((f) => ({ ...f, animalType: e.target.value }))}
                className={sel}
              >
                {CATTLE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Census Date" required>
              <input
                required
                type="date"
                value={cf.censusDate}
                onChange={(e) => setCf((f) => ({ ...f, censusDate: e.target.value }))}
                className={inp}
              />
            </Field>
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
              <Field label="Males">
                <input
                  type="number"
                  value={cf.maleCount}
                  onChange={(e) => setCf((f) => ({ ...f, maleCount: e.target.value }))}
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
              <Field label="Juveniles">
                <input
                  type="number"
                  value={cf.juvenileCount}
                  onChange={(e) => setCf((f) => ({ ...f, juvenileCount: e.target.value }))}
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
          title={editingEvent ? 'Edit Event' : 'Record Event'}
          onClose={() => {
            setShowEventModal(false)
            setEditingEvent(null)
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const input = {
                ...ef,
                count: +ef.count,
                unitValue: ef.unitValue ? +ef.unitValue : null,
                image: efImage,
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
              <Field label="Animal">
                <select
                  value={ef.animalType}
                  onChange={(e) => setEf((f) => ({ ...f, animalType: e.target.value }))}
                  className={sel}
                >
                  {CATTLE_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Event">
                <select
                  value={ef.eventType}
                  onChange={(e) => setEf((f) => ({ ...f, eventType: e.target.value }))}
                  className={sel}
                >
                  {EVENT_TYPES.map((t) => (
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
                  value={ef.eventDate}
                  onChange={(e) => setEf((f) => ({ ...f, eventDate: e.target.value }))}
                  className={inp}
                />
              </Field>
              <Field label="Count">
                <input
                  type="number"
                  min="1"
                  value={ef.count}
                  onChange={(e) => setEf((f) => ({ ...f, count: e.target.value }))}
                  className={inp}
                />
              </Field>
            </div>
            <Field label="Unit Value (KES per head)">
              <input
                type="number"
                value={ef.unitValue}
                onChange={(e) => setEf((f) => ({ ...f, unitValue: e.target.value }))}
                className={inp}
              />
            </Field>
            {ef.unitValue && ef.count && (
              <p className="text-xs text-gray-400">
                Total value: KES {(Number(ef.unitValue) * Number(ef.count)).toLocaleString()}
              </p>
            )}
            {ef.eventType === 'DEATH' && (
              <Field label="Cause of Death">
                <input
                  value={ef.causeOfDeath}
                  onChange={(e) => setEf((f) => ({ ...f, causeOfDeath: e.target.value }))}
                  className={inp}
                />
              </Field>
            )}
            <Field label="Notes">
              <textarea
                value={ef.notes}
                onChange={(e) => setEf((f) => ({ ...f, notes: e.target.value }))}
                className={inp}
                rows={2}
              />
            </Field>
            <ImageUploadField existingUrl={editingEvent?.imageUrl} onChange={setEfImage} />
            <SubmitButton loading={editingEvent ? updatingEvent : recordingEvent} className={btn}>
              {editingEvent ? 'Save Changes' : 'Record Event'}
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
