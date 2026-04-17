/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChefHat, 
  RotateCw, 
  Check, 
  Plus, 
  X, 
  Utensils, 
  Flame, 
  Clock, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import confetti from "canvas-confetti";
import { GoogleGenAI } from "@google/genai";

// --- Types ---
interface Ingredient {
  id: string;
  name: string;
  category: "staple" | "protein" | "veg" | "grain" | "dairy" | "other";
  icon: string;
}

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  time: string;
  difficulty: "Easy" | "Medium" | "Hard";
  sourceUrl?: string;
}

// --- Constants ---
const INGREDIENTS: Ingredient[] = [
  { id: "egg", name: "Eggs", category: "protein", icon: "🥚" },
  { id: "flour", name: "Flour", category: "staple", icon: "🌾" },
  { id: "milk", name: "Milk", category: "dairy", icon: "🥛" },
  { id: "cheese", name: "Cheese", category: "dairy", icon: "🧀" },
  { id: "chicken", name: "Chicken", category: "protein", icon: "🍗" },
  { id: "beef", name: "Beef", category: "protein", icon: "🥩" },
  { id: "pasta", name: "Pasta", category: "grain", icon: "🍝" },
  { id: "rice", name: "Rice", category: "grain", icon: "🍚" },
  { id: "tomato", name: "Tomato", category: "veg", icon: "🍅" },
  { id: "onion", name: "Onion", category: "veg", icon: "🧅" },
  { id: "garlic", name: "Garlic", category: "veg", icon: "🧄" },
  { id: "potato", name: "Potato", category: "veg", icon: "🥔" },
  { id: "butter", name: "Butter", category: "dairy", icon: "🧈" },
  { id: "oil", name: "Oil", category: "staple", icon: "🫗" },
  { id: "sugar", name: "Sugar", category: "staple", icon: "🍬" },
  { id: "salt", name: "Salt", category: "staple", icon: "🧂" },
];

const DEFAULT_RECIPES: Recipe[] = [
  {
    id: "1",
    title: "Simple Omelette",
    ingredients: ["egg", "cheese", "butter", "salt"],
    instructions: ["Beat eggs with salt.", "Melt butter in a pan.", "Pour eggs and add cheese.", "Fold and serve."],
    time: "10 mins",
    difficulty: "Easy"
  },
  {
    id: "2",
    title: "Pasta Marinara",
    ingredients: ["pasta", "tomato", "garlic", "onion", "oil"],
    instructions: ["Boil pasta.", "Sauté onion and garlic in oil.", "Add crushed tomatoes and simmer.", "Toss with pasta."],
    time: "20 mins",
    difficulty: "Easy"
  },
  {
    id: "3",
    title: "Chicken Stir-fry",
    ingredients: ["chicken", "onion", "garlic", "oil", "rice"],
    instructions: ["Cook rice.", "Slice chicken and sauté with garlic and onion.", "Serve over rice."],
    time: "25 mins",
    difficulty: "Medium"
  },
  {
    id: "4",
    title: "Cheesy Baked Potato",
    ingredients: ["potato", "cheese", "butter", "onion"],
    instructions: ["Prick and bake potato at 400°F until soft.", "Slice open, add butter, cheese, and sautéed onions.", "Broil for 2 mins."],
    time: "50 mins",
    difficulty: "Easy"
  },
  {
    id: "5",
    title: "Garlic Butter Chicken",
    ingredients: ["chicken", "garlic", "butter", "salt"],
    instructions: ["Season chicken.", "Sear in a pan with butter.", "Add lots of garlic.", "Cook until golden."],
    time: "15 mins",
    difficulty: "Easy"
  }
];

// --- initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [ingredients, setIngredients] = useState<Ingredient[]>(INGREDIENTS);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [resultRecipe, setResultRecipe] = useState<Recipe | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [useOnlineSearch, setUseOnlineSearch] = useState(false);

  const toggleIngredient = (id: string) => {
    setSelectedIngredients(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleCategory = (category: Ingredient["category"]) => {
    const categoryIds = ingredients
      .filter(i => i.category === category)
      .map(i => i.id);
    
    const allSelected = categoryIds.every(id => selectedIngredients.includes(id));
    
    if (allSelected) {
      setSelectedIngredients(prev => prev.filter(id => !categoryIds.includes(id)));
    } else {
      setSelectedIngredients(prev => Array.from(new Set([...prev, ...categoryIds])));
    }
  };

  const addCustomIngredient = () => {
    if (!newIngredientName.trim()) return;
    const id = `custom-${Date.now()}`;
    const newIng: Ingredient = {
      id,
      name: newIngredientName.trim(),
      category: "other",
      icon: "✨"
    };
    setIngredients(prev => [...prev, newIng]);
    setSelectedIngredients(prev => [...prev, id]);
    setNewIngredientName("");
    setShowAddModal(false);
  };

  const handleSpin = async () => {
    if (selectedIngredients.length === 0) return;
    
    setIsSpinning(true);
    setResultRecipe(null);
    setShowResult(false);
    
    const newRotation = rotation + 1800 + Math.random() * 360;
    setRotation(newRotation);

    setTimeout(async () => {
      setIsSpinning(false);
      
      const matchingRecipes = DEFAULT_RECIPES.filter(recipe => 
        recipe.ingredients.some(ing => selectedIngredients.includes(ing))
      );

      if (matchingRecipes.length > 0 && !useOnlineSearch) {
        const winner = matchingRecipes[Math.floor(Math.random() * matchingRecipes.length)];
        setResultRecipe(winner);
        triggerWin();
      } else {
        setIsGenerating(true);
        try {
          const matchedNames = selectedIngredients.map(id => ingredients.find(i => i.id === id)?.name).join(", ");
          
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: useOnlineSearch 
              ? `Find a real, specific online recipe using these ingredients: ${matchedNames}. 
                 Search the web to find a real dish with a real URL.
                 Format the response as a JSON object with: 
                 title (string), 
                 ingredients (array of strings), 
                 instructions (array of strings), 
                 time (string like "20 mins"), 
                 difficulty (one of: Easy, Medium, Hard),
                 sourceUrl (string - a real URL to the recipe).`
              : `Suggest a single creative recipe using some or all of these ingredients: ${matchedNames}. 
                 Format the response as a JSON object with: 
                 title (string), 
                 ingredients (array of strings), 
                 instructions (array of strings), 
                 time (string like "20 mins"), 
                 difficulty (one of: Easy, Medium, Hard).`,
            config: { 
              responseMimeType: "application/json",
              tools: useOnlineSearch ? [{ googleSearch: {} }] : undefined
            },
          });
          
          const aiRecipe = JSON.parse(response.text || "{}");
          setResultRecipe({
            id: `ai-${Date.now()}`,
            ...aiRecipe
          });
          triggerWin();
        } catch (error) {
          console.error("AI Generation failed:", error);
        } finally {
          setIsGenerating(false);
        }
      }
      setShowResult(true);
    }, 3000);
  };

  const triggerWin = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#5E6D5B", "#8A8A8A", "#2D2D2D"]
    });
  };

  const groupedIngredients = ingredients.reduce((acc, ing) => {
    if (!acc[ing.category]) acc[ing.category] = [];
    acc[ing.category].push(ing);
    return acc;
  }, {} as Record<Ingredient["category"], Ingredient[]>);

  const categoryLabels: Record<Ingredient["category"], string> = {
    protein: "Proteins",
    veg: "Vegetables",
    staple: "Pantry Staples",
    grain: "Grains",
    dairy: "Dairy",
    other: "Custom / Other"
  };

  return (
    <div className="min-h-screen bg-bg-clean text-text-main font-sans flex flex-col">
      {/* Header */}
      <header className="px-10 py-10 flex justify-between items-center max-w-[1400px] mx-auto w-full">
        <div className="text-2xl font-semibold tracking-tighter text-accent-clean uppercase">PANTRY PICKER</div>
        <div className="text-xs text-text-muted uppercase tracking-widest font-medium">
          {selectedIngredients.length} Items Selected
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-[400px_1fr] gap-10 px-10 pb-10 max-w-[1400px] mx-auto w-full">
        
        {/* Pantry Section */}
        <section className="bg-surface-clean rounded-[24px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col h-fit max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-8 group">
            <h2 className="text-lg font-medium">Your Pantry</h2>
            <button 
              onClick={() => setShowAddModal(true)}
              className="p-2 hover:bg-accent-light-clean rounded-full text-accent-clean transition-colors"
              title="Add custom ingredient"
            >
              <Plus size={18} />
            </button>
          </div>
          
          <div className="space-y-8">
            {(Object.keys(groupedIngredients) as Ingredient["category"][]).map((cat) => (
              <div key={cat} className="space-y-4">
                <div className="flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-sm z-10 py-1">
                  <h3 className="text-[10px] uppercase font-bold tracking-[2px] text-text-muted">
                    {categoryLabels[cat]}
                  </h3>
                  <button 
                    onClick={() => toggleCategory(cat)}
                    className="text-[9px] uppercase font-bold tracking-widest text-accent-clean hover:underline"
                  >
                    {groupedIngredients[cat].every(i => selectedIngredients.includes(i.id)) ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {groupedIngredients[cat].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleIngredient(item.id)}
                      className={`
                        p-3 border rounded-xl text-[11px] transition-all duration-200 text-center flex items-center justify-center gap-2
                        ${selectedIngredients.includes(item.id) 
                          ? "bg-accent-light-clean border-accent-clean text-accent-clean font-medium shadow-sm" 
                          : "border-border-clean bg-transparent hover:border-gray-300"}
                      `}
                    >
                      <span className="opacity-70">{item.icon}</span>
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Spinner Section */}
        <section className="flex flex-col items-center justify-center relative py-12">
          {/* Wheel & Spinner implementation stays exactly the same as before */}
          <div className="relative w-[340px] h-[340px] md:w-[440px] md:h-[440px] flex items-center justify-center">
            <div className="absolute -top-2 left-1/2 -translateX-1/2 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-accent-clean z-10" />
            <div className="w-full h-full rounded-full border-8 border-surface-clean shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden bg-white">
              <motion.div 
                animate={{ rotate: rotation }}
                transition={{ duration: 3, ease: [0.32, 0.72, 0, 1] }}
                className="w-full h-full relative"
                style={{
                  background: `conic-gradient(from 0deg, #F2F2F2 0deg 60deg, #FFFFFF 60deg 120deg, #F2F2F2 120deg 180deg, #FFFFFF 180deg 240deg, #F2F2F2 240deg 300deg, #FFFFFF 300deg 360deg)`
                }}
              />
            </div>
            <button
              disabled={isSpinning || selectedIngredients.length === 0}
              onClick={handleSpin}
              className={`
                absolute w-[80px] h-[80px] md:w-[100px] md:h-[100px] rounded-full flex items-center justify-center font-semibold text-base border-6 border-surface-clean z-[5] transition-all
                ${selectedIngredients.length > 0 && !isSpinning
                  ? "bg-accent-clean text-white shadow-[0_10px_20px_rgba(94,109,91,0.3)] hover:scale-105 active:scale-95" 
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"}
              `}
            >
              {isSpinning ? <RotateCw className="animate-spin" size={24} /> : "SPIN"}
            </button>
          </div>

          {resultRecipe && !isSpinning && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 text-center max-w-[400px] px-6"
            >
              <div className="text-[11px] uppercase tracking-[2px] text-text-muted mb-2">
                {resultRecipe.sourceUrl ? "Found Online" : "Tonight's Pick"}
              </div>
              <h1 className="text-3xl font-medium mb-3">{resultRecipe.title}</h1>
              <div className="flex justify-center items-center gap-5 text-sm text-text-muted">
                <div className="flex items-center gap-1.5 uppercase tracking-wider">{resultRecipe.time}</div>
                <div className="w-1 h-1 bg-accent-clean rounded-full" />
                <div className="flex items-center gap-1.5 uppercase tracking-wider">{resultRecipe.difficulty}</div>
              </div>
              
              <div className="flex flex-col gap-3 mt-6">
                <button 
                  onClick={() => setShowResult(true)}
                  className="text-xs font-semibold uppercase tracking-widest text-accent-clean border-b border-accent-clean pb-0.5 hover:text-black hover:border-black transition-all self-center"
                >
                  View Recipe Method
                </button>
                {resultRecipe.sourceUrl && (
                  <a 
                    href={resultRecipe.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-text-muted hover:text-accent-clean flex items-center justify-center gap-1"
                  >
                    Original Recipe <ArrowRight size={10} />
                  </a>
                )}
              </div>
            </motion.div>
          )}

          <div className="mt-12 flex items-center gap-3 bg-surface-clean px-4 py-2 rounded-full border border-border-clean shadow-sm">
            <input 
              type="checkbox" 
              id="onlineSearch" 
              checked={useOnlineSearch}
              onChange={(e) => setUseOnlineSearch(e.target.checked)}
              className="w-4 h-4 accent-accent-clean"
            />
            <label htmlFor="onlineSearch" className="text-xs font-medium text-text-main cursor-pointer flex items-center gap-2">
              <RotateCw size={12} className={useOnlineSearch ? "text-accent-clean" : ""} />
              Deep Web Search for real recipes
            </label>
          </div>

          {selectedIngredients.length === 0 && (
            <p className="mt-8 text-sm text-text-muted italic">
              Select items in your pantry to begin
            </p>
          )}
        </section>
      </main>

      {/* Add Ingredient Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium">Add New Item</h3>
              <input 
                autoFocus
                type="text"
                placeholder="Ingredient name (e.g., Avocado)"
                value={newIngredientName}
                onChange={e => setNewIngredientName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustomIngredient()}
                className="w-full px-4 py-3 rounded-xl border border-border-clean focus:border-accent-clean focus:ring-1 focus:ring-accent-clean outline-none transition-all"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 text-sm font-medium text-text-muted hover:text-black"
                >
                  Cancel
                </button>
                <button 
                  onClick={addCustomIngredient}
                  className="flex-1 py-3 bg-accent-clean text-white rounded-xl text-sm font-bold uppercase tracking-wider"
                >
                  Add
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Recipe Result Modal stays exactly the same as before */}
        {showResult && resultRecipe && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/5 backdrop-blur-md"
            onClick={() => setShowResult(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-clean rounded-[32px] p-10 max-w-2xl w-full shadow-[0_30px_60px_rgba(0,0,0,0.1)] relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowResult(false)}
                className="absolute top-8 right-8 text-text-muted hover:text-black"
              >
                <X size={24} />
              </button>

              <div className="space-y-8 h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                <header className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-accent-clean">Chef's Suggestion</div>
                  <h2 className="text-4xl font-medium tracking-tight">{resultRecipe.title}</h2>
                </header>

                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <h3 className="text-xs uppercase font-bold tracking-[2px] text-text-muted">Ingredients</h3>
                    <ul className="space-y-3">
                      {resultRecipe.ingredients.map((ing, idx) => (
                        <li key={idx} className="text-sm flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full border border-accent-clean" />
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-xs uppercase font-bold tracking-[2px] text-text-muted">Instructions</h3>
                    <ol className="space-y-4">
                      {resultRecipe.instructions.map((step, idx) => (
                        <li key={idx} className="text-sm leading-relaxed flex gap-3 text-text-main">
                          <span className="font-bold text-accent-clean">{idx + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="pt-8 border-t border-border-clean flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-6">
                      <div className="text-xs font-medium uppercase tracking-wider text-text-muted">Time: {resultRecipe.time}</div>
                      <div className="text-xs font-medium uppercase tracking-wider text-text-muted">Level: {resultRecipe.difficulty}</div>
                    </div>
                    {resultRecipe.sourceUrl && (
                      <a 
                        href={resultRecipe.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-accent-clean hover:underline"
                      >
                        Visit Original Source
                      </a>
                    )}
                  </div>
                  <button 
                    onClick={() => setShowResult(false)}
                    className="px-8 py-3 bg-accent-clean text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-black transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-bg-clean/90 backdrop-blur-md"
          >
            <div className="text-center space-y-4">
              <div className="relative w-12 h-12 mx-auto">
                <RotateCw className="animate-spin text-accent-clean" size={48} />
              </div>
              <p className="text-lg font-medium tracking-tight">Creating a Custom Recipe...</p>
              <p className="text-xs text-text-muted uppercase tracking-widest">Powered by Gemini AI</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #EEEEEE;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CCCCCC;
        }
      `}</style>
    </div>
  );
}
