#!/usr/bin/env python3
"""Sweep Tailwind classes accent → primary (golden v3 single-blue).

Substitutions chirurgicales sur préfixes Tailwind seulement, pour ne pas casser
les variants TypeScript 'accent' (Badge, ModalForm).
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent / 'src'

# Préfixes Tailwind qui peuvent précéder -accent
PREFIXES = [
    'bg', 'text', 'border', 'ring', 'fill', 'stroke',
    'hover:bg', 'hover:text', 'hover:border', 'hover:ring',
    'focus:bg', 'focus:text', 'focus:border', 'focus:ring',
    'group-hover:bg', 'group-hover:text', 'group-hover:border',
    'active:bg', 'active:text',
    'disabled:bg', 'disabled:text',
]

# Substitutions ordonnées (longues avant courtes)
def build_subs():
    subs = []
    # Variantes -dark / -light explicites
    for prefix in PREFIXES:
        subs.append((rf'\b{re.escape(prefix)}-accent-dark\b', f'{prefix}-primary-hover'))
        subs.append((rf'\b{re.escape(prefix)}-accent-light\b', f'{prefix}-primary-light'))
    # Suffixes opacités : -accent/N
    for prefix in PREFIXES:
        subs.append((rf'\b{re.escape(prefix)}-accent/(\d+)\b', rf'{prefix}-primary/\1'))
    # accent isolé après préfixe
    for prefix in PREFIXES:
        subs.append((rf'\b{re.escape(prefix)}-accent\b', f'{prefix}-primary'))
    return subs

SUBS = build_subs()

# Fichiers à exclure
EXCLUDES = {'app.css', 'sweep-accent-to-primary.py'}

def should_process(path: Path) -> bool:
    if path.name in EXCLUDES:
        return False
    if path.suffix not in {'.svelte', '.ts'}:
        return False
    if '.test.' in path.name:
        return False
    return True

def sweep_file(path: Path) -> int:
    text = path.read_text(encoding='utf-8')
    original = text
    count = 0
    for pattern, repl in SUBS:
        new_text, n = re.subn(pattern, repl, text)
        if n > 0:
            count += n
            text = new_text
    if text != original:
        path.write_text(text, encoding='utf-8')
    return count

def main():
    total = 0
    files_modified = 0
    for path in sorted(ROOT.rglob('*')):
        if not path.is_file():
            continue
        if not should_process(path):
            continue
        n = sweep_file(path)
        if n > 0:
            files_modified += 1
            total += n
            print(f'{path.relative_to(ROOT.parent)}: {n} subs')
    print(f'\nTotal : {total} substitutions sur {files_modified} fichiers.')

if __name__ == '__main__':
    main()
