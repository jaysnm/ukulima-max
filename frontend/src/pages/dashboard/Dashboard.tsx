import { useEffect, useState } from 'react'
import { useApolloClient, useQuery } from '@apollo/client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Sprout, Beef, Bird, Fence, Wallet, ShoppingBasket } from 'lucide-react'
import {
  MY_FARMS,
  PLANTINGS,
  LIVESTOCK_SUMMARY,
  EGG_PRODUCTIONS,
  FENCE_DAMAGES,
  OPERATIONAL_COSTS,
  SEEDLING_PURCHASES,
  SOIL_TREATMENTS,
  SOIL_INPUT_PURCHASES,
  FEED_RECORDS,
  TREATMENTS,
  PESTICIDE_APPLICATIONS,
} from '../../graphql/queries'
import { useFarm } from '../../context/FarmContext'
import dayjs from 'dayjs'

const CATEGORY_LABELS: Record<string, string> = {
  CASUAL_LABOUR: 'Casual Labour',
  WAGES: 'Staff / Manager Wages',
  EQUIPMENT: 'Equipment & Amenities',
  UTILITIES: 'Utilities',
  MAINTENANCE: 'Repairs & Maintenance',
  TRANSPORT: 'Transport',
  OTHER: 'Other',
}

const COLORS = ['#22c55e', '#16a34a', '#86efac', '#4ade80', '#bbf7d0', '#f97316']

const MULTI_FARM_QUERIES = {
  plantings: PLANTINGS,
  livestock: LIVESTOCK_SUMMARY,
  eggs: EGG_PRODUCTIONS,
  fenceDamages: FENCE_DAMAGES,
  operationalCosts: OPERATIONAL_COSTS,
  seedlingPurchases: SEEDLING_PURCHASES,
  soilTreatments: SOIL_TREATMENTS,
  soilInputPurchases: SOIL_INPUT_PURCHASES,
  feedRecords: FEED_RECORDS,
  treatments: TREATMENTS,
  pesticideApplications: PESTICIDE_APPLICATIONS,
} as const

const RESULT_KEYS: Record<keyof typeof MULTI_FARM_QUERIES, string> = {
  plantings: 'plantings',
  livestock: 'livestockSummary',
  eggs: 'eggProductions',
  fenceDamages: 'fenceDamages',
  operationalCosts: 'operationalCosts',
  seedlingPurchases: 'seedlingPurchases',
  soilTreatments: 'soilTreatments',
  soilInputPurchases: 'soilInputPurchases',
  feedRecords: 'feedRecords',
  treatments: 'treatments',
  pesticideApplications: 'pesticideApplications',
}

/**
 * "All Farms" mode has no single farmId to scope a query by, so each
 * per-farm query is fetched once per farm and concatenated here — every row
 * carries __farmName so per-farm comparison charts can group by it, while
 * every existing "group by crop/category/product name" calculation below
 * keeps working unchanged since it never looked at farm in the first place.
 */
function useAllFarmsData(farms: { id: string; name: string }[]) {
  const client = useApolloClient()
  const [state, setState] = useState<{ loading: boolean; data: Record<string, any[]> }>({
    loading: true,
    data: {},
  })
  const farmKey = farms.map((f) => f.id).join(',')

  useEffect(() => {
    if (farms.length === 0) {
      setState({ loading: false, data: {} })
      return
    }
    let cancelled = false
    setState((s) => ({ ...s, loading: true }))

    const fromDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD')

    Promise.all(
      farms.map(async (f) => {
        const entries = await Promise.all(
          (Object.keys(MULTI_FARM_QUERIES) as (keyof typeof MULTI_FARM_QUERIES)[]).map(
            async (key) => {
              const variables: Record<string, any> = { farmId: f.id }
              if (key === 'eggs') variables.fromDate = fromDate
              if (key === 'fenceDamages') variables.repairStatus = 'PENDING'
              const res = await client.query({
                query: MULTI_FARM_QUERIES[key],
                variables,
                fetchPolicy: 'network-only',
              })
              const rows = (res.data?.[RESULT_KEYS[key]] ?? []) as any[]
              return [key, rows.map((r) => ({ ...r, __farmName: f.name, __farmId: f.id }))] as const
            }
          )
        )
        return Object.fromEntries(entries) as Record<string, any[]>
      })
    ).then((perFarm) => {
      if (cancelled) return
      const merged: Record<string, any[]> = {}
      for (const key of Object.keys(MULTI_FARM_QUERIES)) {
        merged[key] = perFarm.flatMap((f) => f[key] ?? [])
      }
      setState({ loading: false, data: merged })
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, farmKey])

  return state
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`${color} rounded-xl p-3`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { activeFarmId } = useFarm()
  const [scope, setScope] = useState<'farm' | 'all'>('farm')
  const isAllFarms = scope === 'all'
  const skip = !activeFarmId || isAllFarms

  const { data: farmsData } = useQuery(MY_FARMS)
  const allFarms = (farmsData?.myFarms ?? []).filter((f: any) => f.isActive)
  const allFarmsState = useAllFarmsData(isAllFarms ? allFarms : [])

  const { data: plantData } = useQuery(PLANTINGS, { variables: { farmId: activeFarmId }, skip })
  const { data: livestockData } = useQuery(LIVESTOCK_SUMMARY, {
    variables: { farmId: activeFarmId },
    skip,
  })
  const { data: eggData } = useQuery(EGG_PRODUCTIONS, {
    variables: {
      farmId: activeFarmId,
      fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    },
    skip,
  })
  const { data: fenceData } = useQuery(FENCE_DAMAGES, {
    variables: { farmId: activeFarmId, repairStatus: 'PENDING' },
    skip,
  })
  const { data: costsData } = useQuery(OPERATIONAL_COSTS, {
    variables: { farmId: activeFarmId },
    skip,
  })
  const { data: seedlingPurchaseData } = useQuery(SEEDLING_PURCHASES, {
    variables: { farmId: activeFarmId },
    skip,
  })
  const { data: soilTreatmentData } = useQuery(SOIL_TREATMENTS, {
    variables: { farmId: activeFarmId },
    skip,
  })
  const { data: soilInputPurchaseData } = useQuery(SOIL_INPUT_PURCHASES, {
    variables: { farmId: activeFarmId },
    skip,
  })
  const { data: feedRecordData } = useQuery(FEED_RECORDS, {
    variables: { farmId: activeFarmId },
    skip,
  })
  const { data: treatmentData } = useQuery(TREATMENTS, {
    variables: { farmId: activeFarmId },
    skip,
  })
  const { data: pesticideAppData } = useQuery(PESTICIDE_APPLICATIONS, {
    variables: { farmId: activeFarmId },
    skip,
  })

  const md = allFarmsState.data
  const plantings = isAllFarms ? (md.plantings ?? []) : (plantData?.plantings ?? [])
  const livestock = isAllFarms ? (md.livestock ?? []) : (livestockData?.livestockSummary ?? [])
  const eggs = isAllFarms ? (md.eggs ?? []) : (eggData?.eggProductions ?? [])
  const pendingFence = isAllFarms
    ? (md.fenceDamages ?? []).length
    : (fenceData?.fenceDamages?.length ?? 0)
  const operationalCosts = isAllFarms
    ? (md.operationalCosts ?? [])
    : (costsData?.operationalCosts ?? [])
  const seedlingPurchases = isAllFarms
    ? (md.seedlingPurchases ?? [])
    : (seedlingPurchaseData?.seedlingPurchases ?? [])
  const soilTreatments = isAllFarms
    ? (md.soilTreatments ?? [])
    : (soilTreatmentData?.soilTreatments ?? [])
  const soilInputPurchases = isAllFarms
    ? (md.soilInputPurchases ?? [])
    : (soilInputPurchaseData?.soilInputPurchases ?? [])
  const feedRecords = isAllFarms ? (md.feedRecords ?? []) : (feedRecordData?.feedRecords ?? [])
  const treatments = isAllFarms ? (md.treatments ?? []) : (treatmentData?.treatments ?? [])
  const pesticideApplications = isAllFarms
    ? (md.pesticideApplications ?? [])
    : (pesticideAppData?.pesticideApplications ?? [])

  const activePlantings = plantings.filter((p: any) => p.status === 'ACTIVE')
  const totalAcres = activePlantings.reduce((s: number, p: any) => s + Number(p.acreage), 0)

  // Re-aggregated by species — in "All Farms" mode the raw list has one row
  // per (farm, species) pair, which would otherwise render as duplicate
  // table rows / pie slices for any species raised on more than one farm.
  const livestockByType = Object.values(
    livestock.reduce((acc: Record<string, any>, l: any) => {
      if (!acc[l.animalType]) {
        acc[l.animalType] = {
          animalType: l.animalType,
          latestCount: 0,
          birthsThisMonth: 0,
          deathsThisMonth: 0,
          purchasesThisMonth: 0,
          salesThisMonth: 0,
        }
      }
      acc[l.animalType].latestCount += l.latestCount
      acc[l.animalType].birthsThisMonth += l.birthsThisMonth
      acc[l.animalType].deathsThisMonth += l.deathsThisMonth
      acc[l.animalType].purchasesThisMonth += l.purchasesThisMonth
      acc[l.animalType].salesThisMonth += l.salesThisMonth
      return acc
    }, {})
  )

  // One bar per crop, summed across every planting/harvest of that crop —
  // otherwise two yield records for the same crop (e.g. two harvests) show
  // up as two separate bars sharing one category label.
  const yieldByPlanting = Object.values(
    plantings
      .flatMap((p: any) =>
        p.yields.map((y: any) => ({ name: p.crop.name, qty: Number(y.quantity) }))
      )
      .reduce((acc: Record<string, any>, y: any) => {
        if (!acc[y.name]) acc[y.name] = { name: y.name, qty: 0 }
        acc[y.name].qty += y.qty
        return acc
      }, {})
  ).slice(0, 8)

  // One bar per calendar day, summed across every bird type — otherwise a
  // farm tracking more than one bird type gets two bars sharing the same
  // date label per day, and "last 7 days" silently shrinks to however many
  // days 7 *records* happen to span.
  const eggChartData = Object.values(
    eggs.reduce((acc: Record<string, any>, e: any) => {
      if (!acc[e.productionDate]) {
        acc[e.productionDate] = { date: e.productionDate, eggs: 0, damaged: 0 }
      }
      acc[e.productionDate].eggs += e.totalEggs
      acc[e.productionDate].damaged += e.damagedEggs
      return acc
    }, {})
  )
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .map((d: any) => ({ ...d, date: dayjs(d.date).format('MMM D') }))

  const livestockPie = livestockByType
    .filter((l: any) => l.latestCount > 0)
    .map((l: any) => ({ name: l.animalType, value: l.latestCount }))

  // Cost / revenue / profit per crop, summed across every planting of that
  // crop — the clearest "which crop is actually paying off" view.
  const financialsByCrop = Object.values(
    plantings.reduce((acc: Record<string, any>, p: any) => {
      const key = p.crop.name
      if (!acc[key]) acc[key] = { name: key, cost: 0, revenue: 0, profit: 0 }
      acc[key].cost += Number(p.totalCost ?? 0)
      acc[key].revenue += Number(p.totalRevenue ?? 0)
      acc[key].profit += Number(p.profit ?? 0)
      return acc
    }, {})
  )

  const costsByCategory = Object.entries(
    operationalCosts.reduce((acc: Record<string, number>, c: any) => {
      acc[c.category] = (acc[c.category] ?? 0) + Number(c.amount)
      return acc
    }, {})
  ).map(([category, value]) => ({ name: CATEGORY_LABELS[category] ?? category, value }))
  const totalOperationalCost = operationalCosts.reduce(
    (s: number, c: any) => s + Number(c.amount),
    0
  )
  const totalCropProfit = financialsByCrop.reduce((s: number, c: any) => s + c.profit, 0)
  const totalFarmProfit = totalCropProfit - totalOperationalCost

  const sumCost = (rows: any[]) =>
    rows.reduce((s: number, r: any) => s + Number(r.totalCost ?? 0), 0)

  const costByName = (rows: any[], nameOf: (r: any) => string) =>
    Object.entries(
      rows.reduce((acc: Record<string, number>, r: any) => {
        const key = nameOf(r)
        acc[key] = (acc[key] ?? 0) + Number(r.totalCost ?? 0)
        return acc
      }, {})
    ).map(([name, value]) => ({ name, value }))

  // Farm input purchases — each category is recorded against a specific
  // catalog item (seed type, pesticide, soil input, feed, drug), so grouping
  // by that item's name is what answers "which specific product is costing
  // us the most", not just "which category".
  const seedlingCostByType = costByName(
    seedlingPurchases,
    (p) => p.purchase?.seedling?.name ?? 'Unknown'
  )
  const pesticideCostByType = costByName(
    pesticideApplications,
    (a) => a.purchase?.pesticide?.name ?? 'Unknown'
  )
  // Both the "applying it" record (SoilTreatment) and the dedicated
  // purchase record spend money on soil inputs, so they're combined here
  // rather than only counting one of the two.
  const soilCostRows = [...soilTreatments, ...soilInputPurchases]
  const soilCostByType = costByName(soilCostRows, (t) => t.purchase?.soilInput?.name ?? 'Unknown')
  const feedCostByType = costByName(feedRecords, (f) => f.purchase?.feed?.name ?? 'Unknown')
  const treatmentCostByType = costByName(treatments, (t) => t.purchase?.drug?.name ?? 'Unknown')

  const totalSeedlingCost = sumCost(seedlingPurchases)
  const totalPesticideCost = sumCost(pesticideApplications)
  const totalSoilCost = sumCost(soilCostRows)
  const totalFeedCost = sumCost(feedRecords)
  const totalTreatmentCost = sumCost(treatments)
  const totalInputCost =
    totalSeedlingCost + totalPesticideCost + totalSoilCost + totalFeedCost + totalTreatmentCost

  const inputExpenditureByCategory = [
    { name: 'Seedlings', value: totalSeedlingCost },
    { name: 'Pesticides', value: totalPesticideCost },
    { name: 'Soil Inputs', value: totalSoilCost },
    { name: 'Feed', value: totalFeedCost },
    { name: 'Vet Treatments', value: totalTreatmentCost },
  ].filter((c) => c.value > 0)

  const inputBreakdowns = [
    { title: 'Seedling Cost by Seed Type', data: seedlingCostByType },
    { title: 'Pesticide Cost by Type', data: pesticideCostByType },
    { title: 'Soil Input Cost by Type', data: soilCostByType },
    { title: 'Feed Cost by Type', data: feedCostByType },
    { title: 'Vet Treatment Cost by Drug Type', data: treatmentCostByType },
  ]

  // Per-farm comparison — only meaningful once more than one farm is in
  // view, and only computable in "All Farms" mode since every row here
  // carries __farmName tagged on by useAllFarmsData.
  const profitByFarm = allFarms.map((f: any) => {
    const cropProfit = plantings
      .filter((p: any) => p.__farmName === f.name)
      .reduce((s: number, p: any) => s + Number(p.profit ?? 0), 0)
    const opCost = operationalCosts
      .filter((c: any) => c.__farmName === f.name)
      .reduce((s: number, c: any) => s + Number(c.amount ?? 0), 0)
    return { name: f.name, value: cropProfit - opCost }
  })

  const inputCostByFarm = allFarms.map((f: any) => {
    const rows = [
      ...seedlingPurchases,
      ...soilCostRows,
      ...feedRecords,
      ...treatments,
      ...pesticideApplications,
    ].filter((r: any) => r.__farmName === f.name)
    return { name: f.name, value: sumCost(rows) }
  })

  if (!isAllFarms && !activeFarmId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Sprout className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-lg font-medium">No farm selected</p>
        <p className="text-sm mt-1">
          Choose a farm from the top-right menu, or create one in My Farms.
        </p>
      </div>
    )
  }

  if (isAllFarms && allFarms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Sprout className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-lg font-medium">No farms yet</p>
        <p className="text-sm mt-1">Create a farm in My Farms to see a combined overview.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Scope toggle */}
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
        <button
          onClick={() => setScope('farm')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            !isAllFarms ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          This Farm
        </button>
        <button
          onClick={() => setScope('all')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            isAllFarms ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          All Farms
        </button>
      </div>

      {isAllFarms && allFarmsState.loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          Loading data across {allFarms.length} farm{allFarms.length === 1 ? '' : 's'}…
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <StatCard
              icon={Sprout}
              label="Active Plantings"
              value={activePlantings.length}
              sub={`${totalAcres.toFixed(1)} acres under crop`}
              color="bg-primary-600"
            />
            <StatCard
              icon={Beef}
              label="Total Livestock"
              value={livestockByType.reduce((s: number, l: any) => s + l.latestCount, 0)}
              sub={`${livestockByType.filter((l: any) => l.latestCount > 0).length} species`}
              color="bg-earth-500"
            />
            <StatCard
              icon={Bird}
              label="Eggs (7 days)"
              value={eggs.reduce((s: number, e: any) => s + e.totalEggs, 0)}
              sub={`${eggs.reduce((s: number, e: any) => s + e.damagedEggs, 0)} damaged`}
              color="bg-yellow-500"
            />
            <StatCard
              icon={Fence}
              label="Pending Fence Repairs"
              value={pendingFence}
              sub="reported damages awaiting repair"
              color="bg-red-500"
            />
            <StatCard
              icon={Wallet}
              label={isAllFarms ? 'Profit (All Farms)' : 'Farm Profit'}
              value={`KES ${Math.round(totalFarmProfit).toLocaleString()}`}
              sub={`After KES ${Math.round(totalOperationalCost).toLocaleString()} operational costs`}
              color={totalFarmProfit >= 0 ? 'bg-primary-600' : 'bg-red-500'}
            />
            <StatCard
              icon={ShoppingBasket}
              label={isAllFarms ? 'Input Costs (All Farms)' : 'Farm Input Costs'}
              value={`KES ${Math.round(totalInputCost).toLocaleString()}`}
              sub="Seedlings, pesticides, soil, feed & treatments"
              color="bg-orange-500"
            />
          </div>

          {isAllFarms && allFarms.length > 1 && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-700 mb-4">Profit by Farm</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={profitByFarm} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={110} />
                    <Tooltip formatter={(v: any) => `KES ${Number(v).toLocaleString()}`} />
                    <Bar dataKey="value" fill="#16a34a" radius={[0, 4, 4, 0]} name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-700 mb-4">Input Cost by Farm</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={inputCostByFarm} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={110} />
                    <Tooltip formatter={(v: any) => `KES ${Number(v).toLocaleString()}`} />
                    <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} name="Input Cost" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Egg production chart */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-700 mb-4">Egg Production — Last 7 Days</h2>
              {eggChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={eggChartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="eggs" fill="#22c55e" radius={[4, 4, 0, 0]} name="Total" />
                    <Bar dataKey="damaged" fill="#f97316" radius={[4, 4, 0, 0]} name="Damaged" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
                  No egg records yet
                </div>
              )}
            </div>

            {/* Livestock composition */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-700 mb-4">Livestock Composition</h2>
              {livestockPie.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={livestockPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {livestockPie.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
                  No livestock records yet
                </div>
              )}
            </div>
          </div>

          {/* Yield summary */}
          {yieldByPlanting.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-700 mb-4">Recent Yields</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={yieldByPlanting} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="#16a34a" radius={[0, 4, 4, 0]} name="Quantity" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Financials */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-700 mb-4">Cost vs Revenue by Crop</h2>
              {financialsByCrop.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={financialsByCrop}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: any) => `KES ${Number(v).toLocaleString()}`} />
                    <Bar dataKey="cost" fill="#f97316" radius={[4, 4, 0, 0]} name="Cost" />
                    <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
                  No planting cost/revenue data yet
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-700 mb-4">Operational Costs by Category</h2>
              {costsByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={costsByCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {costsByCategory.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(v: any) => `KES ${Number(v).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
                  No operational costs recorded yet
                </div>
              )}
            </div>
          </div>

          {/* Farm input expenditure */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-700 mb-4">Farm Input Expenditure by Category</h2>
            {inputExpenditureByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={inputExpenditureByCategory}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => `KES ${Number(v).toLocaleString()}`} />
                  <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} name="Cost" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
                No farm input purchases recorded yet
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {inputBreakdowns.map(({ title, data }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
              >
                <h2 className="font-semibold text-gray-700 mb-4">{title}</h2>
                {data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {data.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={(v: any) => `KES ${Number(v).toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
                    No records yet
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Livestock summary table */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-700 mb-4">Livestock Monthly Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 font-medium">Animal</th>
                    <th className="pb-2 font-medium text-right">Count</th>
                    <th className="pb-2 font-medium text-right">Births</th>
                    <th className="pb-2 font-medium text-right">Deaths</th>
                    <th className="pb-2 font-medium text-right">Purchased</th>
                    <th className="pb-2 font-medium text-right">Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {livestockByType.map((l: any) => (
                    <tr key={l.animalType} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 font-medium capitalize">{l.animalType.toLowerCase()}</td>
                      <td className="py-2 text-right font-bold text-primary-700">
                        {l.latestCount}
                      </td>
                      <td className="py-2 text-right text-green-600">+{l.birthsThisMonth}</td>
                      <td className="py-2 text-right text-red-500">-{l.deathsThisMonth}</td>
                      <td className="py-2 text-right text-blue-500">{l.purchasesThisMonth}</td>
                      <td className="py-2 text-right text-orange-500">{l.salesThisMonth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
