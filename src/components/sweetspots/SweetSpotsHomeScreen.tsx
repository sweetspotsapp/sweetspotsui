import React, { useState } from 'react';
import { Menu, Search, DollarSign, Car, TreePine, Star, Home, Bookmark, User } from 'lucide-react';

// Mock data
const mockPlaces = [
  { id: '1', title: 'Melbourne Skyline Beach', imageUrl: 'https://images.unsplash.com/photo-1514395462725-fb4566210144?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
  { id: '2', title: 'City Bridge View', imageUrl: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
  { id: '3', title: 'Quirky House', imageUrl: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
  { id: '4', title: 'Harbor Walk', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
  { id: '5', title: 'Ocean Cliffs', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
  { id: '6', title: 'Mountain View', imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
];

const cbdPlaces = [
  { id: '7', title: 'Flinders Station', imageUrl: 'https://images.unsplash.com/photo-1514395462725-fb4566210144?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
  { id: '8', title: 'City Circle Tram', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
  { id: '9', title: 'Historic Building', imageUrl: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
  { id: '10', title: 'Street Art Lane', imageUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
  { id: '11', title: 'Rooftop Bar', imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
  { id: '12', title: 'Coffee Lane', imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
];

const friendGroupPlaces = [
  { id: '13', title: 'Warehouse District', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
  { id: '14', title: 'University Gardens', imageUrl: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
  { id: '15', title: 'Outdoor Steps', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
  { id: '16', title: 'Park Pavilion', imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
  { id: '17', title: 'Beach Bonfire', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
  { id: '18', title: 'Sunset Lookout', imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=500&fit=crop', rating: 5, priceLabel: '$ free - 50' },
];

interface ChipProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const Chip: React.FC<ChipProps> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-4 py-2 rounded-full border whitespace-nowrap transition-all
      ${isActive 
        ? 'bg-primary/10 border-primary text-primary' 
        : 'bg-card border-border text-muted-foreground hover:border-primary/50'
      }
      shadow-sm`}
  >
    <span className="text-primary">{icon}</span>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

interface PlaceCardProps {
  place: {
    id: string;
    title: string;
    imageUrl: string;
    rating: number;
    priceLabel: string;
  };
}

const PlaceCard: React.FC<PlaceCardProps> = ({ place }) => {
  const [imageError, setImageError] = useState(false);
  
  return (
    <div className="flex-shrink-0 w-[140px] relative">
      <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-muted">
        <img
          src={imageError ? '/placeholder.svg' : place.imageUrl}
          alt={place.title}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
        {/* Rating badge - bottom left */}
        <div className="absolute bottom-12 left-2">
          <div className="flex items-center gap-1 bg-card/95 backdrop-blur-sm px-2 py-1 rounded-full shadow-soft">
            <Star className="w-3 h-3 text-primary fill-primary" />
            <span className="text-xs font-medium text-foreground">{place.rating}</span>
          </div>
        </div>
      </div>
      {/* Price badge - below image */}
      <div className="mt-2 flex justify-start">
        <div className="flex items-center gap-1 bg-card border border-border px-2 py-1 rounded-full shadow-sm">
          <DollarSign className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">free - 50</span>
        </div>
      </div>
    </div>
  );
};

interface SectionRowProps {
  title: string;
  places: PlaceCardProps['place'][];
}

const SectionRow: React.FC<SectionRowProps> = ({ title, places }) => (
  <div className="mb-6">
    <h2 className="text-lg font-semibold text-foreground mb-3 px-4">{title}</h2>
    <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {places.map((place) => (
        <PlaceCard key={place.id} place={place} />
      ))}
    </div>
  </div>
);

type TabType = 'home' | 'saved' | 'profile';

interface BottomTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const BottomTabs: React.FC<BottomTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'saved' as TabType, label: 'Saved', icon: Bookmark },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="max-w-[420px] mx-auto flex justify-around items-center py-3 px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all
                ${isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Icon className="w-5 h-5" />
              {isActive && <span className="text-sm font-medium">{tab.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const SweetSpotsHomeScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeChip, setActiveChip] = useState<string | null>(null);

  const chips = [
    { id: 'budget', label: 'Under $50', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'cbd', label: 'Near The CBD', icon: <Car className="w-4 h-4" /> },
    { id: 'nature', label: 'Nature & Outdoor', icon: <TreePine className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background max-w-[420px] mx-auto relative pb-24">
      {/* Top App Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-primary">SweetSpots</h1>
          <button className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
            <Search className="w-6 h-6" />
          </button>
        </div>

        {/* Chip Row */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {chips.map((chip) => (
            <Chip
              key={chip.id}
              icon={chip.icon}
              label={chip.label}
              isActive={activeChip === chip.id}
              onClick={() => setActiveChip(activeChip === chip.id ? null : chip.id)}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-2">
        <SectionRow title="Hidden gems under $50" places={mockPlaces} />
        <SectionRow title="Chill spots near the CBD" places={cbdPlaces} />
        <SectionRow title="Great for friend groups" places={friendGroupPlaces} />
      </main>

      {/* Bottom Tabs */}
      <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default SweetSpotsHomeScreen;
