import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@mantine/core/styles.css';
import './index.css';
import { MantineProvider } from '@mantine/core';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider>
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>,
);
