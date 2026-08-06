import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Trash2, Star, Building2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getPropertyById, getPropertyImages } from '@/services/propertyService';
import { uploadPropertyImage, saveImageRecord, deleteImage, setPrimaryImage } from '@/services/imageService';
import type { Property, PropertyImage } from '@/types';

export default function ImageManagerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const loadImages = useCallback(async () => {
    const imgs = await getPropertyImages(id!);
    setImages(imgs);
  }, [id]);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    getPropertyById(id!).then((prop) => {
      setProperty(prop);
      setLoading(false);
    });
    loadImages();
  }, [id, user, navigate, loadImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user || !property) return;

    setUploading(true);
    setError('');

    try {
      for (const file of Array.from(files)) {
        const result = await uploadPropertyImage(file, user.id, property.id);
        if (!result) continue;
        const isPrimary = images.length === 0;
        await saveImageRecord(property.id, result.url, result.storagePath, images.length, isPrimary);
      }
      await loadImages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (image: PropertyImage) => {
    if (!confirm('Eliminar esta imagem?')) return;
    try {
      await deleteImage(image);
      await loadImages();
    } catch {
      alert('Erro ao eliminar imagem.');
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await setPrimaryImage(id!, imageId);
      await loadImages();
    } catch {
      alert('Erro ao definir imagem principal.');
    }
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-8"><div className="animate-pulse h-40 bg-slate-200 rounded-xl" /></div>;
  }

  if (!property) {
    return <div className="max-w-3xl mx-auto px-4 py-8 text-center text-slate-500">Imóvel não encontrado.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-600 hover:text-slate-900 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-2">Gerir Imagens</h1>
      <p className="text-slate-500 mb-6">{property.title}</p>

      {/* Upload zone */}
      <div className="mb-6">
        <label className="block">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-teal-400 hover:bg-teal-50/50 transition-colors cursor-pointer">
            {uploading ? (
              <div className="text-teal-600 font-medium">A carregar...</div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <div className="text-slate-600 font-medium">Clique para selecionar imagens</div>
                <div className="text-sm text-slate-400 mt-1">JPG, PNG, WEBP — máx 10MB cada</div>
              </>
            )}
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleUpload} className="hidden" />
        </label>
        {error && <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
      </div>

      {/* Images grid */}
      {images.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p>Ainda não há imagens.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              {img.is_primary && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium bg-teal-600 text-white">Principal</div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!img.is_primary && (
                  <button onClick={() => handleSetPrimary(img.id)} className="p-2 bg-white/90 rounded-lg text-teal-700 hover:bg-white" title="Definir como principal">
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => handleDelete(img)} className="p-2 bg-white/90 rounded-lg text-red-600 hover:bg-white" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
