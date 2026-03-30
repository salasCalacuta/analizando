import { Paciente, Turno } from '../types';

const DB_KEY = 'analizandome_v162';

export const getDB = () => {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : { pacientes: [], turnos: [], config: {} };
};

export const saveDB = (db: any) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

export const getPacientes = (): Paciente[] => getDB().pacientes;
export const savePaciente = (paciente: Paciente) => {
  const db = getDB();
  const index = db.pacientes.findIndex((p: Paciente) => p.id === paciente.id);
  if (index > -1) {
    db.pacientes[index] = paciente;
  } else {
    db.pacientes.push(paciente);
  }
  saveDB(db);
};
