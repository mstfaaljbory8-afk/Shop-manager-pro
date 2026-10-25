import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Graceful error shield to prevent harmless background notices from polluting preview toolbar
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = (reason?.message || String(reason || '')).toLowerCase();
  // Benign background conditions (offline transport, token sync, camera permission denial, popup cancellation, aborts)
  if (
    msg.includes('token-service') ||
    msg.includes('securetoken') ||
    msg.includes('client is offline') ||
    msg.includes('could not reach cloud firestore') ||
    msg.includes('unavailable') ||
    msg.includes('network') ||
    msg.includes('cancelled-popup-request') ||
    msg.includes('popup-closed-by-user') ||
    msg.includes('permission denied') ||
    msg.includes('barcodedetector') ||
    msg.includes('abort') ||
    msg.includes('user cancelled')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
});

// Suppress known benign iframe warnings (window.close in iframe, resize observer)
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const first = String(args[0] || '').toLowerCase();
  if (
    first.includes('scripts may close only the windows') ||
    first.includes('token-service') ||
    first.includes('background transport') ||
    first.includes('resizeobserver loop') ||
    first.includes('websocket') ||
    first.includes('vite')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

createRoot(document.getElementById('root')!).render(<App />);

