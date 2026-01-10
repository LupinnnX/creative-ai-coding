/**
 * Tutorial Handler - Comprehensive Command Guide
 * Bilingual support (ES/EN) with rich visual explanations
 * 
 * NOVA Framework v6.0 - SIRIUS + POLARIS Implementation
 * January 2026
 * 
 * Usage: /tutorial [es|en] [topic]
 * Topics: setup, deploy, git, github, autonomy, nova, all
 */

export type TutorialLanguage = 'en' | 'es';
export type TutorialTopic = 
  | 'setup' 
  | 'deploy' 
  | 'git' 
  | 'github' 
  | 'autonomy' 
  | 'nova' 
  | 'database'
  | 'all';

interface TutorialSection {
  title: string;
  emoji: string;
  content: string;
  commands: {
    cmd: string;
    desc: string;
    example?: string;
    important?: boolean;
  }[];
}

// =============================================================================
// ENGLISH TUTORIALS
// =============================================================================

const TUTORIALS_EN: Record<TutorialTopic, TutorialSection> = {
  setup: {
    title: '🚀 INITIAL SETUP',
    emoji: '🚀',
    content: `Welcome to Creative AI-Driven Coding Development! Let's get you started.

This bot allows you to code, deploy, and manage repositories directly from Telegram.`,
    commands: [
      {
        cmd: '/clone <repo-url>',
        desc: 'Clone a GitHub repository to start working',
        example: '/clone https://github.com/user/my-app',
        important: true,
      },
      {
        cmd: '/github_token <token>',
        desc: 'Set your GitHub Personal Access Token for git operations',
        example: '/github_token ghp_xxxxxxxxxxxx',
        important: true,
      },
      {
        cmd: '/vercel_setup <token>',
        desc: 'Configure Vercel for deployments',
        example: '/vercel_setup your_vercel_token',
        important: true,
      },
      {
        cmd: '/setcwd <path>',
        desc: 'Set working directory manually',
        example: '/setcwd /home/user/projects/my-app',
      },
      {
        cmd: '/status',
        desc: 'Check current session status and configuration',
      },
      {
        cmd: '/help',
        desc: 'Show all available commands',
      },
    ],
  },

  deploy: {
    title: '🌐 DEPLOYMENT',
    emoji: '🌐',
    content: `Deploy your projects to Vercel with one command!

Supports local directories AND direct GitHub repo deployment.`,
    commands: [
      {
        cmd: '/preview [dir]',
        desc: 'Deploy local directory to Vercel preview',
        example: '/preview dist',
        important: true,
      },
      {
        cmd: '/preview owner/repo',
        desc: '🆕 Deploy GitHub repo directly (no clone needed!)',
        example: '/preview vercel/next.js',
        important: true,
      },
      {
        cmd: '/preview owner/repo#branch',
        desc: '🆕 Deploy specific branch from GitHub',
        example: '/preview my-org/app#develop',
        important: true,
      },
      {
        cmd: '/preview_prod [dir|repo]',
        desc: 'Deploy to production environment',
        example: '/preview_prod dist',
      },
      {
        cmd: '/preview_scan',
        desc: 'Scan project for deployable folders',
      },
      {
        cmd: '/preview_providers',
        desc: 'List all deployment providers (Vercel, Surge, etc.)',
      },
      {
        cmd: '/vercel_debug on|off',
        desc: 'Toggle verbose deployment output',
      },
      {
        cmd: '/vercel_env add KEY=value',
        desc: 'Add environment variable for deployments',
        example: '/vercel_env add API_URL=https://api.example.com',
      },
    ],
  },

  git: {
    title: '📦 GIT OPERATIONS',
    emoji: '📦',
    content: `Manage your git workflow directly from Telegram.

All operations work via API - no git CLI needed on server!`,
    commands: [
      {
        cmd: '/git_status',
        desc: 'Show current git status',
        important: true,
      },
      {
        cmd: '/git_commit <message>',
        desc: 'Commit all changes with message',
        example: '/git_commit "feat: add login page"',
        important: true,
      },
      {
        cmd: '/git_push [branch]',
        desc: 'Push commits to remote',
        example: '/git_push main',
        important: true,
      },
      {
        cmd: '/git_branch <name>',
        desc: 'Create and switch to new branch',
        example: '/git_branch feature/auth',
      },
      {
        cmd: '/git_diff',
        desc: 'Show uncommitted changes',
      },
      {
        cmd: '/git_pull',
        desc: 'Pull latest changes from remote',
      },
    ],
  },

  github: {
    title: '🐙 GITHUB API',
    emoji: '🐙',
    content: `Interact with GitHub directly via API.

Create repos, PRs, and manage your GitHub account.`,
    commands: [
      {
        cmd: '/gh_user',
        desc: 'Show your GitHub profile info',
        important: true,
      },
      {
        cmd: '/gh_repos',
        desc: 'List your repositories',
        important: true,
      },
      {
        cmd: '/gh_create <name>',
        desc: 'Create new GitHub repository',
        example: '/gh_create my-new-project',
      },
      {
        cmd: '/gh_fork <owner/repo>',
        desc: 'Fork a repository',
        example: '/gh_fork facebook/react',
      },
      {
        cmd: '/gh_pr_create <title>',
        desc: 'Create pull request from current branch',
        example: '/gh_pr_create "Add authentication"',
      },
      {
        cmd: '/gh_prs',
        desc: 'List open pull requests',
      },
    ],
  },

  autonomy: {
    title: '⚡ AUTONOMY & EXECUTION',
    emoji: '⚡',
    content: `Control how the agent executes commands and manages your workflow.

From supervised to full autonomy mode.`,
    commands: [
      {
        cmd: '/autonomy',
        desc: 'Show current autonomy configuration',
        important: true,
      },
      {
        cmd: '/autonomy <preset>',
        desc: 'Apply preset: safe, balanced, aggressive, full',
        example: '/autonomy balanced',
        important: true,
      },
      {
        cmd: '/autonomy preview on|off',
        desc: 'Enable/disable preview deployments',
      },
      {
        cmd: '/exec <command>',
        desc: 'Execute a shell command',
        example: '/exec npm install',
        important: true,
      },
      {
        cmd: '/exec-sequence <cmds>',
        desc: 'Run numbered command sequence',
        example: '/exec-sequence 1. npm install 2. npm run build',
      },
      {
        cmd: '/exec-template [name]',
        desc: 'Run or list command templates',
        example: '/exec-template build-deploy',
      },
      {
        cmd: '/autonomy-full',
        desc: 'Enable full autonomy mode (AI decides actions)',
      },
    ],
  },

  nova: {
    title: '🌟 NOVA FRAMEWORK',
    emoji: '🌟',
    content: `Multi-agent AI system with 6 specialized agents.

Each agent has unique expertise and can be activated for specific tasks.`,
    commands: [
      {
        cmd: '/activate POLARIS <task>',
        desc: '⭐ Strategic Commander - orchestration & planning',
        example: '/activate POLARIS Plan user authentication',
        important: true,
      },
      {
        cmd: '/activate VEGA <task>',
        desc: '🔭 Navigator - research & architecture',
        example: '/activate VEGA Research best database option',
        important: true,
      },
      {
        cmd: '/activate SIRIUS <task>',
        desc: '✨ Designer - UI/UX & accessibility (has VETO)',
        example: '/activate SIRIUS Design login page',
      },
      {
        cmd: '/activate RIGEL <task>',
        desc: '💎 Frontend Prime - React, TypeScript, components',
        example: '/activate RIGEL Build the navbar component',
      },
      {
        cmd: '/activate ANTARES <task>',
        desc: '❤️ Backend Prime - APIs, databases, systems',
        example: '/activate ANTARES Create REST API endpoints',
      },
      {
        cmd: '/activate ARCTURUS <task>',
        desc: '🛡️ Guardian - security & testing (has VETO)',
        example: '/activate ARCTURUS Review security of auth',
      },
      {
        cmd: '/constellation <agents> <task>',
        desc: 'Activate multiple agents together',
        example: '/constellation POLARIS VEGA Research and plan auth',
      },
    ],
  },

  database: {
    title: '🗄️ DATABASE (SUPABASE)',
    emoji: '🗄️',
    content: `Connect to Supabase for database operations.

Execute SQL, manage tables, and deploy edge functions.`,
    commands: [
      {
        cmd: '/supabase_setup <token>',
        desc: 'Configure Supabase access token',
        example: '/supabase_setup sbp_xxxxxxxxxxxx',
        important: true,
      },
      {
        cmd: '/supabase_tables',
        desc: 'List all tables in database',
        important: true,
      },
      {
        cmd: '/supabase_query <sql>',
        desc: 'Execute SQL query (read-only)',
        example: '/supabase_query SELECT * FROM users LIMIT 10',
      },
      {
        cmd: '/supabase_project <ref>',
        desc: 'Scope operations to specific project',
      },
    ],
  },

  all: {
    title: '📚 COMPLETE GUIDE',
    emoji: '📚',
    content: `Full command reference for Creative AI-Driven Coding Development.

Use /tutorial <topic> for detailed guides on specific areas.`,
    commands: [],
  },
};

// =============================================================================
// SPANISH TUTORIALS
// =============================================================================

const TUTORIALS_ES: Record<TutorialTopic, TutorialSection> = {
  setup: {
    title: '🚀 CONFIGURACIÓN INICIAL',
    emoji: '🚀',
    content: `¡Bienvenido al Agente de Código Remoto! Vamos a comenzar.

Este bot te permite programar, desplegar y gestionar repositorios directamente desde Telegram.`,
    commands: [
      {
        cmd: '/clone <repo-url>',
        desc: 'Clonar un repositorio de GitHub para empezar a trabajar',
        example: '/clone https://github.com/user/my-app',
        important: true,
      },
      {
        cmd: '/github_token <token>',
        desc: 'Configurar tu Token de Acceso Personal de GitHub',
        example: '/github_token ghp_xxxxxxxxxxxx',
        important: true,
      },
      {
        cmd: '/vercel_setup <token>',
        desc: 'Configurar Vercel para despliegues',
        example: '/vercel_setup tu_token_vercel',
        important: true,
      },
      {
        cmd: '/setcwd <ruta>',
        desc: 'Establecer directorio de trabajo manualmente',
        example: '/setcwd /home/user/projects/my-app',
      },
      {
        cmd: '/status',
        desc: 'Ver estado actual de la sesión y configuración',
      },
      {
        cmd: '/help',
        desc: 'Mostrar todos los comandos disponibles',
      },
    ],
  },

  deploy: {
    title: '🌐 DESPLIEGUE',
    emoji: '🌐',
    content: `¡Despliega tus proyectos a Vercel con un solo comando!

Soporta directorios locales Y despliegue directo desde GitHub.`,
    commands: [
      {
        cmd: '/preview [dir]',
        desc: 'Desplegar directorio local a Vercel preview',
        example: '/preview dist',
        important: true,
      },
      {
        cmd: '/preview owner/repo',
        desc: '🆕 Desplegar repo de GitHub directamente (¡sin clonar!)',
        example: '/preview vercel/next.js',
        important: true,
      },
      {
        cmd: '/preview owner/repo#branch',
        desc: '🆕 Desplegar rama específica desde GitHub',
        example: '/preview mi-org/app#develop',
        important: true,
      },
      {
        cmd: '/preview_prod [dir|repo]',
        desc: 'Desplegar a entorno de producción',
        example: '/preview_prod dist',
      },
      {
        cmd: '/preview_scan',
        desc: 'Escanear proyecto buscando carpetas desplegables',
      },
      {
        cmd: '/preview_providers',
        desc: 'Listar proveedores de despliegue (Vercel, Surge, etc.)',
      },
      {
        cmd: '/vercel_debug on|off',
        desc: 'Activar/desactivar salida detallada',
      },
      {
        cmd: '/vercel_env add KEY=value',
        desc: 'Añadir variable de entorno para despliegues',
        example: '/vercel_env add API_URL=https://api.example.com',
      },
    ],
  },

  git: {
    title: '📦 OPERACIONES GIT',
    emoji: '📦',
    content: `Gestiona tu flujo de trabajo git directamente desde Telegram.

¡Todas las operaciones funcionan via API - no necesitas git CLI en el servidor!`,
    commands: [
      {
        cmd: '/git_status',
        desc: 'Mostrar estado actual de git',
        important: true,
      },
      {
        cmd: '/git_commit <mensaje>',
        desc: 'Hacer commit de todos los cambios',
        example: '/git_commit "feat: añadir página de login"',
        important: true,
      },
      {
        cmd: '/git_push [rama]',
        desc: 'Subir commits al remoto',
        example: '/git_push main',
        important: true,
      },
      {
        cmd: '/git_branch <nombre>',
        desc: 'Crear y cambiar a nueva rama',
        example: '/git_branch feature/auth',
      },
      {
        cmd: '/git_diff',
        desc: 'Mostrar cambios sin commitear',
      },
      {
        cmd: '/git_pull',
        desc: 'Traer últimos cambios del remoto',
      },
    ],
  },

  github: {
    title: '🐙 API DE GITHUB',
    emoji: '🐙',
    content: `Interactúa con GitHub directamente via API.

Crea repos, PRs y gestiona tu cuenta de GitHub.`,
    commands: [
      {
        cmd: '/gh_user',
        desc: 'Mostrar info de tu perfil de GitHub',
        important: true,
      },
      {
        cmd: '/gh_repos',
        desc: 'Listar tus repositorios',
        important: true,
      },
      {
        cmd: '/gh_create <nombre>',
        desc: 'Crear nuevo repositorio en GitHub',
        example: '/gh_create mi-nuevo-proyecto',
      },
      {
        cmd: '/gh_fork <owner/repo>',
        desc: 'Hacer fork de un repositorio',
        example: '/gh_fork facebook/react',
      },
      {
        cmd: '/gh_pr_create <título>',
        desc: 'Crear pull request desde rama actual',
        example: '/gh_pr_create "Añadir autenticación"',
      },
      {
        cmd: '/gh_prs',
        desc: 'Listar pull requests abiertos',
      },
    ],
  },

  autonomy: {
    title: '⚡ AUTONOMÍA Y EJECUCIÓN',
    emoji: '⚡',
    content: `Controla cómo el agente ejecuta comandos y gestiona tu flujo de trabajo.

Desde modo supervisado hasta autonomía completa.`,
    commands: [
      {
        cmd: '/autonomy',
        desc: 'Mostrar configuración actual de autonomía',
        important: true,
      },
      {
        cmd: '/autonomy <preset>',
        desc: 'Aplicar preset: safe, balanced, aggressive, full',
        example: '/autonomy balanced',
        important: true,
      },
      {
        cmd: '/autonomy preview on|off',
        desc: 'Activar/desactivar despliegues preview',
      },
      {
        cmd: '/exec <comando>',
        desc: 'Ejecutar un comando de shell',
        example: '/exec npm install',
        important: true,
      },
      {
        cmd: '/exec-sequence <cmds>',
        desc: 'Ejecutar secuencia de comandos numerados',
        example: '/exec-sequence 1. npm install 2. npm run build',
      },
      {
        cmd: '/exec-template [nombre]',
        desc: 'Ejecutar o listar plantillas de comandos',
        example: '/exec-template build-deploy',
      },
      {
        cmd: '/autonomy-full',
        desc: 'Activar modo autonomía completa (IA decide acciones)',
      },
    ],
  },

  nova: {
    title: '🌟 FRAMEWORK NOVA',
    emoji: '🌟',
    content: `Sistema multi-agente con 6 agentes especializados.

Cada agente tiene experiencia única y puede activarse para tareas específicas.`,
    commands: [
      {
        cmd: '/activate POLARIS <tarea>',
        desc: '⭐ Comandante Estratégico - orquestación y planificación',
        example: '/activate POLARIS Planificar autenticación de usuarios',
        important: true,
      },
      {
        cmd: '/activate VEGA <tarea>',
        desc: '🔭 Navegador - investigación y arquitectura',
        example: '/activate VEGA Investigar mejor opción de base de datos',
        important: true,
      },
      {
        cmd: '/activate SIRIUS <tarea>',
        desc: '✨ Diseñador - UI/UX y accesibilidad (tiene VETO)',
        example: '/activate SIRIUS Diseñar página de login',
      },
      {
        cmd: '/activate RIGEL <tarea>',
        desc: '💎 Frontend Prime - React, TypeScript, componentes',
        example: '/activate RIGEL Construir componente navbar',
      },
      {
        cmd: '/activate ANTARES <tarea>',
        desc: '❤️ Backend Prime - APIs, bases de datos, sistemas',
        example: '/activate ANTARES Crear endpoints REST API',
      },
      {
        cmd: '/activate ARCTURUS <tarea>',
        desc: '🛡️ Guardián - seguridad y testing (tiene VETO)',
        example: '/activate ARCTURUS Revisar seguridad de auth',
      },
      {
        cmd: '/constellation <agentes> <tarea>',
        desc: 'Activar múltiples agentes juntos',
        example: '/constellation POLARIS VEGA Investigar y planificar auth',
      },
    ],
  },

  database: {
    title: '🗄️ BASE DE DATOS (SUPABASE)',
    emoji: '🗄️',
    content: `Conecta con Supabase para operaciones de base de datos.

Ejecuta SQL, gestiona tablas y despliega edge functions.`,
    commands: [
      {
        cmd: '/supabase_setup <token>',
        desc: 'Configurar token de acceso de Supabase',
        example: '/supabase_setup sbp_xxxxxxxxxxxx',
        important: true,
      },
      {
        cmd: '/supabase_tables',
        desc: 'Listar todas las tablas de la base de datos',
        important: true,
      },
      {
        cmd: '/supabase_query <sql>',
        desc: 'Ejecutar consulta SQL (solo lectura)',
        example: '/supabase_query SELECT * FROM users LIMIT 10',
      },
      {
        cmd: '/supabase_project <ref>',
        desc: 'Limitar operaciones a proyecto específico',
      },
    ],
  },

  all: {
    title: '📚 GUÍA COMPLETA',
    emoji: '📚',
    content: `Referencia completa de comandos del Agente de Código Remoto.

Usa /tutorial <tema> para guías detalladas de áreas específicas.`,
    commands: [],
  },
};

// =============================================================================
// FORMATTING FUNCTIONS
// =============================================================================

/**
 * Format a single command for display
 */
function formatCommand(cmd: { 
  cmd: string; 
  desc: string; 
  example?: string; 
  important?: boolean 
}, lang: TutorialLanguage): string {
  const star = cmd.important ? '⭐ ' : '';
  let result = `${star}\`${cmd.cmd}\`\n   └─ ${cmd.desc}`;
  
  if (cmd.example) {
    const exLabel = lang === 'es' ? 'Ej' : 'Ex';
    result += `\n   📝 ${exLabel}: \`${cmd.example}\``;
  }
  
  return result;
}

/**
 * Format a tutorial section
 */
function formatSection(section: TutorialSection, lang: TutorialLanguage): string {
  let msg = `${section.emoji} ${section.title}\n`;
  msg += '━'.repeat(30) + '\n\n';
  msg += section.content + '\n\n';
  
  if (section.commands.length > 0) {
    const cmdLabel = lang === 'es' ? '📋 COMANDOS:' : '📋 COMMANDS:';
    msg += `${cmdLabel}\n\n`;
    
    // Important commands first
    const important = section.commands.filter(c => c.important);
    const regular = section.commands.filter(c => !c.important);
    
    for (const cmd of important) {
      msg += formatCommand(cmd, lang) + '\n\n';
    }
    
    if (regular.length > 0 && important.length > 0) {
      const moreLabel = lang === 'es' ? '➕ Más comandos:' : '➕ More commands:';
      msg += `${moreLabel}\n\n`;
    }
    
    for (const cmd of regular) {
      msg += formatCommand(cmd, lang) + '\n\n';
    }
  }
  
  return msg;
}

/**
 * Get quick start guide
 */
function getQuickStart(lang: TutorialLanguage): string {
  if (lang === 'es') {
    return `
🚀 INICIO RÁPIDO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ Configura tu token de GitHub:
   \`/github_token ghp_tu_token\`

2️⃣ Clona un repositorio:
   \`/clone https://github.com/user/repo\`

3️⃣ Configura Vercel (opcional):
   \`/vercel_setup tu_token_vercel\`

4️⃣ ¡Empieza a programar!
   Escribe código o usa comandos

5️⃣ Despliega tu proyecto:
   \`/preview dist\`
   o directamente desde GitHub:
   \`/preview owner/repo\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Usa /tutorial <tema> para más info:
   setup, deploy, git, github, autonomy, nova, database
`;
  }
  
  return `
🚀 QUICK START
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ Set up your GitHub token:
   \`/github_token ghp_your_token\`

2️⃣ Clone a repository:
   \`/clone https://github.com/user/repo\`

3️⃣ Configure Vercel (optional):
   \`/vercel_setup your_vercel_token\`

4️⃣ Start coding!
   Write code or use commands

5️⃣ Deploy your project:
   \`/preview dist\`
   or directly from GitHub:
   \`/preview owner/repo\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Use /tutorial <topic> for more info:
   setup, deploy, git, github, autonomy, nova, database
`;
}

/**
 * Get topics list
 */
function getTopicsList(lang: TutorialLanguage): string {
  if (lang === 'es') {
    return `
📚 TEMAS DISPONIBLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 \`/tutorial es setup\`
   Configuración inicial y tokens

🌐 \`/tutorial es deploy\`
   Despliegue a Vercel (¡incluye GitHub directo!)

📦 \`/tutorial es git\`
   Operaciones Git (commit, push, branch)

🐙 \`/tutorial es github\`
   API de GitHub (repos, PRs, forks)

⚡ \`/tutorial es autonomy\`
   Modos de autonomía y ejecución

🌟 \`/tutorial es nova\`
   Framework NOVA multi-agente

🗄️ \`/tutorial es database\`
   Operaciones Supabase

📚 \`/tutorial es all\`
   Guía completa (todos los temas)
`;
  }
  
  return `
📚 AVAILABLE TOPICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 \`/tutorial en setup\`
   Initial setup and tokens

🌐 \`/tutorial en deploy\`
   Deploy to Vercel (includes direct GitHub!)

📦 \`/tutorial en git\`
   Git operations (commit, push, branch)

🐙 \`/tutorial en github\`
   GitHub API (repos, PRs, forks)

⚡ \`/tutorial en autonomy\`
   Autonomy modes and execution

🌟 \`/tutorial en nova\`
   NOVA multi-agent framework

🗄️ \`/tutorial en database\`
   Supabase operations

📚 \`/tutorial en all\`
   Complete guide (all topics)
`;
}

// =============================================================================
// MAIN TUTORIAL FUNCTION
// =============================================================================

/**
 * Generate tutorial content
 * @param lang Language: 'en' or 'es'
 * @param topic Topic to show, or undefined for quick start
 */
export function generateTutorial(
  lang: TutorialLanguage = 'en',
  topic?: string
): { success: boolean; message: string } {
  const tutorials = lang === 'es' ? TUTORIALS_ES : TUTORIALS_EN;
  
  // No topic - show quick start + topics list
  if (!topic) {
    const quickStart = getQuickStart(lang);
    const topicsList = getTopicsList(lang);
    return {
      success: true,
      message: quickStart + topicsList,
    };
  }
  
  // Normalize topic
  const normalizedTopic = topic.toLowerCase();
  
  // Valid topics list
  const validTopics: TutorialTopic[] = [
    'setup', 'deploy', 'git', 'github', 'autonomy', 'nova', 'database', 'all'
  ];
  
  // Check if valid topic
  if (!validTopics.includes(normalizedTopic as TutorialTopic)) {
    const invalidMsg = lang === 'es' 
      ? `❌ Tema no válido: ${topic}` 
      : `❌ Invalid topic: ${topic}`;
    return {
      success: false,
      message: invalidMsg + getTopicsList(lang),
    };
  }
  
  const validTopic = normalizedTopic as TutorialTopic;
  
  // Special case: 'all' shows all topics
  if (validTopic === 'all') {
    let fullGuide = lang === 'es' 
      ? '📚 GUÍA COMPLETA DEL AGENTE\n' 
      : '📚 COMPLETE AGENT GUIDE\n';
    fullGuide += '═'.repeat(35) + '\n\n';
    
    const topicOrder: TutorialTopic[] = [
      'setup', 'deploy', 'git', 'github', 'autonomy', 'nova', 'database'
    ];
    
    for (const t of topicOrder) {
      fullGuide += formatSection(tutorials[t], lang);
      fullGuide += '\n' + '─'.repeat(35) + '\n\n';
    }
    
    return { success: true, message: fullGuide };
  }
  
  // Show specific topic
  const section = tutorials[validTopic];
  let msg = formatSection(section, lang);
  
  // Add navigation hint
  const navHint = lang === 'es'
    ? '\n💡 Usa /tutorial es para ver todos los temas'
    : '\n💡 Use /tutorial en to see all topics';
  msg += navHint;
  
  return { success: true, message: msg };
}

/**
 * Parse tutorial command arguments
 * Supports: /tutorial, /tutorial en, /tutorial es, /tutorial en deploy, etc.
 */
export function parseTutorialArgs(args: string[]): {
  lang: TutorialLanguage;
  topic?: string;
} {
  if (args.length === 0) {
    return { lang: 'en' };
  }
  
  const first = args[0].toLowerCase();
  
  // Check if first arg is language
  if (first === 'es' || first === 'en') {
    return {
      lang: first as TutorialLanguage,
      topic: args[1],
    };
  }
  
  // First arg is topic, default to English
  return {
    lang: 'en',
    topic: first,
  };
}

/**
 * Handle /tutorial command
 */
export function handleTutorial(args: string[]): { success: boolean; message: string } {
  const { lang, topic } = parseTutorialArgs(args);
  return generateTutorial(lang, topic);
}
