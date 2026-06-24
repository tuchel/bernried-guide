import { Component, type ReactNode } from 'react'

/**
 * Keeps a failure inside the map subtree (e.g. Google Maps rejecting the API key /
 * domain, or AdvancedMarker throwing) from unmounting the whole app. The header,
 * filters, lenses, and the running-costs / analysis routes keep working; only the
 * map area shows a fallback.
 */
export class MapErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#eef1f4] px-6 text-center">
          <p className="text-sm font-medium text-gray-600">The interactive map couldn’t load here.</p>
          <p className="max-w-xs text-xs text-gray-500">
            This usually means the Google Maps key isn’t authorized for this domain. Everything else —
            travel times, the guide, running costs and the analysis — still works.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
