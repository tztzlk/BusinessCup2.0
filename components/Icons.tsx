import type { ReactNode, SVGProps } from "react";

// Small stroke icon set (24×24, currentColor), drawn for PayTrail. Decorative unless a title is given.

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Icon({ title, children, className = "h-5 w-5", ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

export const IconDemo = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Icon>
);

export const IconReport = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 16v-3M12 16V9M16 16v-5" />
  </Icon>
);

export const IconScan = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
    <path d="M8 9h8M8 12h8M8 15h5" />
  </Icon>
);

export const IconHousehold = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 9.5V20h13V9.5" />
    <circle cx="12" cy="13" r="1.8" />
    <path d="M9.5 18.5c.4-1.6 1.3-2.4 2.5-2.4s2.1.8 2.5 2.4" />
  </Icon>
);

export const IconBriefcase = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18" />
  </Icon>
);

export const IconUpload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
    <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
  </Icon>
);

export const IconCheckCircle = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.3 2.6 2.6L16.2 9.3" />
  </Icon>
);

export const IconLock = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" />
  </Icon>
);

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

export const IconMapPin = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </Icon>
);

export const IconUsers = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19c.6-3 2.7-4.8 5.5-4.8s4.9 1.8 5.5 4.8" />
    <circle cx="17" cy="9.5" r="2.2" />
    <path d="M16 14.4c2.3.1 3.9 1.6 4.5 4.1" />
  </Icon>
);

export const IconRings = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="14" r="5" />
    <circle cx="15" cy="14" r="5" />
    <path d="m10 5 2-2 2 2" />
  </Icon>
);

export const IconPerson = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c.8-3.6 3.5-5.6 7-5.6s6.2 2 7 5.6" />
  </Icon>
);

export const IconHomeKey = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 11 12 4l9 7" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M10 20v-5h4v5" />
  </Icon>
);

export const IconBank = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 9.5 12 4l9 5.5H3Z" />
    <path d="M5.5 10v7M10 10v7M14 10v7M18.5 10v7M3.5 20h17" />
  </Icon>
);

export const IconTrend = (p: IconProps) => (
  <Icon {...p}>
    <path d="m3.5 16.5 5.5-5.5 4 4 7.5-7.5" />
    <path d="M15 7.5h5.5V13" />
  </Icon>
);

export const IconHeartPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />
    <path d="M12 10.5v5M9.5 13h5" />
  </Icon>
);

export const IconDollar = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M14.8 9.2c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.7.8-2.7 2s1.1 1.7 2.7 2.1 2.9 1 2.9 2.3-1.3 2-2.9 2c-1.4 0-2.4-.5-2.9-1.5M12 6.3v1.5M12 16.2v1.5" />
  </Icon>
);

export const IconPiggy = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 10.5c.9.3 1.5.9 1.8 1.8h1.2v3h-1.6a6 6 0 0 1-2 2V20h-2.5v-1.8a8 8 0 0 1-3.8 0V20H8.6v-2.6A5.7 5.7 0 0 1 5.5 12.5C5.5 9.1 8.6 6.6 12.5 6.6c1.3 0 2.5.3 3.5.8L18.5 6l-.5 4.5Z" />
    <circle cx="15.5" cy="11" r=".6" fill="currentColor" />
  </Icon>
);

export const IconFileText = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8L14 3Z" />
    <path d="M14 3v5h5M8.5 12.5h7M8.5 16h5" />
  </Icon>
);

export const IconInfo = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.8v.2" />
  </Icon>
);

export const IconArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);

export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const IconSparkle = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 13.8 9 19.5 11l-5.7 2-1.8 5.5-1.8-5.5L4.5 11l5.7-2L12 3.5Z" />
  </Icon>
);

export const IconMinus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 12h12" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 6v12M6 12h12" />
  </Icon>
);
