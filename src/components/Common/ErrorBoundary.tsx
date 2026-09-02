import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  declare state: State;
  declare props: Readonly<Props>;
  declare setState: any;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 bg-rose-950/60 border border-rose-800/80 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2 tracking-tight">
              Sharq Medical Portal Notice
            </h1>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              The application encountered an unexpected runtime error. You can refresh the page or clear local cached data to restore normal operation.
            </p>

            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-left mb-6 font-mono text-xs text-rose-300 max-h-28 overflow-auto">
                {this.state.error.message || 'Unknown error occurred'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Portal
              </button>
              <button
                type="button"
                onClick={this.handleResetCache}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
