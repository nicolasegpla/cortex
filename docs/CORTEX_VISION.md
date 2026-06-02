# CORTEX — visión y propuesta de valor

---

## La idea central

CORTEX es un super empleado digital. No una herramienta, no un chatbot. Un empleado que conoce toda la empresa, ejecuta tareas, nunca olvida nada y está disponible las 24 horas.

Funciona para una empresa pequeña que necesita su primer empleado inteligente, y para una empresa grande que necesita conectar el conocimiento de toda la organización.

---

## El problema que resuelve

Toda empresa enfrenta los mismos tres problemas:

**El conocimiento vive en personas, no en la empresa.**
Cuando alguien se va, se lleva años de aprendizaje. Los procesos quedan en la cabeza de quien los hacía. Los nuevos empleados tardan meses en aprender lo que ya existía.

**La información está fragmentada.**
Los manuales en una carpeta, los clientes en un Excel, las decisiones en correos viejos. Nadie tiene todo el contexto en un solo lugar.

**Las tareas repetitivas consumen tiempo valioso.**
Escribir correos, buscar información, generar reportes, responder las mismas preguntas. Trabajo que podría hacerse solo.

CORTEX resuelve los tres al mismo tiempo.

---

## Qué hace CORTEX

### Ejecuta tareas
Redacta cartas, correos y actas con el tono y formato de la empresa. Genera reportes y dashboards con datos reales. Crea y actualiza registros en la base de datos. Todo desde una conversación en la web o en Telegram.

### Responde con conocimiento propio
Consulta los documentos internos de la empresa para responder preguntas sobre procesos, políticas y procedimientos. No inventa. Sabe lo que la empresa le enseñó.

### Recuerda lo que aprendió
Cada interacción queda en su memoria. La próxima vez que alguien pide algo relacionado, CORTEX ya tiene el contexto. Se vuelve más útil con el tiempo, igual que un empleado experimentado.

### Capacita a nuevos empleados
Un empleado nuevo puede preguntarle a CORTEX cómo se hacen las cosas en la empresa y recibir una respuesta precisa, consistente y disponible al instante. El conocimiento institucional deja de depender de que alguien se tome el tiempo de explicarlo.

---

## Por qué escala en cualquier empresa

La arquitectura de CORTEX es una abstracción de lo que hace cualquier empleado:

| Empleado humano | CORTEX |
|---|---|
| Lee los manuales de la empresa | Knowledge layer — documentos vectorizados |
| Consulta la base de datos | Data layer — Supabase PostgreSQL |
| Recuerda experiencias pasadas | Memory layer — Engram |
| Escribe comunicaciones formales | Agente Secretario |
| Genera reportes e informes | Agente Analista |
| Responde preguntas sobre procesos | Agente Documentador |
| Crea y actualiza registros | Agente Operativo |
| Atiende por distintos medios | Web + Telegram + futuros canales |

Esa abstracción funciona igual para una empresa de 5 personas que para una de 5000. El tamaño cambia, la necesidad es la misma.

---

## La fuga de conocimiento institucional

Uno de los costos más invisibles y más altos de cualquier empresa. Cuando un empleado se va, se lleva:

- Los procesos que solo él conocía
- Las preferencias de los clientes que atendía
- Las decisiones que tomó y por qué
- Los atajos que aprendió con la experiencia

Con CORTEX ese conocimiento vive en el sistema. No en una persona. No se va cuando alguien renuncia. No se pierde cuando alguien se enferma. No hay que reconstruirlo cada vez que llega alguien nuevo.

---

## EaaS — Employee as a Service

El modelo de negocio no es vender software. Es ofrecer un empleado como servicio.

CORTEX se entrega completo: el sistema, la integración con los documentos y datos de la empresa, y la infraestructura para que funcione. El cliente no necesita equipo técnico, no necesita configurar servidores, no necesita saber nada de IA.

Paga una mensualidad y tiene su super empleado funcionando.

**Para una empresa pequeña** es el primer empleado inteligente que cuesta una fracción de un salario, trabaja 24/7 y nunca renuncia.

**Para una empresa grande** es el empleado que conecta silos de información, está disponible para todos al mismo tiempo y capacita a los nuevos desde el primer día.

---

## Lo que diferencia a CORTEX

No es el chat. No es la IA. Es la combinación de tres cosas que ninguna herramienta genérica tiene:

**Conocimiento propio de la empresa.** CORTEX sabe lo que la empresa le enseña. No es un modelo genérico respondiendo con información de internet.

**Memoria persistente.** Aprende y acumula contexto con cada interacción. Mejora con el tiempo.

**Acción real.** No solo responde, ejecuta. Crea registros, genera documentos, actualiza datos, envía respuestas por el canal correcto.

---

## La visión a largo plazo

Hoy CORTEX es un super empleado para una empresa.

Mañana es la infraestructura humana digitalizada de cualquier organización. El lugar donde vive el conocimiento, la memoria y la capacidad de acción de una empresa, independientemente de quién trabaje en ella.

---

## Modelo de infraestructura — single-tenant gestionado

CORTEX no es un software multitenant donde todos los clientes comparten el mismo servidor. Cada empresa recibe su propia instancia, desplegada en su propio servidor, gestionada por Stalloy.

```
Empresa A          Empresa B          Empresa C
└── su servidor    └── su servidor    └── su servidor
    └── CORTEX         └── CORTEX         └── CORTEX
    └── su DB          └── su DB          └── su DB
    └── su Engram      └── su Engram      └── su Engram
    └── sus docs       └── sus docs       └── sus docs
```

Los datos de cada empresa nunca tocan los de otra. No hay riesgo de filtración entre clientes, no hay complejidad de aislamiento, no hay arquitectura multitenant que construir desde el día uno.

**Ventajas del modelo:**

Para el cliente, sus datos viven en su servidor. No en una nube extranjera, no en una plataforma compartida. Eso cierra ventas que un SaaS tradicional no puede cerrar, especialmente con empresas medianas y grandes que tienen requisitos de compliance o simplemente desconfianza de compartir sus datos.

Para Stalloy, el modelo de costos es limpio. El servidor lo contrata o lo paga el cliente, con o sin margen. La mensualidad cubre el software, el deployment, los updates y la gestión continua. No hay que absorber costos de infraestructura variable antes de tener ingresos suficientes.

**Lo que Stalloy gestiona remotamente:**
- Deployments y actualizaciones de CORTEX
- Monitoreo y disponibilidad
- Actualización del conocimiento cuando cambian procesos
- Incorporación de nuevos agentes y skills

El cliente no necesita equipo técnico. Stalloy es el equipo técnico de su CORTEX.

**Escalabilidad del modelo:**
Cuando el volumen de clientes lo justifique, se puede evaluar un tier multitenant para empresas pequeñas que no requieren aislamiento estricto. Pero esa es una decisión futura. Hoy el modelo single-tenant gestionado es el correcto: sin complejidad técnica prematura, con una propuesta de valor de privacidad y control que es difícil de igualar.
