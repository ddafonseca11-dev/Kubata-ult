import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Building2 } from 'lucide-react';
import { getPublishedProperties, getPropertyImages } from '@/services/propertyService';
import PropertyCard from '@/components/PropertyCard';
import Pagination from '@/components/Pagination';
import type { Property, PaginationParams } from '@/types';

const PAGE_SIZE = 12;

export default function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [count, setCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [transactionType, setTransactionType] = useState(searchParams.get('transaction_type') || '');
  const [propertyType, setPropertyType] = useState(searchParams.get('property_type') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [bedrooms, setBedrooms] = useState(searchParams.get('bedrooms') || '');

  const fetchProperties = useCallback(async (targetPage: number) => {
    setLoading(true);
    const params: PaginationParams = {
      page: targetPage,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      filters: {
        ...(transactionType && { transaction_type: transactionType }),
        ...(propertyType && { property_type: propertyType }),
        ...(minPrice && { min_price: minPrice }),
        ...(maxPrice && { max_price: maxPrice }),
        ...(bedrooms && { bedrooms }),
      },
      sortBy: 'created_at',
      sortOrder: 'desc',
    };

    const result = await getPublishedProperties(params);
    setProperties(result.data);
    setTotalPages(result.totalPages);
    setCount(result.count);
    setPage(targetPage);

    const imgs: Record<string, string> = {};
    await Promise.all(
      result.data.map(async (p) => {
        const images = await getPropertyImages(p.id);
        if (images.length > 0) imgs[p.id] = images[0].url;
      })
    );
    setImageMap(imgs);
    setLoading(false);
  }, [search, transactionType, propertyType, minPrice, maxPrice, bedrooms]);

  useEffect(() => {
    fetchProperties(1);
  }, [fetchProperties]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (transactionType) params.transaction_type = transactionType;
    if (propertyType) params.property_type = propertyType;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (bedrooms) params.bedrooms = bedrooms;
    setSearchParams(params);
    fetchProperties(1);
  };

  const handlePageChange = (newPage: number) => {
    fetchProperties(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Imóveis Disponíveis</h1>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cidade, região, título..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </button>
          <button type="submit" className="px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700">
            Pesquisar
          </button>
        </form>

        {showFilters && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Transação</label>
              <select value={transactionType} onChange={(e) => setTransactionType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm">
                <option value="">Todas</option>
                <option value="sale">Comprar</option>
                <option value="rent">Arrendar</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo</label>
              <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm">
                <option value="">Todos</option>
                <option value="apartment">Apartamento</option>
                <option value="house">Casa</option>
                <option value="villa">Vivenda</option>
                <option value="studio">Studio</option>
                <option value="duplex">Duplex</option>
                <option value="commercial">Comercial</option>
                <option value="office">Escritório</option>
                <option value="land">Terreno</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Preço mín.</label>
              <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Preço máx.</label>
              <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="∞" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Quartos mín.</label>
              <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm">
                <option value="">Qualquer</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 text-sm text-slate-500">
        {loading ? 'A carregar...' : `${count} imóveis encontrados`}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
              <div className="h-52 bg-slate-200" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-lg">Nenhum imóvel encontrado.</p>
          <p className="text-sm mt-1">Tenta ajustar os filtros de pesquisa.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} imageUrl={imageMap[property.id]} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} loading={loading} />
        </>
      )}
    </div>
  );
}
