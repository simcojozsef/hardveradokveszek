import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';

import { router } from './router';
import { AuthProvider } from './context/AuthContext';

import './styles/app.css';

const rootElement = document.getElementById('app');

if (!rootElement) {
    throw new Error('React root element #app was not found.');
}

createRoot(rootElement).render(
    <React.StrictMode>
        <AuthProvider>
            <RouterProvider router={router} />
        </AuthProvider>
    </React.StrictMode>,
);