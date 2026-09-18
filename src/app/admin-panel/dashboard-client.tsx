"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ComponentType } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  Eye,
  LayoutDashboard,
  LogOut,
  Menu,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  TrendingUp,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ExchangeRateWidget } from "@/components/exchange-rate-widget";
import type { ExchangeRateSnapshot } from "@/lib/exchange-rate";

type Language = "ES" | "EN";
type StoreStatus = "active" | "suspended" | "pending";
type PlanName = "Growth" | "Enterprise";
type StoreRow = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  email: string;
  status: StoreStatus;
  plan?: PlanName;
  price?: number | null;
  currentPeriodEnd?: string | null;
};
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  last: string;
  status: string;
};
type ServerAction = (formData: FormData) => void | Promise<void>;
type Props = {
  currentUser: { email: string };
  stores: StoreRow[];
  metrics: {
    totalStores: number;
    activeStores: number;
    totalSales: number;
    pendingOrders: number;
  };
  error?: string;
  onToggleStatus: ServerAction;
  onCreateStore: ServerAction;
  onRenewSubscription: ServerAction;
  onInviteUser: ServerAction;
  users: UserRow[];
  onSignOut: ServerAction;
  exchangeRates: ExchangeRateSnapshot;
};

const navItems = [
  {
    key: "overview",
    label: { ES: "Resumen", EN: "Overview" },
    icon: LayoutDashboard,
  },
  { key: "stores", label: { ES: "Tiendas", EN: "Stores" }, icon: Store },
  { key: "sales", label: { ES: "Ventas", EN: "Sales" }, icon: BarChart3 },
  { key: "users", label: { ES: "Usuarios", EN: "Users" }, icon: Users },
] as const;

const copy = {
  ES: {
    adminPanel: "Panel de administración",
    overview: "Resumen ejecutivo",
    principal: "Principal",
    system: "Sistema",
    settings: "Configuración",
    help: "Ayuda",
    collapse: "Contraer menú",
    logout: "Cerrar sesión",
    administrator: "Administrador",
    greeting: "¡Hola, administrador!",
    summary: "Aquí tienes una vista general de la actividad de PagoFácil.",
    online: "Sistema operativo",
    registeredStores: "Tiendas registradas",
    activeStores: "Tiendas activas",
    processedSales: "Ventas procesadas",
    pendingOrders: "Órdenes pendientes",
    totalBusiness: "Base total de comercios",
    enabledAccounts: "Cuentas habilitadas",
    verifiedOrders: "Órdenes verificadas",
    followUp: "Requieren seguimiento",
    directory: "Directorio de tiendas",
    directoryDescription: "Gestiona el acceso y estado de tus comercios.",
    total: "total",
    newStore: "Nueva tienda",
    search: "Buscar por nombre o correo...",
    allStatuses: "Todos los estados",
    active: "Activo",
    activePlural: "Activos",
    pending: "Pendiente",
    pendingPlural: "Pendientes",
    inactive: "Inactivo",
    inactivePlural: "Inactivos",
    store: "Tienda",
    owner: "Propietario",
    status: "Estado",
    actions: "Acciones",
    activate: "Activar",
    deactivate: "Desactivar",
    waitingProfile: "Esperando perfil",
    details: "Ver detalles",
    copyLink: "Copiar enlace",
    copied: "¡Copiado!",
    noStores: "No encontramos tiendas",
    tryAgain: "Prueba con otro nombre, correo o estado.",
    showing: "Mostrando",
    of: "de",
    synced: "Datos sincronizados con Supabase",
    notifications: "Notificaciones",
    systemNormal: "El sistema está operando con normalidad.",
    newStoreTitle: "Nueva tienda",
    newStoreDescription: "Prepara el alta de un nuevo comercio en PagoFácil.",
    storeName: "Nombre de la tienda",
    storeNamePlaceholder: "Ej. Café Central",
    ownerEmail: "Correo del propietario",
    ownerEmailPlaceholder: "propietario@ejemplo.com",
    cancel: "Cancelar",
    prepareInvite: "Preparar invitación",
    requestReady: "Solicitud preparada",
    requestReadyDescription:
      "La invitación para registrar una tienda está lista para continuar.",
    close: "Cerrar",
    operations: "Operaciones seguras y simples",
    footer: "Panel de administración",
  },
  EN: {
    adminPanel: "Administration panel",
    overview: "Executive overview",
    principal: "Main",
    system: "System",
    settings: "Settings",
    help: "Help",
    collapse: "Collapse menu",
    logout: "Log out",
    administrator: "Administrator",
    greeting: "Hello, administrator!",
    summary: "Here is an overview of PagoFácil activity.",
    online: "System operational",
    registeredStores: "Registered stores",
    activeStores: "Active stores",
    processedSales: "Processed sales",
    pendingOrders: "Pending orders",
    totalBusiness: "Total merchant base",
    enabledAccounts: "Enabled accounts",
    verifiedOrders: "Verified orders",
    followUp: "Require follow-up",
    directory: "Store directory",
    directoryDescription: "Manage access and status for your merchants.",
    total: "total",
    newStore: "New store",
    search: "Search by name or email...",
    allStatuses: "All statuses",
    active: "Active",
    activePlural: "Active",
    pending: "Pending",
    pendingPlural: "Pending",
    inactive: "Inactive",
    inactivePlural: "Inactive",
    store: "Store",
    owner: "Owner",
    status: "Status",
    actions: "Actions",
    activate: "Activate",
    deactivate: "Deactivate",
    waitingProfile: "Waiting for profile",
    details: "View details",
    copyLink: "Copy link",
    copied: "Copied!",
    noStores: "No stores found",
    tryAgain: "Try another name, email or status.",
    showing: "Showing",
    of: "of",
    synced: "Data synced with Supabase",
    notifications: "Notifications",
    systemNormal: "The system is operating normally.",
    newStoreTitle: "New store",
    newStoreDescription: "Prepare a new merchant onboarding in PagoFácil.",
    storeName: "Store name",
    storeNamePlaceholder: "E.g. Central Café",
    ownerEmail: "Owner email",
    ownerEmailPlaceholder: "owner@example.com",
    cancel: "Cancel",
    prepareInvite: "Prepare invitation",
    requestReady: "Request prepared",
    requestReadyDescription:
      "The invitation to register a store is ready to continue.",
    close: "Close",
    operations: "Secure and simple operations",
    footer: "Administration panel",
  },
} as const;

type Translation = Record<keyof typeof copy.ES, string>;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function Flag({
  language,
  size = "h-4 w-6",
}: {
  language: Language;
  size?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`fi ${language === "ES" ? "fi-ve" : "fi-us"} inline-block rounded-sm ${size}`}
    />
  );
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-slate-200/70 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {value}
          </p>
        </div>
        <div
          className={`rounded-2xl p-3.5 transition-transform duration-300 group-hover:scale-110 ${accent}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <TrendingUp className="h-3.5 w-3.5" />
        {detail}
      </p>
    </article>
  );
}

type DemoStore = {
  id: string;
  name: string;
  owner: string;
  email: string;
  plan: PlanName;
  price?: number | null;
  status: "active" | "pending" | "inactive";
  currentPeriodEnd?: string | null;
};
type DemoSale = {
  id: string;
  store: string;
  amount: string;
  method: string;
  status: "approved" | "review" | "rejected";
  date: string;
};

const demoStores: DemoStore[] = [
  {
    id: "PF-0001",
    name: "Café Central",
    owner: "María González",
    email: "maria@cafecentral.ve",
    plan: "Enterprise",
    status: "active",
  },
  {
    id: "PF-0002",
    name: "TechNova Store",
    owner: "Carlos Rivas",
    email: "carlos@technova.ve",
    plan: "Growth",
    price: 29,
    status: "active",
  },
  {
    id: "PF-0003",
    name: "Moda Caracas",
    owner: "Valentina Pérez",
    email: "valentina@modacaracas.ve",
    plan: "Growth",
    price: 29,
    status: "pending",
  },
  {
    id: "PF-0004",
    name: "Casa Verde",
    owner: "Andrés Molina",
    email: "andres@casaverde.ve",
    plan: "Growth",
    price: 29,
    status: "inactive",
  },
];
const planOptions: Array<{
  name: PlanName;
  price: number | null;
  description: { ES: string; EN: string };
}> = [
  {
    name: "Growth",
    price: null,
    description: {
      ES: "Para negocios en crecimiento",
      EN: "For growing businesses",
    },
  },
  {
    name: "Enterprise",
    price: null,
    description: { ES: "Precio configurable", EN: "Configurable price" },
  },
];
const demoSales: DemoSale[] = [
  {
    id: "#ORD-84291",
    store: "Café Central",
    amount: "USD 86.50 / Bs. 3.156,42",
    method: "Pago Móvil",
    status: "approved",
    date: "Hoy, 10:42 AM",
  },
  {
    id: "#ORD-84290",
    store: "TechNova Store",
    amount: "USD 249.00 / Bs. 9.088,50",
    method: "Zelle",
    status: "review",
    date: "Hoy, 09:18 AM",
  },
  {
    id: "#ORD-84289",
    store: "Bodega 24/7",
    amount: "USD 42.00 / Bs. 1.533,00",
    method: "Binance Pay",
    status: "approved",
    date: "Ayer, 06:52 PM",
  },
  {
    id: "#ORD-84288",
    store: "Moda Caracas",
    amount: "USD 118.00 / Bs. 4.307,00",
    method: "Pago Móvil",
    status: "rejected",
    date: "Ayer, 04:31 PM",
  },
];
const demoUsers = [
  {
    name: "Bruno Superadmin",
    email: "bruno@pagofacil.com",
    role: "Super Admin",
    last: "Hace 4 min",
    status: "active",
  },
  {
    name: "María González",
    email: "maria@cafecentral.ve",
    role: "Lojista",
    last: "Hoy, 10:44 AM",
    status: "active",
  },
  {
    name: "Carlos Rivas",
    email: "carlos@technova.ve",
    role: "Lojista",
    last: "Ayer, 06:21 PM",
    status: "active",
  },
  {
    name: "Valentina Pérez",
    email: "valentina@modacaracas.ve",
    role: "Lojista",
    last: "Nunca",
    status: "pending",
  },
];
void demoUsers;

function DemoBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "amber" | "slate" | "red" | "blue";
}) {
  const styles = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold " +
        styles[tone]
      }
    >
      {children}
    </span>
  );
}

function SectionFrame({
  title,
  description,
  language,
  action,
  children,
}: {
  title: string;
  description: string;
  language: Language;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
            {language === "ES" ? "Gestión" : "Management"}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </main>
  );
}

/* Legacy implementation kept out of the active UI.
function LegacyStoresView({ language, sourceStores }: { language: Language; sourceStores: StoreRow[] }) {
  const es = language === "ES";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const rows: DemoStore[] = sourceStores.length ? sourceStores.map((item) => ({ id: item.id.slice(0, 8).toUpperCase(), name: item.name, owner: item.email.split("@")[0], email: item.email, plan: "Growth", price: null, status: item.status === "suspended" ? "inactive" : item.status })) : demoStores;
  const filtered = rows.filter((row) => (row.name + row.owner + row.email).toLowerCase().includes(query.toLowerCase()) && (filter === "all" || row.status === filter));
  return <SectionFrame language={language} title={es ? "Tiendas" : "Stores"} description={es ? "Administra comercios, planes y accesos desde un solo lugar." : "Manage merchants, plans and access from one place."} action={<button type="button" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"><Plus className="h-4 w-4" />{es ? "Nueva tienda" : "New store"}</button>}><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/40"><div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={es ? "Buscar tienda, propietario o correo..." : "Search store, owner or email..."} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:bg-white" /></label><select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"><option value="all">{es ? "Todos los estados" : "All statuses"}</option><option value="active">{es ? "Activas" : "Active"}</option><option value="pending">{es ? "Pendientes" : "Pending"}</option><option value="inactive">{es ? "Inactivas" : "Inactive"}</option></select><button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Filter className="h-4 w-4" />{es ? "Filtros" : "Filters"}</button></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">ID</th><th className="px-5 py-4">{es ? "Nombre de la tienda" : "Store name"}</th><th className="px-5 py-4">{es ? "Propietario" : "Owner"}</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">{es ? "Estado" : "Status"}</th><th className="px-5 py-4 text-right">{es ? "Acciones" : "Actions"}</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-mono text-xs text-slate-500">{row.id}</td><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-xs font-bold text-emerald-700">{initials(row.name)}</div><div><p className="font-semibold text-slate-800">{row.name}</p><p className="text-xs text-slate-500">{row.email}</p></div></div></td><td className="px-5 py-4"><p className="font-medium text-slate-700">{row.owner}</p><p className="text-xs text-slate-400">{row.email}</p></td><td className="px-5 py-4"><DemoBadge tone={row.plan === "Enterprise" ? "blue" : row.plan === "Growth" ? "green" : "slate"}>{row.plan}</DemoBadge></td><td className="px-5 py-4"><DemoBadge tone={row.status === "active" ? "green" : row.status === "pending" ? "amber" : "slate"}>{row.status === "active" ? (es ? "Activa" : "Active") : row.status === "pending" ? (es ? "Pendiente" : "Pending") : (es ? "Inactiva" : "Inactive")}</DemoBadge></td><td className="px-5 py-4 text-right"><button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:bg-emerald-50">{row.status === "active" ? (es ? "Desactivar" : "Deactivate") : (es ? "Activar" : "Activate")}</button></td></tr>)}</tbody></table></div><div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">{es ? "Mostrando" : "Showing"} <b>{filtered.length}</b> {es ? "de" : "of"} <b>{rows.length}</b> {es ? "tiendas" : "stores"}</div></div></SectionFrame>;
}

*/
function subscriptionRemaining(end: string | null | undefined, es: boolean) {
  if (!end) return { label: es ? "Sin fecha" : "No date", tone: "slate" as const };
  const days = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
  if (Number.isNaN(days)) return { label: es ? "Sin fecha" : "No date", tone: "slate" as const };
  if (days <= 0) return { label: es ? "Vencido" : "Expired", tone: "red" as const };
  return { label: es ? `Quedan ${days} días` : `${days} days left`, tone: days <= 5 ? "red" as const : days <= 15 ? "amber" as const : "green" as const };
}
function StoresView({
  language,
  sourceStores,
  onCreateStore,
  onRenewSubscription,
}: {
  language: Language;
  sourceStores: StoreRow[];
  onCreateStore: ServerAction;
  onRenewSubscription: ServerAction;
}) {
  const es = language === "ES";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [newStoreOpen, setNewStoreOpen] = useState(false);
  const [newStoreSubmitted, setNewStoreSubmitted] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Record<string, DemoStore["status"]>>(
    {},
  );
  const rows: DemoStore[] = sourceStores.length
    ? sourceStores.map((item) => ({
        id: item.id,
        name: item.name,
        owner: item.email.split("@")[0],
        email: item.email,
        plan: item.plan ?? "Growth",
        price: item.price,
        status: item.status === "suspended" ? "inactive" : item.status,
        currentPeriodEnd: item.currentPeriodEnd,
      }))
    : demoStores;
  const visible = rows.filter(
    (row) =>
      !deletedIds.includes(row.id) &&
      (row.name + row.owner + row.email)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || (statuses[row.id] ?? row.status) === filter),
  );
  const formatPlanPrice = (row: DemoStore) =>
    row.price
      ? `US$${row.price}/${es ? "mes" : "month"}`
      : es
        ? "Precio configurable"
        : "Configurable price";
  const toggle = (id: string, current: DemoStore["status"]) =>
    setStatuses((value) => ({
      ...value,
      [id]: current === "active" ? "inactive" : "active",
    }));
  const remove = (id: string, name: string) => {
    if (
      window.confirm(
        es
          ? "¿Eliminar la tienda " +
              name +
              "? Esta acción no se puede deshacer."
          : "Delete " + name + "? This action cannot be undone.",
      )
    )
      setDeletedIds((value) => [...value, id]);
  };
  return (
    <SectionFrame
      language={language}
      title={es ? "Tiendas" : "Stores"}
      description={
        es
          ? "Administra comercios, planes y accesos desde un solo lugar."
          : "Manage merchants, plans and access from one place."
      }
      action={
        <button
          type="button"
          onClick={() => {
            setNewStoreOpen(true);
            setNewStoreSubmitted(false);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          {es ? "Nueva tienda" : "New store"}
        </button>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/40">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                es
                  ? "Buscar tienda, propietario o correo..."
                  : "Search store, owner or email..."
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
          >
            <option value="all">
              {es ? "Todos los estados" : "All statuses"}
            </option>
            <option value="active">{es ? "Activas" : "Active"}</option>
            <option value="pending">{es ? "Pendientes" : "Pending"}</option>
            <option value="inactive">{es ? "Inactivas" : "Inactive"}</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">{es ? "Nombre" : "Name"}</th>
                <th className="px-5 py-4">{es ? "Propietario" : "Owner"}</th>
                <th className="px-5 py-4">Plan</th>
                <th className="px-5 py-4">Suscripción</th>
                <th className="px-5 py-4">{es ? "Estado" : "Status"}</th>
                <th className="px-5 py-4 text-right">
                  {es ? "Acciones" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((row) => {
                const status = statuses[row.id] ?? row.status;
                return (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">
                      {row.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-xs font-bold text-emerald-700">
                          {initials(row.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {row.name}
                          </p>
                          <p className="text-xs text-slate-500">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">{row.owner}</p>
                      <p className="text-xs text-slate-400">{row.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <DemoBadge
                        tone={
                          row.plan === "Enterprise"
                            ? "blue"
                            : row.plan === "Growth"
                              ? "green"
                              : "slate"
                        }
                      >
                        {row.plan}
                      </DemoBadge>
                      <span className="mt-1 text-xs font-medium text-slate-500">
                        {formatPlanPrice(row)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {(() => {
                        const subscription = subscriptionRemaining(row.currentPeriodEnd, es);
                        return <div><DemoBadge tone={subscription.tone}>{subscription.label}</DemoBadge>{row.currentPeriodEnd ? <p className="mt-1 text-[11px] text-slate-400">{new Date(row.currentPeriodEnd).toLocaleDateString(es ? "es-VE" : "en-US")}</p> : null}</div>;
                      })()}
                    </td>
                    <td className="px-5 py-4">
                      <DemoBadge
                        tone={
                          status === "active"
                            ? "green"
                            : status === "pending"
                              ? "amber"
                              : "slate"
                        }
                      >
                        {status === "active"
                          ? es
                            ? "Activa"
                            : "Active"
                          : status === "pending"
                            ? es
                              ? "Pendiente"
                              : "Pending"
                            : es
                              ? "Inactiva"
                              : "Inactive"}
                      </DemoBadge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggle(row.id, status)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:bg-emerald-50"
                        >
                          {status === "active"
                            ? es
                              ? "Desactivar"
                              : "Deactivate"
                            : es
                              ? "Activar"
                              : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(row.id, row.name)}
                          aria-label={es ? "Eliminar tienda" : "Delete store"}
                          className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {sourceStores.some((store) => store.id === row.id) ? (
                          <form action={onRenewSubscription}>
                            <input type="hidden" name="store_id" value={row.id} />
                            <button type="submit" className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                              Renovar (+30 días)
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="p-12 text-center text-sm text-slate-500">
              {es
                ? "No hay tiendas que coincidan con los filtros."
                : "No stores match the filters."}
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
          {es ? "Mostrando" : "Showing"} <b>{visible.length}</b>{" "}
          {es ? "de" : "of"} <b>{rows.length - deletedIds.length}</b>{" "}
          {es ? "tiendas" : "stores"}
        </div>
      </div>
      <NewStoreModal
        open={newStoreOpen}
        submitted={newStoreSubmitted}
        language={language}
        onCreateStore={onCreateStore}
        onClose={() => setNewStoreOpen(false)}
        onSubmit={() => setNewStoreSubmitted(true)}
      />
    </SectionFrame>
  );
}

function SalesViewPrimary({ language }: { language: Language }) {
  const es = language === "ES";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedSale, setSelectedSale] = useState<DemoSale | null>(null);
  const rows = demoSales.filter(
    (row) =>
      (row.id + row.store + row.method)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || row.status === filter),
  );
  const label = (status: DemoSale["status"]) =>
    status === "approved"
      ? es
        ? "OCR aprobado"
        : "OCR approved"
      : status === "review"
        ? es
          ? "Revisión manual"
          : "Manual review"
          : es
            ? "Rechazado"
            : "Rejected";
  const exportCsv = () => {
    const csv = ["ID,Tienda,Monto,Método,Estado,Fecha", ...rows.map((row) => [row.id, row.store, row.amount, row.method, label(row.status), row.date].map((value) => `"${value.replaceAll('"', '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "pagofacil-ventas.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <SectionFrame
      language={language}
      title={es ? "Ventas" : "Sales"}
      description={
        es
          ? "Auditoría global de transacciones y verificación de pagos."
          : "Global transaction audit and payment verification."
      }
      action={
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          {es ? "Exportar CSV" : "Export CSV"}
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          label={es ? "Volumen total" : "Total volume"}
          value="$24,890.40"
          detail={es ? "Últimos 30 días" : "Last 30 days"}
          icon={TrendingUp}
          accent="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          label={es ? "Órdenes hoy" : "Orders today"}
          value="128"
          detail={es ? "+18.6% vs. ayer" : "+18.6% vs. yesterday"}
          icon={Activity}
          accent="bg-blue-50 text-blue-600"
        />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/40">
        <div className="flex gap-3 border-b border-slate-200 p-5">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                es
                  ? "Buscar por orden, tienda o método..."
                  : "Search order, store or method..."
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-400"
            />
          </label>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
          >
            <option value="all">{es ? "Todos" : "All"}</option>
            <option value="approved">
              {es ? "OCR aprobado" : "OCR approved"}
            </option>
            <option value="review">
              {es ? "Revisión manual" : "Manual review"}
            </option>
            <option value="rejected">{es ? "Rechazado" : "Rejected"}</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">{es ? "Nº Orden" : "Order no."}</th>
                <th className="px-5 py-4">{es ? "Tienda" : "Store"}</th>
                <th className="px-5 py-4">{es ? "Monto" : "Amount"}</th>
                <th className="px-5 py-4">{es ? "Método" : "Method"}</th>
                <th className="px-5 py-4">
                  {es ? "Verificación" : "Verification"}
                </th>
                <th className="px-5 py-4">{es ? "Fecha" : "Date"}</th>
                <th className="px-5 py-4 text-right">
                  {es ? "Acciones" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono text-xs font-semibold">
                    {row.id}
                  </td>
                  <td className="px-5 py-4 font-semibold">{row.store}</td>
                  <td className="px-5 py-4 font-semibold">{row.amount}</td>
                  <td className="px-5 py-4">
                    <DemoBadge tone="blue">{row.method}</DemoBadge>
                  </td>
                  <td className="px-5 py-4">
                    <DemoBadge
                      tone={
                        row.status === "approved"
                          ? "green"
                          : row.status === "review"
                            ? "amber"
                            : "red"
                      }
                    >
                      {label(row.status)}
                    </DemoBadge>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {row.date}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedSale(row)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selectedSale ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">{es ? "Detalle de venta" : "Sale detail"}</p><h3 className="mt-1 text-lg font-bold">{selectedSale.id}</h3></div><button type="button" onClick={() => setSelectedSale(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><dl className="mt-6 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-500">{es ? "Tienda" : "Store"}</dt><dd className="font-semibold">{selectedSale.store}</dd></div><div className="flex justify-between"><dt className="text-slate-500">{es ? "Monto" : "Amount"}</dt><dd className="font-semibold">{selectedSale.amount}</dd></div><div className="flex justify-between"><dt className="text-slate-500">{es ? "Método" : "Method"}</dt><dd className="font-semibold">{selectedSale.method}</dd></div><div className="flex justify-between"><dt className="text-slate-500">{es ? "Estado" : "Status"}</dt><dd className="font-semibold">{label(selectedSale.status)}</dd></div></dl></div></div> : null}
    </SectionFrame>
  );
}

function InviteSubmitButton({ language }: { language: Language }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"><Mail className="h-4 w-4" />{pending ? (language === "ES" ? "Enviando..." : "Sending...") : (language === "ES" ? "Enviar invitación" : "Send invitation")}</button>;
}

function UsersViewPrimary({ language, sourceUsers, onInviteUser }: { language: Language; sourceUsers: UserRow[]; onInviteUser: ServerAction }) {
  const es = language === "ES";
  const [inviteOpen, setInviteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openUserMenu, setOpenUserMenu] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const rows = sourceUsers.filter((user) =>
    (user.name + user.email).toLowerCase().includes(query.toLowerCase()),
  );
  async function copyEmail(email: string) {
    if (navigator.clipboard) await navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setOpenUserMenu(null);
    window.setTimeout(() => setCopiedEmail(null), 1800);
  }
  return (
    <SectionFrame
      language={language}
      title={es ? "Usuarios" : "Users"}
      description={
        es
          ? "Propietarios de tiendas y administradores con acceso al sistema."
          : "Store owners and administrators with system access."
      }
      action={
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Mail className="h-4 w-4" />
          {es ? "Invitar usuario" : "Invite user"}
        </button>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/40">
        <div className="border-b border-slate-200 p-5">
          <label className="relative block max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                es ? "Buscar usuario o correo..." : "Search user or email..."
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-400"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">{es ? "Usuario" : "User"}</th>
                <th className="px-5 py-4">{es ? "Rol" : "Role"}</th>
                <th className="px-5 py-4">
                  {es ? "Último acceso" : "Last access"}
                </th>
                <th className="px-5 py-4">{es ? "Estado" : "Status"}</th>
                <th className="px-5 py-4 text-right">
                  {es ? "Acciones" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                        {initials(user.name)}
                      </div>
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <DemoBadge
                      tone={user.role === "Super Admin" ? "blue" : "slate"}
                    >
                      {user.role}
                    </DemoBadge>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{user.last}</td>
                  <td className="px-5 py-4">
                    <DemoBadge
                      tone={user.status === "active" ? "green" : "amber"}
                    >
                      {user.status === "active"
                        ? es
                          ? "Activo"
                          : "Active"
                        : es
                          ? "Pendiente"
                          : "Pending"}
                    </DemoBadge>
                  </td>
                  <td className="relative px-5 py-4 text-right">
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        aria-label={es ? "Abrir acciones del usuario" : "Open user actions"}
                        aria-expanded={openUserMenu === user.id}
                        onClick={() => setOpenUserMenu((current) => current === user.id ? null : user.id)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openUserMenu === user.id ? (
                        <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 text-left shadow-xl shadow-slate-900/10">
                          <button type="button" onClick={() => copyEmail(user.email)} className="flex w-full items-center rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700">
                            {copiedEmail === user.email ? (es ? "¡Correo copiado!" : "Email copied!") : (es ? "Copiar correo" : "Copy email")}
                          </button>
                          {user.role !== "Super Admin" ? (
                            <form action={onInviteUser} onSubmit={() => setOpenUserMenu(null)}>
                              <input type="hidden" name="email" value={user.email} />
                              <button type="submit" className="flex w-full items-center rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700">
                                {es ? "Reenviar invitación" : "Resend invitation"}
                              </button>
                            </form>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {inviteOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {es ? "Invitar usuario" : "Invite user"}
              </h3>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {es
                ? "Enviaremos un enlace de acceso al correo indicado."
                : "We will send an access link to the provided email."}
            </p>
            <form action={onInviteUser} onSubmit={() => setInviteOpen(false)}>
              <input required name="email" type="email" placeholder={es ? "correo@ejemplo.com" : "email@example.com"} className="mt-5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
              <InviteSubmitButton language={language} />
            </form>
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="mt-4 w-full rounded-xl bg-slate-950 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {es ? "Enviar invitación" : "Send invitation"}
            </button>
          </div>
        </div>
      )}
    </SectionFrame>
  );
}

/* function SalesView({ language }: { language: Language }) {
  const es = language === "ES";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const rows = demoSales.filter((row) => (row.id + row.store + row.method).toLowerCase().includes(query.toLowerCase()) && (filter === "all" || row.status === filter));
  const label = (status: DemoSale["status"]) => status === "approved" ? (es ? "OCR aprobado" : "OCR approved") : status === "review" ? (es ? "Revisión manual" : "Manual review") : (es ? "Rechazado" : "Rejected");
  return <SectionFrame language={language} title={es ? "Ventas" : "Sales"} description={es ? "Auditoría global de transacciones y verificación de pagos." : "Global transaction audit and payment verification."} action={<button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />{es ? "Exportar CSV" : "Export CSV"}</button>}><div className="grid gap-4 sm:grid-cols-2"><KpiCard label={es ? "Volumen total" : "Total volume"} value="$24,890.40" detail={es ? "Últimos 30 días" : "Last 30 days"} icon={TrendingUp} accent="bg-emerald-50 text-emerald-600" /><KpiCard label={es ? "Órdenes hoy" : "Orders today"} value="128" detail={es ? "+18.6% vs. ayer" : "+18.6% vs. yesterday"} icon={Activity} accent="bg-blue-50 text-blue-600" /></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/40"><div className="flex gap-3 border-b border-slate-200 p-5"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={es ? "Buscar por orden, tienda o método..." : "Search order, store or method..."} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-400" /></label><select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"><option value="all">{es ? "Todos" : "All"}</option><option value="approved">{es ? "OCR aprobado" : "OCR approved"}</option><option value="review">{es ? "Revisión manual" : "Manual review"}</option><option value="rejected">{es ? "Rechazado" : "Rejected"}</option></select></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">{es ? "Nº Orden" : "Order no."}</th><th className="px-5 py-4">{es ? "Tienda" : "Store"}</th><th className="px-5 py-4">{es ? "Monto" : "Amount"}</th><th className="px-5 py-4">{es ? "Método" : "Method"}</th><th className="px-5 py-4">{es ? "Verificación" : "Verification"}</th><th className="px-5 py-4">{es ? "Fecha" : "Date"}</th><th className="px-5 py-4 text-right">{es ? "Acciones" : "Actions"}</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-mono text-xs font-semibold">{row.id}</td><td className="px-5 py-4 font-semibold">{row.store}</td><td className="px-5 py-4 font-semibold">{row.amount}</td><td className="px-5 py-4"><DemoBadge tone="blue">{row.method}</DemoBadge></td><td className="px-5 py-4"><DemoBadge tone={row.status === "approved" ? "green" : row.status === "review" ? "amber" : "red"}>{label(row.status)}</DemoBadge></td><td className="px-5 py-4 text-xs text-slate-500">{row.date}</td><td className="px-5 py-4 text-right"><button type="button" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"><Eye className="h-4 w-4" /></button></td></tr>)}</tbody></table></div></div></SectionFrame>;
}

function UsersView({ language }: { language: Language }) {
  const es = language === "ES";
  const [inviteOpen, setInviteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rows = demoUsers.filter((user) => (user.name + user.email).toLowerCase().includes(query.toLowerCase()));
  return <SectionFrame language={language} title={es ? "Usuarios" : "Users"} description={es ? "Propietarios de tiendas y administradores con acceso al sistema." : "Store owners and administrators with system access."} action={<button type="button" onClick={() => setInviteOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"><Mail className="h-4 w-4" />{es ? "Invitar usuario" : "Invite user"}</button>}><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/40"><div className="border-b border-slate-200 p-5"><label className="relative block max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={es ? "Buscar usuario o correo..." : "Search user or email..."} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-400" /></label></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">{es ? "Usuario" : "User"}</th><th className="px-5 py-4">{es ? "Rol" : "Role"}</th><th className="px-5 py-4">{es ? "Último acceso" : "Last access"}</th><th className="px-5 py-4">{es ? "Estado" : "Status"}</th><th className="px-5 py-4 text-right">{es ? "Acciones" : "Actions"}</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((user) => <tr key={user.email} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">{initials(user.name)}</div><div><p className="font-semibold">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></div></div></td><td className="px-5 py-4"><DemoBadge tone={user.role === "Super Admin" ? "blue" : "slate"}>{user.role}</DemoBadge></td><td className="px-5 py-4 text-slate-600">{user.last}</td><td className="px-5 py-4"><DemoBadge tone={user.status === "active" ? "green" : "amber"}>{user.status === "active" ? (es ? "Activo" : "Active") : (es ? "Pendiente" : "Pending")}</DemoBadge></td><td className="px-5 py-4 text-right"><button type="button" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"><MoreHorizontal className="h-4 w-4" /></button></td></tr>)}</tbody></table></div></div>{inviteOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h3 className="text-lg font-bold">{es ? "Invitar usuario" : "Invite user"}</h3><button type="button" onClick={() => setInviteOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><p className="mt-2 text-sm text-slate-500">{es ? "Enviaremos un enlace de acceso al correo indicado." : "We will send an access link to the provided email."}</p><input type="email" placeholder={es ? "correo@ejemplo.com" : "email@example.com"} className="mt-5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" /><button type="button" onClick={() => setInviteOpen(false)} className="mt-4 w-full rounded-xl bg-slate-950 py-3 text-sm font-semibold text-white hover:bg-emerald-700">{es ? "Enviar invitación" : "Send invitation"}</button></div></div>}</SectionFrame>;
}

*/

function SettingsView({ language }: { language: Language }) {
  const es = language === "ES";
  const [tab, setTab] = useState<"api" | "payments">("api");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState({
    openai: "",
    wahaUrl: "https://waha.pagofacil.local",
    wahaKey: "",
    zelle: "pagofacil@zelle.com",
    pagoMovil: "",
    binance: "",
  });
  const update = (key: keyof typeof values, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const field = (
    label: string,
    key: keyof typeof values,
    placeholder: string,
    secret = false,
  ) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        type={secret ? "password" : "text"}
        value={values[key]}
        onChange={(event) => update(key, event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-400 focus:bg-white"
      />
    </label>
  );
  const save = () => {
    setSaving(true);
    setSaved(false);
    window.setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 900);
  };
  return (
    <SectionFrame
      language={language}
      title={es ? "Configuración" : "Settings"}
      description={
        es
          ? "Ajustes centrales para integraciones y recepción de pagos."
          : "Core settings for integrations and payment collection."
      }
    >
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <button
            type="button"
            onClick={() => setTab("api")}
            className={
              "flex w-full rounded-xl px-3 py-3 text-left text-sm font-semibold " +
              (tab === "api"
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-500 hover:bg-slate-50")
            }
          >
            {es ? "Credenciales de API" : "API credentials"}
          </button>
          <button
            type="button"
            onClick={() => setTab("payments")}
            className={
              "flex w-full rounded-xl px-3 py-3 text-left text-sm font-semibold " +
              (tab === "payments"
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-500 hover:bg-slate-50")
            }
          >
            {es ? "Métodos de pago" : "Payment methods"}
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/40 sm:p-7">
          <div className="mb-6 flex justify-between">
            <div>
              <h3 className="text-lg font-bold">
                {tab === "api"
                  ? es
                    ? "Credenciales de API"
                    : "API credentials"
                  : es
                    ? "Métodos de pago globales"
                    : "Global payment methods"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {tab === "api"
                  ? es
                    ? "Conecta OpenAI y WAHA con el panel."
                    : "Connect OpenAI and WAHA to the panel."
                  : es
                    ? "Configura los datos de cobro de las tiendas."
                    : "Configure merchant payment details."}
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          {tab === "api" ? (
            <div className="grid gap-5 md:grid-cols-2">
              {field("OpenAI API Key", "openai", "sk-proj-••••••••", true)}
              {field("WAHA URL", "wahaUrl", "https://waha.example.com")}
              {field("WAHA API Key", "wahaKey", "waha_••••••••", true)}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {field("Zelle ID / correo", "zelle", "pagofacil@zelle.com")}
              {field(
                es ? "Datos de Pago Móvil" : "Pago Móvil details",
                "pagoMovil",
                es ? "Banco, teléfono y documento" : "Bank, phone and ID",
              )}
              {field("Binance Pay ID", "binance", "binance_merchant_id")}
            </div>
          )}
          <div className="mt-8 flex flex-col justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
            <p className="text-sm text-emerald-700">
              {saved
                ? es
                  ? "Cambios guardados correctamente."
                  : "Changes saved successfully."
                : es
                  ? "Los valores se almacenan de forma segura."
                  : "Values are stored securely."}
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
            >
              {saving
                ? es
                  ? "Guardando..."
                  : "Saving..."
                : es
                  ? "Guardar cambios"
                  : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}

function AdminSectionView({
  section,
  language,
  stores,
  onCreateStore,
  onRenewSubscription,
  users,
  onInviteUser,
}: {
  section: string;
  language: Language;
  stores: StoreRow[];
  onCreateStore: ServerAction;
  onRenewSubscription: ServerAction;
  users: UserRow[];
  onInviteUser: ServerAction;
}) {
  if (section === "stores")
    return (
      <StoresView
        language={language}
        sourceStores={stores}
        onCreateStore={onCreateStore}
        onRenewSubscription={onRenewSubscription}
      />
    );
  if (section === "sales") return <SalesViewPrimary language={language} />;
  if (section === "users") return <UsersViewPrimary language={language} sourceUsers={users} onInviteUser={onInviteUser} />;
  if (section === "settings") return <SettingsView language={language} />;
  const supportMessage =
    language === "ES"
      ? "Hola, necesito ayuda con mi panel de administración de PagoFácil."
      : "Hello, I need help with my PagoFácil administration panel.";
  const supportUrl =
    "https://wa.me/5581994401675?text=" + encodeURIComponent(supportMessage);
  return (
    <SectionFrame
      language={language}
      title={language === "ES" ? "Ayuda" : "Help"}
      description={
        language === "ES"
          ? "Centro de recursos y soporte para la operación."
          : "Resources and support center for operations."
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg shadow-slate-200/40">
        <CircleHelp className="mx-auto h-10 w-10 text-emerald-600" />
        <h3 className="mt-4 text-xl font-bold text-slate-950">
          {language === "ES" ? "¿Cómo podemos ayudarte?" : "How can we help?"}
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          {language === "ES"
            ? "Consulta la documentación o contacta con soporte."
            : "Read the documentation or contact support."}
        </p>
        <a
          href={supportUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {language === "ES" ? "Contactar soporte" : "Contact support"}
        </a>
      </div>
    </SectionFrame>
  );
}

function SectionShell({
  section,
  language,
  collapsed,
  onToggleCollapsed,
  onNavigate,
  children,
  onSignOut,
}: {
  section: string;
  language: Language;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate: (key: string) => void;
  children: React.ReactNode;
  onSignOut: ServerAction;
}) {
  const t = copy[language];
  return (
    <div className="pf-corporate-background min-h-screen">
      <aside
        className={
          "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-800 bg-slate-950 px-4 py-5 text-slate-300 shadow-2xl shadow-slate-950/20 " +
          (collapsed ? "lg:w-24" : "")
        }
      >
        <div
          className={
            "flex items-center " +
            (collapsed ? "justify-center" : "justify-between")
          }
        >
          <div className={collapsed ? "hidden" : "block"}>
            <BrandLogo
              className="h-20 w-56 object-contain brightness-0 invert"
              priority
            />
          </div>
          {collapsed && (
            <span className="text-xl font-black text-white">PF</span>
          )}
        </div>
        <nav className="mt-10 space-y-1" aria-label={t.principal}>
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              title={collapsed ? label[language] : undefined}
              className={
                "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition " +
                (section === key
                  ? "bg-emerald-400 font-semibold text-emerald-950"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white") +
                " " +
                (collapsed ? "justify-center" : "")
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className={collapsed ? "hidden" : ""}>
                {label[language]}
              </span>
            </button>
          ))}
        </nav>
        <p
          className={
            "mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 " +
            (collapsed ? "hidden" : "")
          }
        >
          {t.system}
        </p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onNavigate("settings")}
            className={
              "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium " +
              (section === "settings"
                ? "bg-emerald-400 text-emerald-950"
                : "text-slate-400 hover:bg-slate-800 hover:text-white") +
              " " +
              (collapsed ? "justify-center" : "")
            }
          >
            <Settings className="h-[18px] w-[18px]" />
            <span className={collapsed ? "hidden" : ""}>{t.settings}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("help")}
            className={
              "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium " +
              (section === "help"
                ? "bg-emerald-400 text-emerald-950"
                : "text-slate-400 hover:bg-slate-800 hover:text-white") +
              " " +
              (collapsed ? "justify-center" : "")
            }
          >
            <CircleHelp className="h-[18px] w-[18px]" />
            <span className={collapsed ? "hidden" : ""}>{t.help}</span>
          </button>
        </div>
        <div className="mt-auto space-y-3">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden w-full items-center justify-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white lg:flex"
          >
            <ChevronRight
              className={"h-4 w-4 " + (collapsed ? "rotate-180" : "")}
            />
            <span className={collapsed ? "hidden" : ""}>{t.collapse}</span>
          </button>
          <form action={onSignOut}>
            <button
              type="submit"
              className={
                "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 " +
                (collapsed ? "justify-center" : "")
              }
            >
              <LogOut className="h-[18px] w-[18px]" />
              <span className={collapsed ? "hidden" : ""}>{t.logout}</span>
            </button>
          </form>
        </div>
      </aside>
      <div className={collapsed ? "lg:pl-24" : "lg:pl-72"}>{children}</div>
    </div>
  );
}

/* Legacy duplicate block retained below only as a migration note.
type DemoStore = { id: string; name: string; owner: string; email: string; plan: string; status: "active" | "pending" | "inactive" };
type DemoSale = { id: string; store: string; amount: string; method: string; status: "approved" | "review" | "rejected"; date: string };

const demoStores: DemoStore[] = [
  { id: "PF-0001", name: "Café Central", owner: "María González", email: "maria@cafecentral.ve", plan: "Enterprise", status: "active" },
  { id: "PF-0002", name: "TechNova Store", owner: "Carlos Rivas", email: "carlos@technova.ve", plan: "Growth", status: "active" },
  { id: "PF-0003", name: "Moda Caracas", owner: "Valentina Pérez", email: "valentina@modacaracas.ve", plan: "Starter", status: "pending" },
  { id: "PF-0004", name: "Casa Verde", owner: "Andrés Molina", email: "andres@casaverde.ve", plan: "Growth", status: "inactive" },
];
const demoSales: DemoSale[] = [
  { id: "#ORD-84291", store: "Café Central", amount: "USD 86.50 / Bs. 3.156,42", method: "Pago Móvil", status: "approved", date: "Hoy, 10:42 AM" },
  { id: "#ORD-84290", store: "TechNova Store", amount: "USD 249.00 / Bs. 9.088,50", method: "Zelle", status: "review", date: "Hoy, 09:18 AM" },
  { id: "#ORD-84289", store: "Bodega 24/7", amount: "USD 42.00 / Bs. 1.533,00", method: "Binance Pay", status: "approved", date: "Ayer, 06:52 PM" },
  { id: "#ORD-84288", store: "Moda Caracas", amount: "USD 118.00 / Bs. 4.307,00", method: "Pago Móvil", status: "rejected", date: "Ayer, 04:31 PM" },
];
const demoUsers = [
  { name: "Bruno Superadmin", email: "bruno@pagofacil.com", role: "Super Admin", last: "Hace 4 min", status: "active" },
  { name: "María González", email: "maria@cafecentral.ve", role: "Lojista", last: "Hoy, 10:44 AM", status: "active" },
  { name: "Carlos Rivas", email: "carlos@technova.ve", role: "Lojista", last: "Ayer, 06:21 PM", status: "active" },
  { name: "Valentina Pérez", email: "valentina@modacaracas.ve", role: "Lojista", last: "Nunca", status: "pending" },
];

function DemoBadge({ children, tone }: { children: React.ReactNode; tone: "green" | "amber" | "slate" | "red" | "blue" }) {
  const styles = { green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", slate: "bg-slate-100 text-slate-600", red: "bg-rose-50 text-rose-700", blue: "bg-blue-50 text-blue-700" };
  return <span className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold " + styles[tone]}>{children}</span>;
}

function SectionFrame({ title, description, language, action, children }: { title: string; description: string; language: Language; action?: React.ReactNode; children: React.ReactNode }) {
  return <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-8"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">{language === "ES" ? "Gestión" : "Management"}</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{title}</h2><p className="mt-2 text-sm text-slate-500">{description}</p></div>{action}</div>{children}</main>;
}

function StoresView({ language, sourceStores }: { language: Language; sourceStores: StoreRow[] }) {
  const es = language === "ES";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const rows: DemoStore[] = sourceStores.length ? sourceStores.map((item) => ({ id: item.id.slice(0, 8).toUpperCase(), name: item.name, owner: item.email.split("@")[0], email: item.email, plan: "Growth", status: item.status === "suspended" ? "inactive" : item.status })) : demoStores;
  const filtered = rows.filter((row) => (row.name + row.owner + row.email).toLowerCase().includes(query.toLowerCase()) && (filter === "all" || row.status === filter));
  return <SectionFrame language={language} title={es ? "Tiendas" : "Stores"} description={es ? "Administra comercios, planes y accesos desde un solo lugar." : "Manage merchants, plans and access from one place."} action={<button type="button" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"><Plus className="h-4 w-4" />{es ? "Nueva tienda" : "New store"}</button>}><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/40"><div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={es ? "Buscar tienda, propietario o correo..." : "Search store, owner or email..."} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:bg-white" /></label><select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"><option value="all">{es ? "Todos los estados" : "All statuses"}</option><option value="active">{es ? "Activas" : "Active"}</option><option value="pending">{es ? "Pendientes" : "Pending"}</option><option value="inactive">{es ? "Inactivas" : "Inactive"}</option></select><button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Filter className="h-4 w-4" />{es ? "Filtros" : "Filters"}</button></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">ID</th><th className="px-5 py-4">{es ? "Nombre de la tienda" : "Store name"}</th><th className="px-5 py-4">{es ? "Propietario" : "Owner"}</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">{es ? "Estado" : "Status"}</th><th className="px-5 py-4 text-right">{es ? "Acciones" : "Actions"}</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-mono text-xs text-slate-500">{row.id}</td><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-xs font-bold text-emerald-700">{initials(row.name)}</div><div><p className="font-semibold text-slate-800">{row.name}</p><p className="text-xs text-slate-500">{row.email}</p></div></div></td><td className="px-5 py-4"><p className="font-medium text-slate-700">{row.owner}</p><p className="text-xs text-slate-400">{row.email}</p></td><td className="px-5 py-4"><DemoBadge tone={row.plan === "Enterprise" ? "blue" : row.plan === "Growth" ? "green" : "slate"}>{row.plan}</DemoBadge></td><td className="px-5 py-4"><DemoBadge tone={row.status === "active" ? "green" : row.status === "pending" ? "amber" : "slate"}>{row.status === "active" ? (es ? "Activa" : "Active") : row.status === "pending" ? (es ? "Pendiente" : "Pending") : (es ? "Inactiva" : "Inactive")}</DemoBadge></td><td className="px-5 py-4 text-right"><button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:bg-emerald-50">{row.status === "active" ? (es ? "Desactivar" : "Deactivate") : (es ? "Activar" : "Activate")}</button></td></tr>)}</tbody></table></div><div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">{es ? "Mostrando" : "Showing"} <b>{filtered.length}</b> {es ? "de" : "of"} <b>{rows.length}</b> {es ? "tiendas" : "stores"}</div></div></SectionFrame>;
}

function SettingsView({ language }: { language: Language }) {
  const es = language === "ES";
  const [tab, setTab] = useState<"api" | "payments">("api");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState({ openai: "", wahaUrl: "https://waha.pagofacil.local", wahaKey: "", zelle: "pagofacil@zelle.com", pagoMovil: "", binance: "" });
  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const field = (label: string, key: keyof typeof values, placeholder: string, secret = false) => <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><input type={secret ? "password" : "text"} value={values[key]} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-400 focus:bg-white" /></label>;
  const save = () => { setSaving(true); setSaved(false); window.setTimeout(() => { setSaving(false); setSaved(true); }, 900); };
  return <SectionFrame language={language} title={es ? "Configuración" : "Settings"} description={es ? "Ajustes centrales para integraciones y recepción de pagos." : "Core settings for integrations and payment collection."}><div className="grid gap-6 lg:grid-cols-[220px_1fr]"><div className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"><button type="button" onClick={() => setTab("api")} className={"flex w-full rounded-xl px-3 py-3 text-left text-sm font-semibold " + (tab === "api" ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50")}>{es ? "Credenciales de API" : "API credentials"}</button><button type="button" onClick={() => setTab("payments")} className={"flex w-full rounded-xl px-3 py-3 text-left text-sm font-semibold " + (tab === "payments" ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50")}>{es ? "Métodos de pago" : "Payment methods"}</button></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/40 sm:p-7"><div className="mb-6 flex justify-between"><div><h3 className="text-lg font-bold">{tab === "api" ? (es ? "Credenciales de API" : "API credentials") : (es ? "Métodos de pago globales" : "Global payment methods")}</h3><p className="mt-1 text-sm text-slate-500">{tab === "api" ? (es ? "Conecta OpenAI y WAHA con el panel." : "Connect OpenAI and WAHA to the panel.") : (es ? "Configura los datos de cobro de las tiendas." : "Configure merchant payment details.")}</p></div><ShieldCheck className="h-5 w-5 text-emerald-600" /></div>{tab === "api" ? <div className="grid gap-5 md:grid-cols-2">{field("OpenAI API Key", "openai", "sk-proj-••••••••", true)}{field("WAHA URL", "wahaUrl", "https://waha.example.com")}{field("WAHA API Key", "wahaKey", "waha_••••••••", true)}</div> : <div className="grid gap-5 md:grid-cols-2">{field("Zelle ID / correo", "zelle", "pagofacil@zelle.com")}{field(es ? "Datos de Pago Móvil" : "Pago Móvil details", "pagoMovil", es ? "Banco, teléfono y documento" : "Bank, phone and ID")}{field("Binance Pay ID", "binance", "binance_merchant_id")}</div>}<div className="mt-8 flex flex-col justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center"><p className="text-sm text-emerald-700">{saved ? (es ? "Cambios guardados correctamente." : "Changes saved successfully.") : (es ? "Los valores se almacenan de forma segura." : "Values are stored securely.")}</p><button type="button" disabled={saving} onClick={save} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70">{saving ? (es ? "Guardando..." : "Saving...") : (es ? "Guardar cambios" : "Save changes")}</button></div></div></div></SectionFrame>;
}

function AdminSectionView({ section, language, stores }: { section: string; language: Language; stores: StoreRow[] }) {
  if (section === "stores") return <StoresView language={language} sourceStores={stores} />;
  if (section === "sales") return <SalesView language={language} />;
  if (section === "users") return <UsersView language={language} />;
  if (section === "settings") return <SettingsView language={language} />;
  return null;
}
*/

function SectionPlaceholder({
  section,
  language,
  collapsed,
  onToggleCollapsed,
  onNavigate,
}: {
  section: string;
  language: Language;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate: (key: string) => void;
}) {
  const t = copy[language];
  const sectionCopy: Record<
    string,
    {
      title: string;
      description: string;
      icon: ComponentType<{ className?: string }>;
    }
  > = {
    stores: {
      title: language === "ES" ? "Tiendas" : "Stores",
      description:
        language === "ES"
          ? "Administra tus comercios, accesos y estados desde este espacio."
          : "Manage your merchants, access and statuses from this workspace.",
      icon: Store,
    },
    sales: {
      title: language === "ES" ? "Ventas" : "Sales",
      description:
        language === "ES"
          ? "Consulta el rendimiento y el movimiento de tus ventas."
          : "Review sales performance and activity.",
      icon: BarChart3,
    },
    users: {
      title: language === "ES" ? "Usuarios" : "Users",
      description:
        language === "ES"
          ? "Gestiona los usuarios y permisos de la plataforma."
          : "Manage platform users and permissions.",
      icon: Users,
    },
    settings: {
      title: t.settings,
      description:
        language === "ES"
          ? "Configura las preferencias generales de PagoFácil."
          : "Configure PagoFácil general preferences.",
      icon: Settings,
    },
    help: {
      title: t.help,
      description:
        language === "ES"
          ? "Encuentra respuestas y recursos para operar tu cuenta."
          : "Find answers and resources to operate your account.",
      icon: CircleHelp,
    },
  };
  const current = sectionCopy[section] ?? sectionCopy.stores;
  const Icon = current.icon;
  return (
    <div className="pf-corporate-background min-h-screen text-slate-950">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-800 bg-slate-950 px-4 py-5 text-slate-300 shadow-2xl shadow-slate-950/20 ${collapsed ? "lg:w-24" : ""}`}
      >
        <div
          className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}
        >
          <div className={collapsed ? "hidden" : "block"}>
            <BrandLogo
              className="h-20 w-56 object-contain brightness-0 invert"
              priority
            />
          </div>
          {collapsed && (
            <span className="text-xl font-black text-white">PF</span>
          )}
        </div>
        <nav className="mt-10 space-y-1" aria-label={t.principal}>
          {navItems.map(({ key, label, icon: NavIcon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${section === key ? "bg-emerald-400 font-semibold text-emerald-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"} ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? label[language] : undefined}
            >
              <NavIcon className="h-[18px] w-[18px] shrink-0" />
              <span className={collapsed ? "hidden" : ""}>
                {label[language]}
              </span>
            </button>
          ))}
        </nav>
        <p
          className={`mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 ${collapsed ? "hidden" : ""}`}
        >
          {t.system}
        </p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onNavigate("settings")}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${section === "settings" ? "bg-emerald-400 text-emerald-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"} ${collapsed ? "justify-center" : ""}`}
          >
            <Settings className="h-[18px] w-[18px]" />
            <span className={collapsed ? "hidden" : ""}>{t.settings}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("help")}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${section === "help" ? "bg-emerald-400 text-emerald-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"} ${collapsed ? "justify-center" : ""}`}
          >
            <CircleHelp className="h-[18px] w-[18px]" />
            <span className={collapsed ? "hidden" : ""}>{t.help}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="mt-auto hidden items-center justify-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white lg:flex"
        >
          <ChevronRight
            className={`h-4 w-4 ${collapsed ? "rotate-180" : ""}`}
          />
          <span className={collapsed ? "hidden" : ""}>{t.collapse}</span>
        </button>
      </aside>
      <main
        className={`${collapsed ? "lg:pl-24" : "lg:pl-72"} min-h-screen p-4 transition-[padding] duration-300 sm:p-8`}
      >
        <header className="flex h-16 items-center justify-between border-b border-slate-200/80 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
              {t.adminPanel}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              {current.title}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("overview")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
          >
            {t.overview}
          </button>
        </header>
        <section className="mx-auto flex max-w-4xl items-center justify-center py-24">
          <div className="w-full rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xl shadow-slate-200/40 sm:p-14">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Icon className="h-8 w-8" />
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
              {language === "ES" ? "Sección" : "Section"}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              {current.title}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
              {current.description}
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
              <Clock3 className="h-4 w-4" />
              {language === "ES"
                ? "Vista base lista para conectar"
                : "Base view ready to connect"}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function NewStoreModal({
  open,
  submitted,
  language,
  onCreateStore,
  onClose,
  onSubmit,
}: {
  open: boolean;
  submitted: boolean;
  language: Language;
  onCreateStore: ServerAction;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const t = copy[language];
  const es = language === "ES";
  const [plan, setPlan] = useState<PlanName>("Growth");
  const [customPrice, setCustomPrice] = useState("");
  const selectedPlan =
    planOptions.find((option) => option.name === plan) ?? planOptions[0];
  const planPrice = customPrice
    ? `US$${customPrice} / ${es ? "mes" : "month"}`
    : es
      ? "Precio a definir"
      : "Price to define";
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-store-title"
    >
      <div className="w-full max-w-lg rounded-3xl border border-white/20 bg-white p-6 shadow-2xl shadow-slate-950/30 sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Store className="h-6 w-6" />
            </div>
            <h2
              id="new-store-title"
              className="text-xl font-bold text-slate-950"
            >
              {t.newStoreTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t.newStoreDescription}
            </p>
          </div>
          <button
            type="button"
            aria-label={t.close}
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {submitted ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5" />
              {t.requestReady}
            </div>
            <p className="mt-2 text-emerald-700">{t.requestReadyDescription}</p>
          </div>
        ) : (
          <form
            action={async (formData) => {
              await onCreateStore(formData);
              onSubmit();
            }}
            className="mt-6 space-y-4"
          >
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                {t.ownerEmail}
              </span>
              <input
                required
                type="email"
                name="owner_email"
                placeholder={t.ownerEmailPlaceholder}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              />
            </label>
            <input type="hidden" name="plan_code" value={plan.toLowerCase()} />
            <input type="hidden" name="custom_price" value={customPrice} />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {es ? "Plan de suscripción" : "Subscription plan"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedPlan.description[language]}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {planPrice}
                </span>
              </div>
              <select
                value={plan}
                onChange={(event) => setPlan(event.target.value as PlanName)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
              >
                <option value="Growth">
                  Growth · {es ? "precio configurable" : "configurable price"}
                </option>
                <option value="Enterprise">
                  Enterprise ·{" "}
                  {es ? "precio configurable" : "configurable price"}
                </option>
              </select>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  {es
                    ? "Valor mensual del plan (US$)"
                    : "Monthly plan price (USD)"}
                </span>
                <input
                  required
                  min="0"
                  step="1"
                  type="number"
                  value={customPrice}
                  onChange={(event) => setCustomPrice(event.target.value)}
                  placeholder={plan === "Growth" ? "29" : "100"}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                />
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                {t.prepareInvite}
              </button>
            </div>
          </form>
        )}
        {submitted && (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              {t.close}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard({
  currentUser,
  stores,
  users,
  metrics,
  error,
  onToggleStatus,
  onCreateStore,
  onRenewSubscription,
  onInviteUser,
  onSignOut,
  exchangeRates,
}: Props) {
  const [language, setLanguage] = useState<Language>("ES");
  const t = copy[language];
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StoreStatus>("all");
  const [activeNav, setActiveNav] = useState("overview");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [newStoreOpen, setNewStoreOpen] = useState(false);
  const [newStoreSubmitted, setNewStoreSubmitted] = useState(false);
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);
  const [copiedStore, setCopiedStore] = useState<string | null>(null);
  const filteredStores = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return stores.filter(
      (store) =>
        (!normalized ||
          store.name.toLowerCase().includes(normalized) ||
          store.email.toLowerCase().includes(normalized)) &&
        (statusFilter === "all" || store.status === statusFilter),
    );
  }, [query, statusFilter, stores]);
  const activeNavLabel =
    navItems.find((item) => item.key === activeNav)?.label[language] ??
    t.overview;
  const closeMenus = () => {
    setLanguageOpen(false);
    setNotificationsOpen(false);
    setProfileOpen(false);
    setOpenRowMenu(null);
  };
  async function copyStoreUrl(slug: string) {
    if (navigator.clipboard)
      await navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
    setCopiedStore(slug);
    setOpenRowMenu(null);
    window.setTimeout(() => setCopiedStore(null), 1800);
  }

  if (activeNav !== "overview") {
    return (
      <SectionShell
        section={activeNav}
        language={language}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        onNavigate={setActiveNav}
        onSignOut={onSignOut}
      >
        <AdminSectionView
          section={activeNav}
          language={language}
          stores={stores}
          onCreateStore={onCreateStore}
          onRenewSubscription={onRenewSubscription}
          users={users}
          onInviteUser={onInviteUser}
        />
      </SectionShell>
    );
  }

  if (activeNav !== "overview") {
    return (
      <SectionPlaceholder
        section={activeNav}
        language={language}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        onNavigate={setActiveNav}
      />
    );
  }

  return (
    <div className="pf-corporate-background min-h-screen text-slate-950">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-800/80 bg-slate-950 px-4 py-5 text-slate-300 shadow-2xl shadow-slate-950/20 transition-all duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "lg:w-24" : ""}`}
      >
        <div
          className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}
        >
          <div className={collapsed ? "hidden" : "block"}>
            <BrandLogo
              className="h-20 w-56 object-contain brightness-0 invert"
              priority
            />
          </div>
          <div className="flex items-center gap-2">
            {collapsed && (
              <span className="text-xl font-black tracking-tight text-white">
                PF
              </span>
            )}
            <button
              type="button"
              aria-label={t.close}
              onClick={() => setSidebarOpen(false)}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div
          className={`mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 ${collapsed ? "justify-center" : ""}`}
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400 font-bold text-emerald-950 shadow-lg shadow-emerald-950/30">
            PF
          </div>
          <div className={collapsed ? "hidden" : "min-w-0"}>
            <p className="truncate text-sm font-semibold text-white">
              PagoFácil
            </p>
            <p className="text-xs text-slate-500">{t.overview}</p>
          </div>
        </div>
        <nav className="mt-8 space-y-1" aria-label={t.principal}>
          <p
            className={`mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 ${collapsed ? "hidden" : ""}`}
          >
            {t.principal}
          </p>
          {navItems.map(({ key, label, icon: Icon }) => {
            const active = activeNav === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveNav(key);
                  setSidebarOpen(false);
                }}
                title={collapsed ? label[language] : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all ${active ? "bg-emerald-400 font-semibold text-emerald-950 shadow-lg shadow-emerald-950/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"} ${collapsed ? "justify-center" : ""}`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className={collapsed ? "hidden" : ""}>
                  {label[language]}
                </span>
                {key === "sales" && !collapsed && (
                  <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                    New
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <p
          className={`mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 ${collapsed ? "hidden" : ""}`}
        >
          {t.system}
        </p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setActiveNav("settings")}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white ${collapsed ? "justify-center" : ""}`}
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            <span className={collapsed ? "hidden" : ""}>{t.settings}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveNav("help")}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white ${collapsed ? "justify-center" : ""}`}
          >
            <CircleHelp className="h-[18px] w-[18px] shrink-0" />
            <span className={collapsed ? "hidden" : ""}>{t.help}</span>
          </button>
        </div>
        <div className="mt-auto space-y-3">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="hidden w-full items-center justify-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white lg:flex"
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
            <span className={collapsed ? "hidden" : ""}>{t.collapse}</span>
          </button>
          <form action={onSignOut}>
            <button
              type="submit"
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300 ${collapsed ? "justify-center" : ""}`}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              <span className={collapsed ? "hidden" : ""}>{t.logout}</span>
            </button>
          </form>
        </div>
      </aside>
      {sidebarOpen && (
        <button
          type="button"
          aria-label={t.close}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/60 lg:hidden"
        />
      )}
      <div
        className={`min-h-screen transition-[padding] duration-300 ${collapsed ? "lg:pl-24" : "lg:pl-72"}`}
      >
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 shadow-sm shadow-slate-200/30 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={t.principal}
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                {t.adminPanel}
              </p>
              <h1 className="mt-0.5 text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
                {activeNavLabel}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="relative">
              <button
                type="button"
                aria-expanded={languageOpen}
                onClick={() => {
                  const next = !languageOpen;
                  closeMenus();
                  setLanguageOpen(next);
                }}
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
              >
                <Flag language={language} />
                <span>{language}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {languageOpen && (
                <div className="absolute right-0 top-12 z-30 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage("ES");
                      setLanguageOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold ${language === "ES" ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <Flag language="ES" />
                    Venezuela · ES
                    {language === "ES" && (
                      <Check className="ml-auto h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage("EN");
                      setLanguageOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold ${language === "EN" ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <Flag language="EN" />
                    United States · EN
                    {language === "EN" && (
                      <Check className="ml-auto h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                aria-expanded={notificationsOpen}
                aria-label={t.notifications}
                onClick={() => {
                  const next = !notificationsOpen;
                  closeMenus();
                  setNotificationsOpen(next);
                }}
                className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-30 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
                  <p className="font-semibold text-slate-900">
                    {t.notifications}
                  </p>
                  <div className="mt-3 flex gap-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{t.systemNormal}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="hidden h-7 w-px bg-slate-200 sm:block" />
            <div className="relative">
              <button
                type="button"
                aria-expanded={profileOpen}
                onClick={() => {
                  const next = !profileOpen;
                  closeMenus();
                  setProfileOpen(next);
                }}
                className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-slate-100"
              >
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-slate-800">
                    {t.administrator}
                  </p>
                  <p className="max-w-44 truncate text-xs text-slate-500">
                    {currentUser.email}
                  </p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-800 ring-4 ring-emerald-50">
                  <UserRound className="h-5 w-5" />
                </div>
                <ChevronDown
                  className={`hidden h-4 w-4 text-slate-400 transition sm:block ${profileOpen ? "rotate-180" : ""}`}
                />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-14 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
                  <form action={onSignOut}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      {t.logout}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] space-y-8 p-4 sm:p-8">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
            >
              <Activity className="h-4 w-4" />
              {error}
            </div>
          )}
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-slate-500">
                {new Intl.DateTimeFormat(
                  language === "ES" ? "es-VE" : "en-US",
                  { dateStyle: "long" },
                ).format(new Date())}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {t.greeting} <span aria-hidden="true">👋</span>
              </h2>
              <p className="mt-2 text-sm text-slate-500">{t.summary}</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              {t.online}
            </div>
          </section>
          <ExchangeRateWidget rates={exchangeRates} />
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={t.registeredStores}
              value={metrics.totalStores.toLocaleString(
                language === "ES" ? "es-VE" : "en-US",
              )}
              detail={t.totalBusiness}
              icon={Building2}
              accent="bg-blue-50 text-blue-600"
            />
            <KpiCard
              label={t.activeStores}
              value={metrics.activeStores.toLocaleString(
                language === "ES" ? "es-VE" : "en-US",
              )}
              detail={t.enabledAccounts}
              icon={ShieldCheck}
              accent="bg-emerald-50 text-emerald-600"
            />
            <KpiCard
              label={t.processedSales}
              value={currency.format(metrics.totalSales)}
              detail={t.verifiedOrders}
              icon={TrendingUp}
              accent="bg-violet-50 text-violet-600"
            />
            <KpiCard
              label={t.pendingOrders}
              value={metrics.pendingOrders.toLocaleString(
                language === "ES" ? "es-VE" : "en-US",
              )}
              detail={t.followUp}
              icon={Clock3}
              accent="bg-amber-50 text-amber-600"
            />
          </section>
          <section className="overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40">
            <div className="flex flex-col gap-5 border-b border-slate-200/80 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-950">
                    {t.directory}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    {stores.length} {t.total}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {t.directoryDescription}
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setNewStoreOpen(true);
                    setNewStoreSubmitted(false);
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  {t.newStore}
                </button>
                <label className="relative block sm:min-w-64">
                  <span className="sr-only">{t.search}</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t.search}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                  />
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "all" | StoreStatus)
                  }
                  aria-label={t.status}
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                >
                  <option value="all">{t.allStatuses}</option>
                  <option value="active">{t.activePlural}</option>
                  <option value="pending">{t.pendingPlural}</option>
                  <option value="suspended">{t.inactivePlural}</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">{t.store}</th>
                    <th className="px-6 py-4 font-semibold">{t.owner}</th>
                    <th className="px-6 py-4 font-semibold">{t.status}</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      {t.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStores.map((store) => {
                    const status = statusStyles(store.status, t);
                    const nextStatus =
                      store.status === "active" ? "suspended" : "active";
                    return (
                      <tr
                        key={store.id}
                        className="group transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-700">
                              {initials(store.name)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                {store.name}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                /{store.slug}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {store.email}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status.className}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                            />
                            {status.label}
                          </span>
                        </td>
                        <td className="relative px-6 py-4 text-right">
                          {store.status === "pending" ? (
                            <span className="text-xs font-medium text-slate-400">
                              {t.waitingProfile}
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              <form action={onToggleStatus}>
                                <input
                                  type="hidden"
                                  name="profile_id"
                                  value={store.ownerId}
                                />
                                <input
                                  type="hidden"
                                  name="status"
                                  value={nextStatus}
                                />
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                                >
                                  {store.status === "active"
                                    ? t.deactivate
                                    : t.activate}
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </button>
                              </form>
                              <div className="relative">
                                <button
                                  type="button"
                                  aria-label={`${t.actions} ${store.name}`}
                                  onClick={() =>
                                    setOpenRowMenu(
                                      openRowMenu === store.id
                                        ? null
                                        : store.id,
                                    )
                                  }
                                  className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                                {openRowMenu === store.id && (
                                  <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl shadow-slate-900/10">
                                    <button
                                      type="button"
                                      onClick={() => setOpenRowMenu(null)}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      {t.details}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => copyStoreUrl(store.slug)}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                      {copiedStore === store.slug
                                        ? t.copied
                                        : t.copyLink}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredStores.length && (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                    <Search className="h-5 w-5" />
                  </div>
                  <p className="mt-4 font-semibold text-slate-700">
                    {t.noStores}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{t.tryAgain}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                {t.showing}{" "}
                <span className="font-semibold text-slate-700">
                  {filteredStores.length}
                </span>{" "}
                {t.of}{" "}
                <span className="font-semibold text-slate-700">
                  {stores.length}
                </span>{" "}
                {t.directory.toLowerCase()}
              </p>
              <div className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                {t.synced}
              </div>
            </div>
          </section>
          <footer className="flex flex-col justify-between gap-2 pb-2 text-xs text-slate-400 sm:flex-row">
            <p>© 2026 PagoFácil. {t.footer}.</p>
            <p className="flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" />
              {t.operations}
            </p>
          </footer>
        </main>
      </div>
      <NewStoreModal
        open={newStoreOpen}
        submitted={newStoreSubmitted}
        language={language}
        onCreateStore={onCreateStore}
        onClose={() => setNewStoreOpen(false)}
        onSubmit={() => setNewStoreSubmitted(true)}
      />
    </div>
  );
}

function statusStyles(status: StoreStatus, t: Translation) {
  const labels = {
    active: t.active,
    pending: t.pending,
    suspended: t.inactive,
  };
  const styles = {
    active: {
      className: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
      dot: "bg-emerald-500",
    },
    pending: {
      className: "bg-amber-50 text-amber-700 ring-amber-600/10",
      dot: "bg-amber-500",
    },
    suspended: {
      className: "bg-slate-100 text-slate-600 ring-slate-600/10",
      dot: "bg-slate-400",
    },
  };
  return { label: labels[status], ...styles[status] };
}
