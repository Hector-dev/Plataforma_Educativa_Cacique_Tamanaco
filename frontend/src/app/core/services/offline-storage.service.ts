import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

export interface OfflineAsistencia {
  id?: number;
  id_clase: number;
  id_estudiante: number;
  estado: 'presente' | 'ausente' | 'justificado';
  fecha_registro: string;
  sincronizado: boolean;
}

export interface OfflineEvaluacion {
  id?: number;
  id_evaluacion: number;
  id_estudiante: number;
  contenido: string;
  formato: string;
  fecha_entrega: string;
  sincronizado: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineStorageService extends Dexie {
  asistencias!: Table<OfflineAsistencia>;
  evaluaciones!: Table<OfflineEvaluacion>;

  constructor() {
    super('CaciqueOfflineDB');
    
    // Definición de esquema para IndexedDB
    this.version(1).stores({
      asistencias: '++id, [id_clase+id_estudiante], id_clase, id_estudiante, sincronizado',
      evaluaciones: '++id, [id_evaluacion+id_estudiante], id_evaluacion, id_estudiante, sincronizado'
    });
  }

  // ─── Métodos Asistencia ──────────────────────────────
  async saveAsistencia(data: OfflineAsistencia) {
    return await this.asistencias.put(data);
  }

  async getPendingAsistencias() {
    return await this.asistencias.where('sincronizado').equals(0).toArray(); // Dexie usa 0 para false en algunos casos o boolean directo
  }

  async markAsistenciaSynced(ids: number[]) {
    return await this.asistencias.where('id').anyOf(ids).modify({ sincronizado: true });
  }

  // ─── Métodos Evaluaciones ───────────────────────────
  async saveEvaluacion(data: OfflineEvaluacion) {
    return await this.evaluaciones.put(data);
  }

  async getPendingEvaluaciones() {
    return await this.evaluaciones.where('sincronizado').equals(0).toArray();
  }

  async markEvaluacionSynced(ids: number[]) {
    return await this.evaluaciones.where('id').anyOf(ids).modify({ sincronizado: true });
  }
}
