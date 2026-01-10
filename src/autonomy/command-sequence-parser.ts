/**
 * Command Sequence Parser
 * Parses numbered command lists from natural language input
 * 
 * NOVA Framework v6.0 - VEGA Research + ANTARES Implementation
 * 
 * Supports formats:
 * - "1. command1 2. command2 3. command3"
 * - "1) command1 2) command2"
 * - "Step 1: command1 Step 2: command2"
 * - Bullet points: "- command1 - command2"
 * - Newline separated numbered lists
 */

export interface ParsedCommand {
  index: number;
  raw: string;
  command: string;
  description?: string;
}

export interface ParsedSequence {
  commands: ParsedCommand[];
  totalCount: number;
  hasDescriptions: boolean;
}

/**
 * Parse numbered command sequences from text
 * 
 * Examples:
 * - "1. rm -rf .next 2. rm -rf node_modules/.cache 3. npm run export"
 * - "1. Clear cache: rm -rf .next\n2. Rebuild: npm run build"
 */
export function parseCommandSequence(text: string): ParsedSequence {
  const commands: ParsedCommand[] = [];
  
  // Normalize text - replace multiple spaces/newlines
  const normalized = text.trim();
  
  // Pattern 1: "1. command" or "1) command" or "1: command"
  const numberedPattern = /(\d+)[.\):\s]+\s*(?:([^:]+):\s*)?([^\d]+?)(?=\d+[.\):\s]|$)/g;
  
  // Pattern 2: "Step N: command" or "Step N - command"
  const stepPattern = /step\s*(\d+)[:\-\s]+\s*(?:([^:]+):\s*)?(.+?)(?=step\s*\d+|$)/gi;
  
  // Pattern 3: Bullet points "- command" or "* command"
  const bulletPattern = /^[\-\*•]\s+(.+)$/gm;
  
  // Try numbered pattern first
  let match;
  let hasDescriptions = false;
  
  // Reset lastIndex
  numberedPattern.lastIndex = 0;
  
  while ((match = numberedPattern.exec(normalized)) !== null) {
    const index = parseInt(match[1], 10);
    const description = match[2]?.trim();
    const command = match[3]?.trim();
    
    if (command && command.length > 0) {
      if (description) hasDescriptions = true;
      commands.push({
        index,
        raw: match[0].trim(),
        command: cleanCommand(command),
        description,
      });
    }
  }
  
  // If no numbered commands found, try step pattern
  if (commands.length === 0) {
    stepPattern.lastIndex = 0;
    while ((match = stepPattern.exec(normalized)) !== null) {
      const index = parseInt(match[1], 10);
      const description = match[2]?.trim();
      const command = match[3]?.trim();
      
      if (command && command.length > 0) {
        if (description) hasDescriptions = true;
        commands.push({
          index,
          raw: match[0].trim(),
          command: cleanCommand(command),
          description,
        });
      }
    }
  }
  
  // If still no commands, try bullet points
  if (commands.length === 0) {
    let bulletIndex = 1;
    while ((match = bulletPattern.exec(normalized)) !== null) {
      const command = match[1]?.trim();
      if (command && command.length > 0) {
        commands.push({
          index: bulletIndex++,
          raw: match[0].trim(),
          command: cleanCommand(command),
        });
      }
    }
  }
  
  // Sort by index
  commands.sort((a, b) => a.index - b.index);
  
  return {
    commands,
    totalCount: commands.length,
    hasDescriptions,
  };
}

/**
 * Clean command string - remove trailing descriptions and normalize
 */
function cleanCommand(cmd: string): string {
  // Remove trailing comments or descriptions after the command
  // e.g., "rm -rf .next # clear cache" -> "rm -rf .next"
  let cleaned = cmd.split('#')[0].trim();
  
  // Remove trailing parenthetical notes
  // e.g., "npm run build (rebuilds the app)" -> "npm run build"
  cleaned = cleaned.replace(/\s*\([^)]+\)\s*$/, '').trim();
  
  // Remove trailing "to ..." descriptions
  // e.g., "npm run export to rebuild" -> "npm run export"
  // But be careful not to remove valid command parts
  const toPattern = /\s+to\s+(?:rebuild|clear|fix|update|install|remove|delete|create|generate|run|start|stop|restart|build|test|deploy|check|verify|validate|ensure|make|set|get|show|list|view|display|print|output|save|load|read|write|copy|move|rename|backup|restore|reset|clean|purge|flush|refresh|reload|sync|push|pull|fetch|clone|init|setup|configure|config|enable|disable|activate|deactivate|turn|switch|toggle|change|modify|edit|add|append|prepend|insert|include|exclude|filter|sort|order|group|merge|split|join|combine|separate|extract|parse|format|convert|transform|encode|decode|encrypt|decrypt|compress|decompress|zip|unzip|archive|unarchive|pack|unpack|bundle|unbundle|minify|uglify|beautify|prettify|lint|format|style|theme|color|highlight|annotate|comment|document|describe|explain|summarize|report|log|trace|debug|profile|benchmark|measure|monitor|watch|observe|track|record|capture|snapshot|screenshot|render|draw|paint|display|show|hide|reveal|expose|conceal|mask|unmask|cover|uncover|wrap|unwrap|box|unbox|contain|release|hold|drop|grab|take|give|send|receive|get|put|post|patch|delete|head|options|connect|trace|request|response|call|invoke|execute|run|start|stop|pause|resume|continue|break|abort|cancel|terminate|kill|end|finish|complete|done|succeed|fail|error|warn|info|debug|verbose|quiet|silent|loud|noisy|fast|slow|quick|instant|immediate|delayed|deferred|async|sync|parallel|serial|sequential|concurrent|simultaneous|batch|stream|pipe|chain|link|connect|disconnect|attach|detach|bind|unbind|hook|unhook|register|unregister|subscribe|unsubscribe|listen|unlisten|watch|unwatch|observe|unobserve|notify|alert|warn|error|info|debug|log|print|echo|output|input|read|write|open|close|create|destroy|new|old|fresh|stale|valid|invalid|correct|incorrect|right|wrong|good|bad|best|worst|better|worse|more|less|most|least|all|none|some|any|every|each|both|either|neither|other|another|same|different|similar|equal|unequal|greater|lesser|higher|lower|bigger|smaller|larger|shorter|longer|wider|narrower|deeper|shallower|thicker|thinner|heavier|lighter|faster|slower|stronger|weaker|harder|softer|louder|quieter|brighter|darker|warmer|cooler|hotter|colder|newer|older|younger|elder|earlier|later|sooner|further|closer|nearer|farther|beyond|within|inside|outside|above|below|over|under|before|after|during|while|until|since|from|to|into|onto|upon|off|out|in|on|at|by|for|with|without|about|around|through|across|along|against|between|among|within|without|inside|outside|beside|behind|ahead|front|back|left|right|top|bottom|middle|center|edge|corner|side|end|beginning|start|finish|origin|destination|source|target|input|output|entry|exit|entrance|departure|arrival|return|forward|backward|upward|downward|inward|outward|onward|homeward|northward|southward|eastward|westward)(?:\s|$)/i;
  
  // Only apply if it looks like a description, not a command argument
  if (toPattern.test(cleaned) && !cleaned.includes('--to') && !cleaned.includes('-to')) {
    cleaned = cleaned.replace(toPattern, '').trim();
  }
  
  return cleaned;
}

/**
 * Extract commands from a message that might contain mixed content
 */
export function extractCommandsFromMessage(message: string): ParsedSequence {
  // First try to parse as a command sequence
  const parsed = parseCommandSequence(message);
  
  if (parsed.totalCount > 0) {
    return parsed;
  }
  
  // If no structured commands found, look for code blocks
  const codeBlockPattern = /```(?:bash|sh|shell|zsh)?\n?([\s\S]*?)```/g;
  const commands: ParsedCommand[] = [];
  let match;
  let index = 1;
  
  while ((match = codeBlockPattern.exec(message)) !== null) {
    const blockContent = match[1].trim();
    const lines = blockContent.split('\n').filter(line => {
      const trimmed = line.trim();
      // Skip comments and empty lines
      return trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//');
    });
    
    for (const line of lines) {
      commands.push({
        index: index++,
        raw: line,
        command: cleanCommand(line),
      });
    }
  }
  
  return {
    commands,
    totalCount: commands.length,
    hasDescriptions: false,
  };
}

/**
 * Validate commands against allowlist
 */
export function validateCommands(
  commands: ParsedCommand[],
  allowlist: string[]
): { valid: ParsedCommand[]; invalid: ParsedCommand[] } {
  const valid: ParsedCommand[] = [];
  const invalid: ParsedCommand[] = [];
  
  for (const cmd of commands) {
    const firstWord = cmd.command.trim().split(/\s+/)[0];
    const basename = firstWord.split('/').pop() || firstWord;
    
    if (allowlist.includes(firstWord) || allowlist.includes(basename)) {
      valid.push(cmd);
    } else {
      invalid.push(cmd);
    }
  }
  
  return { valid, invalid };
}

/**
 * Format command sequence for display
 */
export function formatCommandSequence(sequence: ParsedSequence): string {
  if (sequence.totalCount === 0) {
    return 'No commands found.';
  }
  
  let output = `📋 Command Sequence (${sequence.totalCount} commands):\n\n`;
  
  for (const cmd of sequence.commands) {
    output += `${cmd.index}. `;
    if (cmd.description) {
      output += `${cmd.description}: `;
    }
    output += `\`${cmd.command}\`\n`;
  }
  
  return output;
}
