#!/usr/bin/env bash
# SessionStart hook - Auto-activate Serena for this project
# Triggers on: startup, resume, clear, compact

PROJECT_PATH="/home/omar/claude - sales_auto_skill"

# Claude Code hooks expect this JSON structure
# The additionalContext field injects instructions into the conversation
cat <<EOF
{
  "result": "Success",
  "additionalContext": "**SERENA AUTO-ACTIVATION REQUIRED**\n\nThis project uses Serena MCP server for semantic code operations. You MUST activate Serena IMMEDIATELY by calling:\n\nmcp__serena__activate_project with project: \"${PROJECT_PATH}\"\n\nDo this before responding to any user message. Serena provides intelligent code navigation, symbol-based editing, and project memory."
}
EOF

exit 0
