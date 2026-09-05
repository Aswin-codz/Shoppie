import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './app/store';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ErrorBoundary>
            <Provider store={store}>
                <BrowserRouter>
                    <App />
                    <Toaster position="bottom-right" />
                </BrowserRouter>
            </Provider>
        </ErrorBoundary>
    </StrictMode>,
);
