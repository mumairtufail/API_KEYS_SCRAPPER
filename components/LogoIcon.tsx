"use client";

export function LogoIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer shield structure */}
      <path
        d="M50 12 L82 26 V56 C82 72 68 85 50 90 C32 85 18 72 18 56 V26 L50 12 Z"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner circular key core */}
      <circle
        cx="50"
        cy="42"
        r="11"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Key shaft and bits */}
      <path
        d="M50 53 V76"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M48 64 H58"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M48 71 H60"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
