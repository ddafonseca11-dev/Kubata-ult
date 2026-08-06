import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getFavorites } from '@/services/favoriteService';
import { getPropertyImages } from '@/services/propertyService';
import PropertyCard from '@/components/PropertyCard';
import type { Favorite } from '@/types';

export default function FavoritesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    getFavorites(user.id).then(async (favs) => {
      setFavorites(favs);
      const imgs: Record<string, string> = {};
      await Promise.all(
        favs.map(async (f) => {
          if (f.property) {
            const images = await getPropertyImages(f.property_id);
            if (images.length > 0) imgs[f.property_id] = images[0].url;
          }
        })
      );
      setImageMap(imgs);
      setLoading(false);
    });
  }, [user, navigate]);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8"><div className="animate-pulse h-40 bg-slate-200 rounded-xl" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Favoritos</h1>

      {favorites.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Heart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p>Ainda não tens imóveis favoritos.</p>
          <Link to="/properties" className="text-teal-600 hover:text-teal-700 mt-2 inline-block">Explorar imóveis</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.filter((f) => f.property).map((fav) => (
            <PropertyCard key={fav.id} property={fav.property!} imageUrl={imageMap[fav.property_id]} />
          ))}
        </div>
      )}
    </div>
  );
}
