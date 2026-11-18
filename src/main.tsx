import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import 'tdesign-react/es/style/index.css';
import './styles.css';

/** 默认启用 MSW 模拟接口；接入真实后端时设置环境变量 VITE_USE_MOCK=false。 */
async function enableMocks() {
  if (import.meta.env.VITE_USE_MOCK === 'false') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}

enableMocks().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
});
