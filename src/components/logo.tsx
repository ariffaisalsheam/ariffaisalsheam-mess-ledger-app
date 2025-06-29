import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="6" y1="7" x2="10" y2="7" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="14" y1="7" x2="18" y2="7" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="6" y1="11" x2="10" y2="11" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="14" y1="11" x2="18" y2="11" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
