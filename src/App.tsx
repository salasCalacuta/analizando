/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Logo } from './components/Logo';
import { Paciente, Pago, SesionHistorial, Turno, Profesional, ReporteError } from './types';
import { getPacientes } from './services/storage';

export default function App() {
  const [screen, setScreen] = useState('inicio');
  const [history, setHistory] = useState<string[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  
  // Estado para el formulario de paciente
  const [pacienteForm, setPacienteForm] = useState<Partial<Paciente>>({
    id: '',
    clave: '',
    nombre: '',
    telefono: '',
    afiliado: '',
    email: '',
    fechaInicio: '',
    obraSocial: 'Particular',
    token: '',
    comprobanteCargado: false,
    valorSesion: 0,
    historialClinicoPrevio: '',
    historialSesiones: [],
    pagos: [],
    deuda: 0,
  });
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacientesSubScreen, setPacientesSubScreen] = useState<'alta' | 'listado'>('alta');
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [pagoForm, setPagoForm] = useState<Partial<Pago>>({
    monto: 0,
    metodo: 'Transf Bancaria',
    numeroComprobante: '',
  });
  const [emailUser, setEmailUser] = useState('');
  const [emailDomain, setEmailDomain] = useState('gmail.com');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Estados Agenda
  const [agendaWeek, setAgendaWeek] = useState<'actual' | 'proxima'>('actual');
  const [agendaDayIdx, setAgendaDayIdx] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1); // 0-6 (Mon-Sun)
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [activeSession, setActiveSession] = useState<Turno | null>(null);
  const [sessionNote, setSessionNote] = useState('');
  const [quickTurnoForm, setQuickTurnoForm] = useState({ pacienteId: '', fecha: '', hora: '' });

  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [reportes, setReportes] = useState<ReporteError[]>([]);
  const [adminTab, setAdminTab] = useState<'profesionales' | 'abonos' | 'reportes'>('profesionales');
  const [currentProfesional, setCurrentProfesional] = useState<Profesional | null>(null);
  const [currentPaciente, setCurrentPaciente] = useState<Paciente | null>(null);

  const [searchFilters, setSearchFilters] = useState({ nombre: '', id: '', fechaInicio: '', fechaFin: '' });
  const [activeAlerts, setActiveAlerts] = useState<{ id: string; message: string }[]>([]);

  const [adminLoginForm, setAdminLoginForm] = useState({ usuario: '', clave: '' });
  const [proLoginForm, setProLoginForm] = useState({ id: '', clave: '' });
  const [pacLoginForm, setPacLoginForm] = useState({ id: '', clave: '' });

  const fetchFromDB = async () => {
    try {
      const { data: turnos, error: turnosError } = await supabase.from('turnos').select('*');
      if (turnosError) console.error('Turnos error:', turnosError.message);
      
      const { data: pacientes, error: pacientesError } = await supabase.from('pacientes').select('*');
      if (pacientesError) console.error('Pacientes error:', pacientesError.message);
      
      const { data: profesionales, error: profesionalesError } = await supabase.from('profesionales').select('*');
      if (profesionalesError) console.error('Profesionales error:', profesionalesError.message);
      
      const { data: reportes, error: reportesError } = await supabase.from('reportes').select('*');
      if (reportesError) console.error('Reportes error:', reportesError.message);

      if (turnosError || pacientesError || profesionalesError || reportesError) throw new Error('Error fetching from Supabase');

      setTurnos(turnos || []);
      setPacientes(pacientes || []);
      setProfesionales(profesionales || []);
      setReportes(reportes || []);
      console.log('Datos cargados desde Supabase');
    } catch (error) {
      console.error('Error fetching from Supabase, falling back to localStorage:', error);
      const db = JSON.parse(localStorage.getItem('analizandome_v162') || '{"pacientes":[],"turnos":[],"profesionales":[],"reportes":[],"config":{}}');
      setTurnos(db.turnos || []);
      setPacientes(db.pacientes || []);
      setProfesionales(db.profesionales || []);
      setReportes(db.reportes || []);
    }
  };

  useEffect(() => {
    // Request notification permission
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    fetchFromDB();
    
    const interval = setInterval(() => {
      const now = new Date();
      turnos.forEach(turno => {
        if (turno.estado === 'agendado') {
          const [hora, min] = turno.hora.split(':').map(Number);
          const turnoDate = new Date(turno.fecha);
          turnoDate.setHours(hora, min);
          
          const diff = (turnoDate.getTime() - now.getTime()) / 60000;
          if (diff > 0 && diff <= 2 && !activeAlerts.find(a => a.id === turno.id)) {
            const paciente = pacientes.find(p => p.id === turno.pacienteId);
            const message = `Turno en 2 minutos: ${turno.hora} con paciente ${paciente?.nombre || 'Desconocido'}`;
            setActiveAlerts(prev => [...prev, { id: turno.id, message }]);
            
            // Trigger push notification
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("AnalizandoV1.64 - Turno Próximo", { body: message });
            }
          }
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const saveToDB = async (data: { pacientes?: Paciente[], turnos?: Turno[], profesionales?: Profesional[], reportes?: ReporteError[] }) => {
    try {
      if (data.turnos) await supabase.from('turnos').upsert(data.turnos);
      if (data.pacientes) await supabase.from('pacientes').upsert(data.pacientes);
      if (data.profesionales) await supabase.from('profesionales').upsert(data.profesionales);
      if (data.reportes) await supabase.from('reportes').upsert(data.reportes);
      console.log('Sincronizado con Supabase');
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      // Fallback to localStorage if Supabase fails
      const db = JSON.parse(localStorage.getItem('analizandome_v162') || '{"pacientes":[],"turnos":[],"profesionales":[],"reportes":[],"config":{}}');
      const newDB = { ...db, ...data };
      localStorage.setItem('analizandome_v162', JSON.stringify(newDB));
    }
  };

  const navigateTo = (newScreen: string) => {
    setHistory([...history, screen]);
    setScreen(newScreen);
  };

  const navigateBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(history.slice(0, -1));
      setScreen(prev);
    }
  };

  // useEffect para modo oscuro eliminado

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleSavePaciente = () => {
    showConfirm('Guardar Paciente', '¿Desea guardar los datos del paciente?', () => {
      // Validaciones robustas
      const email = `${emailUser}@${emailDomain}`;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const dateRegex = /^\d{2}\/\d{2}\/\d{2}$/;
      const idRegex = /^[a-zA-Z0-9]+$/;

      if (!pacienteForm.nombre || pacienteForm.nombre.trim().length < 3) {
        setError('Nombre y apellido inválido (mínimo 3 caracteres)');
        return;
      }
      if (!idRegex.test(pacienteForm.id || '')) {
        setError('ID debe ser alfanumérico');
        return;
      }
      if (!idRegex.test(pacienteForm.clave || '')) {
        setError('Clave ID debe ser alfanumérica');
        return;
      }
      if (!/^\d{10}$/.test(pacienteForm.telefono || '')) {
        setError('El teléfono debe tener exactamente 10 dígitos numéricos');
        return;
      }
      if (!emailRegex.test(email)) {
        setError('Formato de email inválido');
        return;
      }
      if (!dateRegex.test(pacienteForm.fechaInicio || '')) {
        setError('Fecha de inicio debe tener formato dd/mm/aa');
        return;
      }
      
      const newPaciente: Paciente = {
        ...(pacienteForm as Paciente),
        id: pacienteForm.id!,
        email: email,
        historialSesiones: [],
        pagos: [],
        deuda: 0,
      };

      const updatedPacientes = [...pacientes, newPaciente];
      setPacientes(updatedPacientes);
      saveToDB({ pacientes: updatedPacientes });
      
      setError('');
      showNotification('Paciente guardado con éxito');
      setPacientesSubScreen('listado');
      setPacienteForm({
        id: '', clave: '', nombre: '', telefono: '', afiliado: '', email: '',
        fechaInicio: '', obraSocial: 'Particular', token: '',
        valorSesion: 0, historialClinicoPrevio: '',
        historialSesiones: [], pagos: [], deuda: 0
      });
      setEmailUser('');
    });
  };

  const handleAddPago = (pacienteId: string) => {
    showConfirm('Registrar Pago', '¿Registrar este pago?', () => {
      if (!pagoForm.monto || !pagoForm.numeroComprobante) {
        setError('Monto y número de comprobante son obligatorios');
        return;
      }

      const updatedPacientes = pacientes.map(p => {
        if (p.id === pacienteId) {
          const newPago: Pago = {
            fecha: new Date().toLocaleDateString(),
            monto: pagoForm.monto!,
            metodo: pagoForm.metodo!,
            numeroComprobante: pagoForm.numeroComprobante!,
          };
          return {
            ...p,
            pagos: [...p.pagos, newPago],
            deuda: p.deuda - newPago.monto,
          };
        }
        return p;
      });

      setPacientes(updatedPacientes);
      saveToDB({ pacientes: updatedPacientes });
      setPagoForm({ monto: 0, metodo: 'Transf Bancaria', numeroComprobante: '' });
      showNotification('Pago registrado');
    });
  };

  const handleDeletePaciente = (id: string) => {
    showConfirm('Eliminar Paciente', '¿ESTÁ SEGURO DE ELIMINAR AL PACIENTE? Esta acción no se puede deshacer.', () => {
      const updatedPacientes = pacientes.filter(p => p.id !== id);
      setPacientes(updatedPacientes);
      saveToDB({ pacientes: updatedPacientes });
      setSelectedPaciente(null);
      showNotification('Paciente eliminado');
    });
  };

  // Lógica Agenda
  const getWeekDates = (offset: number = 0) => {
    const now = new Date();
    const day = now.getDay() || 7; // 1-7
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1) + (offset * 7));
    
    const dates = [];
    for (let i = 0; i < 5; i++) { // Solo lunes a viernes
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const currentWeekDates = getWeekDates(agendaWeek === 'actual' ? 0 : 1);
  const selectedDate = currentWeekDates[agendaDayIdx];
  const dateStr = selectedDate.toISOString().split('T')[0];

  const handleSaveTurno = (hora: string, pacienteId: string, fecha: string = dateStr) => {
    showConfirm('Confirmar Turno', `¿Confirmar turno a las ${hora} el ${fecha}?`, () => {
      const newTurno: Turno = {
        id: Math.random().toString(36).substr(2, 9),
        pacienteId,
        fecha: fecha,
        hora,
        estado: pacienteId ? 'agendado' : 'libre',
        aprobado: true,
        salaJitsi: `Analizandome_${pacienteId}`
      };

      const [h, m] = hora.split(':');
      
      // Check if a turno already exists and is agendado
      const existingTurno = turnos.find(t => t.fecha === fecha && t.hora === hora);
      if (existingTurno && existingTurno.estado === 'agendado') {
        showNotification('El turno ya está asignado. No se puede sobreescribir.', 'error');
        return;
      }

      let filteredTurnos = turnos.filter(t => !(t.fecha === fecha && t.hora === hora));
      
      if (m !== '00') {
        const punctualHora = `${h}:00`;
        const punctualTurno = turnos.find(t => t.fecha === fecha && t.hora === punctualHora);
        if (punctualTurno) {
          filteredTurnos = filteredTurnos.filter(t => t.id !== punctualTurno.id);
          showNotification(`Se ha eliminado el turno puntual de las ${punctualHora} para agendar el de las ${hora}`);
        }
      }

      const updatedTurnos = [...filteredTurnos, newTurno];
      setTurnos(updatedTurnos);
      saveToDB({ turnos: updatedTurnos });
      showNotification('Turno guardado');
    });
  };

  const handleDeleteTurno = (turno: Turno, motivo: 'profesional' | 'paciente') => {
    const title = 'Eliminar Turno';
    const msg = motivo === 'profesional' 
      ? '¿Eliminar turno por motivo profesional? (No genera deuda)' 
      : '¿Eliminar turno por motivo del paciente? (Se cargará el valor de la sesión a su deuda)';
    
    showConfirm(title, msg, () => {
      if (motivo === 'paciente' && turno.pacienteId) {
        const paciente = pacientes.find(p => p.id === turno.pacienteId);
        if (paciente) {
          const updatedPacientes = pacientes.map(p => {
            if (p.id === turno.pacienteId) {
              return { ...p, deuda: p.deuda + p.valorSesion };
            }
            return p;
          });
          setPacientes(updatedPacientes);
          saveToDB({ pacientes: updatedPacientes });
        }
      }

      const updatedTurnos = turnos.filter(t => t.id !== turno.id);
      setTurnos(updatedTurnos);
      saveToDB({ turnos: updatedTurnos });
      showNotification('Turno eliminado');
    });
  };

  const startSession = (turno: Turno) => {
    const paciente = pacientes.find(p => p.id === turno.pacienteId);
    if (!paciente?.token || !paciente?.comprobanteCargado) {
      showNotification('Debe cargar token y comprobante de pago para iniciar la sesión');
      return;
    }
    showConfirm('Iniciar Sesión', '¿Iniciar videollamada?', () => {
      setActiveSession(turno);
      setSessionNote('');
      setScreen('session-active');
    });
  };

  const endSession = () => {
    showConfirm('Finalizar Sesión', '¿Finalizar sesión y guardar historial?', () => {
      if (activeSession && activeSession.pacienteId) {
        const updatedPacientes = pacientes.map(p => {
          if (p.id === activeSession.pacienteId) {
            const newSesion: SesionHistorial = {
              fecha: new Date().toLocaleDateString(),
              nota: sessionNote
            };
            return { ...p, historialSesiones: [...p.historialSesiones, newSesion] };
          }
          return p;
        });
        setPacientes(updatedPacientes);
        saveToDB({ pacientes: updatedPacientes });

        const updatedTurnos = turnos.map(t => t.id === activeSession.id ? { ...t, estado: 'finalizado' as const } : t);
        setTurnos(updatedTurnos);
        saveToDB({ turnos: updatedTurnos });
      }
      setActiveSession(null);
      setScreen('pro-agenda');
      showNotification('Sesión finalizada y guardada');
    });
  };

  const BackButton = () => (
    screen !== 'inicio' && (
      <button onClick={navigateBack} className="mb-4 text-sm text-indigo-600 dark:text-indigo-400 font-bold uppercase">
        ← Volver
      </button>
    )
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col pb-20">
      <header className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
        <h1 className="font-bold text-lg text-indigo-600 flex items-center gap-2"><Logo /> Analizandome</h1>
      </header>

      <main className="flex-grow p-4 overflow-y-auto">
        {activeAlerts.map(alert => (
          <div key={alert.id} className="bg-orange-100 text-orange-800 p-3 rounded-xl mb-4 flex justify-between items-center">
            <p className="text-sm font-bold">{alert.message}</p>
            <button onClick={() => setActiveAlerts(prev => prev.filter(a => a.id !== alert.id))} className="font-bold">X</button>
          </div>
        ))}
        <BackButton />
        {screen === 'inicio' && (
          <div className="text-center mt-10">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Logo /> Analizandome <span className="text-indigo-600">Pro</span></h1>
            <button onClick={() => navigateTo('pro-login')} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-semibold mb-3">Soy Profesional</button>
            <button onClick={() => navigateTo('pac-login')} className="w-full border border-gray-300 p-3 rounded-xl font-semibold mb-3">Soy Paciente</button>
            <button onClick={() => navigateTo('admin-login')} className="w-full border border-gray-300 p-3 rounded-xl font-semibold">Soy Admin</button>
          </div>
        )}
        
        {screen === 'pro-login' && (
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h2 className="font-bold mb-4">Acceso Profesional</h2>
            <input 
              placeholder="ID Profesional" 
              className="w-full p-2 border rounded-lg mb-3" 
              value={proLoginForm.id}
              onChange={(e) => setProLoginForm({...proLoginForm, id: e.target.value})}
            />
            <input 
              placeholder="Clave" 
              type="password"
              className="w-full p-2 border rounded-lg mb-3" 
              value={proLoginForm.clave}
              onChange={(e) => setProLoginForm({...proLoginForm, clave: e.target.value})}
            />
            <button 
              onClick={() => {
                const pro = profesionales.find(p => p.id === proLoginForm.id && p.clave === proLoginForm.clave);
                if (pro) {
                  if (!pro.habilitado) {
                    setError('Su cuenta no está habilitada. Contacte al administrador.');
                    return;
                  }
                  setCurrentProfesional(pro);
                  navigateTo('pro-dashboard');
                  setError('');
                } else {
                  setError('ID o Clave incorrectos');
                }
              }} 
              className="w-full bg-indigo-600 text-white p-3 rounded-xl font-semibold"
            >
              Ingresar
            </button>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>
        )}

        {screen === 'admin-login' && (
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h2 className="font-bold mb-4">Acceso Admin</h2>
            <input 
              placeholder="Usuario" 
              className="w-full p-2 border rounded-lg mb-3" 
              value={adminLoginForm.usuario}
              onChange={(e) => setAdminLoginForm({...adminLoginForm, usuario: e.target.value})}
            />
            <input 
              placeholder="Clave" 
              type="password" 
              className="w-full p-2 border rounded-lg mb-3" 
              value={adminLoginForm.clave}
              onChange={(e) => setAdminLoginForm({...adminLoginForm, clave: e.target.value})}
            />
            <button 
              onClick={() => {
                if ((adminLoginForm.usuario.toLowerCase() === 'admin') && adminLoginForm.clave === 'Estefi12') {
                  navigateTo('admin-dashboard');
                  setError('');
                  const pendingReports = reportes.filter(r => r.estado === 'pendiente');
                  if (pendingReports.length > 0) {
                    showNotification(`Tienes ${pendingReports.length} reportes de errores pendientes`);
                  }
                } else {
                  setError('Usuario o Clave incorrectos');
                }
              }}
              className="w-full bg-indigo-600 text-white p-3 rounded-xl font-semibold"
            >
              Ingresar
            </button>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>
        )}

        {screen === 'pro-dashboard' && (
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h2 className="font-bold mb-4">Panel Profesional</h2>
            <button onClick={() => navigateTo('pro-pacientes')} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-semibold mb-3">Pacientes</button>
            <button onClick={() => navigateTo('pro-agenda')} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-semibold mb-3">Agenda</button>
            <button onClick={() => navigateTo('pro-datos')} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-semibold">Mis Datos</button>
          </div>
        )}

        {screen === 'pro-pacientes' && (
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
            <div className="flex border-b border-gray-200">
              <button 
                onClick={() => setPacientesSubScreen('alta')}
                className={`flex-1 py-2 font-bold text-sm ${pacientesSubScreen === 'alta' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
              >
                Alta de Paciente
              </button>
              <button 
                onClick={() => setPacientesSubScreen('listado')}
                className={`flex-1 py-2 font-bold text-sm ${pacientesSubScreen === 'listado' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
              >
                Listado de Pacientes
              </button>
            </div>

            {pacientesSubScreen === 'alta' ? (
              <div className="space-y-4">
                <h2 className="font-bold mb-2">Nuevo Paciente</h2>
                {error && <div className="p-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium">{error}</div>}

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-indigo-600 uppercase">Nombre y Apellido *</label>
                    <input 
                      value={pacienteForm.nombre}
                      onChange={(e) => setPacienteForm({...pacienteForm, nombre: e.target.value})}
                      placeholder="Nombre y Apellido" 
                      className={`w-full p-2 border rounded-lg ${!pacienteForm.nombre ? 'border-red-200' : ''}`} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-indigo-600 uppercase">ID (Alfanumérico) *</label>
                      <input 
                        value={pacienteForm.id}
                        onChange={(e) => setPacienteForm({...pacienteForm, id: e.target.value})}
                        placeholder="ID" 
                        className={`w-full p-2 border rounded-lg ${!pacienteForm.id ? 'border-red-200' : ''}`} 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-indigo-600 uppercase">Clave ID *</label>
                      <input 
                        value={pacienteForm.clave}
                        onChange={(e) => setPacienteForm({...pacienteForm, clave: e.target.value})}
                        placeholder="Clave" 
                        className={`w-full p-2 border rounded-lg ${!pacienteForm.clave ? 'border-red-200' : ''}`} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-indigo-600 uppercase">Número de Afiliado</label>
                    <input 
                      value={pacienteForm.afiliado}
                      onChange={(e) => setPacienteForm({...pacienteForm, afiliado: e.target.value})}
                      placeholder="Número de Afiliado" 
                      className="w-full p-2 border rounded-lg" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-indigo-600 uppercase">Teléfono (10 dígitos) *</label>
                    <input 
                      value={pacienteForm.telefono}
                      onChange={(e) => setPacienteForm({...pacienteForm, telefono: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                      placeholder="Ej: 1122334455" 
                      className={`w-full p-2 border rounded-lg ${!pacienteForm.telefono ? 'border-red-200' : ''}`} 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-indigo-600 uppercase">Email *</label>
                    <div className="flex gap-2">
                      <input 
                        value={emailUser}
                        onChange={(e) => setEmailUser(e.target.value)}
                        placeholder="usuario" 
                        className={`flex-grow p-2 border rounded-lg ${!emailUser ? 'border-red-200' : ''}`} 
                      />
                      <span className="flex items-center">@</span>
                      <select 
                        value={emailDomain}
                        onChange={(e) => setEmailDomain(e.target.value)}
                        className="p-2 border rounded-lg"
                      >
                        <option value="gmail.com">gmail.com</option>
                        <option value="outlook.com">outlook.com</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-indigo-600 uppercase">Fecha Inicio (dd/mm/aa) *</label>
                    <input 
                      type="text"
                      value={pacienteForm.fechaInicio}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 6) val = val.slice(0, 6);
                        if (val.length >= 4) val = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4);
                        else if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
                        setPacienteForm({...pacienteForm, fechaInicio: val});
                      }}
                      placeholder="dd/mm/aa" 
                      className={`w-full p-2 border rounded-lg ${!pacienteForm.fechaInicio ? 'border-red-200' : ''}`} 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-indigo-600 uppercase">Obra Social</label>
                    <select 
                      value={pacienteForm.obraSocial}
                      onChange={(e) => setPacienteForm({...pacienteForm, obraSocial: e.target.value})}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="Particular">Particular</option>
                      <option value="Swiss">Swiss</option>
                      <option value="Osde">Osde</option>
                      <option value="Galeno">Galeno</option>
                      <option value="Ommint">Ommint</option>
                      <option value="Medicus">Medicus</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-indigo-600 uppercase">Valor Sesión</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input 
                        type="text"
                        value={pacienteForm.valorSesion === 0 ? '' : pacienteForm.valorSesion?.toLocaleString('es-AR')}
                        onChange={(e) => {
                          const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                          setPacienteForm({...pacienteForm, valorSesion: val});
                        }}
                        placeholder="0" 
                        className="w-full p-2 pl-7 border rounded-lg" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-indigo-600 uppercase">Historial Clínico Previo</label>
                    <textarea 
                      value={pacienteForm.historialClinicoPrevio}
                      onChange={(e) => setPacienteForm({...pacienteForm, historialClinicoPrevio: e.target.value})}
                      placeholder="Antecedentes, diagnósticos previos..." 
                      className="w-full p-2 border rounded-lg h-24" 
                    />
                    <div className="mt-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase cursor-pointer bg-gray-100 px-2 py-1 rounded border border-dashed border-gray-400">
                        📎 Adjuntar Archivo (TXT/XLSX)
                        <input type="file" className="hidden" onChange={(e) => alert('Archivo seleccionado: ' + e.target.files?.[0]?.name)} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <button onClick={handleSavePaciente} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-semibold shadow-md active:scale-[0.98] transition-transform">Guardar</button>
                  <button onClick={navigateBack} className="w-full border border-gray-300 p-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Volver</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="font-bold mb-2">Pacientes Guardados</h2>
                {pacientes.length === 0 ? (
                  <p className="text-center text-gray-500 py-10">No hay pacientes registrados</p>
                ) : (
                  <div className="space-y-3">
                    {pacientes.map(p => (
                      <div key={p.id} className="border rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-indigo-600">{p.nombre}</h3>
                            <p className="text-[10px] text-gray-500">ID: {p.id} | OS: {p.obraSocial}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setPacienteForm(p);
                                setPacientesSubScreen('alta');
                                setScreen('pro-pacientes');
                              }}
                              className="text-xs font-bold text-emerald-600"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => setSelectedPaciente(selectedPaciente?.id === p.id ? null : p)}
                              className="text-xs font-bold text-indigo-600"
                            >
                              {selectedPaciente?.id === p.id ? 'Cerrar' : 'Ver Detalle'}
                            </button>
                          </div>
                        </div>

                        {selectedPaciente?.id === p.id && (
                          <div className="pt-2 border-t dark:border-gray-700 space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="font-bold text-gray-500 uppercase text-[9px]">Teléfono</p>
                                <p>{p.telefono}</p>
                              </div>
                              <div>
                                <p className="font-bold text-gray-500 uppercase text-[9px]">Email</p>
                                <p>{p.email}</p>
                              </div>
                              <div>
                                <p className="font-bold text-gray-500 uppercase text-[9px]">Afiliado</p>
                                <p>{p.afiliado || '-'}</p>
                              </div>
                              <div>
                                <p className="font-bold text-gray-500 uppercase text-[9px]">Deuda</p>
                                <p className="text-red-600 font-bold">{formatCurrency(p.deuda)}</p>
                              </div>
                            </div>

                            <div>
                              <p className="font-bold text-indigo-600 uppercase text-[10px] mb-1">Historial de Sesiones</p>
                              {p.historialSesiones.length === 0 ? (
                                <p className="text-[10px] text-gray-400 italic">Sin sesiones registradas</p>
                              ) : (
                                <div className="space-y-1">
                                  {p.historialSesiones.map((s, i) => (
                                    <div key={i} className="bg-gray-50 dark:bg-gray-900 p-2 rounded text-[10px]">
                                      <span className="font-bold">{s.fecha}:</span> {s.nota}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="bg-indigo-50 p-3 rounded-xl space-y-3">
                              <p className="font-bold text-indigo-600 uppercase text-[10px]">Asignar Pago</p>
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <input 
                                    type="number" 
                                    placeholder="Monto"
                                    value={pagoForm.monto || ''}
                                    onChange={(e) => setPagoForm({...pagoForm, monto: Number(e.target.value)})}
                                    className="p-2 text-xs border rounded-lg"
                                  />
                                  <select 
                                    value={pagoForm.metodo}
                                    onChange={(e) => setPagoForm({...pagoForm, metodo: e.target.value as any})}
                                    className="p-2 text-xs border rounded-lg"
                                  >
                                    <option value="Transf Bancaria">Transf Bancaria</option>
                                    <option value="MP">MP</option>
                                  </select>
                                </div>
                                <input 
                                  placeholder="Número de Comprobante"
                                  value={pagoForm.numeroComprobante}
                                  onChange={(e) => setPagoForm({...pagoForm, numeroComprobante: e.target.value})}
                                  className="w-full p-2 text-xs border rounded-lg"
                                />
                                <div className="flex gap-2">
                                  <label className="flex-1 text-center p-2 text-[10px] border border-dashed rounded-lg cursor-pointer hover:bg-white">
                                    📎 Adjuntar Comprobante
                                    <input type="file" className="hidden" />
                                  </label>
                                  <button 
                                    onClick={() => handleAddPago(p.id)}
                                    className="flex-1 bg-indigo-600 text-white p-2 text-xs font-bold rounded-lg"
                                  >
                                    Registrar Pago
                                  </button>
                                </div>
                              </div>
                            </div>

                            <button 
                              onClick={() => handleDeletePaciente(p.id)}
                              className="w-full text-red-600 text-[10px] font-bold uppercase py-2 border border-red-100 rounded-lg hover:bg-red-50"
                            >
                              Eliminar Paciente
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {screen === 'pac-login' && (
          <div className="bg-white p-4 rounded-xl">
            <h2 className="font-bold mb-4">Acceso Paciente</h2>
            <input 
              placeholder="ID Paciente" 
              className="w-full p-2 border rounded-lg mb-3" 
              value={pacLoginForm.id}
              onChange={(e) => setPacLoginForm({...pacLoginForm, id: e.target.value})}
            />
            <input 
              placeholder="Clave" 
              type="password" 
              className="w-full p-2 border rounded-lg mb-3" 
              value={pacLoginForm.clave}
              onChange={(e) => setPacLoginForm({...pacLoginForm, clave: e.target.value})}
            />
            <button 
              onClick={() => {
                const pac = pacientes.find(p => p.id === pacLoginForm.id && p.clave === pacLoginForm.clave);
                if (pac) {
                  setCurrentPaciente(pac);
                  navigateTo('pac-dashboard');
                  setError('');
                } else {
                  setError('ID o Clave incorrectos');
                }
              }} 
              className="w-full bg-indigo-600 text-white p-3 rounded-xl font-semibold"
            >
              Ingresar
            </button>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>
        )}

        {screen === 'pac-dashboard' && currentPaciente && (
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
            <h2 className="font-bold mb-2">Panel Paciente: {currentPaciente.nombre}</h2>
            {(() => {
              const proximoTurno = turnos.find(t => t.pacienteId === currentPaciente.id && t.estado === 'agendado');
              const now = new Date();
              const turnoDate = proximoTurno ? new Date(`${proximoTurno.fecha}T${proximoTurno.hora}`) : null;
              const canStartVideo = proximoTurno && turnoDate && (turnoDate.getTime() - now.getTime()) / 60000 <= 2 && (turnoDate.getTime() - now.getTime()) / 60000 >= -60 && currentPaciente.token && currentPaciente.comprobanteCargado;
              
              const getObraSocialLink = (os: string) => {
                if (os === 'Osde') return 'https://www.osde.com.ar/mis-tramites/';
                if (os === 'Swiss') return 'https://app.swissmedical.com.ar/#/inicio-sesion';
                return null;
              };
              const osLink = getObraSocialLink(currentPaciente.obraSocial);
              
              return (
                <>
                  <button 
                    disabled={!canStartVideo}
                    onClick={() => {
                      window.open(`https://meet.jit.si/${proximoTurno?.salaJitsi}`, '_blank');
                    }}
                    className={`w-full p-3 rounded-xl font-semibold ${canStartVideo ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  >
                    {canStartVideo ? 'Iniciar Videollamada' : 'Videollamada no disponible'}
                  </button>
                  <button className="w-full border border-gray-300 p-3 rounded-xl font-semibold">
                    Ver Saldo de Deuda: {formatCurrency(currentPaciente.deuda)}
                  </button>

                  <div className="space-y-2 p-3 border rounded-xl">
                    <p className="text-xs font-bold text-indigo-600 uppercase">Adjuntar Comprobante</p>
                    <label className="block w-full text-center border border-dashed border-gray-300 p-3 rounded-xl font-semibold cursor-pointer hover:bg-gray-50">
                      {currentPaciente.comprobantePago ? "✅ Comprobante Adjuntado" : "📎 Seleccionar PDF/PNG/JPG"}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".pdf,.png,.jpg" 
                        onChange={() => {
                          const updated = { ...currentPaciente, comprobantePago: true, comprobanteCargado: true };
                          setCurrentPaciente(updated);
                          const updatedPacientes = pacientes.map(p => p.id === updated.id ? updated : p);
                          setPacientes(updatedPacientes);
                          saveToDB({ pacientes: updatedPacientes });
                          showNotification('Comprobante adjuntado');
                        }}
                      />
                    </label>
                  </div>

                  <div className="space-y-2 p-3 border rounded-xl">
                    <p className="text-xs font-bold text-indigo-600 uppercase">Token</p>
                    <input 
                      placeholder="Ingresar número de Token" 
                      className="w-full p-2 border rounded-lg text-sm" 
                      value={currentPaciente.token || ''}
                      onChange={(e) => {
                        const updated = { ...currentPaciente, token: e.target.value };
                        setCurrentPaciente(updated);
                        const updatedPacientes = pacientes.map(p => p.id === updated.id ? updated : p);
                        setPacientes(updatedPacientes);
                        saveToDB({ pacientes: updatedPacientes });
                      }}
                    />
                  </div>

                  <div className="p-3 border rounded-xl bg-indigo-50">
                    <p className="text-xs font-bold text-indigo-600 uppercase">Resumen Financiero</p>
                    <p className="text-sm font-bold">Saldo Deuda: {formatCurrency(currentPaciente.deuda)}</p>
                  </div>

                  <div className="space-y-2 p-3 border rounded-xl">
                    <p className="text-xs font-bold text-indigo-600 uppercase">Historial de Turnos</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {turnos.filter(t => t.pacienteId === currentPaciente.id).sort((a,b) => b.fecha.localeCompare(a.fecha)).map(t => (
                        <div key={t.id} className="text-[10px] p-1 border-b flex justify-between">
                          <span>{t.fecha} - {t.hora}</span>
                          <span className={`font-bold ${t.estado === 'finalizado' ? 'text-emerald-600' : 'text-orange-600'}`}>{t.estado}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 p-3 border rounded-xl">
                    <p className="text-xs font-bold text-indigo-600 uppercase">Historial de Pagos</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {currentPaciente.pagos.map((p, i) => (
                        <div key={i} className="text-[10px] p-1 border-b flex justify-between">
                          <span>{p.fecha}</span>
                          <span>{formatCurrency(p.monto)} ({p.metodo})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {screen === 'admin-dashboard' && (
          <div className="space-y-4">
            <div className="flex bg-white rounded-xl p-1 shadow-sm">
              {(['profesionales', 'abonos', 'reportes'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAdminTab(tab)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors uppercase ${adminTab === tab ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {adminTab === 'profesionales' && (
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                <h2 className="font-bold">Gestión de Profesionales</h2>
                <button
                  onClick={() => {
                    const data = pacientes.map(p => ({ id: p.id, clave: p.clave, nombre: p.nombre }));
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'usuarios_credenciales.json';
                    a.click();
                    URL.revokeObjectURL(url);
                    showNotification('Credenciales descargadas');
                  }}
                  className="w-full bg-emerald-600 text-white p-3 rounded-xl font-semibold mb-4"
                >
                  Descargar Credenciales Pacientes
                </button>
                <div className="space-y-4">
                  {profesionales.map(pro => (
                    <div key={pro.id} className="p-3 border rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-indigo-600">{pro.nombre}</p>
                        <div className="flex gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pro.habilitado ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {pro.habilitado ? 'Habilitado' : 'Inhabilitado'}
                          </span>
                          <button onClick={() => {
                            const updated = profesionales.filter(p => p.id !== pro.id);
                            setProfesionales(updated);
                            saveToDB({ profesionales: updated });
                          }} className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Eliminar</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Nombre</label>
                          <input className="w-full p-1 border rounded" value={pro.nombre} onChange={(e) => {
                            const updated = profesionales.map(p => p.id === pro.id ? {...p, nombre: e.target.value} : p);
                            setProfesionales(updated);
                          }} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Teléfono</label>
                          <input className="w-full p-1 border rounded" value={pro.telefono} onChange={(e) => {
                            const updated = profesionales.map(p => p.id === pro.id ? {...p, telefono: e.target.value} : p);
                            setProfesionales(updated);
                          }} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Matrícula</label>
                          <input className="w-full p-1 border rounded" value={pro.matricula} onChange={(e) => {
                            const updated = profesionales.map(p => p.id === pro.id ? {...p, matricula: e.target.value} : p);
                            setProfesionales(updated);
                          }} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase">ID Acceso</label>
                          <input 
                            className="w-full p-1 border rounded" 
                            value={pro.id} 
                            onChange={(e) => {
                              const updated = profesionales.map(p => p.id === pro.id ? { ...p, id: e.target.value } : p);
                              setProfesionales(updated);
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Clave</label>
                          <input 
                            type="password"
                            className="w-full p-1 border rounded" 
                            value={pro.clave} 
                            onChange={(e) => {
                              const updated = profesionales.map(p => p.id === pro.id ? { ...p, clave: e.target.value } : p);
                              setProfesionales(updated);
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Inicio Suscripción</label>
                          <input 
                            type="date"
                            className="w-full p-1 border rounded" 
                            value={pro.inicioSuscripcion} 
                            onChange={(e) => {
                              const updated = profesionales.map(p => p.id === pro.id ? { ...p, inicioSuscripcion: e.target.value } : p);
                              setProfesionales(updated);
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Monto Abono</label>
                          <input 
                            type="number"
                            className="w-full p-1 border rounded" 
                            value={pro.valorSuscripcion} 
                            onChange={(e) => {
                              const updated = profesionales.map(p => p.id === pro.id ? { ...p, valorSuscripcion: Number(e.target.value) } : p);
                              setProfesionales(updated);
                            }}
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          saveToDB({ profesionales });
                          showNotification('Datos de profesional guardados');
                        }}
                        className="w-full bg-indigo-600 text-white p-2 rounded-lg text-xs font-bold"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newPro: Profesional = {
                        id: 'pro' + Math.floor(Math.random() * 1000),
                        nombre: 'Nuevo Profesional',
                        telefono: '',
                        matricula: '',
                        clave: '1234',
                        habilitado: false,
                        aliasMP: '',
                        valorSuscripcion: 50000,
                        vencimiento: '',
                        inicioSuscripcion: new Date().toISOString().split('T')[0],
                        valor: 0,
                        validoDesde: '',
                        validoHasta: '',
                        saldoDeuda: 0,
                        estado: 'Pendiente'
                      };
                      const updated = [...profesionales, newPro];
                      setProfesionales(updated);
                      saveToDB({ profesionales: updated });
                    }}
                    className="w-full border-2 border-dashed border-gray-300 p-3 rounded-xl text-gray-500 font-bold text-sm"
                  >
                    + Agregar Profesional
                  </button>
                </div>
              </div>
            )}

            {adminTab === 'abonos' && (
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                <h2 className="font-bold">Abonos Activos</h2>
                <div className="space-y-3">
                  {profesionales.map(pro => (
                    <div key={pro.id} className="flex justify-between items-center p-3 border rounded-xl">
                      <div>
                        <p className="font-bold text-sm">{pro.nombre}</p>
                        <p className="text-[10px] text-gray-500">Abono: {formatCurrency(pro.valorSuscripcion)} | Inicio: {pro.inicioSuscripcion}</p>
                      </div>
                      <button
                        onClick={() => {
                          const updated = profesionales.map(p => p.id === pro.id ? { ...p, habilitado: !p.habilitado } : p);
                          setProfesionales(updated);
                          saveToDB({ profesionales: updated });
                          showNotification(pro.habilitado ? 'Profesional inhabilitado' : 'Profesional habilitado');
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold ${pro.habilitado ? 'bg-red-100 text-red-600' : 'bg-emerald-600 text-white'}`}
                      >
                        {pro.habilitado ? 'Inhabilitar' : 'Habilitar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'reportes' && (
              <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                <h2 className="font-bold">Reportes de Errores</h2>
                {reportes.length === 0 ? (
                  <p className="text-center text-gray-500 py-10 text-sm">No hay reportes de errores</p>
                ) : (
                  <div className="space-y-3">
                    {reportes.map(rep => (
                      <div key={rep.id} className="p-3 border rounded-xl space-y-1">
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-xs text-indigo-600">{rep.usuario}</p>
                          <div className="flex gap-2 items-center">
                            <p className="text-[9px] text-gray-400">{rep.fecha}</p>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${rep.estado === 'realizado' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                              {rep.estado}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-700">{rep.mensaje}</p>
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => {
                            const updated = reportes.map(r => r.id === rep.id ? {...r, estado: r.estado === 'pendiente' ? 'realizado' : 'pendiente'} : r);
                            setReportes(updated);
                            saveToDB({ reportes: updated });
                          }} className="text-[9px] bg-gray-100 px-2 py-1 rounded">Marcar como {rep.estado === 'pendiente' ? 'Realizado' : 'Pendiente'}</button>
                          <button onClick={() => {
                            const updated = reportes.filter(r => r.id !== rep.id);
                            setReportes(updated);
                            saveToDB({ reportes: updated });
                          }} className="text-[9px] bg-red-100 text-red-700 px-2 py-1 rounded">Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {screen === 'reporte' && (
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
            <h2 className="font-bold mb-2">Reportar Error</h2>
            <div className="space-y-3">
              <input 
                placeholder="Nombre / ID" 
                className="w-full p-2 border rounded-lg" 
                id="reporte-usuario"
              />
              <textarea 
                placeholder="Mensaje" 
                className="w-full p-2 border rounded-lg h-32" 
                id="reporte-mensaje"
              />
              <button 
                onClick={() => {
                  const msg = (document.getElementById('reporte-mensaje') as HTMLTextAreaElement).value;
                  const user = (document.getElementById('reporte-usuario') as HTMLInputElement).value;
                  if (!msg || !user) {
                    setError('Complete todos los campos');
                    return;
                  }
                  showConfirm('Reportar Error', '¿Enviar este reporte de error?', () => {
                    const newReporte: ReporteError = {
                      id: Math.random().toString(36).substr(2, 9),
                      usuario: user,
                      mensaje: msg,
                      fecha: new Date().toLocaleString(),
                      estado: 'pendiente'
                    };
                    const updated = [...reportes, newReporte];
                    setReportes(updated);
                    saveToDB({ reportes: updated });
                    showNotification('Reporte enviado al administrador');
                    navigateBack();
                  });
                }} 
                className="w-full bg-indigo-600 text-white p-3 rounded-xl font-semibold"
              >
                Enviar Reporte
              </button>
            </div>
          </div>
        )}

        {screen === 'faq' && (
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
            <h2 className="font-bold mb-2">Preguntas Frecuentes</h2>
            <div className="space-y-4">
              <div className="border-b pb-2">
                <p className="font-bold text-sm text-indigo-600">¿Cómo doy de alta un paciente?</p>
                <p className="text-xs text-gray-500 mt-1">Ve al Panel Profesional &gt; Pacientes &gt; Alta de Paciente y completa los campos obligatorios.</p>
              </div>
              <div className="border-b pb-2">
                <p className="font-bold text-sm text-indigo-600">¿Cómo registro un pago?</p>
                <p className="text-xs text-gray-500 mt-1">En el Listado de Pacientes, abre el detalle del paciente y usa la sección &quot;Asignar Pago&quot;.</p>
              </div>
              <div className="border-b pb-2">
                <p className="font-bold text-sm text-indigo-600">¿Qué es el Token?</p>
                <p className="text-xs text-gray-500 mt-1">Es el código de autorización proporcionado por la obra social para la videollamada.</p>
              </div>
            </div>
          </div>
        )}

        {screen === 'pro-datos' && currentProfesional && (
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
            <h2 className="font-bold mb-2">Mis Datos Profesionales</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3 border-r pr-4">
                <h3 className="font-bold text-sm text-indigo-600">Datos Personales</h3>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Nombre Profesional</label>
                  <input defaultValue={currentProfesional.nombre} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Especialidad</label>
                  <input defaultValue="Psicología Clínica" className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Matrícula</label>
                  <input defaultValue="MN 12345" className="w-full p-2 border rounded-lg" />
                </div>
              </div>
              <div className="space-y-3 pl-4">
                <h3 className="font-bold text-sm text-indigo-600">Datos de Suscripción</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Inicio</label>
                    <p className="p-2 bg-gray-100 rounded-lg text-sm">{currentProfesional.inicioSuscripcion}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Valor</label>
                    <p className="p-2 bg-gray-100 rounded-lg text-sm">{formatCurrency(currentProfesional.valorSuscripcion)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Desde</label>
                    <p className="p-2 bg-gray-100 rounded-lg text-sm">{currentProfesional.validoDesde || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Hasta</label>
                    <p className="p-2 bg-gray-100 rounded-lg text-sm">{currentProfesional.validoHasta || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Deuda</label>
                    <p className="p-2 bg-gray-100 rounded-lg text-sm">{formatCurrency(currentProfesional.saldoDeuda)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Estado</label>
                    <p className={`p-2 bg-gray-100 rounded-lg text-sm font-bold ${currentProfesional.habilitado ? 'text-emerald-700' : 'text-red-700'}`}>
                      {currentProfesional.habilitado ? 'Activo' : 'Inactivo'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-bold text-sm text-indigo-600">Obras Sociales</h3>
              {[
                { name: 'OSDE', url: 'https://extranet.osde.com.ar/OSDEExtranet/jsp/multiempresas/osde/HomePublicaV2.jsp' },
                { name: 'SWISS MEDICAL', url: 'https://www.swissmedical.com.ar/prestadores/login-mobile' },
                { name: 'GALENO', url: 'https://webapp.galeno.com.ar/prestadores-liq-web/#/login' }
              ].map(os => (
                <div key={os.name} className="flex justify-between items-center p-2 border rounded-lg">
                  <span className="text-sm font-bold">{os.name}</span>
                  <a href={os.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 underline">Cargar comprobante</a>
                </div>
              ))}
            </div>
            <button onClick={() => showConfirm('Guardar Datos', '¿Guardar cambios en sus datos?', () => showNotification('Datos actualizados'))} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-semibold">Guardar Cambios</button>
          </div>
        )}
        {screen === 'pro-agenda' && (
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold">Agenda</h2>
            </div>
            
            <div className="flex gap-4">
              <div className="w-1/2 space-y-4">
                <div className="flex gap-1 justify-between">
                  <button onClick={() => setAgendaWeek('actual')} className={`text-[10px] font-bold p-1 rounded ${agendaWeek === 'actual' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>Semana Actual</button>
                  <button onClick={() => setAgendaWeek('proxima')} className={`text-[10px] font-bold p-1 rounded ${agendaWeek === 'proxima' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>Semana Próxima</button>
                </div>
                <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map((day, idx) => {
                    const d = currentWeekDates[idx];
                    const isSelected = agendaDayIdx === idx;
                    return (
                      <button 
                        key={day}
                        onClick={() => setAgendaDayIdx(idx)}
                        className={`flex-shrink-0 w-14 py-2 rounded-xl border flex flex-col items-center transition-colors ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                      >
                        <span className="text-[10px] font-bold uppercase">{day}</span>
                        <span className="text-xs font-bold">{d.getDate()}/{d.getMonth()+1}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-3">
                  {/* Scheduled appointments for selected day */}
                  {turnos
                    .filter(t => t.fecha === dateStr && t.estado === 'agendado')
                    .sort((a, b) => a.hora.localeCompare(b.hora))
                    .map(t => {
                      const paciente = pacientes.find(p => p.id === t.pacienteId);
                      return (
                        <div key={t.id} className="p-3 border rounded-lg bg-indigo-50 border-indigo-200 flex justify-between items-center text-[15px]">
                          <div>
                            <p className="font-bold">{t.hora} - {paciente?.nombre || 'Desconocido'}</p>
                            <div className="flex gap-1">
                              {paciente?.token && <span className="text-[10px] bg-yellow-100 p-0.5 rounded">Token: {paciente.token}</span>}
                              {paciente?.comprobanteCargado && <span className="text-[10px] bg-emerald-100 p-0.5 rounded">📄 OK</span>}
                            </div>
                          </div>
                          <div className="flex gap-5 items-center">
                            <button 
                              onClick={() => startSession(t)} 
                              title="Iniciar Sesión"
                              disabled={!(paciente?.token && paciente?.comprobanteCargado)}
                              className={!(paciente?.token && paciente?.comprobanteCargado) ? 'opacity-50 cursor-not-allowed' : ''}
                            >📹</button>
                            <span className={`font-bold ${paciente?.token && paciente?.comprobanteCargado ? 'text-emerald-600' : 'text-orange-600'}`}>
                              {paciente?.token && paciente?.comprobanteCargado ? 'OK' : 'PEND'}
                            </span>
                            <button onClick={() => handleDeleteTurno(t, 'profesional')} title="Eliminar (Prof)">❌</button>
                            <button onClick={() => handleDeleteTurno(t, 'paciente')} title="Cancelar (Pac)">⚠️</button>
                          </div>
                        </div>
                      );
                    })}
                  {turnos.filter(t => t.fecha === dateStr && t.estado === 'agendado').length === 0 && (
                    <p className="text-xs text-gray-500 italic">No hay turnos agendados para este día.</p>
                  )}
                </div>
              </div>
              
              <div className="w-1/2 space-y-4">
                {/* Quick Appointment Creation */}
                <div className="p-4 border rounded-xl bg-gray-50">
                  <h3 className="font-bold mb-2">Nuevo Turno</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <select className="p-2 border rounded-lg text-sm" onChange={(e) => setQuickTurnoForm({...quickTurnoForm, pacienteId: e.target.value})}>
                      <option value="">Seleccionar Paciente</option>
                      {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    <input type="text" placeholder="dd/mm/yy" className="p-2 border rounded-lg text-sm" onChange={(e) => setQuickTurnoForm({...quickTurnoForm, fecha: e.target.value})} />
                    <input type="text" placeholder="HH:MM" className="p-2 border rounded-lg text-sm" onChange={(e) => setQuickTurnoForm({...quickTurnoForm, hora: e.target.value})} />
                    <button 
                      onClick={() => {
                        if (!quickTurnoForm.pacienteId || !quickTurnoForm.fecha || !quickTurnoForm.hora) {
                          setError('Completar todos los campos');
                          return;
                        }
                        const [d, m, y] = quickTurnoForm.fecha.split('/');
                        const formattedDate = `20${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                        handleSaveTurno(quickTurnoForm.hora, quickTurnoForm.pacienteId, formattedDate);
                      }}
                      className="bg-indigo-600 text-white p-2 rounded-lg text-sm font-bold"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>

                {/* Simplified Free Slots */}
                <div className="p-4 border rounded-xl bg-gray-50">
                  <h3 className="font-bold mb-2">Turnos Libres (Futuros)</h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {currentWeekDates.filter(d => d >= new Date(new Date().setHours(0,0,0,0))).map(d => {
                      const dateStr = d.toISOString().split('T')[0];
                      return (
                        <div key={dateStr} className="text-xs">
                          <p className="font-bold text-indigo-600">{d.toLocaleDateString('es-AR')}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.from({ length: 14 }).map((_, i) => {
                              const hour = 8 + i;
                              const baseTime = `${hour.toString().padStart(2, '0')}:00`;
                              if (!turnos.find(t => t.fecha === dateStr && t.hora === baseTime && t.estado === 'agendado')) {
                                return <span key={baseTime} className="bg-emerald-100 text-emerald-700 px-1 rounded">{baseTime}</span>
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === 'session-active' && activeSession && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="h-1/2 bg-gray-900 relative">
              <iframe 
                src={`https://meet.jit.si/${activeSession.salaJitsi}#config.startWithAudioMuted=true&config.startWithVideoMuted=false`}
                className="w-full h-full border-none"
                allow="camera; microphone; fullscreen; display-capture"
              />
              <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold">
                Paciente: {pacientes.find(p => p.id === activeSession.pacienteId)?.nombre}
              </div>
            </div>
            <div className="h-1/2 bg-white dark:bg-gray-800 p-4 flex flex-col">
              <label className="text-xs font-bold text-indigo-600 uppercase mb-2">Notas de la Sesión</label>
              <textarea 
                value={sessionNote}
                onChange={(e) => setSessionNote(e.target.value)}
                placeholder="Escribe aquí las notas de la sesión..."
                className="flex-grow p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 mb-4 resize-none"
              />
              <button 
                onClick={endSession}
                className="w-full bg-red-600 text-white p-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
              >
                Finalizar Sesión y Guardar
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="flex-1 px-4 py-2 border border-red-300 rounded-xl font-bold text-sm text-red-600"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Notification Toast */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top-full duration-300">
          <div className={`px-6 py-3 rounded-full shadow-xl font-bold text-sm text-white ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {notification.message}
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 w-full bg-white border-t border-gray-200 p-2 text-xs">
        <div className="flex justify-around mb-2">
          <button onClick={() => setScreen('inicio')} className="font-bold uppercase">Inicio</button>
          <button onClick={() => setScreen('reporte')} className="font-bold uppercase">Reportar</button>
          <button onClick={() => setScreen('faq')} className="font-bold uppercase">FAQ</button>
        </div>
        <div className="text-center text-[9px] text-gray-500 pb-1">
          versión 1.62 - desarrollado por <strong>Uruguash Desarrollos Web</strong>
        </div>
      </footer>
    </div>
  );
}
