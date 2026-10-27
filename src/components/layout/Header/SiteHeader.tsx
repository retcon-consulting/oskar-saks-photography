// import { getContactContent } from "@/lib/siteContent";
import Header from "./Header";

// The header is a client component, so the editable Instagram handle is read here and passed down.
// Instagram is disabled until the client has an account.
export default async function SiteHeader() {
  // const { instagram } = await getContactContent();
  // return <Header instagram={instagram} />;
  return <Header />;
}
