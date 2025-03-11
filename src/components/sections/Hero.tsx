
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-slide-down">
            Trade Pokémon Cards <br className="hidden sm:block" />
            <span className="text-primary">Safely and Securely</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-slide-down animation-delay-100">
            CollectX is a community-focused platform that helps collectors find, 
            trade, and manage their Pokémon card collections with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up animation-delay-200">
            <Button size="lg" asChild>
              <Link to="/collection">Start Trading</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/pokemons">Browse Cards</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
