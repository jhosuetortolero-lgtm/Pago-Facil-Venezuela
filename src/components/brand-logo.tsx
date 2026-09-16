import Image from "next/image";

type BrandLogoProps = { className?: string; priority?: boolean };

export function BrandLogo({ className = "h-auto w-44", priority = false }: BrandLogoProps) {
  return <Image src="/logo-pagofacil.png" alt="PagoFácil — Ventas inteligentes en WhatsApp" width={512} height={355} priority={priority} className={`object-contain ${className}`} />;
}
