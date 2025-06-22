'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home as HomeIcon,
  ChevronRight,
  UserPlus,
  CalendarCheck,
  Phone,
  Info,
  ShieldCheck,
} from 'lucide-react';

interface BreadcrumbProps {
  homeElement?: React.ReactNode;
  separator?: React.ReactNode;
  activeClasses?: string;
  containerClasses?: string;
  listClasses?: string;
  capitalizeLinks?: boolean;
}

const iconMap: Record<string, JSX.Element> = {
  register: <UserPlus className="w-4 h-4" />,
  'book-slot': <CalendarCheck className="w-4 h-4" />,
  contact: <Phone className="w-4 h-4" />,
  about: <Info className="w-4 h-4" />,
  admin: <ShieldCheck className="w-4 h-4" />,
};

export default function NextBreadcrumb({
  homeElement = <HomeIcon className="w-4 h-4" />, // Home icon
  separator = <ChevronRight className="w-4 h-4 mx-1 text-white" />,
  activeClasses = '',
  containerClasses = '',
  listClasses = '',
  capitalizeLinks = false,
}: BreadcrumbProps) {
  const pathname = usePathname();
  const segments = pathname
    .split('/')
    .filter((seg) => seg && seg !== ''); // Ensure no empty or root segments

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const isLast = index === segments.length - 1;
    const label = capitalizeLinks
      ? segment.charAt(0).toUpperCase() + segment.slice(1)
      : segment;
    const icon = iconMap[segment.toLowerCase()] || null;

    return (
      <li key={href} className="flex items-center">
        {separator}
        {isLast ? (
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded bg-amber-100 text-amber-800 text-sm font-semibold ${activeClasses}`}
          >
            {icon}
            {label}
          </span>
        ) : (
          <Link
            href={href}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded bg-white text-blue-700 hover:bg-blue-100 text-sm font-medium ${listClasses}`}
          >
            {icon}
            {label}
          </Link>
        )}
      </li>
    );
  });

  return (
    <nav
      className={`sticky top-0 z-50 w-full shadow-md bg-gradient-to-r from-purple-600 to-blue-600 py-4 px-6 ${containerClasses}`}
      aria-label="breadcrumb"
    >
      <div className="flex justify-between items-center">
        <ol className="flex items-center space-x-1 overflow-x-auto">
          {breadcrumbs.length === 0 ? null : (
            <li className="flex items-center gap-1">
              <Link
                href="/"
                className={`inline-flex items-center gap-1 px-3 py-1 rounded bg-white text-blue-700 hover:bg-blue-100 text-sm font-medium ${listClasses}`}
              >
                {homeElement}
              </Link>
            </li>
          )}
          {breadcrumbs}
        </ol>
        <div>
          <Link
            href="/register"
            className="ml-4 px-4 py-2 rounded bg-white text-blue-700 text-sm font-medium hover:bg-blue-100 border border-blue-500"
          >
            Register Now
          </Link>
        </div>
      </div>
    </nav>
  );
}
