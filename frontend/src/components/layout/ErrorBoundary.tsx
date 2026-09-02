import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// React only supports catching render-time errors via a class component's
// getDerivedStateFromError/componentDidCatch -- there's no hook equivalent.
// Without this, any uncaught error while rendering a page (a bad AI response
// shape, a null a component didn't expect, ...) unmounts the whole React
// tree to a blank white screen instead of a page the user can recover from.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled error in component tree:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
          <div className="w-full max-w-md">
            <Alert variant="error">Something went wrong while displaying this page.</Alert>
          </div>
          <Button onClick={this.handleReset}>Try again</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
