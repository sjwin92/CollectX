
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import Features from "@/components/sections/Features";
import FeaturedCards from "@/components/sections/FeaturedCards";
import RecentTrades from "@/components/sections/RecentTrades";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Hero />
      <Features />
      <FeaturedCards />
      <RecentTrades />
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Trading?</h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of Pokémon card collectors already trading safely on our platform.
              It only takes a minute to set up your collection and start making trades.
            </p>
            <Button size="lg" asChild>
              <Link to="/collection">Get Started Now</Link>
            </Button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Index;
