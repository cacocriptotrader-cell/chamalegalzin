type DocFinLogoProps = {
  className?: string;
  markLabel?: string;
};

export function DocFinLogo({ className = "h-8 w-auto", markLabel = "DocFin" }: DocFinLogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 190 56"
      fill="none"
      role="img"
      aria-label={markLabel}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="2"
        y="34"
        fill="#F9FAFB"
        fontFamily="Inter, Satoshi, system-ui, sans-serif"
        fontSize="34"
        fontWeight="800"
        letterSpacing="-1.7"
      >
        Doc
      </text>
      <text
        x="72"
        y="34"
        fill="#0F766E"
        fontFamily="Inter, Satoshi, system-ui, sans-serif"
        fontSize="34"
        fontWeight="800"
        letterSpacing="-1.7"
      >
        Fin
      </text>
      <path
        d="M126 31H151C164 31 172 23.5 174 13"
        stroke="#0F766E"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
