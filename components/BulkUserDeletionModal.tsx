import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

interface BulkUserDeletionModalProps {
  onClose: () => void;
  onDeleted: () => void;
}

type DeletionCriteria = 'unverified_email' | 'ghost_users' | 'inactive_date' | 'no_simulations_ever';

export const BulkUserDeletionModal: React.FC<BulkUserDeletionModalProps> = ({ onClose, onDeleted }) => {
  const [criteria, setCriteria] = useState<DeletionCriteria>('ghost_users');
  const [cutoffDate, setCutoffDate] = useState('');
  const [matchingUsers, setMatchingUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  // Set default cutoff date to 6 months ago for inactivity
  useEffect(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    setCutoffDate(date.toISOString().split('T')[0]);
  }, []);

  const handleSearch = async () => {
    setIsLoading(true);
    setMatchingUsers([]);
    setSelectedUsers(new Set());

    try {
      // Use the secure RPC function to get accurate data from auth.users
      const { data, error } = await supabase.rpc('get_candidates_for_deletion', {
        criteria,
        cutoff_date: (criteria === 'inactive_date' && cutoffDate) ? cutoffDate : null
      });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      const users = data || [];

      setMatchingUsers(users);
      // Por defecto seleccionar todos
      setSelectedUsers(new Set(users.map(u => u.id)));

      if (users.length > 0) {
        toast.success(`Se encontraron ${users.length} usuarios`);
      } else {
        toast('No se encontraron usuarios con este criterio', { icon: 'ℹ️' });
      }
    } catch (error: any) {
      console.error('Error searching users:', error);
      toast.error('Error buscando usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedUsers.size === matchingUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(matchingUsers.map(u => u.id)));
    }
  };

  const handleDelete = async () => {
    if (selectedUsers.size === 0) {
      toast.error('No has seleccionado ningún usuario para eliminar');
      return;
    }

    if (confirmationText !== 'ELIMINAR') {
      toast.error('Por favor escribe ELIMINAR para confirmar');
      return;
    }

    setIsLoading(true);
    try {
      const userIds = Array.from(selectedUsers);

      // Usar la función RPC 'delete_users' que elimina de simulaciones, profiles y auth.users
      const { error: deleteError } = await supabase.rpc('delete_users', {
        user_ids: userIds
      });

      if (deleteError) throw deleteError;

      toast.success(`✅ ${userIds.length} usuarios eliminados correctamente`);
      onDeleted();
      onClose();
    } catch (error: any) {
      console.error('Error deleting users:', error);
      toast.error('Error eliminando usuarios: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">cleaning_services</span>
              Mantenimiento y Limpieza de Usuarios
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Herramienta avanzada para depurar la base de datos
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar: Filtros */}
          <div className="w-1/3 p-5 border-r border-slate-200 bg-slate-50 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Criterios de Búsqueda</h3>

            <div className="space-y-3">
              <FilterOption
                id="ghost_users"
                title="👻 Usuarios Fantasma"
                description="Registrados hace >30 días sin ningún simulacro realizado."
                active={criteria === 'ghost_users'}
                onClick={() => setCriteria('ghost_users')}
              />
              <FilterOption
                id="unverified_email"
                title="✉️ Email No Verificado"
                description="Usuarios que nunca confirmaron su correo electrónico."
                active={criteria === 'unverified_email'}
                onClick={() => setCriteria('unverified_email')}
              />
              <FilterOption
                id="inactive_date"
                title="💤 Inactividad"
                description="Usuarios que no han ingresado desde X fecha."
                active={criteria === 'inactive_date'}
                onClick={() => setCriteria('inactive_date')}
              />
              <FilterOption
                id="no_simulations_ever"
                title="📉 Sin Simulacros"
                description="Cualquier usuario que nunca haya hecho un simulacro."
                active={criteria === 'no_simulations_ever'}
                onClick={() => setCriteria('no_simulations_ever')}
              />
            </div>

            {criteria === 'inactive_date' && (
              <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                <label className="block text-xs font-bold text-slate-600 mb-2">Sin ingresar desde:</label>
                <input
                  type="date"
                  value={cutoffDate}
                  onChange={(e) => setCutoffDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            )}

            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="w-full mt-6 bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isLoading ? (
                <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-sm">search</span>
              )}
              Buscar Candidatos
            </button>
          </div>

          {/* Main Area: Resultados */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {matchingUsers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-4xl">person_search</span>
                </div>
                <h4 className="text-lg font-bold text-slate-600">Esperando búsqueda</h4>
                <p className="max-w-xs mt-2 text-sm">Selecciona un criterio a la izquierda y busca usuarios para limpiar.</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-slate-200 bg-red-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-600">warning</span>
                    <span className="font-bold text-red-900">{matchingUsers.length} usuarios encontrados</span>
                  </div>
                  <div className="text-sm text-red-700">
                    <span className="font-bold">{selectedUsers.size}</span> seleccionados para eliminar
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedUsers.size === matchingUsers.length && matchingUsers.length > 0}
                            onChange={toggleAllSelection}
                            className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                          />
                        </th>
                        <th className="p-3 text-left font-bold text-slate-600">Usuario</th>
                        <th className="p-3 text-left font-bold text-slate-600">Email</th>
                        <th className="p-3 text-left font-bold text-slate-600">Registro</th>
                        <th className="p-3 text-left font-bold text-slate-600">Último Acceso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {matchingUsers.map(user => (
                        <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${selectedUsers.has(user.id) ? 'bg-red-50/30' : ''}`}>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user.id)}
                              onChange={() => toggleUserSelection(user.id)}
                              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-slate-900">{user.name || 'Sin nombre'}</div>
                            <div className="text-xs text-slate-400 capitalize">{user.role || 'Usuario'}</div>
                          </td>
                          <td className="p-3 text-slate-600 font-mono text-xs cursor-text select-text">{user.email}</td>
                          <td className="p-3 text-slate-500 text-xs">
                            {new Date(user.created_at).toLocaleDateString('es-CO')}
                          </td>
                          <td className="p-3 text-slate-500 text-xs">
                            {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('es-CO') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-slate-200 bg-white">
                  {!showConfirmation ? (
                    <button
                      onClick={() => setShowConfirmation(true)}
                      disabled={selectedUsers.size === 0}
                      className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">delete</span>
                      Preparar Eliminación ({selectedUsers.size})
                    </button>
                  ) : (
                    <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                      <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Para confirmar, escribe <span className="text-red-600 font-black">ELIMINAR</span> abajo:
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="ELIMINAR"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            className="flex-1 p-3 border-2 border-red-200 rounded-lg focus:border-red-500 focus:ring-red-500 outline-none font-bold text-red-900 placeholder:text-red-200"
                          />
                          <button
                            onClick={() => {
                              setShowConfirmation(false);
                              setConfirmationText('');
                            }}
                            className="px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 font-bold"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={handleDelete}
                        disabled={confirmationText !== 'ELIMINAR' || isLoading}
                        className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-200 scale-100 active:scale-95 transition-all"
                      >
                        {isLoading ? 'Eliminando...' : `🗑️ CONFIRMAR Y ELIMINAR ${selectedUsers.size} USUARIOS`}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterOption = ({ id, title, description, active, onClick }: { id: string, title: string, description: string, active: boolean, onClick: () => void }) => (
  <div
    onClick={onClick}
    className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${active
      ? 'border-slate-800 bg-white shadow-md scale-[1.02]'
      : 'border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm'
      }`}
  >
    <div className={`font-bold ${active ? 'text-slate-900' : 'text-slate-600'}`}>{title}</div>
    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</div>
  </div>
);
