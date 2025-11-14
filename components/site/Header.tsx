'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold">
            Portfolio
          </Link>
          <nav className="flex space-x-8">
            <Link href="/" className="text-gray-700 hover:text-gray-900">
              Main
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-gray-900">
              About
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

