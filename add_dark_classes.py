import os
import re

MAPPING = {
    r'\bbg-white\b': 'bg-white dark:bg-[#101728]',
    r'\bbg-neutral-50\b': 'bg-neutral-50 dark:bg-[#0b101a]',
    r'\bbg-neutral-100\b': 'bg-neutral-100 dark:bg-slate-800',
    r'\bbg-neutral-200\b': 'bg-neutral-200 dark:bg-slate-700',
    r'\bbg-neutral-800\b': 'bg-neutral-800 dark:bg-slate-200',
    r'\bbg-neutral-900\b': 'bg-neutral-900 dark:bg-white',
    
    r'\bborder-neutral-200\b': 'border-neutral-200 dark:border-[#1e293b]',
    r'\bborder-neutral-300\b': 'border-neutral-300 dark:border-[#2b3a54]',
    r'\bborder-neutral-400\b': 'border-neutral-400 dark:border-slate-600',
    
    r'\bhover:border-neutral-300\b': 'hover:border-neutral-300 dark:hover:border-[#2b3a54]',
    r'\bhover:border-neutral-400\b': 'hover:border-neutral-400 dark:hover:border-slate-600',
    
    r'\bhover:bg-neutral-50\b': 'hover:bg-neutral-50 dark:hover:bg-[#1e293b]',
    r'\bhover:bg-neutral-100\b': 'hover:bg-neutral-100 dark:hover:bg-slate-800',
    r'\bhover:bg-neutral-200\b': 'hover:bg-neutral-200 dark:hover:bg-slate-700',

    r'\btext-neutral-400\b': 'text-neutral-400 dark:text-slate-500',
    r'\btext-neutral-500\b': 'text-neutral-500 dark:text-slate-400',
    r'\btext-neutral-600\b': 'text-neutral-600 dark:text-slate-400',
    r'\btext-neutral-700\b': 'text-neutral-700 dark:text-slate-300',
    r'\btext-neutral-800\b': 'text-neutral-800 dark:text-slate-200',
    r'\btext-neutral-900\b': 'text-neutral-900 dark:text-white',
    r'\btext-neutral-950\b': 'text-neutral-950 dark:text-white',
    
    r'\bplaceholder:text-neutral-400\b': 'placeholder:text-neutral-400 dark:placeholder:text-slate-500',
    
    # Text black/white inverse
    r'\btext-black\b': 'text-black dark:text-white',
    r'\btext-white\b(?!\s*dark:text-)': 'text-white dark:text-slate-900', # ONLY if it's on a button usually? Let's skip text-white to avoid breaking colored badges.
}

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
        
    original = content
    for pattern, replacement in MAPPING.items():
        # Avoid replacing if it already has dark: equivalent nearby (simple heuristic: if "dark:" is in the same line, maybe we should still replace but we can't easily check line by line with regex sub if we do it globally)
        # Actually, let's just do line by line.
        lines = content.split('\n')
        new_lines = []
        for line in lines:
            # If the class already has dark: mapped for this specific pattern, skip it
            if "dark:" in line and "bg-[#101728]" in line and "bg-white" in pattern:
                new_lines.append(line)
                continue
                
            # A bit dangerous, let's just use regex sub, but ensure we don't double up
            # E.g. bg-white dark:bg-slate-900 shouldn't become bg-white dark:bg-[#101728] dark:bg-slate-900
            
            # If line has dark:bg- we might want to be careful.
            
            # Let's do a simple replace, then clean up double darks if needed.
            replaced = line
            # Check if this replacement is already there
            if replacement not in replaced:
                # Replace only if the word exists
                if re.search(pattern, replaced):
                    replaced = re.sub(pattern, replacement, replaced)
            new_lines.append(replaced)
        content = '\n'.join(new_lines)

    if original != content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('src/components'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))

