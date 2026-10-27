import { Component, type ReactNode } from 'react';

interface Props {
  fallback: (error: Error) => ReactNode;
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[RollerCoasterRush] render error', error);
  }

  render() {
    if (this.state.error) return this.props.fallback(this.state.error);
    return this.props.children;
  }
}
