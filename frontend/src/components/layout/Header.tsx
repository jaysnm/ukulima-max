import { useEffect, useState } from 'react'
import { useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'
import { ChevronDown, LogOut, Building2, Plus, Settings } from 'lucide-react'
import { MY_FARMS } from '../../graphql/queries'
import { useAuth } from '../../context/AuthContext'
import { useFarm } from '../../context/FarmContext'
import FarmFormModal from '../farms/FarmFormModal'

export default function Header({ title }: { title: string }) {
  const { user, logout } = useAuth()
  const { activeFarmId, setActiveFarmId } = useFarm()
  const [farmOpen, setFarmOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [showCreateFarm, setShowCreateFarm] = useState(false)

  // Header is mounted on every authenticated page, so polling this query is
  // what actually catches a dead session in the background — without it, a
  // tab left open with a warm Apollo cache can keep showing stale data with
  // zero network traffic until the user submits a mutation (which always
  // hits the network) and loses whatever they were entering.
  const { data } = useQuery(MY_FARMS, { pollInterval: 60_000 })
  const allFarms = data?.myFarms ?? []
  const activeFarms = allFarms.filter((f: any) => f.isActive)
  const activeFarm = allFarms.find((f: any) => f.id === activeFarmId)

  // Renders the default farm on the page automatically: whenever there's no
  // selected farm yet (first sign-in) or the previously-selected one is gone
  // (deleted/disabled), fall back to whichever farm is marked default.
  useEffect(() => {
    if (!data || activeFarm) return
    const defaultFarm = activeFarms.find((f: any) => f.isDefault) ?? activeFarms[0]
    if (defaultFarm) setActiveFarmId(defaultFarm.id)
  }, [data, activeFarm, activeFarms, setActiveFarmId])

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-3">
        {/* Farm selector */}
        <div className="relative">
          <button
            onClick={() => setFarmOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700"
          >
            <Building2 className="w-4 h-4 text-primary-600" />
            {activeFarm ? activeFarm.name : 'Select Farm'}
            <ChevronDown className="w-4 h-4 opacity-50" />
          </button>
          {farmOpen && (
            <div className="absolute right-0 top-10 bg-white border rounded-xl shadow-lg min-w-48 z-50 py-1">
              {activeFarms.map((f: any) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setActiveFarmId(f.id)
                    setFarmOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50
                    ${f.id === activeFarmId ? 'text-primary-600 font-semibold' : 'text-gray-700'}`}
                >
                  {f.name}
                </button>
              ))}
              {activeFarms.length === 0 && (
                <p className="px-4 py-2 text-sm text-gray-400">No farms yet</p>
              )}
              <button
                onClick={() => {
                  setFarmOpen(false)
                  setShowCreateFarm(true)
                }}
                className="w-full text-left px-4 py-2 text-sm text-primary-600 font-medium hover:bg-primary-50 flex items-center gap-1.5 border-t"
              >
                <Plus className="w-3.5 h-3.5" /> Create Farm
              </button>
              <Link
                to="/farms"
                onClick={() => setFarmOpen(false)}
                className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" /> Manage Farms
              </Link>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {user?.username}
            </span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </button>
          {userOpen && (
            <div className="absolute right-0 top-11 bg-white border rounded-xl shadow-lg min-w-40 z-50 py-1">
              <div className="px-4 py-2 border-b">
                <p className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreateFarm && (
        <FarmFormModal
          onClose={() => setShowCreateFarm(false)}
          onSaved={(farmId) => setActiveFarmId(farmId)}
        />
      )}
    </header>
  )
}
