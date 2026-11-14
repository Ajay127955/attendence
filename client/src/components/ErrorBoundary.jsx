import { Component } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

/**
 * Top-level error boundary. Catches render errors anywhere in the tree so a
 * single broken page never blanks the whole app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info);
  }

  handleReset = () => {
    this.setState({ error: null, info: null });
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 p-6 dark:bg-ink-950">
        <div className="card w-full max-w-lg p-8 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-danger/10">
            <AlertOctagon className="text-danger" size={26} aria-hidden />
          </span>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
            An unexpected error interrupted this page. You can try again — your data is safe.
          </p>
          {!import.meta.env.PROD && (
            <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-ink-100 p-3 text-left text-xs text-ink-700 dark:bg-ink-900 dark:text-ink-300">
              {String(error?.stack || error?.message || error)}
              {info?.componentStack ? `\n${info.componentStack}` : ''}
            </pre>
          )}
          <div className="mt-6 flex justify-center gap-2">
            <button type="button" className="btn-primary" onClick={this.handleReset}>
              <RotateCcw size={16} /> Try again
            </button>
            <a className="btn-secondary" href="/">
              Go to dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
