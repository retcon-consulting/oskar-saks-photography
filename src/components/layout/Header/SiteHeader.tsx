// import { getContactContent } from "@/lib/siteContent";
import { getListedCategories } from "@/lib/gallery";
import Header from "./Header";

// The header is a client component, so the galleries it lists (and the editable Instagram handle, once enabled) are read here and passed down.
// Instagram is disabled until the client has an account.
export default async function SiteHeader() {
  // const { instagram } = await getContactContent();
  // return <Header instagram={instagram} />;
  const categories = await getListedCategories();
  return <Header categories={categories.map(({ slug, label }) => ({ slug, label }))} />;
}
