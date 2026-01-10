# NOVA Style Engine v1.0
## Cross-Agent Code Consistency Protocol

**Version**: 1.0.0 | **Status**: Production | **Standard**: December 2025

---

## Overview

The NOVA Style Engine ensures consistent code quality across all agents. Style is enforced through activation steering patterns, not just linter configs.

```
┌─────────────────────────────────────────────────────────────┐
│                 STYLE ENGINE PRINCIPLE                       │
│                                                              │
│  "Style is not preference. Style is communication."         │
│                                                              │
│  Consistent style reduces cognitive load for all readers.   │
│  Every agent writes code that looks like it came from       │
│  the same thoughtful engineer.                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Universal Style Rules (All Languages)

### Naming Conventions

```
EMBODY:
  ✓ Names reveal intent: getUserById, isAuthenticated, handleSubmit
  ✓ Boolean variables: is*, has*, can*, should*
  ✓ Collections: users, items, entries (plural nouns)
  ✓ Functions: verbNoun (getUser, createOrder, validateInput)
  ✓ Constants: SCREAMING_SNAKE_CASE
  ✓ Type parameters: T, K, V or descriptive TItem, TResult

REJECT:
  ✗ Single letters (except i,j,k in loops)
  ✗ Abbreviations unless universally known
  ✗ Negated booleans: notReady, isNotValid
  ✗ Generic names: data, info, result, temp, stuff
  ✗ Type prefixes: IUser, EStatus (just User, Status)
```

### Code Organization

```
FILE STRUCTURE:
  1. Imports (grouped: external → internal → relative)
  2. Types/Interfaces
  3. Constants
  4. Main exports
  5. Helper functions (private/internal)

FUNCTION STRUCTURE:
  1. Validate inputs (fail fast)
  2. Early returns for edge cases
  3. Main logic
  4. Return or side effect

COMPONENT STRUCTURE (React/Vue):
  1. Types/Props
  2. Hook calls
  3. Derived state
  4. Effects
  5. Handlers
  6. Render logic
```

### Comment Philosophy

```
WHEN TO COMMENT:
  ✓ WHY, not WHAT (code shows what, comments show why)
  ✓ Warnings about non-obvious behavior
  ✓ Links to relevant documentation or tickets
  ✓ TODO with ticket reference: // TODO(JIRA-123): description

WHEN NOT TO COMMENT:
  ✗ Obvious code: // increment i by 1
  ✗ Commented-out code (delete it, git remembers)
  ✗ Apologies: // sorry this is hacky
  ✗ Journal entries: // fixed bug on 2024-01-01
```

---

## TypeScript/JavaScript Style

### Type Safety

```typescript
// EMBODY: Strict types with explicit contracts
interface User {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
}

function getUser(id: string): Promise<User | null> {
  // Implementation
}

// REJECT: any, type assertions without reason
function getUser(id: any): any { } // ❌
const user = data as User; // ❌ without validation
```

### Function Patterns

```typescript
// EMBODY: Pure functions, explicit parameters
function calculateTotal(items: CartItem[], discount: number): number {
  return items.reduce((sum, item) => sum + item.price, 0) * (1 - discount);
}

// EMBODY: Early returns for clarity
function processOrder(order: Order): Result {
  if (!order) return { error: 'Order required' };
  if (!order.items.length) return { error: 'Empty order' };
  if (!order.payment) return { error: 'Payment required' };
  
  // Main logic here
  return { success: true, orderId: order.id };
}

// REJECT: Deeply nested conditionals
function processOrder(order: Order): Result {
  if (order) {
    if (order.items.length) {
      if (order.payment) {
        // 3 levels deep = hard to read ❌
      }
    }
  }
}
```

### React Patterns

```tsx
// EMBODY: Composition over inheritance
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({ variant, size, children, onClick, disabled }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }))}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// EMBODY: Custom hooks for logic extraction
function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Auth logic
  }, []);
  
  return { user, loading, isAuthenticated: !!user };
}

// REJECT: Prop drilling > 2 levels (use context or composition)
// REJECT: useEffect without dependency awareness
// REJECT: Inline styles (use Tailwind/CSS modules)
```

---

## Python Style

### Type Hints

```python
# EMBODY: Type hints on all public functions
from typing import Optional, List
from dataclasses import dataclass

@dataclass
class User:
    id: str
    email: str
    role: str

def get_user(user_id: str) -> Optional[User]:
    """Fetch user by ID.
    
    Args:
        user_id: The unique user identifier.
        
    Returns:
        User if found, None otherwise.
    """
    pass

# REJECT: No type hints on public API
def get_user(user_id):  # ❌
    pass
```

---

## Pre-Commit Validation Protocol

### Validation Checkpoints

```
CHECKPOINT 1: SYNTAX (Automated)
  □ Linter passes (ESLint, Ruff, etc.)
  □ Formatter applied (Prettier, Black)
  □ Type check passes (tsc, mypy)

CHECKPOINT 2: SEMANTIC (Agent self-check)
  □ Names reveal intent
  □ No generic names (data, result, temp)
  □ Early returns used appropriately
  □ Functions under 50 lines
  □ No deep nesting (max 3 levels)

CHECKPOINT 3: ARCHITECTURAL (ARCTURUS review)
  □ Correct file location
  □ Appropriate abstraction level
  □ No circular dependencies
  □ Follows established patterns

CHECKPOINT 4: DOCUMENTATION (Agent self-check)
  □ Public APIs documented
  □ Complex logic explained
  □ No commented-out code
  □ TODOs have ticket references
```

### Self-Check Template

```
STYLE SELF-CHECK:
  □ Did I use descriptive names that reveal intent?
  □ Did I avoid generic names and abbreviations?
  □ Did I use early returns instead of deep nesting?
  □ Did I document WHY, not WHAT?
  □ Did I follow the established patterns in this codebase?
  □ Would a new team member understand this code?
  
If any answer is NO → Refine before commit
```

---

## Language-Specific Quick Reference

### TypeScript/JavaScript
```
✓ Strict mode always
✓ Explicit return types on exports
✓ Const by default, let when needed
✓ Arrow functions for callbacks
✓ Template literals over concatenation
✓ Optional chaining and nullish coalescing
✓ Async/await over .then chains
```

### Python
```
✓ Type hints on public functions
✓ Dataclasses for data containers
✓ Context managers for resources
✓ List comprehensions for simple transforms
✓ f-strings over .format()
✓ pathlib over os.path
```

### React/Frontend
```
✓ Functional components only
✓ Custom hooks for logic extraction
✓ Props destructured in signature
✓ Tailwind for styling
✓ Error boundaries for fault tolerance
✓ Accessible by default (ARIA, semantic HTML)
```

### Backend/API
```
✓ Input validation at boundaries
✓ Explicit error types
✓ Structured logging
✓ Idempotency keys for mutations
✓ Rate limiting awareness
✓ Versioned APIs
```

---

## Quick Reference

```
NAMING:
  ✓ verbNoun for functions
  ✓ is/has/can for booleans
  ✓ Plural for collections
  ✓ SCREAMING_SNAKE for constants

STRUCTURE:
  ✓ Imports → Types → Constants → Exports → Helpers
  ✓ Validate → Early return → Main logic → Return
  ✓ Max 3 levels of nesting
  ✓ Max 50 lines per function

COMMENTS:
  ✓ WHY not WHAT
  ✓ TODO with ticket
  ✗ Commented-out code
  ✗ Obvious explanations

PRE-COMMIT:
  1. Syntax (linter/formatter)
  2. Semantic (naming, structure)
  3. Architectural (patterns, location)
  4. Documentation (APIs, complexity)
```

---

*"Style is how we think expressed in code. Think consistently. Code consistently."*
