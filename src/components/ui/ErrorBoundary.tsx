import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./button";
import { Icon } from "@/components/ui/icon";
;

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
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
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-slate-50/50 rounded-xl border border-slate-200">
          <div className="bg-red-50 p-3 rounded-full mb-4">
            <Icon name="warning" className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-slate-500 text-center max-w-md mb-6">
            {this.state.error?.message || "An unexpected error occurred in this component. Please try again or refresh the page."}
          </p>
          <Button onClick={this.handleRetry} variant="outline" className="gap-2">
            <Icon name="sync" className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
