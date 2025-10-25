import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Apple, Flame, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function FoodLookup() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      alert("Please enter a food item or meal");
      return;
    }

    setSearching(true);

    try {
      const prompt = `Provide detailed nutritional information for the following Indian food/meal: "${query}"

Use ICMR (Indian Council of Medical Research) data and standard Indian portion sizes.

Provide:
- Standard portion size used (in household units like katori, roti, cup, plate, etc.)
- Calories
- Protein (grams)
- Carbohydrates (grams)
- Fats (grams)
- Fiber (grams)
- Brief nutritional description
- Health benefits
- Tips for improvement (e.g., how to make it healthier)
- Alternative options or swaps

If the query includes multiple items (like "2 rotis + dal + sabzi"), calculate the combined nutritional values.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            food_name: { type: "string" },
            portion_size: { type: "string" },
            calories: { type: "number" },
            protein: { type: "number" },
            carbs: { type: "number" },
            fats: { type: "number" },
            fiber: { type: "number" },
            description: { type: "string" },
            health_benefits: { type: "array", items: { type: "string" } },
            tips: { type: "array", items: { type: "string" } },
            alternatives: { type: "array", items: { type: "string" } }
          }
        }
      });

      setResult(response);
    } catch (error) {
      alert("Error looking up food information. Please try again.");
      console.error(error);
    }

    setSearching(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Food Lookup</h1>
            <p className="text-gray-600">Get detailed macro information for Indian foods</p>
          </div>
          <Apple className="w-10 h-10 text-orange-500" />
        </div>

        {/* Search Box */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-orange-500" />
              Search Food Items
            </CardTitle>
            <CardDescription>
              Enter any Indian food item or combination (e.g., "1 plate poha" or "2 rotis + dal + sabzi")
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="E.g., 1 plate biryani, 2 idlis with sambar, masala dosa..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="text-lg"
              />
              <Button
                onClick={handleSearch}
                disabled={searching}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-8"
              >
                {searching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <p className="text-sm text-gray-600 w-full mb-2">Try these examples:</p>
              {[
                "1 katori dal",
                "2 chapatis",
                "1 plate poha",
                "Masala dosa with chutney",
                "1 bowl curd rice"
              ].map((example) => (
                <Badge
                  key={example}
                  variant="outline"
                  className="cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-colors"
                  onClick={() => setQuery(example)}
                >
                  {example}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
              <CardHeader>
                <CardTitle className="text-3xl mb-2">{result.food_name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-500 text-white text-lg px-4 py-1">
                    {result.portion_size}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{result.description}</p>
              </CardContent>
            </Card>

            {/* Macro Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                <CardContent className="p-6 text-center">
                  <Flame className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                  <p className="text-sm text-gray-600 mb-1">Calories</p>
                  <p className="text-3xl font-bold text-orange-600">{result.calories}</p>
                  <p className="text-xs text-gray-500">kcal</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto text-red-500 mb-2" />
                  <p className="text-sm text-gray-600 mb-1">Protein</p>
                  <p className="text-3xl font-bold text-red-600">{result.protein}</p>
                  <p className="text-xs text-gray-500">grams</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                <CardContent className="p-6 text-center">
                  <Apple className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                  <p className="text-sm text-gray-600 mb-1">Carbs</p>
                  <p className="text-3xl font-bold text-yellow-600">{result.carbs}</p>
                  <p className="text-xs text-gray-500">grams</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                <CardContent className="p-6 text-center">
                  <div className="w-8 h-8 mx-auto bg-purple-500 rounded-full mb-2"></div>
                  <p className="text-sm text-gray-600 mb-1">Fats</p>
                  <p className="text-3xl font-bold text-purple-600">{result.fats}</p>
                  <p className="text-xs text-gray-500">grams</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                <CardContent className="p-6 text-center">
                  <div className="w-8 h-8 mx-auto bg-green-500 rounded-full mb-2"></div>
                  <p className="text-sm text-gray-600 mb-1">Fiber</p>
                  <p className="text-3xl font-bold text-green-600">{result.fiber}</p>
                  <p className="text-xs text-gray-500">grams</p>
                </CardContent>
              </Card>
            </div>

            {/* Health Benefits */}
            {result.health_benefits && result.health_benefits.length > 0 && (
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-xl text-green-700">Health Benefits</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.health_benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm mt-0.5">
                          ✓
                        </span>
                        <p className="text-gray-700 leading-relaxed">{benefit}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tips for Improvement */}
            {result.tips && result.tips.length > 0 && (
              <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
                <CardHeader>
                  <CardTitle className="text-xl text-blue-700">Tips for Improvement</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm mt-0.5">
                          💡
                        </span>
                        <p className="text-gray-700 leading-relaxed">{tip}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Alternative Options */}
            {result.alternatives && result.alternatives.length > 0 && (
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-xl text-purple-700">Alternative Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.alternatives.map((alt, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition-colors px-4 py-2 text-sm"
                        onClick={() => setQuery(alt)}
                      >
                        {alt}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Info Alert */}
        <Alert className="border-orange-200 bg-orange-50">
          <Apple className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-gray-700">
            All nutritional information is based on ICMR data and standard Indian portion sizes. 
            Values may vary based on preparation methods and ingredients used.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}