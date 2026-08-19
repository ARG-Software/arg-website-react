import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch() {
    try {
      window.sessionStorage.removeItem('arg:lazyReload');
    } catch (e) {
      void e;
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem('arg:lazyReload');
      } catch (e) {
        void e;
      }
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error: this.state.error,
          reset: this.handleReload,
        });
      }
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
            textAlign: 'center',
            color: 'inherit',
            fontFamily: 'inherit',
          }}
        >
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>Something went wrong</h1>
          <p style={{ margin: '0 0 1.5rem', opacity: 0.8 }}>
            A newer version of this page is available. Reload to continue.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '0.75rem 1.25rem',
              border: '1px solid currentColor',
              borderRadius: '999px',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              font: 'inherit',
            }}
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
