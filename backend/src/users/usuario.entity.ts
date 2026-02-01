import { Entity, Column } from 'typeorm';
import { AbstractEntity } from '../common/abstract.entity';

export enum Role {
  Estudiante = 'Estudiante',
  Docente = 'Docente',
  Administrador = 'Administrativo',
}

@Entity({ name: 'usuarios' })
export class Usuario extends AbstractEntity {
  @Column({ length: 32, nullable: true, unique: true })
  cedula: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 200 })
  apellido: string;

  @Column({ length: 320, unique: true })
  email: string;

  @Column({ length: 255 })
  password_hash: string;

  @Column({ type: 'enum', enum: Role, default: Role.Estudiante })
  rol: Role;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  fecha_creacion: Date;
}
