# Horarios

Aplicación web estática para distribuir clases, asignar salones y docentes, consultar horarios y exportar un libro Excel con una hoja por grupo.

## Características

- Cuestionario guiado de ocho secciones.
- Días, horas, duración de módulos, recesos y continuidad máxima configurables.
- Catálogos de salones, materias, grupos y docentes.
- Disponibilidad docente en tabla por día y módulo.
- Sesiones compartidas entre grupos.
- Distribución equilibrada con validación de choques, capacidad, disponibilidad y tipo de aula.
- Vista previa por grupo, docente y aula.
- Exportación XLSX con hoja Resumen y una hoja por grupo.
- Respaldo y restauración en JSON.
- Datos guardados localmente en el navegador.
- Sin servidor, base de datos, Node.js ni instalación.

## Uso local

1. Descarga o clona el repositorio.
2. Abre `index.html` con un navegador moderno.
3. Completa las secciones en orden o pulsa **Cargar ejemplo**.
4. En **Generar**, revisa la validación y crea los horarios.
5. En **Vista previa**, pulsa **Exportar XLSX**.

> La biblioteca de Excel está incluida dentro de `vendor/`, por lo que la exportación no depende de una conexión a internet.

## Estructura

```text
Horarios/
├── index.html
├── README.md
├── LICENSE
├── .nojekyll
├── assets/Chava.png
├── css/styles.css
├── js/store.js
├── js/scheduler.js
├── js/export.js
├── js/app.js
└── vendor/xlsx-js-style.min.js
```

## Privacidad

La información se procesa en el navegador y se conserva en `localStorage` del dispositivo. No se envía a servidores. Si se borran los datos del navegador, también se pierde la configuración; usa **Respaldo JSON** para conservar una copia portátil.

## Alcance

La interfaz limita el catálogo a 30 grupos. El motor emplea una heurística de restricciones: prioriza las tareas con menos combinaciones posibles y puntúa los espacios para repartir las clases entre días, reducir huecos, conservar el aula base y evitar capacidad desperdiciada.

Si una configuración no permite acomodar toda la carga, la aplicación genera el mejor horario parcial encontrado y señala las asignaciones pendientes tanto en pantalla como en la hoja Resumen del XLSX.

## Autor

Salvador Molina Corona  
GitHub: https://github.com/Mini-Buda-CH  
Contacto: smolina.co@gmail.com

## Licencia

MIT. Consulta `LICENSE`.
