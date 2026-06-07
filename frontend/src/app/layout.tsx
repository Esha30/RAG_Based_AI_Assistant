import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'RAG AI Assistant — Document Intelligence Platform',
  description: 'Enterprise-grade AI assistant that lets you chat with your documents, extract insights, and analyze resumes using Gemini AI and semantic search.',
  keywords: 'RAG, AI, document intelligence, semantic search, LangChain, ChromaDB, Gemini',
};

const suppressExtensionErrors = `
(function () {
  // Provide a harmless window.ethereum stub so wallet extensions
  // don't throw "MetaMask extension not found" when probing the page.
  if (typeof window !== 'undefined' && !window.ethereum) {
    Object.defineProperty(window, 'ethereum', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  }

  if (typeof window !== 'undefined') {
    // Intercept uncaught errors in the capture phase (before Next.js dev overlay)
    window.addEventListener('error', function (e) {
      var src = e.filename || '';
      var msg = e.message || '';
      var stack = (e.error && e.error.stack) || '';
      if (
        (typeof src === 'string' && src.indexOf('chrome-extension://') !== -1) ||
        (typeof msg === 'string' && (msg.indexOf('MetaMask') !== -1 || msg.indexOf('ethereum') !== -1)) ||
        (typeof stack === 'string' && (stack.indexOf('chrome-extension://') !== -1 || stack.indexOf('MetaMask') !== -1))
      ) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    }, true);

    // Intercept unhandled promise rejections in the capture phase
    window.addEventListener('unhandledrejection', function (e) {
      var msg = e && e.reason && (e.reason.message || String(e.reason));
      var stack = e && e.reason && e.reason.stack;
      if (
        (msg && (msg.indexOf('MetaMask') !== -1 || msg.indexOf('ethereum') !== -1)) ||
        (typeof stack === 'string' && (stack.indexOf('chrome-extension://') !== -1 || stack.indexOf('MetaMask') !== -1))
      ) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    }, true);
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Suppress MetaMask / Web3 wallet extension injection errors */}
        <script dangerouslySetInnerHTML={{ __html: suppressExtensionErrors }} />
      </head>
      <body>
        <AuthProvider>
          {/* Decorative background orbs */}
          <div className="glow-orb" style={{ width: 600, height: 600, background: 'rgba(139,92,246,0.06)', top: -200, left: -100 }} />
          <div className="glow-orb" style={{ width: 400, height: 400, background: 'rgba(6,182,212,0.04)', bottom: 100, right: -100 }} />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
