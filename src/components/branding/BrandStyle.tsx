import { contrastingForeground } from "@/lib/utils/color";

interface BrandStyleProps {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

/** Injects the company's brand colors as CSS variable overrides, driving every themed component. */
export function BrandStyle({ primaryColor, secondaryColor, accentColor }: BrandStyleProps) {
  const css = `:root {
    --primary: ${primaryColor};
    --primary-foreground: ${contrastingForeground(primaryColor)};
    --secondary: ${secondaryColor};
    --secondary-foreground: ${contrastingForeground(secondaryColor)};
    --accent: ${accentColor};
    --accent-foreground: ${contrastingForeground(accentColor)};
    --ring: ${primaryColor};
  }`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
