import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Usuario)
    private usersRepository: Repository<Usuario>,
  ) {}

  async create(dto: CreateUserDto) {
    const user = this.usersRepository.create({
      cedula: dto.cedula,
      nombre: dto.nombre,
      apellido: dto.apellido,
      email: dto.email,
      password_hash: await bcrypt.hash(dto.password, 10),
      rol: dto.rol,
    });
    return this.usersRepository.save(user);
  }

  findAll() {
    return this.usersRepository.find();
  }

  findOne(id: string) {
    return this.usersRepository.findOneBy({ id });
  }

  findByEmail(email: string) {
    return this.usersRepository.findOneBy({ email });
  }

  async remove(id: string) {
    return this.usersRepository.delete(id);
  }
}
