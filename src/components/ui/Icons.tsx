import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 24) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
});

export const Search = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export const Bag = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M5.5 8h13l.9 11.2a1.6 1.6 0 0 1-1.6 1.8H6.2a1.6 1.6 0 0 1-1.6-1.8L5.5 8Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);

export const Menu = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
);

export const Close = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ArrowStart = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </svg>
);

export const ArrowEnd = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export const Plus = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Minus = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M5 12h14" />
  </svg>
);

export const Trash = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
    <path d="M6.5 7 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5L17.5 7" />
    <path d="M10.5 11v5M13.5 11v5" />
  </svg>
);

export const Check = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="m5 12.5 4.5 4.5L19 6.5" />
  </svg>
);

export const Whatsapp = ({ size = 24, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false" {...p}>
    <path d="M12.04 2.5c-5.24 0-9.5 4.25-9.5 9.49 0 1.67.44 3.3 1.27 4.74L2.5 21.5l4.9-1.28a9.5 9.5 0 0 0 4.63 1.19h.01c5.24 0 9.5-4.26 9.5-9.5s-4.26-9.41-9.5-9.41Zm5.57 13.4c-.23.65-1.36 1.25-1.88 1.3-.5.05-.97.23-3.28-.7-2.77-1.1-4.5-3.94-4.64-4.12-.14-.19-1.1-1.47-1.1-2.8 0-1.33.7-1.98.94-2.25.24-.28.53-.35.7-.35h.5c.17 0 .4-.06.6.46.23.56.79 1.94.86 2.08.07.14.11.3.02.49-.09.18-.14.3-.28.46l-.42.49c-.14.14-.28.3-.12.58.16.28.72 1.18 1.54 1.91 1.06.94 1.95 1.23 2.23 1.37.28.14.44.12.6-.07.16-.19.7-.81.88-1.09.19-.28.37-.23.62-.14.25.09 1.6.75 1.87.89.28.14.46.2.53.32.07.11.07.65-.16 1.3Z" />
  </svg>
);

export const Truck = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M3 7.5h10.5V17H3z" />
    <path d="M13.5 10.5h4l3 3.2V17h-7" />
    <circle cx="7" cy="18.5" r="1.7" />
    <circle cx="17" cy="18.5" r="1.7" />
  </svg>
);

export const Leaf = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M5 19c0-7 4-12 14-13 .6 8-5 13-11 13H5Z" />
    <path d="M5 19c1.5-3.5 4-6 8-8" />
  </svg>
);

export const Shield = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3.5 19 6v6c0 4.2-3 7.4-7 8.5-4-1.1-7-4.3-7-8.5V6l7-2.5Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const Drop = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3.5c3 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10Z" />
    <path d="M9.5 14a2.6 2.6 0 0 0 2.5 2.6" />
  </svg>
);

export const Ruler = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="8" width="18" height="8" rx="1.5" />
    <path d="M7 8v3M11 8v4M15 8v3M19 8v4" />
  </svg>
);

export const Phone = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M6.5 3.8h3l1.5 4-2 1.4a12 12 0 0 0 5.8 5.8l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 6a2 2 0 0 1 2-2.2Z" />
  </svg>
);

export const Mail = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

export const Pin = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 21s6.5-6.2 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="10.2" r="2.4" />
  </svg>
);

export const Instagram = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4.5" />
    <circle cx="12" cy="12" r="3.6" />
    <circle cx="16.6" cy="7.4" r=".9" fill="currentColor" stroke="none" />
  </svg>
);

export const Facebook = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M14.5 8.5h2.2V5.6h-2.4c-2.2 0-3.6 1.4-3.6 3.7v1.5H8.5v3h2.2V21h3.2v-7.2h2.3l.4-3h-2.7V9.6c0-.7.3-1.1 1.6-1.1Z" />
  </svg>
);

export const Chevron = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="m8 10 4 4 4-4" />
  </svg>
);

export const Sparkle = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 4c.8 4.4 2.6 6.2 7 7-4.4.8-6.2 2.6-7 7-.8-4.4-2.6-6.2-7-7 4.4-.8 6.2-2.6 7-7Z" />
  </svg>
);
