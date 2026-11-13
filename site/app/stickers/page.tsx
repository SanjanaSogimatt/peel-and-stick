import type { Metadata } from "next";
import { StickersPage } from "../../components/site";

export const metadata: Metadata = { title: "Stickers", description: "Every sticker that ships with peel-and-stick. Peel one, then copy its import." };

export default function Page() {
  return <StickersPage />;
}
