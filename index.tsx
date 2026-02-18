import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log('SmartResume Engine: Initializing...');

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('SmartResume Engine: Ready.');
} else {
  console.error('SmartResume Engine: Failed to find root element.');
}