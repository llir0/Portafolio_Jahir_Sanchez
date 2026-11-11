// js/projects-data.js
// Catálogo de proyectos de Jahir Eliecer Sánchez Centella
// Cada proyecto contiene enlaces reales, descripciones, arquitectura y datos técnicos.

window.projectsData = [
  {
    id: "control-ganadero",
    title: "Control Ganadero Pro",
    version: "v2.5",
    tagline: "Gestión y trazabilidad veterinaria para fincas ganaderas con códigos QR y báscula",
    category: "AgroTech / Web App",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    tabColor: "#10b981",
    date: "2025 - 2026",
    status: "En Producción Activa",
    liveUrl: "https://controlganadero-mu.vercel.app/",
    githubUrl: "https://github.com/llir0/Control-Ganadero",
    screenshot: "images/control-ganadero.png",
    fallbackMockup: {
      type: "cattle",
      title: "Control Ganadero Pro v2.5",
      subtitle: "Dashboard de Hato Activo & Muestreo",
      metric1: "1,240 Cabezas registradas",
      metric2: "98.4% Salud óptima",
      highlight: "Escaneo QR & Lectura de Báscula Rápida"
    },
    shortDescription: "Plataforma web en producción que digitaliza el control de fincas ganaderas: identificación por código QR, pesaje directo de báscula y calendario sanitario.",
    fullDescription: "Desarrollé esta aplicación web para resolver un problema cotidiano en las fincas de nuestra región: la pérdida y desorden de datos al anotar pesajes, partos y vacunas a mano en libretas. Creé un sistema donde cada animal tiene su código QR para escanearlo con el celular en el corral, registrar el pesaje al momento y llevar un control estricto de vacunas y cuarentenas.",
    architecture: [
      { label: "Frontend Móvil", desc: "Interfaz rápida y ligera construida con React y Tailwind, diseñada para cargar al instante incluso con señal celular baja en el campo." },
      { label: "Base de Datos & Sincronización", desc: "Estructura optimizada para consultar historiales de peso y genealogía de ganado en milisegundos." },
      { label: "Módulo Sanitario", desc: "Control de fechas de vacunación, desparasitación y cálculo automático de ganancia diaria de peso (ceba)." },
      { label: "Despliegue Continuo", desc: "Alojado y desplegado en Vercel con integración a GitHub y certificados SSL automáticos." }
    ],
    features: [
      "Escaneo de códigos QR con la cámara del celular para consultar la ficha de cada res",
      "Registro rápido de pesajes de báscula y gráficas de evolución de peso",
      "Calendario sanitario con alertas de próximas vacunas y tratamientos",
      "Exportación de inventarios y reportes de hato a PDF y hojas de cálculo",
      "Diseño adaptable pensado para usarse bajo el sol en teléfonos y tablets"
    ],
    tools: ["React", "TypeScript", "Tailwind CSS", "Node.js", "QR Code API", "Vercel"]
  },
  {
    id: "mialiado-sigc",
    title: "MiAliado (SIGC)",
    version: "v1.0",
    tagline: "Sistema de inventario, punto de venta y finanzas para pequeñas empresas y comercios",
    category: "FinTech / ERP PYME",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    tabColor: "#3b82f6",
    date: "2025 - 2026",
    status: "Plataforma Operativa",
    liveUrl: "https://mialiado.click/",
    githubUrl: "https://github.com/llir0/SIGC",
    screenshot: "images/mialiado.png",
    fallbackMockup: {
      type: "erp",
      title: "MiAliado (SIGC)",
      subtitle: "Panel Financiero & Control de Existencias",
      metric1: "Flujo de Caja en Tiempo Real",
      metric2: "Kardex Automatizado",
      highlight: "Gestión Multi-Sucursal para PYMEs"
    },
    shortDescription: "Sistema ERP comercial y de inventarios diseñado para que pequeños negocios y comercios controlen sus ventas, cajas y almacenes sin hojas de cálculo dispersas.",
    fullDescription: "Creé MiAliado para ayudar a pequeños comerciantes y negocios locales a tener el control exacto de lo que compran, venden y ganan. Sustituye las libretas y hojas de Excel con un sistema ordenado que actualiza el inventario en tiempo real con cada venta, calcula la ganancia neta por producto y avisa antes de que se agote la mercancía.",
    architecture: [
      { label: "Base de Datos Relacional", desc: "Diseño en SQL Server con integridad referencial estricta para transacciones de compras, ventas y kardex." },
      { label: "Punto de Venta & Caja", desc: "Módulo de facturación rápida con cálculo de impuestos, métodos de pago y cierre diario de caja." },
      { label: "Control de Almacén", desc: "Kardex valorizado con seguimiento de entradas, salidas, mermas y alertas de stock mínimo." },
      { label: "Despliegue con Dominio Propio", desc: "Configurado y activo en producción con dominio personalizado (mialiado.click)." }
    ],
    features: [
      "Facturación ágil de productos con actualización automática de stock",
      "Reporte de ventas diarias, ganancias reales y productos más vendidos",
      "Kardex de movimientos para saber con exactitud quién movió cada producto",
      "Gestión de múltiples bodegas o sucursales con permisos diferenciados por usuario"
    ],
    tools: ["SQL Server", "Node.js", "React", "REST API", "Tailwind CSS", "Cloudflare"]
  },
  {
    id: "kelme-latam",
    title: "Portal Kelme Latam Hub",
    version: "Enterprise B2B",
    tagline: "Plataforma mayorista B2B oficial para la red de distribuidores de Kelme en América Latina",
    category: "E-Commerce B2B / Enterprise",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    tabColor: "#f59e0b",
    date: "2025",
    status: "B2B Corporativo",
    liveUrl: null, // Sistema privado corporativo
    githubUrl: null, // Privado
    privateNotice: "Plataforma interna privada para mayoristas y socios estratégicos de Kelme Latam.",
    screenshot: "images/kelme.png",
    fallbackMockup: {
      type: "b2b",
      title: "Kelme Latam B2B Hub",
      subtitle: "Catálogo Mayorista Internacional",
      metric1: "Despacho Inmediato & Reservas Futuras",
      metric2: "Lotes & Preventas Latam",
      highlight: "Portal de Socios Estratégicos"
    },
    shortDescription: "Portal B2B mayorista que centraliza pedidos de distribuidores de Kelme en América Latina, gestionando inventario disponible y preventas de colecciones.",
    fullDescription: "Como desarrollador principal, diseñé y construí el portal B2B para la distribución mayorista de Kelme en la región. La empresa necesitaba centralizar los pedidos de sus distribuidores en varios países, permitiéndoles tanto comprar productos disponibles en bodega para despacho inmediato como apartar pedidos de preventa de colecciones de temporada meses antes de su llegada a puerto.",
    architecture: [
      { label: "Catálogo B2B Multi-Temporada", desc: "Búsqueda y filtrado masivo por disciplinas deportivas, tallas y volúmenes mínimos de compra." },
      { label: "Motor de Preventas", desc: "Lógica para programar pedidos anticipados contra proyecciones de importación de fábrica." },
      { label: "Gestión de Cotizaciones", desc: "Generación automática de pre-órdenes comerciales y órdenes de compra oficiales." },
      { label: "Portal Protegido", desc: "Autenticación segura restringida exclusivamente a distribuidores y socios autorizados." }
    ],
    features: [
      "Separación clara entre stock de entrega inmediata y preventas programadas",
      "Cálculo automático de descuentos por volumen de compra y condiciones comerciales",
      "Descarga de cotizaciones y resúmenes de pedido listos para facturación corporativa",
      "Panel de administración para actualizar catálogos, listas de precios y pedidos"
    ],
    tools: ["Node.js", "SQL Server", "TypeScript", "REST APIs", "Vercel / Cloudflare"]
  },
  {
    id: "ergoia",
    title: "ErgoIA",
    version: "v1.0 - Visión Artificial",
    tagline: "Aplicación de visión artificial que monitorea la postura frente al computador y cuida tu salud laboral",
    category: "Visión Artificial / Python",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    tabColor: "#a855f7",
    date: "2025",
    status: "Código Abierto / Python",
    liveUrl: null,
    githubUrl: "https://github.com/llir0/ErgoIA",
    screenshot: "images/ergoia.png",
    fallbackMockup: {
      type: "vision",
      title: "ErgoIA Computer Vision",
      subtitle: "Tracking de Cuello, Hombros & Columna",
      metric1: "Detección a 30 FPS en Tiempo Real",
      metric2: "Score Ergonómico Continuo",
      highlight: "Alertas Activas de Postura e Hidratación"
    },
    shortDescription: "Herramienta en Python que analiza la postura en tiempo real mediante la webcam y emite alertas ergonómicas discretas, procesando todo localmente.",
    fullDescription: "Desarrollé este proyecto en Python preocupado por las largas jornadas que pasamos los estudiantes y programadores encorvados frente a la pantalla. ErgoIA utiliza la cámara web para estimar en tiempo real la inclinación del cuello, la alineación de los hombros y la distancia a la pantalla, mostrando avisos sutiles cuando detecta mala postura y recordando hacer pausas activas o tomar agua. Todo el procesamiento se ejecuta 100% en la computadora del usuario, por lo que nunca se guarda ni se transmite ningún video.",
    architecture: [
      { label: "Estimación de Pose", desc: "Rastreo de puntos anatómicos clave en tiempo real a 30 FPS con bajo consumo de CPU." },
      { label: "Lógica Ergonómica", desc: "Cálculo de ángulos y umbrales de desviación postural basados en recomendaciones de salud laboral." },
      { label: "Privacidad Total", desc: "Procesamiento completamente local: la imagen de la cámara se analiza en memoria y se descarta al instante." },
      { label: "Alertas No Invasivas", desc: "Notificaciones discretas en pantalla que avisan sin interrumpir tu trabajo o videollamadas." }
    ],
    features: [
      "Detección visual precisa de inclinación de cuello y caída de hombros",
      "Temporizador de pausas activas y recordatorio para tomar agua",
      "Puntaje de postura diario para evaluar tus hábitos a lo largo de la semana",
      "Calibración simple para adaptarse a la altura de cualquier monitor o laptop"
    ],
    tools: ["Python", "OpenCV", "MediaPipe", "NumPy", "Desktop UI"]
  },
  {
    id: "lengua-senas",
    title: "Traductor de Lengua de Señas Panameña",
    version: "Iniciativa Científica UTP 2025",
    tagline: "Investigación científica y prototipo de software para traducción de Lengua de Señas con cámara web",
    category: "Investigación / UTP Azuero",
    badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    tabColor: "#f43f5e",
    date: "2025",
    status: "Reconocimiento JIC UTP",
    liveUrl: null,
    githubUrl: "https://github.com/llir0",
    screenshot: "images/lengua-senas.png",
    fallbackMockup: {
      type: "accessibility",
      title: "Lengua de Señas Panameña (LSP)",
      subtitle: "Arquitectura de Inclusión Tecnológica",
      metric1: "Jornada Iniciación Científica UTP",
      metric2: "Enfoque de Accesibilidad Nacional",
      highlight: "Modelado de Pipelines de IA y Visión"
    },
    shortDescription: "Proyecto de investigación premiado en la Jornada de Iniciación Científica (JIC) de la UTP Azuero para traducir señas a texto con cámaras comunes.",
    fullDescription: "Proyecto de investigación que desarrollé y presenté en la Jornada de Iniciación Científica (JIC 2025) de la Universidad Tecnológica de Panamá (UTP Azuero), obteniendo reconocimiento institucional. El objetivo fue proponer una solución tecnológica real para reducir la brecha de comunicación con las personas sordas en Panamá, utilizando cámaras web estándar para reconocer señas y traducirlas a texto sin requerir sensores costosos.",
    architecture: [
      { label: "Captura de Movimiento", desc: "Extracción de coordenadas de manos y dedos a lo largo del tiempo para captar la seña completa." },
      { label: "Clasificación de Señas", desc: "Modelado de patrones adaptados al vocabulario de la Lengua de Señas Panameña (LSP)." },
      { label: "Salida de Texto", desc: "Traducción inmediata a texto en pantalla para facilitar la atención en ventanillas y aulas." },
      { label: "Enfoque de Accesibilidad", desc: "Diseñado para funcionar en computadoras estándar de escuelas e instituciones públicas." }
    ],
    features: [
      "Presentado y evaluado formalmente en la JIC UTP 2025 con jurado académico",
      "Propuesta orientada a instituciones públicas, bancos y centros educativos de Panamá",
      "Uso de hardware cotidiano sin guantes especiales ni sensores infrarrojos"
    ],
    tools: ["Python", "Deep Learning", "MediaPipe", "OpenCV", "Investigación UTP"]
  }
];

// Perfil profesional y datos biográficos de Jahir
window.personalProfile = {
  fullName: "Jahir Eliecer Sánchez Centella",
  role: "Desarrollador de Software & Estudiante de Ing. de Sistemas",
  subRole: "Desarrollo Web Full-Stack, Bases de Datos Relacionales y Despliegue Cloud",
  location: "Chitré, Herrera, Panamá",
  phone: "6606-1997",
  email: "jahirjanche@gmail.com",
  github: "https://github.com/llir0",
  academicStatus: "5to Año de Ingeniería de Sistemas Computacionales — Universidad Tecnológica de Panamá (UTP Azuero)",
  graduationProjection: "Culminación de materias proyectada para finales de 2026; Tesis programada entre finales de 2026 e inicios de 2027.",
  
  aboutMe: {
    headline: "Ingeniero de Sistemas Computacionales en Formación",
    summary: "Soy estudiante de 5to año en la Universidad Tecnológica de Panamá (UTP Azuero), con sede en Chitré. Me apasiona diseñar y programar software que resuelva problemas reales de personas y empresas. Tengo experiencia construyendo aplicaciones completas desde cero: diseño la base de datos, desarrollo la lógica del backend, creo interfaces web intuitivas y las despliego en la nube con monitoreo continuo.",
    strengths: [
      {
        title: "Desarrollo Full-Stack Real",
        desc: "Experiencia probada creando y desplegando sistemas que hoy están en producción activa (Control Ganadero Pro, MiAliado ERP, Portal Kelme Latam)."
      },
      {
        title: "Bases de Datos y Lógica Robusta",
        desc: "Dominio de modelado relacional en SQL Server, diseño de esquemas normalizados, integridad de datos transaccionales y APIs RESTful."
      },
      {
        title: "Entornos Linux y Flujo Ordenado",
        desc: "Uso diario de entornos Linux, Git y automatización para depurar código, mantener repositorios limpios y entregar software probado."
      }
    ]
  },

  skills: [
    {
      category: "Frontend & Tecnologías Web",
      items: ["React", "TypeScript", "JavaScript Moderno", "Tailwind CSS", "HTML5 Semántico", "CSS3"]
    },
    {
      category: "Backend & Bases de Datos",
      items: ["SQL Server", "Node.js", "Diseño Relacional", "APIs RESTful", "Firestore / Cloud DB"]
    },
    {
      category: "Cloud & Despliegue",
      items: ["Vercel", "Cloudflare Pages", "Git / GitHub", "Linux (Debian, CachyOS)"]
    },
    {
      category: "Inteligencia Artificial & Visión",
      items: ["Python", "OpenCV", "MediaPipe", "Redes Neuronales (Certificación Samsung 200h)"]
    },
    {
      category: "Otros Lenguajes & Bases",
      items: ["Java", "C#", "C", "C++", "Kotlin"]
    }
  ],

  certifications: [
    {
      title: "Programa de Inteligencia Artificial (200 Horas)",
      issuer: "SAMSUNG",
      date: "Agosto - Diciembre 2025",
      credentialId: "Certificado SIC1767-2025",
      badge: "Samsung Innovation Campus"
    },
    {
      title: "Jornada de Iniciación Científica (JIC)",
      issuer: "Universidad Tecnológica de Panamá (UTP)",
      date: "2025",
      credentialId: "Proyecto de Investigación de Lengua de Señas",
      badge: "Investigación Científica"
    },
    {
      title: "Congreso de Ingeniería UTP Azuero",
      issuer: "UTP Azuero",
      date: "2024",
      credentialId: "Participación Académica y Tecnológica",
      badge: "Congreso de Ingeniería"
    },
    {
      title: "Bachiller en Ciencias",
      issuer: "Colegio José Daniel Crespo",
      date: "Graduado en 2020",
      credentialId: "Chitré, Herrera",
      badge: "Educación Media"
    }
  ]
};

const projectsData = window.projectsData;
const personalProfile = window.personalProfile;
