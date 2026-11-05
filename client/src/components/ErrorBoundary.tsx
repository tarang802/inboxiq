import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

// a crash while rendering a page shows this instead of a blank screen.
// Layout keys it by path, so moving to another page clears it
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="py-16 text-center" role="alert">
        <p className="font-medium">Something went wrong on this page.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Reloading usually fixes it. Your data is safe.
        </p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    );
  }
}
