import { Sparkles, Check } from 'lucide-react';

interface WhyVisitSectionProps {
  placeName: string;
  categories: string[];
  rating: number | null;
  priceLevel: number | null;
  reviewCount: number | null;
  aiReason?: string;
}

// Generate contextual bullet points based on place data
const generateHighlights = (
  placeName: string,
  categories: string[],
  rating: number | null,
  priceLevel: number | null,
  reviewCount: number | null
): string[] => {
  const highlights: string[] = [];
  
  // Rating-based highlight
  if (rating && rating >= 4.5) {
    highlights.push(`Highly rated at ${rating.toFixed(1)} stars by locals`);
  } else if (rating && rating >= 4.0) {
    highlights.push(`Well-reviewed with ${rating.toFixed(1)} star rating`);
  } else if (rating) {
    highlights.push(`Rated ${rating.toFixed(1)} stars by visitors`);
  }
  
  // Category-based highlights
  const cats = categories.map(c => c.toLowerCase());
  
  if (cats.includes('restaurant') || cats.includes('food')) {
    highlights.push('Great food options for any craving');
  }
  if (cats.includes('cafe') || cats.includes('coffee')) {
    highlights.push('Perfect spot for coffee and relaxation');
  }
  if (cats.includes('meal_delivery') || cats.includes('meal_takeaway')) {
    highlights.push('Convenient takeaway and delivery available');
  }
  if (cats.includes('bar') || cats.includes('night_club')) {
    highlights.push('Vibrant nightlife atmosphere');
  }
  if (cats.includes('bakery') || cats.includes('dessert')) {
    highlights.push('Known for delicious treats and sweets');
  }
  
  // Price-based highlight
  if (priceLevel === 1) {
    highlights.push('Budget-friendly prices');
  } else if (priceLevel === 2) {
    highlights.push('Reasonably priced for quality offerings');
  } else if (priceLevel !== null && priceLevel >= 3) {
    highlights.push('Premium experience worth the splurge');
  }
  
  // Review count highlight
  if (reviewCount && reviewCount > 500) {
    highlights.push(`Popular spot with ${reviewCount.toLocaleString()}+ reviews`);
  } else if (reviewCount && reviewCount > 100) {
    highlights.push('Trusted by the local community');
  }
  
  // Fallback if no highlights generated
  if (highlights.length === 0) {
    highlights.push('A local favorite worth exploring');
    highlights.push('Unique atmosphere and experience');
  }
  
  return highlights.slice(0, 4); // Max 4 bullet points
};

// Format categories for display tags
const formatCategories = (categories: string[]): string[] => {
  const excludeList = ['point_of_interest', 'establishment', 'food'];
  return categories
    .filter(c => !excludeList.includes(c.toLowerCase()))
    .slice(0, 4)
    .map(c => c.replace(/_/g, ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '));
};

const WhyVisitSection = ({ placeName, categories, rating, priceLevel, reviewCount, aiReason }: WhyVisitSectionProps) => {
  const highlights = generateHighlights(placeName, categories, rating, priceLevel, reviewCount);
  const tags = formatCategories(categories);
  
  return (
    <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Why Visit</h3>
      </div>
      
      <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-4 space-y-4">
        {/* AI Reason - shown first if available */}
        {aiReason && (
          <p className="text-sm text-foreground leading-relaxed">
            ✨ {aiReason}
          </p>
        )}
        
        {/* Bullet Points */}
        <ul className="space-y-2.5">
          {highlights.map((highlight, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground leading-relaxed">
                {highlight}
              </span>
            </li>
          ))}
        </ul>
        
        {/* Category Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {tags.map((tag, i) => (
              <span 
                key={i}
                className="text-xs font-medium px-3 py-1.5 bg-primary/10 text-primary rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhyVisitSection;
