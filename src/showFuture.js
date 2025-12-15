// Check URL query parameter first, then fall back to environment variable
const getShowFuture = () => {
  if (globalThis.window) {
    const urlParams = new URLSearchParams(globalThis.location.search)
    const queryParam = urlParams.get('show_future')

    if (queryParam !== null) {
      return queryParam === 'true'
    }
  }

  return import.meta.env.VITE_SHOW_FUTURE === 'true'
}

// Create a reactive getter that updates when the URL changes
export const showFuture = getShowFuture()

// Export the getter function for components that need reactive updates
export const getShowFutureValue = getShowFuture
