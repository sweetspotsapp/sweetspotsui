export interface Place {
  id: string;
  name: string;
  image: string;
  vibeTag: string;
  practicalHint: string;
  category: string;
}

export const primaryPlaces: Place[] = [
  {
    id: "1",
    name: "The Velvet Corner",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop",
    vibeTag: "Chill",
    practicalHint: "Great for conversation",
    category: "café",
  },
  {
    id: "2",
    name: "Bloom Garden Café",
    image: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400&h=300&fit=crop",
    vibeTag: "Aesthetic",
    practicalHint: "Under $15",
    category: "café",
  },
  {
    id: "3",
    name: "Midnight Ramen",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop",
    vibeTag: "Cozy",
    practicalHint: "Quick & casual",
    category: "restaurant",
  },
  {
    id: "4",
    name: "The Quiet Library Bar",
    image: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&h=300&fit=crop",
    vibeTag: "Intimate",
    practicalHint: "Good for dates",
    category: "bar",
  },
];

export const explorationPlaces: Place[] = [
  {
    id: "5",
    name: "Sunrise Bakery",
    image: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=400&h=300&fit=crop",
    vibeTag: "Friendly",
    practicalHint: "Opens early",
    category: "bakery",
  },
  {
    id: "6",
    name: "The Green Room",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop",
    vibeTag: "Trendy",
    practicalHint: "Great coffee",
    category: "café",
  },
  {
    id: "7",
    name: "Starlight Terrace",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
    vibeTag: "Social",
    practicalHint: "Good for groups",
    category: "restaurant",
  },
];

export const extractVibes = (input: string): string[] => {
  const vibeKeywords: Record<string, string[]> = {
    "Chill": ["chill", "relaxed", "calm", "quiet", "peaceful"],
    "Not too crowded": ["not crowded", "empty", "quiet", "private", "intimate"],
    "Budget-friendly": ["cheap", "budget", "affordable", "inexpensive", "under"],
    "Good for conversation": ["talking", "conversation", "chat", "catch up", "friends"],
    "Cozy": ["cozy", "warm", "comfortable", "snug"],
    "Aesthetic": ["aesthetic", "pretty", "beautiful", "instagrammable", "nice looking"],
    "Fun": ["fun", "exciting", "lively", "entertainment"],
    "Social": ["social", "meet people", "group", "friends"],
  };

  const lowercaseInput = input.toLowerCase();
  const matchedVibes: string[] = [];

  for (const [vibe, keywords] of Object.entries(vibeKeywords)) {
    if (keywords.some(keyword => lowercaseInput.includes(keyword))) {
      matchedVibes.push(vibe);
    }
  }

  // Default vibes if nothing specific matched
  if (matchedVibes.length === 0) {
    return ["Open to anything", "Near you", "Worth exploring"];
  }

  return matchedVibes.slice(0, 4);
};
