import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Sprout,
  Beef,
  Bird,
  FlaskConical,
  Bug,
  Fence,
  BarChart3,
  ChevronRight,
  Tractor,
  Layers,
  Wallet,
  Truck,
  Users,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const nav = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Crops & Acreage', href: '/crops', icon: Sprout },
  { label: 'Crop Yield', href: '/yield', icon: BarChart3 },
  { label: 'Pests & Pesticides', href: '/pests', icon: Bug },
  { label: 'Crop Damage', href: '/damage', icon: Sprout },
  { label: 'Seedlings & Soil', href: '/seedlings-soil', icon: Layers },
  { label: 'Fence', href: '/fence', icon: Fence },
  { label: 'Cattle & Goats', href: '/cattle', icon: Beef },
  { label: 'Poultry & Eggs', href: '/poultry', icon: Bird },
  { label: 'Vet & Treatments', href: '/treatments', icon: FlaskConical },
  { label: 'Feed & Supplements', href: '/feed', icon: Tractor },
  { label: 'Operational Costs', href: '/costs', icon: Wallet },
  { label: 'Suppliers', href: '/suppliers', icon: Truck },
]

const adminNav = [{ label: 'User Management', href: '/admin/users', icon: Users }]

export default function Sidebar() {
  const { pathname } = useLocation()
  const { isAdmin } = useAuth()
  const items = isAdmin ? [...nav, ...adminNav] : nav
  return (
    <aside className="hidden lg:flex flex-col w-64 bg-primary-800 min-h-screen text-white">
      <div className="px-6 py-5 border-b border-primary-700 flex items-center gap-3">
        <div className="bg-primary-500 rounded-lg p-2">
          <Sprout className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-bold text-lg leading-tight">Ukulima Max</p>
          <p className="text-primary-300 text-xs">Farm Management</p>
        </div>
      </div>
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              to={href}
              className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${
                  active
                    ? 'bg-primary-600 text-white'
                    : 'text-primary-200 hover:bg-primary-700 hover:text-white'
                }`}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              {label}
              {active && <ChevronRight className="ml-auto w-4 h-4 opacity-60" />}
            </Link>
          )
        })}
      </nav>
      <div className="px-6 py-4 border-t border-primary-700 text-xs text-primary-400">
        © 2026 Ukulima Max
      </div>
    </aside>
  )
}
