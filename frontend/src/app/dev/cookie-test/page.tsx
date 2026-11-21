// notfound stops the page and shows the standard 404 page instead.
import { notFound } from 'next/navigation';
// metadata is the type for the page title and search engine settings. "import type" loads no running code.
import type { Metadata } from 'next';
// the panel with the form and the buttons. it lives in the same folder.
// only a file named page.tsx becomes an address, so this file is not a page by itself.
import { CookieTestPanel } from './cookie-test-panel';

// the browser tab title, plus a note that tells search engines not to list this page.
export const metadata: Metadata = {
  title: 'Cookie test (development only)',
  robots: { index: false, follow: false },
};

// the page at http://localhost:3001/dev/cookie-test.
// this is a server component (no "use client" line), so the check below runs on the server.
export default function CookieTestPage() {
  // safety: this page is a development tool only (decision 7, option c).
  // next build and next start set NODE_ENV to "production", so a real deployment answers with 404.
  // the page must still be removed before going live (tracker item 52).
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  // in development, show the test panel.
  return <CookieTestPanel />;
}