import os
import re
import json
from pathlib import Path

COMPONENTS_DIR = Path('src/components')

def extract_imports(file_path):
    imports = []
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        # Find import statements (multiline possible)
        # Simple regex that captures import ... from 'module'
        pattern = r'import\s+(?:{[^}]+}|\w+)\s+from\s+[\'"]([^\'"]+)[\'"]'
        matches = re.findall(pattern, content)
        for match in matches:
            imports.append(match)
    return imports

def find_component_files():
    files = []
    for ext in ('*.js', '*.jsx', '*.ts', '*.tsx'):
        files.extend(COMPONENTS_DIR.rglob(ext))
    return [f for f in files if f.is_file()]

def main():
    files = find_component_files()
    graph = {}
    external_imports = {}
    for file_path in files:
        rel_path = file_path.relative_to(COMPONENTS_DIR.parent)  # relative to src
        imports = extract_imports(file_path)
        internal = []
        external = []
        for imp in imports:
            if imp.startswith('.'):
                # relative import, could be within components or outside
                # Resolve relative to file_path
                abs_imp = (file_path.parent / imp).resolve()
                try:
                    abs_imp_rel = abs_imp.relative_to(COMPONENTS_DIR)
                    internal.append(str(abs_imp_rel))
                except ValueError:
                    # outside components directory
                    external.append(imp)
            else:
                external.append(imp)
        graph[str(rel_path)] = {
            'internal': internal,
            'external': external
        }
    print(json.dumps(graph, indent=2))

if __name__ == '__main__':
    main()
