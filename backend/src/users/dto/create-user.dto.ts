import { IsEmail, IsEnum, IsNotEmpty, IsOptional, Length } from 'class-validator';
import { Role } from '../usuario.entity';

export class CreateUserDto {
  @IsOptional()
  @Length(1, 32)
  cedula?: string;

  @IsNotEmpty()
  @Length(1, 200)
  nombre: string;

  @IsNotEmpty()
  @Length(1, 200)
  apellido: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsEnum(Role)
  rol: Role;
}
