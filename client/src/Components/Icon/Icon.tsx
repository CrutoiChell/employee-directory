import type { ReactNode } from 'react';
import './Icon.css';

export function Icon({
  name,
  className = '',
}: {
  name: 'people' | 'search' | 'plus' | 'close' | 'logout' | 'arrow' | 'check';
  className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    people: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87" />
        <circle cx="9" cy="7" r="4" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    logout: (
      <>
        <path d="M9 5H5v14h4M9 12h12m-4-4 4 4-4 4" />
      </>
    ),
    arrow: <path d="m9 6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
