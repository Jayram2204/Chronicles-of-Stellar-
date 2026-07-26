import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createLogger } from '../services/log';

const log = createLogger('ErrorBoundary');

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log.error('Uncaught exception:', error, errorInfo as unknown as string);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-[#0a1a0a] border border-[#306230] rounded-lg font-mono text-xs text-[#306230]">
          <h3 className="font-bold text-sm mb-1 uppercase">
            ⚠️ {this.props.fallbackTitle || 'Subsystem Failure Detected'}
          </h3>
          <p className="text-[#e0f8d0] opacity-80 mb-2">
            An unexpected error occurred in this module. Engine output halted.
          </p>
          <pre className="p-2 bg-[#060c06] rounded border border-[#306230]/30 overflow-x-auto text-[10px] text-[#527038]">
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 px-3 py-1 bg-[#306230] hover:bg-[#3a7a3a] text-[#e0f8d0] font-bold rounded transition text-[10px] uppercase"
          >
            Re-initialize Subsystem
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
