# NOVA MCP Tool Usage Guide

## Available MCP Servers

### 1. Sequential Thinking
**When to use**: Complex reasoning, multi-step problems, Antigravity Loop v2.0
```
mcp__sequential-thinking__sequentialthinking
```
- Break down complex problems step-by-step
- Use for META-PLAN phase of Antigravity Loop
- Track reasoning chains across multiple thoughts

### 2. Brave Search
**When to use**: Web research, current information, documentation lookup
```
mcp__brave-search__brave_web_search(query="...")
mcp__brave-search__brave_local_search(query="...")
```
- VEGA agent: Always verify claims with web search
- Find latest library versions, API docs
- Research best practices and patterns

### 3. Memory (Knowledge Graph)
**When to use**: Persist information across sessions, build context
```
mcp__memory__create_entities(entities=[...])
mcp__memory__create_relations(relations=[...])
mcp__memory__search_nodes(query="...")
mcp__memory__read_graph()
```
- Store project decisions and rationale
- Track agent handoffs and context
- Build persistent knowledge base

### 4. Fetch
**When to use**: HTTP requests, API calls, fetch web content
```
mcp__fetch__fetch(url="...", method="GET")
```
- Retrieve API responses
- Fetch documentation pages
- Test endpoints

### 5. Filesystem
**When to use**: File operations (backup to Droid's built-in tools)
```
mcp__filesystem__read_file(path="...")
mcp__filesystem__write_file(path="...", content="...")
mcp__filesystem__list_directory(path="...")
```

## Agent-Specific MCP Usage

| Agent | Primary MCP Tools | Use Case |
|-------|-------------------|----------|
| POLARIS | memory, sequential-thinking | Strategy planning, decision tracking |
| VEGA | brave-search, fetch | Research, verification, documentation |
| SIRIUS | fetch | Design system references, accessibility docs |
| RIGEL | filesystem | Component scaffolding, code generation |
| ANTARES | fetch, filesystem | API testing, schema validation |
| ARCTURUS | brave-search | Security advisories, CVE lookup |

## Best Practices

1. **VEGA Research Protocol**
   - Always cite sources from brave-search
   - Cross-reference multiple results
   - Include confidence levels

2. **Memory for Context**
   - Store key decisions in knowledge graph
   - Use for handoff context between agents
   - Track project evolution

3. **Sequential Thinking for Complex Tasks**
   - Use for Antigravity Loop phases
   - Break down before implementing
   - Document reasoning chain

## Tool Call Format
```
mcp__<server>__<tool>(param1="value", param2="value")
```

Example:
```
mcp__brave-search__brave_web_search(query="TypeScript best practices 2025", count=5)
```
