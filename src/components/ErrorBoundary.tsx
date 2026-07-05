import {Component, type ReactNode} from 'react';

interface Props {children: ReactNode}
interface State {error: Error | null}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {error: null};

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  componentDidCatch(error: Error) {
    console.error('Lỗi ứng dụng chưa được xử lý:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="panel error-boundary">
          <h1>Đã xảy ra lỗi không mong muốn</h1>
          <p>Ứng dụng gặp sự cố khi hiển thị. Dữ liệu đã lưu trong máy của bạn không bị mất.</p>
          <p><small>{this.state.error.message}</small></p>
          <button onClick={() => window.location.reload()}>Tải lại ứng dụng</button>
        </main>
      );
    }
    return this.props.children;
  }
}
