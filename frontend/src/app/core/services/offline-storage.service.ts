import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

export interface OfflineAsistencia {
  id?: number;
  id_sesion: number;
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

    // v2: índices compuestos únicos para evitar duplicados.
    this.version(2).stores({
      asistencias: '++id, &[id_clase+id_estudiante], id_clase, id_estudiante, sincronizado',
      evaluaciones: '++id, &[id_evaluacion+id_estudiante], id_evaluacion, id_estudiante, sincronizado'
    }).upgrade(async (tx) => {
      const asistenciasTable = tx.table('asistencias');
      const todas = await asistenciasTable.toArray();
      const vistas = new Set<string>();
      for (let i = todas.length - 1; i >= 0; i--) {
        const a = todas[i];
        const key = `${a.id_clase}#${a.id_estudiante}`;
        if (vistas.has(key)) {
          await asistenciasTable.delete(a.id!);
        } else {
          vistas.add(key);
        }
      }
    });

    // v3: soporte para sesiones de asistencia (id_sesion obligatorio).
    // Los registros antiguos sin sesión quedan huérfanos y se eliminan.
    this.version(3).stores({
      asistencias: '++id, [id_sesion+id_estudiante], id_sesion, id_clase, id_estudiante, sincronizado',
      evaluaciones: '++id, &[id_evaluacion+id_estudiante], id_evaluacion, id_estudiante, sincronizado'
    }).upgrade(async (tx) => {
      const asistenciasTable = tx.table('asistencias');
      const todas = await asistenciasTable.toArray();
      for (const a of todas) {
        const item = a as any;
        if (!item.id_sesion) {
          await asistenciasTable.delete(item.id);
        }
      }
    });
  }

  // ─── Métodos Asistencia ──────────────────────────────
  async saveAsistencia(data: OfflineAsistencia) {
    const existente = await this.asistencias
      .where('[id_sesion+id_estudiante]')
      .equals([data.id_sesion, data.id_estudiante])
      .first();

    if (existente?.id) {
      return await this.asistencias.update(existente.id, {
        estado: data.estado,
        fecha_registro: data.fecha_registro,
        sincronizado: false,
      });
    }

    return await this.asistencias.add(data);
  }

  async getAsistenciasBySesion(id_sesion: number) {
    return await this.asistencias.where('id_sesion').equals(id_sesion).toArray();
  }

  async getPendingAsistencias() {
    return await this.asistencias.where('sincronizado').equals(0 as any).toArray();
  }

  async markAsistenciaSynced(ids: number[]) {
    return await this.asistencias.where('id').anyOf(ids).modify({ sincronizado: true });
  }

  async markAsistenciaSyncedBySesion(id_sesion: number, ids: number[]) {
    return await this.asistencias
      .where('id_sesion')
      .equals(id_sesion)
      .and((a) => ids.includes(a.id!))
      .modify({ sincronizado: true });
  }

  // ─── Métodos Evaluaciones ───────────────────────────
  async saveEvaluacion(data: OfflineEvaluacion) {
    const existente = await this.evaluaciones
      .where('[id_evaluacion+id_estudiante]')
      .equals([data.id_evaluacion, data.id_estudiante])
      .first();

    if (existente?.id) {
      return await this.evaluaciones.update(existente.id, {
        contenido: data.contenido,
        formato: data.formato,
        fecha_entrega: data.fecha_entrega,
        sincronizado: false,
      });
    }

    return await this.evaluaciones.add(data);
  }

  async getPendingEvaluaciones() {
    return await this.evaluaciones.where('sincronizado').equals(0 as any).toArray();
  }

  async markEvaluacionSynced(ids: number[]) {
    return await this.evaluaciones.where('id').anyOf(ids).modify({ sincronizado: true });
  }
}
