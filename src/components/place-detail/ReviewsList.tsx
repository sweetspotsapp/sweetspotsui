import { Star } from 'lucide-react';

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
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">Recent Reviews</h3>
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {reviews.map((review) => (
          <div key={review.id} className="bg-secondary/50 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-foreground">{review.name}</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < review.rating 
                        ? 'fill-primary text-primary' 
                        : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{review.text}</p>
            <span className="text-xs text-muted-foreground/60">{review.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsList;
