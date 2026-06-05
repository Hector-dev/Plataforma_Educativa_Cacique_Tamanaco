import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

interface QuizPregunta {
  id: number;
  enunciado: string;
  tipo: string;
  orden: number;
  opciones: QuizOpcion[];
}

interface QuizOpcion {
  id_opcion: number;
  texto: string;
  orden: string;
}

interface QuizData {
  id: number;
  titulo: string;
  descripcion: string;
  tiempo_limite_min: number | null;
  preguntas: QuizPregunta[];
}

interface QuizResultado {
  nota: number;
  acertadas: number;
  total_preguntas: number;
}

@Component({
  selector: 'app-quiz-player',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './quiz-player.component.html',
  styleUrls: ['./quiz-player.component.scss'],
})
export class QuizPlayerComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  readonly quiz = signal<QuizData | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly finalizando = signal(false);
  readonly resultado = signal<QuizResultado | null>(null);

  /** Mapa de pregunta -> id_opcion seleccionada */
  respuestas = new Map<number, number>();

  readonly tiempoRestante = signal(0);
  private timerInterval: any = null;

  ngOnInit(): void {
    const idEvaluacion = this.route.snapshot.paramMap.get('evaId');
    if (!idEvaluacion) {
      this.error.set('ID de evaluación no proporcionado');
      this.cargando.set(false);
      return;
    }

    this.http.get<{ success: boolean; data: any }>(
      `${this.apiUrl}/quizzes/evaluacion/${idEvaluacion}`
    ).subscribe({
      next: (res) => {
        if (!res.success || !res.data) {
          this.error.set('No se encontró un quiz para esta evaluación');
          this.cargando.set(false);
          return;
        }
        // Verificar si ya completado (viene del endpoint tomar)
        if (res.data.yaCompletado) {
          this.resultado.set({
            nota: res.data.nota,
            acertadas: res.data.acertadas,
            total_preguntas: res.data.total_preguntas || res.data.total || 0,
          });
          this.cargando.set(false);
          return;
        }
        this.quiz.set(res.data);
        this.cargando.set(false);

        if (res.data.tiempo_limite_min) {
          this.tiempoRestante.set(res.data.tiempo_limite_min * 60);
          this.iniciarTimer();
        }
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar el quiz');
        this.cargando.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  iniciarTimer(): void {
    this.timerInterval = setInterval(() => {
      const actual = this.tiempoRestante();
      if (actual <= 1) {
        clearInterval(this.timerInterval);
        this.finalizarQuiz();
      } else {
        this.tiempoRestante.set(actual - 1);
      }
    }, 1000);
  }

  formatoTiempo(): string {
    const segs = this.tiempoRestante();
    const min = Math.floor(segs / 60);
    const sec = segs % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  seleccionarRespuesta(idPregunta: number, idOpcion: number): void {
    this.respuestas.set(idPregunta, idOpcion);

    // Enviar respuesta al backend
    const quizData = this.quiz();
    if (!quizData) return;
    this.http.post(`${this.apiUrl}/quizzes/${quizData.id}/responder`, {
      id_pregunta: idPregunta,
      id_opcion: idOpcion,
    }).subscribe();
  }

  finalizarQuiz(): void {
    const quizData = this.quiz();
    if (!quizData || this.finalizando()) return;

    this.finalizando.set(true);

    this.http.post<{ success: boolean; data: QuizResultado }>(
      `${this.apiUrl}/quizzes/${quizData.id}/finalizar`, {}
    ).subscribe({
      next: (res) => {
        this.finalizando.set(false);
        if (res.success && res.data) {
          this.resultado.set(res.data);
        }
        if (this.timerInterval) clearInterval(this.timerInterval);
      },
      error: (err) => {
        this.finalizando.set(false);
        this.error.set(err.error?.message || 'Error al finalizar');
      },
    });
  }

  volver(): void {
    this.router.navigate(['/']);
  }
}
