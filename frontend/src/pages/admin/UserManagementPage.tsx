import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { Building2, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { ALL_FARMS, ALL_USERS } from '../../graphql/queries'
import { INVITE_MEMBER, REMOVE_MEMBER, UPDATE_MEMBER_ROLE } from '../../graphql/mutations'
import SubmitButton from '../../components/ui/SubmitButton'

const ROLES = ['OWNER', 'MANAGER', 'WORKER']

export default function UserManagementPage() {
  const { data: farmsData, refetch: refetchFarms } = useQuery(ALL_FARMS)
  const { data: usersData } = useQuery(ALL_USERS)
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null)
  const [newUsername, setNewUsername] = useState('')
  const [newRole, setNewRole] = useState('WORKER')
  const [error, setError] = useState('')

  const farms = farmsData?.allFarms ?? []
  const users = usersData?.allUsers ?? []
  const activeFarm = farms.find((f: any) => f.id === activeFarmId) ?? farms[0]

  const [inviteMember, { loading: inviting }] = useMutation(INVITE_MEMBER, {
    onCompleted: () => {
      setNewUsername('')
      setError('')
      refetchFarms()
    },
    onError: (e) => setError(e.message),
  })

  const [updateMemberRole] = useMutation(UPDATE_MEMBER_ROLE, {
    onCompleted: () => refetchFarms(),
    onError: (e) => setError(e.message),
  })

  const [removeMember] = useMutation(REMOVE_MEMBER, {
    onCompleted: () => refetchFarms(),
    onError: (e) => setError(e.message),
  })

  const memberUserIds = new Set((activeFarm?.members ?? []).map((m: any) => m.user.id))
  const availableUsers = users.filter((u: any) => !memberUserIds.has(u.id))

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeFarm || !newUsername) return
    inviteMember({
      variables: { input: { farmId: activeFarm.id, username: newUsername, role: newRole } },
    })
  }

  const handleRemove = (userId: string, username: string) => {
    if (!activeFarm) return
    if (!window.confirm(`Remove ${username} from "${activeFarm.name}"?`)) return
    removeMember({ variables: { farmId: activeFarm.id, userId } })
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-1 lg:col-span-1">
        <p className="text-xs font-semibold text-gray-400 uppercase px-2 pb-2">All Farms</p>
        {farms.map((farm: any) => (
          <button
            key={farm.id}
            onClick={() => setActiveFarmId(farm.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all
              ${
                farm.id === activeFarm?.id
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 truncate">{farm.name}</span>
            <span className="text-xs text-gray-400">{farm.members.length}</span>
          </button>
        ))}
        {farms.length === 0 && <p className="text-sm text-gray-400 px-2">No farms yet.</p>}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2 space-y-6">
        {!activeFarm ? (
          <p className="text-sm text-gray-400">Select a farm to manage its members.</p>
        ) : (
          <>
            <div>
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary-600" /> {activeFarm.name}
              </h3>
              <p className="text-sm text-gray-400">{activeFarm.location}</p>
            </div>

            <div className="space-y-2">
              {activeFarm.members.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-2.5"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {m.user.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.user.username}</p>
                    <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
                  </div>
                  <select
                    value={m.role}
                    onChange={(e) =>
                      updateMemberRole({
                        variables: {
                          farmId: activeFarm.id,
                          userId: m.user.id,
                          role: e.target.value,
                        },
                      })
                    }
                    className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemove(m.user.id, m.user.username)}
                    className="text-gray-400 hover:text-red-600 p-1.5"
                    title="Remove from farm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {activeFarm.members.length === 0 && (
                <p className="text-sm text-gray-400">No members on this farm yet.</p>
              )}
            </div>

            <form onSubmit={handleInvite} className="border-t pt-4 flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Assign existing user
                </label>
                <select
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a user…</option>
                  {availableUsers.map((u: any) => (
                    <option key={u.id} value={u.username}>
                      {u.username} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <SubmitButton
                loading={inviting}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium"
              >
                <UserPlus size={14} /> Assign
              </SubmitButton>
            </form>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
