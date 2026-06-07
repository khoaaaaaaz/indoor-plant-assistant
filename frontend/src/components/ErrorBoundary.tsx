// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center
              justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="font-headline text-headline-lg text-primary mb-2">
              Something went wrong
            </h1>
            <p className="text-body-md text-muted-foreground mb-6">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="rounded-full px-6"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
