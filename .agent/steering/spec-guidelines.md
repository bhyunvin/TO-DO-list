# Spec Documentation Guidelines

## Language Requirements

### Primary Language: English
All spec documents (requirements.md, design.md, tasks.md) MUST be written in English as the primary language.

**Rationale:**
- English is the universal language for technical documentation
- Enables collaboration with international developers
- Maintains consistency with code comments and variable names
- Facilitates integration with development tools and AI assistants

### Korean Translation: Optional
After completing all three spec documents in English, you MAY create Korean translations:

1. Create a `ko/` subdirectory within the spec directory
2. Translate all three documents (requirements.md, design.md, tasks.md)
3. Place translated files in the `ko/` subdirectory

**Example Structure:**
```
.kiro/specs/feature-name/
├── requirements.md          # English (required)
├── design.md               # English (required)
├── tasks.md                # English (required)
└── ko/                     # Korean translations (optional)
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

## Writing Style

### Requirements Document
- Use EARS (Easy Approach to Requirements Syntax) patterns
- Follow INCOSE semantic quality rules
- Write user stories in English
- Use clear, unambiguous language

### Design Document
- Use technical English terminology
- Include code examples with English comments
- Maintain professional technical writing style
- Use Mermaid diagrams where appropriate

### Tasks Document
- Write task descriptions in English
- Use action verbs (Implement, Create, Refactor, Test, etc.)
- Reference requirements using requirement IDs
- Keep task descriptions concise and actionable

## Code Comments vs. Spec Documents

**Important Distinction:**
- **Code comments**: Written in Korean (as per project standards)
- **Spec documents**: Written in English (as per this guideline)

This separation ensures:
- Specs are accessible to international collaborators
- Code remains localized for the Korean development team
- Clear distinction between planning (specs) and implementation (code)
