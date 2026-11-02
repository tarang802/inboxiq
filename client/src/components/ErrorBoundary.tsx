import { Component, type ErrorInfo, type ReactNode } from 'react';

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
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Reloading usually fixes it. Your data is safe.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Reload
        </button>
      </div>
    );
  }
}
