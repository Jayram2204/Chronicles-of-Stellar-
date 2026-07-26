import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initErrorReporter } from './services/errorReporter';

initErrorReporter();

createRoot(document.getElementById('root')!).render(<App />);
