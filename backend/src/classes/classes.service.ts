import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clase } from './clase.entity';
import { CreateClaseDto } from './dto/create-clase.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Clase)
    private clasesRepository: Repository<Clase>,
  ) {}

  create(dto: CreateClaseDto) {
    const clase = this.clasesRepository.create({
      nombre_materia: dto.nombre_materia,
      seccion_id: dto.seccion_id,
      docente: dto.docente_id ? ({ id: dto.docente_id } as any) : null,
      filtro_accesibilidad: dto.filtro_accesibilidad,
      metadatos_accesibilidad: dto.metadatos_accesibilidad,
      cupos_maximos: dto.cupos_maximos,
    });
    return this.clasesRepository.save(clase);
  }

  findAll() {
    return this.clasesRepository.find({ relations: ['docente'] });
  }

  findOne(id: string) {
    return this.clasesRepository.findOne({ where: { id }, relations: ['docente'] });
  }

  async remove(id: string) {
    return this.clasesRepository.delete(id);
  }
}
