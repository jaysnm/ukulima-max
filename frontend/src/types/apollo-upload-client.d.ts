// The published @types package targets Apollo Client v4 and doesn't resolve
// against apollo-upload-client's own "exports" map for the v3-compatible
// 17.x line we use, so its return type is declared loosely here instead of
// pulling in a mismatched upstream declaration.
declare module 'apollo-upload-client' {
  import type { ApolloLink } from '@apollo/client'

  export function createUploadLink(options: { uri: string }): ApolloLink
}
