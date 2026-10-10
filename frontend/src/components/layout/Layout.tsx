import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/crops': 'Crops & Acreage',
  '/yield': 'Crop Yield',
  '/pests': 'Pests & Pesticides',
  '/damage': 'Crop Damage',
  '/fence': 'Fence Damage',
  '/cattle': 'Cattle & Goats & Sheep',
  '/poultry': 'Poultry & Eggs',
  '/treatments': 'Vet & Treatments',
  '/feed': 'Feed & Supplements',
  '/seedlings-soil': 'Seedlings & Soil Inputs',
  '/costs': 'Operational Costs',
  '/suppliers': 'Suppliers',
  '/farms': 'My Farms',
  '/admin/users': 'User Management',
}

export default function Layout() {
  const { pathname } = useLocation()
  const title = titles[pathname] ?? 'Ukulima Max'
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title={title} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
