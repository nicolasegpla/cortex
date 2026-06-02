# CORTEX

Sistema de inteligencia empresarial con memoria, conocimiento y datos unificados, accesible desde cualquier canal.

---

## Qué es

CORTEX es un agente de IA conectado a tres fuentes de conocimiento de la empresa: los documentos institucionales, la base de datos operacional y su propia memoria acumulada. El agente recibe preguntas o instrucciones desde una interfaz web o Telegram, consulta lo que necesita y responde o actúa.

---

## Las cinco capas

### Channel layer
Cómo el usuario se comunica con CORTEX. Por ahora dos canales: la interfaz web en React 19 y un bot de Telegram. Ambos hablan con el mismo backend, así que el agente es idéntico en los dos.

### Backend layer
FastAPI en Python. Es el cerebro operativo: autentica al usuario, recibe el mensaje, decide qué modelo de IA usar, orquesta las consultas a las distintas fuentes y devuelve la respuesta al canal correcto. También maneja la ingestión de documentos y los webhooks de Telegram.

### AI provider layer
El usuario configura su propia API key del modelo que prefiera: Claude, GPT u otros. CORTEX enruta la conversación al modelo elegido. Nadie comparte keys, cada empresa o usuario paga directamente a su proveedor.

### MCP layer
Los brazos del agente. Dos servidores MCP conectados al backend: Engram para acceder a la memoria y Supabase para acceder a datos y documentos. El agente los consulta automáticamente según lo que necesite para responder.

### Data layer
Supabase agrupa todo el almacenamiento en un solo lugar: pgvector para los documentos vectorizados, PostgreSQL para los datos operacionales, Storage para los archivos originales y Auth para usuarios y API keys.

---

## La memoria

Engram guarda lo que el agente aprende en cada sesión: decisiones tomadas, contexto de trabajos anteriores, preferencias detectadas. La próxima vez que el usuario pide algo relacionado, el agente ya tiene ese contexto sin que nadie se lo repita.

---

## El conocimiento

Los documentos de la empresa (manuales, políticas, procedimientos en PDF, Word o Excel) se procesan y vectorizan en Supabase pgvector. Cuando el agente necesita saber cómo funciona algo en la empresa, busca semánticamente en esos documentos. No busca palabras exactas, entiende el significado.

---

## Los datos

Los datos operacionales viven en PostgreSQL dentro de Supabase, organizados por schemas. El agente accede directo vía MCP. Puede responder preguntas como "cuántos clientes tenemos en el sector cafetero" o "dame la información de este cliente" sin que nadie tenga que buscar en hojas de Excel.

---

## Los canales

**Web:** interfaz completa con chat, upload de documentos, dashboards y vista de archivos generados.

**Telegram:** el mismo agente accesible desde el móvil. El usuario escribe, el bot responde. Útil para consultas rápidas en movimiento sin abrir el navegador.

**Futuros:** WhatsApp, Slack, Email. Todos hablarían con el mismo backend sin cambiar nada del agente.

---

## Flujo de una conversación típica

El usuario escribe algo, ya sea en la web o en Telegram. El backend autentica, toma el mensaje y se lo pasa al modelo de IA configurado. El agente consulta Engram para ver si hay contexto previo relevante, consulta pgvector si necesita información de algún documento, consulta PostgreSQL si necesita datos operacionales, y produce una respuesta. Si hizo algo importante, guarda el aprendizaje en Engram para la próxima sesión.

---

## Stack del demo

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + shadcn/ui |
| Backend | FastAPI (Python) |
| Base de datos | Supabase (PostgreSQL + pgvector + Storage + Auth) |
| Memoria | Engram (SQLite local) |
| Canales | React 19 · Telegram Bot API |
| AI | Anthropic Claude (API key propia) |

---

## Lo que no es

CORTEX no es un chatbot genérico. Sabe lo que sabe la empresa porque está conectado a sus documentos y sus datos. No inventa, consulta. Y recuerda lo que aprendió porque tiene memoria persistente entre sesiones.
