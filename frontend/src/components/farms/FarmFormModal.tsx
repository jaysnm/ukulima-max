import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation } from '@apollo/client'
import { CREATE_FARM, UPDATE_FARM } from '../../graphql/mutations'
import { MY_FARMS } from '../../graphql/queries'
import SubmitButton from '../ui/SubmitButton'

interface FarmFormModalProps {
  farm?: {
    id: string
    name: string
    location: string
    sizeAcres: number | string | null
    description: string
  }
  onClose: () => void
  onSaved: (farmId: string) => void
}

export default function FarmFormModal({ farm, onClose, onSaved }: FarmFormModalProps) {
  const isEdit = !!farm
  const [form, setForm] = useState({
    name: farm?.name ?? '',
    location: farm?.location ?? '',
    sizeAcres: farm?.sizeAcres != null ? String(farm.sizeAcres) : '',
    description: farm?.description ?? '',
  })

  const [createFarm, { loading: creating }] = useMutation(CREATE_FARM, {
    // Newly created farms aren't automatically added to the cached MY_FARMS
    // list by Apollo, so this writes it in synchronously as part of the same
    // mutation response — no extra refetch round trip, and no window where
    // `active_farm` could point at a farm the cache doesn't know about yet.
    update(cache, { data }) {
      if (!data?.createFarm) return
      const existing = cache.readQuery<{ myFarms: any[] }>({ query: MY_FARMS })
      cache.writeQuery({
        query: MY_FARMS,
        data: { myFarms: [...(existing?.myFarms ?? []), data.createFarm] },
      })
    },
    onCompleted: (d) => {
      onSaved(d.createFarm.id)
      onClose()
    },
  })

  const [updateFarm, { loading: updating }] = useMutation(UPDATE_FARM, {
    onCompleted: (d) => {
      onSaved(d.updateFarm.id)
      onClose()
    },
  })

  const loading = creating || updating

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const input = { ...form, sizeAcres: form.sizeAcres ? +form.sizeAcres : null }
    if (isEdit) {
      updateFarm({ variables: { farmId: farm!.id, input } })
    } else {
      createFarm({ variables: { input } })
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-800">
            {isEdit ? 'Edit Farm' : 'Create New Farm'}
          </h3>
          <button onClick={onClose} className="text-gray-400 text-xl">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Farm Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. Mwangi Green Farm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
            <input
              required
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. Nakuru, Kenya"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Size (acres)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.sizeAcres}
              onChange={(e) => setForm((f) => ({ ...f, sizeAcres: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2}
            />
          </div>
          <SubmitButton
            loading={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg text-sm"
          >
            {isEdit ? 'Save Changes' : 'Create Farm'}
          </SubmitButton>
        </form>
      </div>
    </div>,
    document.body
  )
}
