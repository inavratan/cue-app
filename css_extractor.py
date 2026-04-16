import re

with open('static/index.html', 'r') as f:
    html = f.read()

# Map of exact style strings to class names to append
replacements = {
    'style="font-size: 18px;"': 'class="fs-18"',
    'style="font-size: 13px;"': 'class="fs-13"',
    'style="font-size: 12px;"': 'class="fs-12"',
    'style="font-size: 16px;"': 'class="fs-16"',
    'style="font-size: 14px;"': 'class="fs-14"',
    'style="font-size: 20px;"': 'class="fs-20"',
    'style="font-size: 24px; margin-bottom: 8px;"': 'class="fs-24 mb-8"',
    'style="font-size: 10px;"': 'class="fs-10"',
    'style="margin-top: 32px;"': 'class="mt-32"',
    'style="line-height: 1.5;"': 'class="lh-15"',
    'style="cursor: pointer;"': 'class="cursor-pointer"',
    'style="font-family: \'DM Sans\', sans-serif;"': 'class="font-dm-sans"',
    'style="color: white;"': 'class="text-white"',
    'style="border: none;"': 'class="border-none"',
    'style="font-size: 14px; line-height: 1.5;"': 'class="fs-14 lh-15"',
    'style="font-size: 11px; font-weight: 500;"': 'class="fs-11 fw-500"',
    'style="margin-top: 16px;"': 'class="mt-16"',
    'style="color: white; border: none;"': 'class="text-white border-none"',
    'style="display: block;"': 'class="d-block"',
    'style="position: relative;"': 'class="position-relative"'
}

appended_css = """
/* Auto-extracted Utilities */
.fs-10 { font-size: 10px !important; }
.fs-11 { font-size: 11px !important; }
.fs-12 { font-size: 12px !important; }
.fs-13 { font-size: 13px !important; }
.fs-14 { font-size: 14px !important; }
.fs-16 { font-size: 16px !important; }
.fs-18 { font-size: 18px !important; }
.fs-20 { font-size: 20px !important; }
.fs-24 { font-size: 24px !important; }
.mt-32 { margin-top: 32px !important; }
.mt-16 { margin-top: 16px !important; }
.mb-8 { margin-bottom: 8px !important; }
.lh-15 { line-height: 1.5 !important; }
.fw-500 { font-weight: 500 !important; }
.cursor-pointer { cursor: pointer !important; }
.font-dm-sans { font-family: 'DM Sans', sans-serif !important; }
.text-white { color: white !important; }
.border-none { border: none !important; }
.d-block { display: block !important; }
.position-relative { position: relative !important; }
"""

count_replaced = 0
for style, cls in replacements.items():
    # If the tag already has class="...", we need to inject into it instead of adding a new class attr.
    # regex to find: `class="([^"]+)"\s+style="..."` -> `class="\1 new_classes"`
    # But since it might not be adjacent, we'll just parse the style out and inject the classes.
    pass

# Better approach for exact string replacements:
def replacer(match):
    global count_replaced
    tag_content = match.group(0)
    for style_str, cls_str in replacements.items():
        if style_str in tag_content:
            new_classes = cls_str.replace('class="', '').replace('"', '')
            # Remove style
            tag_content = tag_content.replace(' ' + style_str, '')
            # Inject classes into existing class="..."
            if 'class="' in tag_content:
                tag_content = re.sub(r'class="([^"]+)"', rf'class="\1 {new_classes}"', tag_content)
            else:
                # Add class attribute
                # Put it before >
                if tag_content.endswith('>'):
                    tag_content = tag_content[:-1] + f' {cls_str}>'
                elif tag_content.endswith('/>'):
                    tag_content = tag_content[:-2] + f' {cls_str}/>'
            count_replaced += 1
            break
    return tag_content

# Match all tags <...>
html_new = re.sub(r'<[^>]+>', replacer, html)

with open('static/index.html', 'w') as f:
    f.write(html_new)

with open('static/style.css', 'a') as f:
    f.write(appended_css)

print(f"Replaced {count_replaced} simple inline styles safely.")
