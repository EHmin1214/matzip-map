import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { UserProvider } from './context/UserContext';
import reportWebVitals from './reportWebVitals';

// 모바일 디버깅: 잡히지 않는 JS 에러를 화면에 표시
window.addEventListener('error', (e) => {
  const el = document.getElementById('__crash');
  if (el) el.textContent = `[JS Error] ${e.message} (${e.filename}:${e.lineno})`;
});
window.addEventListener('unhandledrejection', (e) => {
  const el = document.getElementById('__crash');
  if (el) el.textContent = `[Promise] ${e.reason}`;
});

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', fontSize: 13, color: '#900', background: '#fff' }}>
          <h2>앱 로드 중 오류가 발생했습니다</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error.message}{'\n'}{this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <UserProvider>
        <App />
      </UserProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

reportWebVitals();

// CRA 기본 서비스워커만 해제 (푸시 알림용 sw.js는 유지)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => {
      if (!r.active?.scriptURL?.includes("/sw.js")) r.unregister();
    });
  });
}
