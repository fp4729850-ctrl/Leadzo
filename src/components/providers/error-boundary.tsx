import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
          <div className="max-w-2xl w-full bg-zinc-900 border border-red-500/30 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-red-500/10 p-6 border-b border-red-500/20 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-red-400">Application Error</h1>
                <p className="text-zinc-400 text-sm mt-1">
                  Leadzo encountered an unexpected error. Please take a screenshot of this and send it to the developer.
                </p>
              </div>
            </div>
            
            <div className="p-6 bg-zinc-950/50 flex-1 overflow-auto">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2">Error Message:</h3>
                  <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 font-mono text-sm text-red-400 whitespace-pre-wrap break-words">
                    {this.state.error?.toString()}
                  </div>
                </div>
                
                {this.state.errorInfo && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-300 mb-2">Component Stack:</h3>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 font-mono text-[11px] text-zinc-400 whitespace-pre-wrap overflow-x-auto">
                      {this.state.errorInfo.componentStack}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end">
              <Button 
                onClick={() => window.location.href = '/'}
                className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Return Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
