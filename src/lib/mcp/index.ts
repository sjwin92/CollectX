import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchPokemonCards from "./tools/search-pokemon-cards";
import listMyCollection from "./tools/list-my-collection";
import listMyTrades from "./tools/list-my-trades";
import listMarketplaceListings from "./tools/list-marketplace-listings";

// The OAuth issuer must be the direct Supabase host, built from the project ref
// (SUPABASE_URL may be the .lovable.cloud proxy in Lovable Cloud).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "collectx-mcp",
  title: "CollectX MCP",
  version: "0.1.0",
  instructions:
    "Tools for CollectX — the Pokémon card trading and collection platform. Search the card catalog, browse marketplace listings, and read the signed-in user's collection and trades.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchPokemonCards, listMyCollection, listMyTrades, listMarketplaceListings],
});
