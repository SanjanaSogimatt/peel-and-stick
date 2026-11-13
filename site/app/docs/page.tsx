import type { Metadata } from "next";
import { DocsPage } from "../../components/site";

export const metadata: Metadata = { title: "Docs", description: "How to install and use peel-and-stick: props, the sticker maker, Figma sync and Next.js." };

export default function Page() {
  return <DocsPage />;
}
