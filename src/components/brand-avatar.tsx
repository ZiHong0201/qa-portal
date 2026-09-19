/**
 * Mr Tan's portrait, used as the mark on the signed-out pages and as the app
 * icon. The cat stays as the mascot inside the app - this is the face students
 * should recognise before they log in.
 *
 * Sized with width/height attributes as well as classes so it reserves the
 * right space before the image loads, which stops the page shifting under the
 * form as it arrives.
 */
export function BrandAvatar({
  size = 112,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/icon-512.png"
      alt="Mr Tan"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`rounded-full bg-white object-cover shadow-lg ring-4 ring-white/70 ${className}`}
    />
  );
}
