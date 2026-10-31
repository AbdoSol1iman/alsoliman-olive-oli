import { Aref_Ruqaa, IBM_Plex_Sans_Arabic, Inter } from "next/font/google";

/**
 * The site's type stack, shared by every root layout (storefront + admin) so
 * both render with identical font variables from a single download/optimisation
 * pass.
 */

export const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const ruqaa = Aref_Ruqaa({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-ruqaa",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const fontVariables = `${arabic.variable} ${ruqaa.variable} ${inter.variable}`;
