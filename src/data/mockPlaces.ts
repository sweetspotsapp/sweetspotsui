export interface Place {
  id: string;
  name: string;
  image: string;
  images: string[]; // Multiple images for gallery
  vibeTag: string;
  practicalHint: string;
  category: string;
  whatToPrepare?: string[];
}

export const primaryPlaces: Place[] = [
  {
    id: "1",
    name: "The Velvet Corner",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800&h=600&fit=crop",
    ],
    vibeTag: "Chill",
    practicalHint: "Great for conversation",
    category: "café",
    whatToPrepare: [
      "Bring a book if you're going solo",
      "Cash preferred, card accepted",
      "Best seats are by the window",
      "Try their signature lavender latte"
    ],
  },
  {
    id: "2",
    name: "Bloom Garden Café",
    image: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop",
    ],
    vibeTag: "Aesthetic",
    practicalHint: "Under $15",
    category: "café",
    whatToPrepare: [
      "Great for photos - bring your camera",
      "Reservations recommended on weekends",
      "Outdoor seating available"
    ],
  },
  {
    id: "3",
    name: "Midnight Ramen",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800&h=600&fit=crop",
    ],
    vibeTag: "Cozy",
    practicalHint: "Quick & casual",
    category: "restaurant",
    whatToPrepare: [
      "Come hungry - portions are big",
      "Counter seating only",
      "Try the spicy miso if you like heat",
      "Opens late, perfect for night owls"
    ],
  },
  {
    id: "4",
    name: "The Quiet Library Bar",
    image: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=600&fit=crop",
    ],
    vibeTag: "Intimate",
    practicalHint: "Good for dates",
    category: "bar",
    whatToPrepare: [
      "Smart casual dress code",
      "Make a reservation for weekends",
      "Ask for the secret menu"
    ],
  },
];

export const explorationPlaces: Place[] = [
  {
    id: "5",
    name: "Sunrise Bakery",
    image: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&h=600&fit=crop",
    ],
    vibeTag: "Friendly",
    practicalHint: "Opens early",
    category: "bakery",
    whatToPrepare: [
      "Get there early for fresh croissants",
      "They sell out of pastries by noon",
      "Great coffee to-go"
    ],
  },
  {
    id: "6",
    name: "The Green Room",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&h=600&fit=crop",
    ],
    vibeTag: "Trendy",
    practicalHint: "Great coffee",
    category: "café",
    whatToPrepare: [
      "Laptop-friendly with good WiFi",
      "Try their pour-over coffee",
      "Gets busy after 10am"
    ],
  },
  {
    id: "7",
    name: "Starlight Terrace",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&h=600&fit=crop",
    ],
    vibeTag: "Social",
    practicalHint: "Good for groups",
    category: "restaurant",
    whatToPrepare: [
      "Book ahead for groups of 4+",
      "Rooftop seating has the best view",
      "Happy hour 5-7pm",
      "Share plates recommended"
    ],
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
