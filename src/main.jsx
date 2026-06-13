import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const validateEnv = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(
      `[CommerceFlow] WARNING: VITE_OPENAI_API_KEY environment variable is not set. ` +
      `AI mapping assistance will not be available. Please set this variable for AI features.`
    );
  }
};
validateEnv();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
