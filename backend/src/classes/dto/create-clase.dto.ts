import { IsNotEmpty, IsOptional, IsInt, IsArray } from 'class-validator';

export class CreateClaseDto {
  @IsNotEmpty()
  nombre_materia: string;

  @IsNotEmpty()
  seccion_id: string;

  @IsOptional()
  docente_id?: string;

  @IsOptional()
  @IsArray()
  filtro_accesibilidad?: string[];

  @IsOptional()
  metadatos_accesibilidad?: any;

  @IsOptional()
  @IsInt()
  cupos_maximos?: number;
}
