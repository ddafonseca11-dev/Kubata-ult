import { Link } from 'react-router-dom';
import { Heart, MapPin, BedDouble, Bath, Maximize, Eye } from 'lucide-react';
import type { Property } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { isFavorite, toggleFavorite } from '@/services/favoriteService';
import { useEffect, useState } from 'react';
import { trackEvent, AnalyticsEvents } from '@/services/analyticsService';

const PURPOSE_LABELS: Record<string, string> = { sale: 'Comprar', rent: 'Arrendar' };
const TYPE_LABELS: Record<string, string> = { house: 'Vivenda', apartment: 'Apartamento', land: 'Terreno', office: 'Escritório', shop: 'Loja', warehouse: 'Armazém', commercial: 'Comercial', villa: 'Vivenda', studio: 'Estúdio', duplex: 'Duplex', other: 'Outro' };
function formatPrice(value: number | null, currency = 'AOA') {
  if (value == null) return 'Sob consulta';
  return `${new Intl.NumberFormat('pt-AO', { maximumFractionDigits: 0 }).format(value)} ${currency === 'AOA' ? 'Kz' : currency}`;
}

export default function PropertyCard({ property, imageUrl, priority = false }: { property: Property; imageUrl?: string; priority?: boolean }) {
  const { user } = useAuth();
  const [fav, setFav] = useState(false);
  useEffect(() => { if (user) isFavorite(property.id, user.id).then(setFav).catch(() => {}); }, [user, property.id]);
  const handleFav = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) return;
    const next = await toggleFavorite(property.id, user.id);
    setFav(next.isFavorite);
    if (next) trackEvent(AnalyticsEvents.PROPERTY_FAVORITE, { propertyId: property.id });
  };
  const image = imageUrl || 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1200';
  const sold = property.status === 'sold' || property.status === 'rented';
  return (
    <Link to={`/properties/${property.id}`} className="group block overflow-hidden rounded-sm border border-border/60 bg-card transition-all duration-300 hover:border-gold/40 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img src={image} alt={property.title} loading={priority ? 'eager' : 'lazy'} className="property-card-image h-full w-full object-cover group-hover:scale-105" />
        <div className="absolute left-3 top-3 rounded-sm bg-background/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">{sold ? (property.status === 'sold' ? 'Vendido' : 'Arrendado') : PURPOSE_LABELS[property.transaction_type]}</div>
        {property.is_featured && !sold && <div className="absolute right-3 top-3 rounded-sm bg-gold px-3 py-1 text-xs font-medium text-white">Destaque</div>}
        <button onClick={handleFav} className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm" aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
          <Heart className={`h-4 w-4 ${fav ? 'fill-gold text-gold' : 'text-foreground/60'}`} />
        </button>
      </div>
      <div className="p-4 lg:p-5">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /><span className="truncate">{property.city || property.region || property.country || 'Angola'}</span></div>
        <h3 className="mb-1 line-clamp-1 font-serif text-base font-medium text-foreground group-hover:text-gold">{property.title}</h3>
        <p className="mb-3 text-xs text-muted-foreground">{TYPE_LABELS[property.property_type] || property.property_type}</p>
        <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
          {property.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{property.bedrooms} Quartos</span>}
          {property.bathrooms != null && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{property.bathrooms} WCs</span>}
          {property.area != null && <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{property.area} m²</span>}
        </div>
        <div className="flex items-center justify-between border-t border-border/50 pt-3">
          <p className="font-serif text-lg font-semibold text-foreground">{formatPrice(property.price, property.currency)}</p>
          {property.views_count > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="h-3 w-3" />{property.views_count}</span>}
        </div>
      </div>
    </Link>
  );
}
