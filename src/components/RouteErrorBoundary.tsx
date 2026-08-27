import { Component } from 'react'
import type { ReactNode } from 'react'
import { ErrorState } from './States'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Without this, a render-time crash anywhere in the route tree (e.g. a page
 * reading a field on stale/older-shaped case data) takes down the whole app
 * to a blank white screen with no way back except manually editing the URL.
 * This catches it and offers a reload instead.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Unhandled render error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-md px-4 py-16">
          <ErrorState
            title="เกิดข้อผิดพลาดที่ไม่คาดคิด"
            description="กรุณาลองโหลดหน้านี้ใหม่อีกครั้ง"
            onRetry={() => window.location.reload()}
          />
        </div>
      )
    }
    return this.props.children
  }
}
