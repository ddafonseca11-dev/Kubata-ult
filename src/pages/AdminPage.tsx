import { useEffect, useState, useCallback } from 'react';
import { Shield, Building2, Users, MessageSquare, DollarSign, Calendar, Wrench, FileText, ChartBar as BarChart3, LayoutDashboard, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getDashboardStats } from '@/services/adminService';
import AdminProperties from '@/components/admin/AdminProperties';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminLeads from '@/components/admin/AdminLeads';
import AdminInquiries from '@/components/admin/AdminInquiries';
import AdminPayments from '@/components/admin/AdminPayments';
import AdminViewingRequests from '@/components/admin/AdminViewingRequests';
import AdminServiceRequests from '@/components/admin/AdminServiceRequests';
import AdminAuditLogs from '@/components/admin/AdminAuditLogs';
import AdminAnalytics from '@/components/admin/AdminAnalytics';

type AdminTab='dashboard'|'properties'|'users'|'leads'|'inquiries'|'payments'|'viewing'|'service'|'audit'|'analytics';
export default function AdminPage(){
 const {profile,loading:authLoading}=useAuth(); const navigate=useNavigate(); const [tab,setTab]=useState<AdminTab>('dashboard'); const [stats,setStats]=useState<Awaited<ReturnType<typeof getDashboardStats>>|null>(null); const [loading,setLoading]=useState(true);
 const load=useCallback(async()=>{setLoading(true);try{setStats(await getDashboardStats())}catch{setStats(null)}finally{setLoading(false)}},[]);
 useEffect(()=>{if(authLoading)return;if(!profile){navigate('/signin',{replace:true});return;}if(profile.role!=='admin'){navigate('/dashboard',{replace:true});return;}load()},[authLoading,profile,navigate,load]);
 if(authLoading||(!profile)) return <div className="container-mw container-px py-20"><div className="skeleton-shimmer h-40 rounded-sm"/></div>;
 if(profile.role!=='admin') return null;
 const tabs:[AdminTab,string,typeof Building2][]=[['dashboard','Dashboard',LayoutDashboard],['properties','Imóveis',Building2],['users','Utilizadores',Users],['leads','Leads',Users],['inquiries','Inquiries',MessageSquare],['payments','Pagamentos',DollarSign],['viewing','Visitas',Calendar],['service','Serviços',Wrench],['audit','Auditoria',FileText],['analytics','Analytics',BarChart3]];
 return <div className="container-mw container-px py-10"><div className="mb-8 flex items-center justify-between"><div><div className="mb-2 flex items-center gap-2 text-gold"><Shield className="h-5 w-5"/><span className="text-xs font-semibold uppercase tracking-widest">Área restrita</span></div><h1 className="font-serif text-3xl font-semibold">Painel Administrativo</h1><p className="mt-1 text-sm text-muted-foreground">Gestão central do Kubata Kié.</p></div><button onClick={()=>navigate('/dashboard')} className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm hover:bg-muted"><LogOut className="h-4 w-4"/> Sair do painel</button></div>
 <div className="mb-8 flex gap-1 overflow-x-auto border-b border-border">{tabs.map(([id,label,Icon])=><button key={id} onClick={()=>setTab(id)} className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium ${tab===id?'border-gold text-gold-700':'border-transparent text-muted-foreground hover:text-foreground'}`}><Icon className="h-4 w-4"/>{label}</button>)}</div>
 {tab==='dashboard'&&<div className="grid grid-cols-2 gap-4 md:grid-cols-4">{loading?<div className="col-span-full skeleton-shimmer h-40 rounded-sm"/>:stats&&<>{[['Total Imóveis',stats.totalProperties,Building2],['Publicados',stats.publishedProperties,Building2],['Pendentes',stats.pendingProperties,Calendar],['Utilizadores',stats.totalUsers,Users],['Leads',stats.totalLeads,Users],['Inquiries',stats.totalInquiries,MessageSquare],['Pagamentos',stats.totalPayments,DollarSign],['Receita',`${stats.totalRevenue.toFixed(2)} €`,DollarSign]].map(([l,v,I])=>{const Icon=I as typeof Building2;return <div key={String(l)} className="rounded-sm border border-border bg-card p-5"><Icon className="mb-3 h-7 w-7 text-gold"/><div className="text-2xl font-semibold">{String(v)}</div><div className="text-sm text-muted-foreground">{String(l)}</div></div>})}</>}</div>}
 {tab==='properties'&&<AdminProperties/>}{tab==='users'&&<AdminUsers/>}{tab==='leads'&&<AdminLeads/>}{tab==='inquiries'&&<AdminInquiries/>}{tab==='payments'&&<AdminPayments/>}{tab==='viewing'&&<AdminViewingRequests/>}{tab==='service'&&<AdminServiceRequests/>}{tab==='audit'&&<AdminAuditLogs/>}{tab==='analytics'&&<AdminAnalytics/>}
 </div>
}
