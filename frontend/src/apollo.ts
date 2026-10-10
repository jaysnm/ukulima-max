import { ApolloClient, InMemoryCache, from, fromPromise } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { createUploadLink } from 'apollo-upload-client'

// createUploadLink (not createHttpLink) so mutations carrying a File/Blob
// variable (photos on stock-take, treatment, damage records, etc.) are sent
// as a multipart request per the GraphQL multipart request spec instead of
// failing to serialize as JSON.
const httpLink = createUploadLink({ uri: '/graphql/' })

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('access_token')
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }
})

export const SESSION_EXPIRED_KEY = 'session_expired_message'

function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  // A hard redirect (needed to fully reset React/Apollo state) would otherwise
  // just look like an unexplained flicker back to the login screen, silently
  // dropping whatever the user was typing. This survives the reload so the
  // login page can explain what happened.
  sessionStorage.setItem(SESSION_EXPIRED_KEY, 'Your session expired. Please log in again.')
  window.location.href = '/login'
}

// Calls the refreshToken mutation directly over fetch (not apolloClient) to
// avoid a circular dependency on the client this link is being built into.
async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem('refresh_token')
  if (!refresh) return null
  try {
    const res = await fetch('/graphql/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'mutation Refresh($refresh: String!) { refreshToken(refresh: $refresh) }',
        variables: { refresh },
      }),
    })
    const json = await res.json()
    const newAccess = json?.data?.refreshToken
    if (!newAccess) return null
    localStorage.setItem('access_token', newAccess)
    return newAccess as string
  } catch {
    return null
  }
}

// Concurrent auth failures (several queries firing at once with the same
// stale token) all await this SAME promise instead of each racing to start
// their own refresh — the previous isRefreshing-flag approach had a window
// where a late-arriving failure could see the flag already reset and kick
// off a redundant second refresh.
let refreshPromise: Promise<string | null> | null = null

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  const hasAuthError = graphQLErrors?.some((e) =>
    e.message.toLowerCase().includes('authentication')
  )
  if (networkError) console.error('Network error:', networkError)
  if (!hasAuthError) return

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }

  return fromPromise(refreshPromise).flatMap((newToken) => {
    if (!newToken) {
      logout()
      return fromPromise(Promise.reject(new Error('Session expired')))
    }
    operation.setContext(({ headers = {} }) => ({
      headers: { ...headers, Authorization: `Bearer ${newToken}` },
    }))
    return forward(operation)
  })
})

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
})
