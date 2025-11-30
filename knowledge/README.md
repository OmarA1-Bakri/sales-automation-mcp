# Knowledge Repository

This folder contains the knowledge base for AI-powered sales outreach. The AI agents access this content at runtime to personalize messaging, handle objections, and learn from outcomes.

## Structure

```
knowledge/
├── company/              # RTGS.global company knowledge
│   ├── case-studies.md       # Customer success stories
│   ├── value-propositions.md # Value props by pain point
│   └── product-facts.md      # Product capabilities
├── competitive/          # Competitive intelligence
│   └── battle-cards.md       # Competitor comparison & responses
├── industry/             # Industry-specific playbooks
│   ├── psp-playbook.md       # PSP persona playbook
│   └── treasury-playbook.md  # Treasury persona playbook
└── learnings/            # AI learning (auto-populated)
    ├── what-works.md         # Successful patterns
    └── what-doesnt-work.md   # Patterns to avoid
```

## How It Works

### For AI Agents
The `KnowledgeService.js` loads these markdown files at runtime:

```javascript
import { KnowledgeService } from './services/KnowledgeService.js';

// Get context for a specific persona
const context = await KnowledgeService.getContextForPersona('Head of Treasury');

// Get objection handling context
const objectionContext = await KnowledgeService.getObjectionContext('competitor_mention', 'SWIFT');

// Get case study for a pain point
const caseStudy = await KnowledgeService.getCaseStudyForPainPoint('liquidity');
```

### For Humans
Edit these markdown files directly to update the knowledge base. Changes take effect within 5 minutes (cache TTL).

## Content Guidelines

### Case Studies
- Keep factual and specific
- Include measurable results
- Structure: Challenge → Solution → Results

### Value Propositions
- One clear message per pain point
- Include talking points and objection responses
- Map to specific personas

### Battle Cards
- Acknowledge competitor strengths first
- Focus on differentiation, not disparagement
- Include specific objection responses

### Playbooks
- Persona-specific messaging
- Opening hooks and value statements
- Qualification criteria

### Learnings (Auto-populated)
These files are updated by the outcome tracking system:
- `what-works.md`: Templates/approaches with high engagement
- `what-doesnt-work.md`: Templates/approaches with low engagement

**Do not manually edit learnings files** - they are maintained by the AI learning system.

## Adding New Knowledge

1. Create a new `.md` file in the appropriate category
2. Add a loader method to `KnowledgeService.js`
3. The service auto-discovers files in the knowledge folder

## Refreshing Knowledge

To force a cache refresh without restarting the server:

```javascript
KnowledgeService.clearCache();
```

Or restart the API server - cache rebuilds automatically.

## Best Practices

1. **Keep it concise** - AI agents have context limits
2. **Use headers** - Easier to extract specific sections
3. **Include examples** - AI performs better with examples
4. **Test changes** - Verify AI behavior after updates
5. **Version control** - All changes tracked in git
