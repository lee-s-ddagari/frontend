interface BrandLogoProps {
  size?: 'compact' | 'large';
  className?: string;
}

const SIZE_CLASSES = {
  compact: 'h-16 w-16',
  large: 'h-24 w-24 sm:h-28 sm:w-28',
} as const;

export default function BrandLogo({
  size = 'compact',
  className = '',
}: BrandLogoProps) {
  return (
    <div
      className={`shrink-0 overflow-hidden ${SIZE_CLASSES[size]} ${className}`}
    >
      <img
        src="/pangicut-logo.png"
        alt="팡이컷 로고"
        className="h-full w-full scale-[1.18] object-contain mix-blend-multiply"
      />
    </div>
  );
}
