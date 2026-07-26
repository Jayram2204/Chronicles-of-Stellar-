import { app } from './firebase';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { createLogger } from './log';

const log = createLogger('ErrorReporter');
const db = getFirestore(app);

let initialized = false;

export function initErrorReporter() {
  if (initialized) return;
  initialized = true;

  window.onerror = (message, source, lineno, colno, error) => {
    const entry = {
      type: 'window.onerror',
      message: String(message),
      source: String(source),
      lineno: Number(lineno),
      colno: Number(colno),
      stack: error?.stack || null,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: serverTimestamp(),
    };

    log.error(`Uncaught: ${entry.message} at ${entry.source}:${entry.lineno}:${entry.colno}`);

    addDoc(collection(db, 'error_logs'), entry).catch(() => {
      // Silently fail — don't crash the crash reporter
    });
  };

  window.addEventListener('unhandledrejection', (event) => {
    const entry = {
      type: 'unhandledrejection',
      message: String(event.reason?.message || event.reason || 'Unknown'),
      stack: event.reason?.stack || null,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: serverTimestamp(),
    };

    log.error(`Unhandled Promise rejection: ${entry.message}`);

    addDoc(collection(db, 'error_logs'), entry).catch(() => {});
  });

  log.info('Error reporter initialized');
}
