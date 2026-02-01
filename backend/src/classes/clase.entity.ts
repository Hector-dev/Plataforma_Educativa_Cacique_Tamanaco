import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../common/abstract.entity';
import { Usuario } from '../users/usuario.entity';

@Entity({ name: 'clases' })
export class Clase extends AbstractEntity {
  @Column({ length: 200 })
  nombre_materia: string;

  @Column({ type: 'uuid' })
  seccion_id: string;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'docente_id' })
  docente: Usuario;

  @Column({ type: 'text', array: true, nullable: true })
  filtro_accesibilidad: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadatos_accesibilidad: any;

  @Column({ type: 'int', nullable: true })
  cupos_maximos: number;
}
