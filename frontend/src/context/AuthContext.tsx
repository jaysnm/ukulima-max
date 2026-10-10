import React, { createContext, useContext, useState, useCallback } from 'react'
import { useMutation, gql } from '@apollo/client'

const LOGIN = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      access
      refresh
      user {
        id
        username
        email
        firstName
        lastName
        isStaff
        isSuperuser
      }
    }
  }
`

const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      access
      refresh
      user {
        id
        username
        email
        firstName
        lastName
        isStaff
        isSuperuser
      }
    }
  }
`

interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  isStaff: boolean
  isSuperuser: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (username: string, password: string) => Promise<void>
  register: (input: {
    username: string
    email: string
    password: string
    firstName?: string
    lastName?: string
  }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const storedUser = localStorage.getItem('user')
  const [user, setUser] = useState<User | null>(storedUser ? JSON.parse(storedUser) : null)

  const [loginMutation] = useMutation(LOGIN)
  const [registerMutation] = useMutation(REGISTER)

  const login = useCallback(
    async (username: string, password: string) => {
      const { data } = await loginMutation({ variables: { username, password } })
      const payload = data.login
      localStorage.setItem('access_token', payload.access)
      localStorage.setItem('refresh_token', payload.refresh)
      localStorage.setItem('user', JSON.stringify(payload.user))
      setUser(payload.user)
    },
    [loginMutation]
  )

  const register = useCallback(
    async (input: Parameters<AuthContextType['register']>[0]) => {
      const { data } = await registerMutation({ variables: { input } })
      const payload = data.register
      localStorage.setItem('access_token', payload.access)
      localStorage.setItem('refresh_token', payload.refresh)
      localStorage.setItem('user', JSON.stringify(payload.user))
      setUser(payload.user)
    },
    [registerMutation]
  )

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('active_farm')
    setUser(null)
  }, [])

  const isAdmin = !!user && (user.isStaff || user.isSuperuser)

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isAdmin, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
