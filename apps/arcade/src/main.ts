import './styles.css';
import { createApp } from './boot/create-app.ts';
import { showFatalError } from './boot/fatal-error.ts';

void createApp({
  window,
  document,
  isDevBuild: import.meta.env.DEV,
  isE2eBuild: import.meta.env.MODE === 'e2e',
  baseUrl: import.meta.env.BASE_URL,
}).catch((error: unknown) => {
  showFatalError(document, error);
});
