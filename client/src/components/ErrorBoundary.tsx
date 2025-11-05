import React from 'react';
import { Result, Button } from 'antd';

interface State { hasError: boolean; error?: any }

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught:', error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Something went wrong"
          subTitle={this.state.error?.message || 'Unexpected error'}
          extra={<Button type="primary" onClick={this.reset}>Retry</Button>}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
