import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin, BedDouble, Bath, Maximize, ArrowLeft, Heart, MessageCircle,
  Phone, Calendar, Send, Building2, Share2, Check,
} from 'lucide-react';
import { getPropertyById, getPropertyImages, incrementPropertyViews } from '@/services/propertyService';
import { toggleFavorite, isFavorite } from '@/services/favoriteService';
import { createInquiry } from '@/services/inquiryService';
import { createViewingRequest } from '@/services/viewingService';
import { trackEvent, AnalyticsEvents } from '@/services/analyticsService';
import { useAuth } from '@/context/AuthContext';
import TurnstileWidget from '@/components/TurnstileWidget';

import type { Property, PropertyImage } from '@/types';

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [property, setProperty] = useState<Property | null>(null);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [fav, setFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Inquiry form
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [captchaToken, setCaptchaToken] = useState('');
  const [inquiryStatus, setInquiryStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ type: 'idle' });

  // Viewing form
  const [viewingForm, setViewingForm] = useState({ name: '', email: '', phone: '', date: '', time: '', message: '' });
  const [viewingStatus, setViewingStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ type: 'idle' });

  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [showViewingForm, setShowViewingForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getPropertyById(id),
      getPropertyImages(id),
    ]).then(([prop, imgs]) => {
      setProperty(prop);
      setImages(imgs);
      setLoading(false);
      if (prop) {
        incrementPropertyViews(id);
        trackEvent(AnalyticsEvents.PROPERTY_VIEW, { propertyId: id });
      }
    });

    if (user) {
      isFavorite(id!, user.id).then(setFav);
    }
  }, [id, user]);

  const handleFavorite = async () => {
    if (!user) {
      navigate('/signin');
      return;
    }
    setFavLoading(true);
    try {
      const result = await toggleFavorite(id!, user.id);
      setFav(result.isFavorite);
      trackEvent(AnalyticsEvents.PROPERTY_FAVORITE, { propertyId: id, action: result.isFavorite ? 'add' : 'remove' });
    } finally {
      setFavLoading(false);
    }
  };

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryStatus({ type: 'loading' });
    const result = await createInquiry({
      propertyId: id!,
      userId: user?.id,
      name: inquiryForm.name || undefined,
      email: inquiryForm.email || undefined,
      phone: inquiryForm.phone || undefined,
      message: inquiryForm.message,
      captchaToken: captchaToken || undefined,
    });
    if (result.success) {
      setInquiryStatus({ type: 'success', message: 'Pedido enviado com sucesso!' });
      setInquiryForm({ name: '', email: '', phone: '', message: '' });
      trackEvent(AnalyticsEvents.CONTACT, { propertyId: id });
    } else {
      setInquiryStatus({ type: 'error', message: result.error || 'Erro ao enviar.' });
    }
  };

  const handleViewing = async (e: React.FormEvent) => {
    e.preventDefault();
    setViewingStatus({ type: 'loading' });
    try {
      await createViewingRequest({
        propertyId: id!,
        userId: user?.id,
        name: viewingForm.name || undefined,
        email: viewingForm.email || undefined,
        phone: viewingForm.phone || undefined,
        preferredDate: viewingForm.date || undefined,
        preferredTime: viewingForm.time || undefined,
        message: viewingForm.message || undefined,
      });
      setViewingStatus({ type: 'success', message: 'Pedido de visita enviado!' });
      setViewingForm({ name: '', email: '', phone: '', date: '', time: '', message: '' });
      trackEvent(AnalyticsEvents.VIEWING_REQUEST, { propertyId: id });
    } catch {
      setViewingStatus({ type: 'error', message: 'Erro ao enviar pedido.' });
    }
  };

  const handleWhatsApp = () => {
    trackEvent(AnalyticsEvents.WHATSAPP_CLICK, { propertyId: id });
    const phone = property?.owner?.phone || '';
    if (phone) {
      window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
    }
  };

  const handlePhoneClick = () => {
    trackEvent(AnalyticsEvents.PHONE_CLICK, { propertyId: id });
  };

  const formatPrice = (price: number | null, currency: string, transactionType: string) => {
    if (price === null) return 'Sob consulta';
    const formatted = new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(price);
    return transactionType === 'rent' ? `${formatted}/mês` : formatted;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-32" />
          <div className="h-80 bg-slate-200 rounded-xl" />
          <div className="h-8 bg-slate-200 rounded w-2/3" />
          <div className="h-32 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-lg text-slate-600">Imóvel não encontrado.</p>
        <Link to="/properties" className="text-teal-600 hover:text-teal-700 mt-2 inline-block">
          Ver todos os imóveis
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/properties" className="flex items-center gap-1 text-slate-600 hover:text-slate-900 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" />
        Voltar aos imóveis
      </Link>

      {/* Image Gallery */}
      <div className="mb-6">
        <div className="relative h-80 md:h-[28rem] rounded-xl overflow-hidden bg-slate-100">
          {images.length > 0 ? (
            <img src={images[activeImage]?.url} alt={property.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-16 h-16 text-slate-300" />
            </div>
          )}
          <button
            onClick={handleFavorite}
            disabled={favLoading}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/90 hover:bg-white shadow-md transition-colors"
          >
            <Heart className={`w-5 h-5 ${fav ? 'fill-red-500 text-red-500' : 'text-slate-600'}`} />
          </button>
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setActiveImage(i)}
                className={`flex-shrink-0 w-24 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                  activeImage === i ? 'border-teal-500' : 'border-transparent'
                }`}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{property.title}</h1>
              {property.city && (
                <div className="flex items-center gap-1 text-slate-500 mt-2">
                  <MapPin className="w-4 h-4" />
                  {property.address ? `${property.address}, ` : ''}{property.city}
                  {property.region ? `, ${property.region}` : ''}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-teal-700">
                {formatPrice(property.price, property.currency, property.transaction_type)}
              </div>
              <div className="text-sm text-slate-500 capitalize">
                {property.transaction_type === 'rent' ? 'Arrendamento' : 'Venda'}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-4 py-4 border-y border-slate-200 mb-6">
            {property.bedrooms !== null && (
              <div className="flex items-center gap-2 text-slate-700">
                <BedDouble className="w-5 h-5 text-teal-600" />
                <span>{property.bedrooms} quartos</span>
              </div>
            )}
            {property.bathrooms !== null && (
              <div className="flex items-center gap-2 text-slate-700">
                <Bath className="w-5 h-5 text-teal-600" />
                <span>{property.bathrooms} casas de banho</span>
              </div>
            )}
            {property.area !== null && (
              <div className="flex items-center gap-2 text-slate-700">
                <Maximize className="w-5 h-5 text-teal-600" />
                <span>{property.area} m²</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-700">
              <Building2 className="w-5 h-5 text-teal-600" />
              <span className="capitalize">{property.property_type}</span>
            </div>
          </div>

          {/* Description */}
          {property.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Descrição</h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{property.description}</p>
            </div>
          )}

          {/* Features JSON */}
          {property.features && Object.keys(property.features).length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Características</h2>
              <ul className="grid grid-cols-2 gap-2">
                {Object.entries(property.features).map(([key, value]) => (
                  <li key={key} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-teal-600" />
                    <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                    {typeof value === 'string' || typeof value === 'number' ? `: ${value}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Contact Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="font-semibold text-slate-900">Contactar</h3>

            <button
              onClick={() => setShowInquiryForm(!showInquiryForm)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Enviar mensagem
            </button>

            <button
              onClick={() => setShowViewingForm(!showViewingForm)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-teal-600 text-teal-700 rounded-lg font-medium hover:bg-teal-50 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Pedir visita
            </button>

            {property.owner?.phone && (
              <a
                href={`tel:${property.owner.phone}`}
                onClick={handlePhoneClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                <Phone className="w-4 h-4" />
                {property.owner.phone}
              </a>
            )}

            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 border border-green-600 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>

            <button
              onClick={handleFavorite}
              disabled={favLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              <Heart className={`w-4 h-4 ${fav ? 'fill-red-500 text-red-500' : ''}`} />
              {fav ? 'Remover favorito' : 'Adicionar favorito'}
            </button>
          </div>

          {/* Inquiry Form */}
          {showInquiryForm && (
            <form onSubmit={handleInquiry} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <h3 className="font-semibold text-slate-900">Enviar pedido</h3>
              {!user && (
                <>
                  <input
                    type="text" required value={inquiryForm.name}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                    placeholder="Nome" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                  <input
                    type="email" required value={inquiryForm.email}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                    placeholder="Email" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                  <input
                    type="tel" value={inquiryForm.phone}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                    placeholder="Telefone" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </>
              )}
              {!user && import.meta.env.VITE_TURNSTILE_SITE_KEY && (
                <TurnstileWidget siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} onToken={setCaptchaToken} />
              )}
              <textarea
                required value={inquiryForm.message}
                onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                placeholder="Mensagem" rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm resize-none"
              />
              <button type="submit" disabled={inquiryStatus.type === 'loading'} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50">
                {inquiryStatus.type === 'loading' ? 'A enviar...' : <><Send className="w-4 h-4" /> Enviar</>}
              </button>
              {inquiryStatus.type === 'success' && <p className="text-sm text-green-600 text-center">{inquiryStatus.message}</p>}
              {inquiryStatus.type === 'error' && <p className="text-sm text-red-600 text-center">{inquiryStatus.message}</p>}
              {inquiryStatus.type === 'error' && inquiryStatus.message?.includes('Muitos pedidos') && (
                <p className="text-xs text-amber-600 text-center">Aguarda alguns minutos antes de tentar novamente.</p>
              )}
            </form>
          )}

          {/* Viewing Form */}
          {showViewingForm && (
            <form onSubmit={handleViewing} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <h3 className="font-semibold text-slate-900">Pedir visita</h3>
              {!user && (
                <>
                  <input type="text" required value={viewingForm.name} onChange={(e) => setViewingForm({ ...viewingForm, name: e.target.value })} placeholder="Nome" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                  <input type="email" required value={viewingForm.email} onChange={(e) => setViewingForm({ ...viewingForm, email: e.target.value })} placeholder="Email" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                  <input type="tel" value={viewingForm.phone} onChange={(e) => setViewingForm({ ...viewingForm, phone: e.target.value })} placeholder="Telefone" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                </>
              )}
              <div className="flex gap-2">
                <input type="date" value={viewingForm.date} onChange={(e) => setViewingForm({ ...viewingForm, date: e.target.value })} className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                <input type="time" value={viewingForm.time} onChange={(e) => setViewingForm({ ...viewingForm, time: e.target.value })} className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm" />
              </div>
              <textarea value={viewingForm.message} onChange={(e) => setViewingForm({ ...viewingForm, message: e.target.value })} placeholder="Mensagem (opcional)" rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm resize-none" />
              <button type="submit" disabled={viewingStatus.type === 'loading'} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50">
                {viewingStatus.type === 'loading' ? 'A enviar...' : <><Calendar className="w-4 h-4" /> Pedir visita</>}
              </button>
              {viewingStatus.type === 'success' && <p className="text-sm text-green-600 text-center">{viewingStatus.message}</p>}
              {viewingStatus.type === 'error' && <p className="text-sm text-red-600 text-center">{viewingStatus.message}</p>}
            </form>
          )}

          {/* Owner Info */}
          {property.owner && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-3">Anunciante</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                  <span className="text-teal-700 font-semibold text-lg">
                    {(property.owner.full_name || property.owner.email || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-slate-900">{property.owner.full_name || 'Proprietário'}</div>
                  <div className="text-sm text-slate-500">{property.owner.email}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
