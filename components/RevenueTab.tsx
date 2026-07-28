import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { supabase } from '../services/supabase';
import { ExpandableChart } from './ChartModal';

interface Transaction {
    id: string;
    user_id: string;
    plan_name: 'basico' | 'intermedio' | 'avanzado';
    amount_in_cents: number;
    currency: string;
    status: string;
    payment_method_type: string | null;
    includes_interview: boolean;
    created_at: string;
    updated_at: string;
    email?: string;
    name?: string;
}

// -----------------------------------------------------------------------------
// Configuración de comisiones Wompi (Plan Avanzado): 2.65% + $700 + IVA (19%)
// La comisión se calcula por transacción exitosa. El IVA aplica sobre la comisión.
// Si tu plan cambia, ajusta estos valores.
// -----------------------------------------------------------------------------
const WOMPI_FEE = {
    percent: 0.0265,   // 2.65 %
    fixed: 700,        // $700 COP por transacción
    iva: 0.19          // IVA 19 % sobre la comisión
};

/** Comisión total (con IVA) en pesos para un monto dado en pesos. */
const wompiFee = (amountPesos: number): number =>
    (amountPesos * WOMPI_FEE.percent + WOMPI_FEE.fixed) * (1 + WOMPI_FEE.iva);

const PLAN_LABELS: Record<string, string> = {
    basico: 'Básico',
    intermedio: 'Intermedio',
    avanzado: 'Avanzado'
};

const PLAN_COLORS: Record<string, string> = {
    basico: '#64748b',      // slate
    intermedio: '#3b82f6',  // blue
    avanzado: '#f59e0b'     // amber
};

const formatCOP = (pesos: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Math.round(pesos || 0));

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const RevenueTab: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showManage, setShowManage] = useState(false);
    const [manageSearch, setManageSearch] = useState('');
    const [refundingId, setRefundingId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            // Traer transacciones APROBADAS y REEMBOLSADAS (paginado por si son muchas).
            // Las reembolsadas se muestran pero NO cuentan como ingreso.
            const PAGE = 1000;
            let all: Transaction[] = [];
            let from = 0;
            while (true) {
                const { data, error } = await supabase
                    .from('transactions')
                    .select('*')
                    .in('status', ['APPROVED', 'REFUNDED'])
                    .order('created_at', { ascending: true })
                    .range(from, from + PAGE - 1);
                if (error) throw error;
                if (!data || data.length === 0) break;
                all = all.concat(data as Transaction[]);
                if (data.length < PAGE) break;
                from += PAGE;
            }

            // Traer el correo/nombre de los usuarios involucrados para identificarlos.
            const userIds = [...new Set(all.map(t => t.user_id))];
            const emailById: Record<string, { email?: string; name?: string }> = {};
            for (let i = 0; i < userIds.length; i += 300) {
                const { data: profs } = await supabase
                    .from('profiles')
                    .select('id, email, name')
                    .in('id', userIds.slice(i, i + 300));
                (profs || []).forEach((p: any) => { emailById[p.id] = { email: p.email, name: p.name }; });
            }
            all = all.map(t => ({ ...t, email: emailById[t.user_id]?.email, name: emailById[t.user_id]?.name }));

            setTransactions(all);
        } catch (error: any) {
            console.error('Error cargando transacciones:', error);
            toast.error('Error cargando ingresos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleRefund = async (tx: Transaction, refunded: boolean) => {
        const verb = refunded ? 'marcar como REEMBOLSADA' : 'restaurar como ingreso';
        if (!confirm(`¿Seguro que deseas ${verb} la compra de ${tx.email || tx.user_id} por ${formatCOP((tx.amount_in_cents || 0) / 100)}?`)) return;
        setRefundingId(tx.id);
        try {
            const { error } = await supabase.rpc('set_transaction_refunded', {
                p_transaction_id: tx.id,
                p_refunded: refunded
            });
            if (error) throw error;
            toast.success(refunded ? 'Transacción marcada como reembolsada.' : 'Transacción restaurada.');
            await load();
        } catch (error: any) {
            console.error('Error actualizando reembolso:', error);
            toast.error(error?.message?.includes('Unauthorized')
                ? 'No tienes permisos de administrador.'
                : 'Error al actualizar la transacción.');
        } finally {
            setRefundingId(null);
        }
    };

    const metrics = useMemo(() => {
        let gross = 0;
        let fees = 0;
        const payingUsers = new Set<string>();
        const byPlan: Record<string, { count: number; gross: number; net: number; users: Set<string> }> = {
            basico: { count: 0, gross: 0, net: 0, users: new Set() },
            intermedio: { count: 0, gross: 0, net: 0, users: new Set() },
            avanzado: { count: 0, gross: 0, net: 0, users: new Set() }
        };
        const byMonth: Record<string, { gross: number; net: number; count: number }> = {};

        // Reembolsos: se muestran aparte y NO cuentan como ingreso.
        let refundedCount = 0;
        let refundedGross = 0;
        for (const tx of transactions) {
            if (tx.status === 'REFUNDED') {
                refundedCount++;
                refundedGross += (tx.amount_in_cents || 0) / 100;
            }
        }

        // Solo las APROBADAS suman ingresos.
        const approved = transactions.filter(t => t.status === 'APPROVED');

        for (const tx of approved) {
            const pesos = (tx.amount_in_cents || 0) / 100;
            const fee = wompiFee(pesos);
            const net = pesos - fee;
            gross += pesos;
            fees += fee;
            payingUsers.add(tx.user_id);

            const plan = byPlan[tx.plan_name] || byPlan.basico;
            plan.count++;
            plan.gross += pesos;
            plan.net += net;
            plan.users.add(tx.user_id);

            const d = new Date(tx.updated_at || tx.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!byMonth[key]) byMonth[key] = { gross: 0, net: 0, count: 0 };
            byMonth[key].gross += pesos;
            byMonth[key].net += net;
            byMonth[key].count++;
        }

        const monthly = Object.entries(byMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, v]) => {
                const [y, m] = key.split('-');
                return {
                    label: `${MONTH_LABELS[parseInt(m, 10) - 1]} ${y.slice(2)}`,
                    Bruto: Math.round(v.gross),
                    Neto: Math.round(v.net),
                    Transacciones: v.count
                };
            });

        const planRows = Object.entries(byPlan).map(([id, v]) => ({
            id,
            label: PLAN_LABELS[id],
            color: PLAN_COLORS[id],
            count: v.count,
            users: v.users.size,
            gross: v.gross,
            net: v.net
        }));

        return {
            gross,
            fees,
            net: gross - fees,
            count: approved.length,
            payingUsers: payingUsers.size,
            planRows,
            monthly,
            refundedCount,
            refundedGross
        };
    }, [transactions]);

    if (loading) {
        return <div className="p-10 text-center text-slate-500">Cargando ingresos...</div>;
    }

    if (transactions.length === 0) {
        return (
            <div className="p-16 text-center text-slate-400">
                <span className="material-symbols-outlined text-5xl mb-2">payments</span>
                <p className="font-bold text-slate-500">Aún no hay pagos aprobados registrados.</p>
                <p className="text-sm mt-1">Los ingresos aparecerán aquí cuando se procesen transacciones exitosas.</p>
            </div>
        );
    }

    const planPieData = metrics.planRows.filter(p => p.count > 0);

    return (
        <div className="overflow-y-auto pb-6">
            {/* Barra superior: gestión de transacciones/reembolsos */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="text-sm text-slate-500">
                    {metrics.refundedCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg font-bold">
                            <span className="material-symbols-outlined text-base">undo</span>
                            {metrics.refundedCount} reembolso{metrics.refundedCount > 1 ? 's' : ''} excluido{metrics.refundedCount > 1 ? 's' : ''} ({formatCOP(metrics.refundedGross)})
                        </span>
                    ) : (
                        <span className="text-slate-400">Sin reembolsos registrados.</span>
                    )}
                </div>
                <button
                    onClick={() => setShowManage(true)}
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">receipt_long</span>
                    Gestionar transacciones / Reembolsos
                </button>
            </div>

            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-5 rounded-xl border border-border-light shadow-sm">
                    <h3 className="text-slate-500 font-bold text-xs uppercase mb-1">Ingreso Bruto</h3>
                    <p className="text-2xl font-black text-[#0d141c]">{formatCOP(metrics.gross)}</p>
                    <p className="text-xs text-slate-400 mt-1">{metrics.count} transacciones exitosas</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-border-light shadow-sm">
                    <h3 className="text-slate-500 font-bold text-xs uppercase mb-1">Comisiones Wompi</h3>
                    <p className="text-2xl font-black text-red-500">-{formatCOP(metrics.fees)}</p>
                    <p className="text-xs text-slate-400 mt-1">2.65% + $700 + IVA por transacción</p>
                </div>
                <div className="bg-white p-5 rounded-xl border-2 border-green-200 shadow-sm bg-green-50/40">
                    <h3 className="text-green-700 font-bold text-xs uppercase mb-1">Neto Recibido</h3>
                    <p className="text-2xl font-black text-green-700">{formatCOP(metrics.net)}</p>
                    <p className="text-xs text-green-600/70 mt-1">Lo que llega a tu cuenta</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-border-light shadow-sm">
                    <h3 className="text-slate-500 font-bold text-xs uppercase mb-1">Usuarios que Pagaron</h3>
                    <p className="text-2xl font-black text-primary">{metrics.payingUsers}</p>
                    <p className="text-xs text-slate-400 mt-1">Clientes únicos</p>
                </div>
            </div>

            {/* Gráficas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {/* Neto por plan (barras) */}
                <ExpandableChart
                    title="Ingreso Neto por Plan"
                    subtitle="Dinero recibido (después de comisiones) según el plan comprado"
                    chart={(h) => (
                        <ResponsiveContainer width="100%" height={h}>
                            <BarChart data={metrics.planRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(v: number) => formatCOP(v)} />
                                <Legend />
                                <Bar dataKey="net" name="Neto" radius={[6, 6, 0, 0]}>
                                    {metrics.planRows.map((p) => (
                                        <Cell key={p.id} fill={p.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                />

                {/* Distribución de transacciones por plan (pie) */}
                <ExpandableChart
                    title="Transacciones por Plan"
                    subtitle="Cuántas compras se hicieron de cada plan"
                    chart={(h) => (
                        <ResponsiveContainer width="100%" height={h}>
                            <PieChart>
                                <Pie
                                    data={planPieData}
                                    dataKey="count"
                                    nameKey="label"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius="75%"
                                    label={(entry: any) => `${entry.label}: ${entry.count}`}
                                >
                                    {planPieData.map((p) => (
                                        <Cell key={p.id} fill={p.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: number, _n: string, item: any) => [`${v} compras`, item?.payload?.label]} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                />

                {/* Evolución mensual */}
                <ExpandableChart
                    title="Evolución de Ingresos (mensual)"
                    subtitle="Bruto vs Neto por mes"
                    className="lg:col-span-2"
                    chart={(h) => (
                        <ResponsiveContainer width="100%" height={h}>
                            <LineChart data={metrics.monthly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(v: number) => formatCOP(v)} />
                                <Legend />
                                <Line type="monotone" dataKey="Bruto" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="Neto" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                />
            </div>

            {/* Tabla detalle por plan */}
            <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border-light bg-slate-50 font-bold text-slate-600">
                    Detalle por Plan
                </div>
                <div className="overflow-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold">
                            <tr>
                                <th className="p-4">Plan</th>
                                <th className="p-4 text-center">Compras</th>
                                <th className="p-4 text-center">Usuarios</th>
                                <th className="p-4 text-right">Bruto</th>
                                <th className="p-4 text-right">Comisión</th>
                                <th className="p-4 text-right">Neto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {metrics.planRows.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="p-4">
                                        <span className="inline-flex items-center gap-2 font-bold text-[#0d141c]">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                                            {p.label}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">{p.count}</td>
                                    <td className="p-4 text-center">{p.users}</td>
                                    <td className="p-4 text-right text-slate-600">{formatCOP(p.gross)}</td>
                                    <td className="p-4 text-right text-red-500">-{formatCOP(p.gross - p.net)}</td>
                                    <td className="p-4 text-right font-bold text-green-700">{formatCOP(p.net)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-black text-[#0d141c]">
                            <tr>
                                <td className="p-4">TOTAL</td>
                                <td className="p-4 text-center">{metrics.count}</td>
                                <td className="p-4 text-center">{metrics.payingUsers}</td>
                                <td className="p-4 text-right">{formatCOP(metrics.gross)}</td>
                                <td className="p-4 text-right text-red-600">-{formatCOP(metrics.fees)}</td>
                                <td className="p-4 text-right text-green-700">{formatCOP(metrics.net)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <p className="text-xs text-slate-400 mt-3">
                * El neto es una estimación aplicando la comisión de Wompi (2.65% + $700 + IVA) a cada transacción exitosa.
                No incluye retenciones tributarias ni otros descuentos que tu banco/adquirente pueda aplicar.
            </p>

            {/* MODAL: Gestionar transacciones / reembolsos */}
            {showManage && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setShowManage(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-black text-[#0d141c]">Transacciones y Reembolsos</h3>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    Marca una compra como reembolsada para que deje de sumar en los ingresos.
                                </p>
                            </div>
                            <button onClick={() => setShowManage(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-4 border-b border-slate-100">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                <input
                                    type="text"
                                    placeholder="Buscar por correo, nombre o plan..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    value={manageSearch}
                                    onChange={(e) => setManageSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                                    <tr>
                                        <th className="p-3">Usuario</th>
                                        <th className="p-3">Plan</th>
                                        <th className="p-3 text-right">Monto</th>
                                        <th className="p-3">Fecha</th>
                                        <th className="p-3 text-center">Estado</th>
                                        <th className="p-3 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {[...transactions]
                                        .filter(tx => {
                                            const t = manageSearch.trim().toLowerCase();
                                            if (!t) return true;
                                            return (
                                                tx.email?.toLowerCase().includes(t) ||
                                                tx.name?.toLowerCase().includes(t) ||
                                                (PLAN_LABELS[tx.plan_name] || tx.plan_name).toLowerCase().includes(t)
                                            );
                                        })
                                        .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
                                        .map(tx => {
                                            const refunded = tx.status === 'REFUNDED';
                                            return (
                                                <tr key={tx.id} className={`hover:bg-slate-50 ${refunded ? 'bg-rose-50/40' : ''}`}>
                                                    <td className="p-3">
                                                        <div className="font-bold text-[#0d141c] max-w-[220px] truncate" title={tx.email}>{tx.email || '—'}</div>
                                                        <div className="text-xs text-slate-400">{tx.name || tx.user_id.substring(0, 8)}</div>
                                                    </td>
                                                    <td className="p-3">{PLAN_LABELS[tx.plan_name] || tx.plan_name}</td>
                                                    <td className="p-3 text-right font-bold">{formatCOP((tx.amount_in_cents || 0) / 100)}</td>
                                                    <td className="p-3 text-slate-500">
                                                        {new Date(tx.updated_at || tx.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${refunded ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>
                                                            {refunded ? 'Reembolsada' : 'Ingreso'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        {refunded ? (
                                                            <button
                                                                onClick={() => handleRefund(tx, false)}
                                                                disabled={refundingId === tx.id}
                                                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                                                            >
                                                                {refundingId === tx.id ? '...' : 'Restaurar'}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleRefund(tx, true)}
                                                                disabled={refundingId === tx.id}
                                                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                                                            >
                                                                {refundingId === tx.id ? '...' : 'Marcar reembolso'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-amber-50 text-xs text-amber-800">
                            💡 Marcar un reembolso solo lo excluye del reporte de ingresos. Si además quieres quitarle el
                            plan Premium al usuario, hazlo en <strong>Usuarios y Métricas → Ver Detalles</strong>.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
