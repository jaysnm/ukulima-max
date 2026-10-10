import React, { createContext, useContext, useState } from 'react'
import { useQuery } from '@apollo/client'
import { MY_FARMS } from '../graphql/queries'
import { useAuth } from './AuthContext'

const EDITOR_ROLES = ['OWNER', 'MANAGER']

interface FarmContextType {
  activeFarmId: string | null
  setActiveFarmId: (id: string) => void
  // Role-based UI gating only — the backend re-checks every mutation, so
  // these just keep edit/delete controls from being shown to a WORKER who
  // can create entries but not modify or remove existing ones.
  canEditActiveFarm: boolean
  canEditCatalog: boolean
  // Mirrors the backend's `is_worker_only`: false only for a user whose
  // *every* farm membership is WORKER — a brand-new user with no farms yet
  // is still allowed to create their first one.
  canCreateFarm: boolean
}

const FarmContext = createContext<FarmContextType | null>(null)

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth()
  const [activeFarmId, setActiveFarmIdState] = useState<string | null>(
    localStorage.getItem('active_farm')
  )
  const { data } = useQuery(MY_FARMS, { skip: !user })

  const setActiveFarmId = (id: string) => {
    localStorage.setItem('active_farm', id)
    setActiveFarmIdState(id)
  }

  const farms = data?.myFarms ?? []
  const myRoleOn = (farmId: string | null) =>
    farms.find((f: any) => f.id === farmId)?.members.find((m: any) => m.user.id === user?.id)?.role

  // Catalogs (suppliers, crops, pesticides, …) have no farm of their own —
  // mirrors the backend's `is_worker_only`: any OWNER/MANAGER role anywhere
  // unlocks editing them.
  const canEditCatalog = isAdmin || farms.some((f: any) => EDITOR_ROLES.includes(myRoleOn(f.id)))
  const canEditActiveFarm = isAdmin || EDITOR_ROLES.includes(myRoleOn(activeFarmId))
  const canCreateFarm = isAdmin || farms.length === 0 || canEditCatalog

  return (
    <FarmContext.Provider
      value={{ activeFarmId, setActiveFarmId, canEditActiveFarm, canEditCatalog, canCreateFarm }}
    >
      {children}
    </FarmContext.Provider>
  )
}

export function useFarm() {
  const ctx = useContext(FarmContext)
  if (!ctx) throw new Error('useFarm must be used within FarmProvider')
  return ctx
}
