import React from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CollectionManager from "@/components/profile/CollectionManager";
import CollectionBoxesPanel from "@/components/profile/CollectionBoxesPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Box } from "lucide-react";

const Collection = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "boxes" ? "boxes" : "cards";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Collection</h1>
            <p className="text-muted-foreground">Manage and organize your Pokémon card collection</p>
          </div>

          <Tabs
            value={tab}
            onValueChange={(v) => setSearchParams(v === "boxes" ? { tab: "boxes" } : {}, { replace: true })}
          >
            <TabsList className="mb-6">
              <TabsTrigger value="cards" className="gap-1.5">
                <Layers className="h-4 w-4" /> Cards
              </TabsTrigger>
              <TabsTrigger value="boxes" className="gap-1.5">
                <Box className="h-4 w-4" /> Boxes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cards">
              <CollectionManager />
            </TabsContent>
            <TabsContent value="boxes">
              <CollectionBoxesPanel />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Collection;
