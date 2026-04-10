import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-[#0b0e18] gap-4 p-8">
          <div className="text-red-400 text-[14px] font-semibold">Something went wrong</div>
          {this.state.error && (
            <div className="text-[10px] text-slate-600 font-mono bg-[#0f1320] border border-[#1e293b] rounded-lg px-4 py-2 max-w-md text-center truncate">
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={this.handleReload}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-500 transition-colors"
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
