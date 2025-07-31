import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CollectionManager from "@/components/profile/CollectionManager";
const Collection = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Collection</h1>
            <p className="text-muted-foreground">Manage and organize your Pokémon card collection</p>
          </div>
          
          <CollectionManager />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};
export default Collection;
