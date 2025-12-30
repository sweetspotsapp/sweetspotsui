import { useState } from 'react';
import { Star, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';

interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  date: string;
}

interface ReviewsListProps {
  reviews: Review[];
}

const ReviewsList = ({ reviews }: ReviewsListProps) => {
  const [expanded, setExpanded] = useState(false);
  const displayedReviews = expanded ? reviews : reviews.slice(0, 2);

  return (
    <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Reviews</h3>
        </div>
        <span className="text-xs text-muted-foreground">{reviews.length} reviews</span>
      </div>
      
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
        {displayedReviews.map((review, index) => (
          <div 
            key={review.id} 
            className="bg-secondary/50 rounded-2xl p-4 space-y-2 transition-all duration-300"
            style={{ animationDelay: `${0.2 + index * 0.05}s` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">
                    {review.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{review.name}</p>
                  <p className="text-xs text-muted-foreground">{review.date}</p>
                </div>
              </div>
              
              {/* Star Rating */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3.5 h-3.5 ${
                      i < review.rating 
                        ? 'text-primary fill-primary' 
                        : 'text-muted-foreground/30'
                    }`} 
                  />
                ))}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
              {review.text}
            </p>
          </div>
        ))}
      </div>

      {/* Show More/Less */}
      {reviews.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? (
            <>
              Show Less <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              See All {reviews.length} Reviews <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ReviewsList;
