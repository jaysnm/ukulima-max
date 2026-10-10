import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { Plus, Building2, MapPin, Maximize2, Pencil, Trash2, Power, PowerOff } from 'lucide-react'
import { MY_FARMS } from '../../graphql/queries'
import { DELETE_FARM, SET_FARM_ACTIVE, SET_FARM_DEFAULT } from '../../graphql/mutations'
import { useFarm } from '../../context/FarmContext'
import { useAuth } from '../../context/AuthContext'
import FarmFormModal from '../../components/farms/FarmFormModal'

const MANAGER_ROLES = ['OWNER', 'MANAGER']

export default function FarmsPage() {
  const { data } = useQuery(MY_FARMS)
  const { setActiveFarmId, activeFarmId, canCreateFarm } = useFarm()
  const { user, isAdmin } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editingFarm, setEditingFarm] = useState<any | null>(null)

  const [setFarmActive] = useMutation(SET_FARM_ACTIVE)

  const [setFarmDefault] = useMutation(SET_FARM_DEFAULT, {
    // The mutation response only carries the farm that became default, but
    // "only one default" means every other cached farm's isDefault has to
    // flip to false in the same write or the list would briefly show two.
    update(cache, { data }, { variables }) {
      if (!data?.setFarmDefault) return
      const existing = cache.readQuery<{ myFarms: any[] }>({ query: MY_FARMS })
      if (!existing) return
      cache.writeQuery({
        query: MY_FARMS,
        data: {
          myFarms: existing.myFarms.map((f) => ({
            ...f,
            isDefault: f.id === variables?.farmId,
          })),
        },
      })
    },
  })

  const [deleteFarm] = useMutation(DELETE_FARM, {
    update(cache, { data }, { variables }) {
      if (!data?.deleteFarm) return
      const existing = cache.readQuery<{ myFarms: any[] }>({ query: MY_FARMS })
      if (!existing) return
      cache.writeQuery({
        query: MY_FARMS,
        data: { myFarms: existing.myFarms.filter((f) => f.id !== variables?.farmId) },
      })
    },
  })

  const farms = data?.myFarms ?? []

  const myRoleOn = (farm: any) => farm.members.find((m: any) => m.user.id === user?.id)?.role
  const canManageFarm = (farm: any) => isAdmin || MANAGER_ROLES.includes(myRoleOn(farm))
  const canDeleteFarm = (farm: any) => isAdmin || myRoleOn(farm) === 'OWNER'

  const handleDelete = (farm: any) => {
    if (!window.confirm(`Delete "${farm.name}"? This cannot be undone.`)) return
    deleteFarm({ variables: { farmId: farm.id } }).then(() => {
      if (farm.id === activeFarmId) setActiveFarmId('')
    })
  }

  return (
    <div className="space-y-6">
      {canCreateFarm && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
          >
            <Plus size={14} /> New Farm
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {farms.map((farm: any) => (
          <div
            key={farm.id}
            className={`bg-white rounded-2xl p-6 shadow-sm border-2 transition-all
              ${farm.id === activeFarmId ? 'border-primary-500 shadow-primary-100 shadow-md' : 'border-gray-100'}
              ${!farm.isActive ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`rounded-xl p-3 ${farm.isActive ? 'bg-primary-100' : 'bg-gray-100'}`}>
                <Building2
                  className={`w-6 h-6 ${farm.isActive ? 'text-primary-700' : 'text-gray-400'}`}
                />
              </div>
              <div className="flex items-center gap-1.5">
                {farm.isDefault && (
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    Default
                  </span>
                )}
                {!farm.isActive && (
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    Disabled
                  </span>
                )}
                {farm.id === activeFarmId && farm.isActive && (
                  <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
            </div>

            <button
              className="text-left w-full disabled:cursor-not-allowed"
              disabled={!farm.isActive}
              onClick={() => farm.isActive && setActiveFarmId(farm.id)}
              title={farm.isActive ? 'Set as active farm' : 'Enable this farm to select it'}
            >
              <h3 className="font-bold text-gray-800 text-lg">{farm.name}</h3>
              <div className="mt-2 space-y-1 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {farm.location}
                </div>
                {farm.sizeAcres && (
                  <div className="flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5" /> {farm.sizeAcres} acres
                  </div>
                )}
              </div>
            </button>

            <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-gray-400">
              <span>
                {farm.members.length} member{farm.members.length !== 1 ? 's' : ''}
              </span>
              <div className="flex -space-x-2">
                {farm.members.slice(0, 4).map((m: any) => (
                  <div
                    key={m.id}
                    className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold border-2 border-white"
                  >
                    {m.user.username[0].toUpperCase()}
                  </div>
                ))}
              </div>
            </div>

            {canManageFarm(farm) && (
              <label
                className={`mt-4 pt-4 border-t flex items-center gap-2 text-xs font-medium text-gray-600
                  ${farm.isActive ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                title={
                  farm.isActive
                    ? 'Make this the default farm shown when you sign in'
                    : 'Enable this farm to make it the default'
                }
              >
                <input
                  type="checkbox"
                  checked={farm.isDefault}
                  disabled={!farm.isActive || farm.isDefault}
                  onChange={() => setFarmDefault({ variables: { farmId: farm.id } })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed"
                />
                Make default
              </label>
            )}

            {canManageFarm(farm) && (
              <div className="mt-4 pt-4 border-t flex items-center gap-2">
                <button
                  onClick={() => setEditingFarm(farm)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 border border-gray-200"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() =>
                    setFarmActive({ variables: { farmId: farm.id, isActive: !farm.isActive } })
                  }
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 border border-gray-200"
                >
                  {farm.isActive ? (
                    <>
                      <PowerOff className="w-3.5 h-3.5" /> Disable
                    </>
                  ) : (
                    <>
                      <Power className="w-3.5 h-3.5" /> Enable
                    </>
                  )}
                </button>
                {canDeleteFarm(farm) && (
                  <button
                    onClick={() => handleDelete(farm)}
                    className="flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200"
                    title="Delete farm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Create card */}
        {canCreateFarm && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-gray-50 rounded-2xl p-6 border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-primary-600 min-h-48"
          >
            <Plus className="w-8 h-8" />
            <p className="text-sm font-medium">Add New Farm</p>
          </button>
        )}
      </div>

      {showModal && (
        <FarmFormModal
          onClose={() => setShowModal(false)}
          onSaved={(farmId) => setActiveFarmId(farmId)}
        />
      )}

      {editingFarm && (
        <FarmFormModal
          farm={editingFarm}
          onClose={() => setEditingFarm(null)}
          onSaved={() => setEditingFarm(null)}
        />
      )}
    </div>
  )
}
