import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClaseDto } from './dto/create-clase.dto';

@Controller('clases')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  create(@Body() createClaseDto: CreateClaseDto) {
    return this.classesService.create(createClaseDto);
  }

  @Get()
  findAll() {
    return this.classesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}
