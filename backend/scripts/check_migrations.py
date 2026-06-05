#!/usr/bin/env python3
"""Validate Alembic migration chain integrity."""
import os
import re
import sys

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "..", "migrations", "versions")


def get_migrations():
    files = [f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".py") and not f.startswith("__")]
    migrations = {}
    for fname in files:
        path = os.path.join(MIGRATIONS_DIR, fname)
        with open(path) as f:
            content = f.read()

        rev_match = re.search(r'^revision\s*(?::\s*\S+)?\s*=\s*["\']([^"\']+)["\']', content, re.MULTILINE)
        down_match = re.search(r'^down_revision\s*(?::\s*\S+)?\s*=\s*["\']([^"\']+)["\']', content, re.MULTILINE)

        if rev_match:
            rev = rev_match.group(1)
            down = down_match.group(1) if down_match else None
            # down_revision = None (Python None) means root migration
            if down is None or down == "None":
                down = None
            migrations[rev] = {"file": fname, "down": down}

    return migrations


def validate_chain(migrations):
    errors = []

    # Find root (down_revision is None)
    roots = [r for r, m in migrations.items() if m["down"] is None]
    if len(roots) != 1:
        errors.append(f"Expected 1 root migration, found {len(roots)}: {roots}")

    # Walk chain
    seen = set()
    current = roots[0] if roots else None
    chain = []
    while current:
        if current in seen:
            errors.append(f"Circular reference detected at {current}")
            break
        seen.add(current)
        chain.append(current)
        # Find next (migration whose down_revision == current)
        nexts = [r for r, m in migrations.items() if m["down"] == current]
        if len(nexts) > 1:
            errors.append(f"Multiple migrations point to {current}: {nexts}")
            break
        current = nexts[0] if nexts else None

    orphans = set(migrations.keys()) - seen
    if orphans:
        errors.append(f"Orphan migrations (not in chain): {orphans}")

    return chain, errors


def main():
    if not os.path.isdir(MIGRATIONS_DIR):
        print(f"Migrations directory not found: {MIGRATIONS_DIR}")
        sys.exit(1)

    migrations = get_migrations()
    print(f"Found {len(migrations)} migration(s)")

    chain, errors = validate_chain(migrations)

    print("\nMigration chain:")
    for i, rev in enumerate(chain):
        m = migrations[rev]
        print(f"  {i+1}. {rev} <- {m['file']}")

    if errors:
        print("\nErrors found:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print("\nMigration chain is valid")


if __name__ == "__main__":
    main()
