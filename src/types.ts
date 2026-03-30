export interface Pago {
  fecha: string;
  monto: number;
  metodo: 'Transf Bancaria' | 'MP';
  numeroComprobante: string;
  comprobanteArchivo?: string;
}

export interface SesionHistorial {
  fecha: string;
  nota: string;
}

export interface Paciente {
  id: string;
  nombre: string;
  telefono: string;
  clave: string;
  afiliado: string;
  fechaInicio: string;
  email: string;
  obraSocial: string;
  otraObraSocial?: string;
  token: string;
  copago: boolean;
  comprobantePago: boolean;
  comprobanteCargado?: boolean;
  valorSesion: number;
  antecedentes: string;
  historialClinicoPrevio: string;
  archivosHistorial?: string[];
  historialSesiones: SesionHistorial[];
  pagos: Pago[];
  deuda: number;
  proId: string;
}

export interface Profesional {
  id: string;
  nombre: string;
  telefono: string;
  matricula: string;
  clave: string;
  habilitado: boolean;
  aliasMP: string;
  valorSuscripcion: number;
  vencimiento: string;
  inicioSuscripcion: string;
  valor: number;
  validoDesde: string;
  validoHasta: string;
  saldoDeuda: number;
  estado: 'Activo' | 'Inactivo' | 'Pendiente';
}

export interface ReporteError {
  id: string;
  usuario: string;
  mensaje: string;
  fecha: string;
  estado: 'pendiente' | 'realizado';
}

export interface Turno {
  id: string;
  pacienteId: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  estado: 'libre' | 'agendado' | 'cancelado' | 'finalizado';
  aprobado: boolean;
  salaJitsi?: string;
  nota?: string;
  copago?: boolean;
}
