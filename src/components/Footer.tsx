import { Link } from 'react-router-dom';
import { Building2, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Kubata Kié</span>
            </div>
            <p className="text-sm text-slate-400">
              A plataforma imobiliária de Angola. Encontre a sua casa ideal ou anuncie a sua propriedade.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Navegação</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/properties" className="hover:text-teal-400 transition-colors">Imóveis</Link></li>
              <li><Link to="/properties?transaction_type=rent" className="hover:text-teal-400 transition-colors">Arrendar</Link></li>
              <li><Link to="/properties?transaction_type=sale" className="hover:text-teal-400 transition-colors">Comprar</Link></li>
              <li><Link to="/dashboard" className="hover:text-teal-400 transition-colors">Painel</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Contacto</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +244 900 000 000</li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> info@kubatakie.ao</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Luanda, Angola</li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Sobre</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-teal-400 transition-colors">Quem somos</Link></li>
              <li><Link to="/terms" className="hover:text-teal-400 transition-colors">Termos</Link></li>
              <li><Link to="/privacy" className="hover:text-teal-400 transition-colors">Privacidade</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Kubata Kié. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
