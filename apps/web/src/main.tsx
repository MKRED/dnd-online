import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@mantine/core/styles.css';
import './index.css';
import { MantineProvider } from '@mantine/core';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './features/auth';
import { router } from './router.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </MantineProvider>
  </StrictMode>,
);
