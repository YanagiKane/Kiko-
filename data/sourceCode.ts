
export const PROJECT_FILES = [
  {
    name: 'index.html',
    path: 'index.html',
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>LYNX</title>
    <script>window.process = window.process || { env: {} };</script>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`
  },
  {
    name: 'App.tsx',
    path: 'App.tsx',
    content: `// Main Application Entry
import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
// ... (Full App Logic)`
  },
  {
    name: 'types.ts',
    path: 'types.ts',
    content: `export enum EnhancementType {
  GENERAL = 'General Enhancement',
  RESTORE = 'Old Photo Restoration',
  // ...
}`
  },
  {
    name: 'services/geminiService.ts',
    path: 'services/geminiService.ts',
    content: `import { GoogleGenAI } from "@google/genai";
// Gemini Service Implementation`
  },
  {
    name: 'components/Header.tsx',
    path: 'components/Header.tsx',
    content: `import React from 'react';
// Header Component`
  },
  {
    name: 'components/EnhancementControls.tsx',
    path: 'components/EnhancementControls.tsx',
    content: `import React from 'react';
// Controls Component`
  },
  {
    name: 'components/Documentation.tsx',
    path: 'components/Documentation.tsx',
    content: `// Documentation and Download Component`
  },
  {
    name: 'services/falService.ts',
    path: 'services/falService.ts',
    content: `// Fal.ai Service`
  },
  {
    name: 'components/ImageUploader.tsx',
    path: 'components/ImageUploader.tsx',
    content: `// Image Uploader Component`
  },
  {
    name: 'metadata.json',
    path: 'metadata.json',
    content: `{
  "name": "LYNX",
  "description": "AI Image Enhancement Platform"
}`
  }
];
