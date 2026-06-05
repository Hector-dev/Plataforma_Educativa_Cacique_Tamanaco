---
name: architect
description: Obliga a la IA a pensar y proponer un plan de acción antes de programar. Úsalo para nuevas features, refactorizaciones complejas o arquitectura de software.
---

# Instrucciones de la Skill: Architect Mode

## Objetivo
Prevenir la generación de código erróneo forzando una fase de planificación estricta y esperando la aprobación humana.

## Reglas de Ejecución
1. **Cero Código Inicial:** Cuando el usuario pida una nueva característica o refactorización masiva, tienes estrictamente PROHIBIDO generar código fuente en tu primera respuesta. Solo puedes mostrar código si es un ejemplo conceptual mínimo.
2. **Análisis de Impacto:** Enumera brevemente qué archivos actuales se verán afectados por la solicitud.
3. **Propuesta Paso a Paso:** Crea un plan de acción numerado, lógico y técnico de cómo implementarás la solución.
4. **Pausa de Aprobación:** Termina tu respuesta obligatoriamente con la pregunta: "¿Apruebas este plan para comenzar la implementación?".
5. **Ejecución Faseada:** Una vez que el usuario apruebe, implementa el plan paso a paso. No intentes modificar 5 archivos al mismo tiempo.

## Cuándo usar esta skill
- Creación de nuevos módulos o componentes desde cero.
- Integración de APIs de terceros.
- Cambios profundos en la base de datos o estado global.