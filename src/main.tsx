import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept background Firebase transport / token-service propagation rejections
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = (reason?.message || String(reason || '')).toLowerCase();
  if (
    msg.includes('token-service') ||
    msg.includes('securetoken') ||
    msg.includes('client is offline') ||
    msg.includes('could not reach cloud firestore') ||
    msg.includes('unavailable')
  ) {
    event.preventDefault();
    console.warn('[Network/Sync] Background transport notice caught:', reason?.message || reason);
  }
});

createRoot(document.getElementById('root')!).render(<App />);
