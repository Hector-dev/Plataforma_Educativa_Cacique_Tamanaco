import { Component, Input } from '@angular/core';

export type LessonContent = {
  id: string;
  title: string;
  type: 'image' | 'video' | 'pdf' | 'enlace';
  url: string;
  alt?: string;
  transcription?: string;
};

@Component({
  selector: 'app-lesson',
  standalone: true,
  templateUrl: './lesson.component.html',
  styleUrls: ['./lesson.component.css'],
})
export class LessonComponent {
  @Input() content: LessonContent = {
    id: 'demo-1',
    title: 'Imagen de ejemplo',
    type: 'image',
    url: '/assets/example.jpg',
    alt: '',
  };

  get requiresAlt(): boolean {
    return this.content.type === 'image';
  }

  get isVideo(): boolean {
    return this.content.type === 'video';
  }
}
