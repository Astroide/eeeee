import os
import time
files = []
name_list = os.listdir('./docs-source')


def generator():
    i = 0
    while i < len(name_list):
        yield name_list[i]
        i += 1


for name in generator():
    if os.path.isdir('./docs-source/' + name):
        name_list.extend(
            map(lambda n: name + '/' + n, os.listdir('./docs-source/' + name)))
    else:
        files.append(name)

for file in files:
    content = open('./docs-source/' + file, mode='r').read()
    if os.path.splitext(file)[1] == '.md':
        # process the content...
        title = ''
        content = list(filter(lambda x: not x.startswith('--'), map(lambda x: x.replace(
            '$E', 'Escurieux'), (content + ' ').splitlines())))
        if content[0].startswith('@!'):
            title = content[0][2:].strip()
            content = content[1:]

        in_ul = False
        for i in range(len(content)):
            if in_ul and not content[i].startswith('* '):
                in_ul = False
                content[i] = '</ul>' + content[i]
            if content[i].startswith('#'):
                hashes = len(content[i]) - len(content[i].lstrip('#'))
                if hashes > 6:
                    print(f'Error : cannot have a <h7> (file {file})')
                    exit(1)
                content[i] = f'<h{hashes}>{content[i].lstrip("# ")}</h{hashes}>'
            elif content[i].startswith('* '):
                if in_ul:
                    content[i] = '<li>' + content[i][2:]
                else:
                    content[i] = '<ul><li>' + content[i][2:]
                    in_ul = True

        content = '\n'.join(content)
        stack = []
        out = ''
        iterator = iter(content)

        def iterator_function():
            global iterator
            try:
                while True:
                    yield next(iterator)
            except StopIteration:
                pass

        def concat(val, iter):
            yield val
            try:
                while True:
                    yield next(iter)
            except StopIteration:
                pass

        for char in iterator_function():
            if char == '{':
                next_char = ''
                while next_char != '}':
                    title += next_char
                    next_char = next(iterator)
            elif char == '[':
                next_char = ''
                url = ''
                title = ''
                while next_char != ']':
                    title += next_char
                    next_char = next(iterator)
                next(iterator)
                while next_char != ')':
                    url += next_char
                    next_char = next(iterator)
                out += f'<a href="{url.lstrip("]")}">{title}</a>'
            elif char == '\n':
                next_char = next(iterator)
                if next_char == '\n':
                    out += '<br>'
                else:
                    iterator = concat(next_char, iterator)
            elif char == '*':
                next_char = next(iterator)
                if next_char == '*':
                    if len(stack) != 0 and stack[-1][0] == '**':
                        delimiter, tag_name = stack.pop()
                        out += f'</{tag_name}>'
                    else:
                        stack.append(('**', 'strong'))
                        out += f'<{stack[-1][1]}>'
                else:
                    iterator = concat(next_char, iterator)
                    if len(stack) != 0 and stack[-1][0] == '*':
                        delimiter, tag_name = stack.pop()
                        out += f'</{tag_name}>'
                    else:
                        stack.append(('*', 'em'))
                        out += f'<{stack[-1][1]}>'
            elif char == '_':
                next_char = next(iterator)
                if next_char == '_':
                    if len(stack) != 0 and stack[-1][0] == '_':
                        delimiter, tag_name = stack.pop()
                        out += f'</{tag_name}>'
                    else:
                        stack.append(('_', 'strong'))
                        out += f'<{stack[-1][1]}>'
                else:
                    iterator = concat(next_char, iterator)
                    if len(stack) != 0 and stack[-1][0] == '_':
                        delimiter, tag_name = stack.pop()
                        out += f'</{tag_name}>'
                    else:
                        stack.append(('_', 'em'))
                        out += f'<{stack[-1][1]}>'
            elif char == '§':
                out += '<code>'
                next_char = ''
                while next_char != '§':
                    out += next_char
                    next_char = next(iterator)

                out += '</code>'

            elif char == '«':
                out += '<pre><code>'
                next_char = ''
                next(iterator)
                while next_char != '»':
                    out += next_char
                    next_char = next(iterator)

                out += '</code></pre>'

            elif char == '\\':
                next_char = next(iterator)
                if next_char == '\\':
                    out += '\\'
                else:
                    out += next_char
            else:
                out += char
        content = out
        # end processing
        id = int(time.time() * 1000)  # Unix time
        content = f'''<!DOCTYPE html>
<html class="light-theme">
<head>
<!-- Generated at Unix time {id * 1000} by the Escurieux Docs Generator. Copyright (c) 2020 Olie Auger. -->
    <title>{title}</title>
    <link rel="stylesheet" href="/escurieux/theme.css" />
</head>
<body>
<div id="mode-selector"><code>[Light mode] Dark mode</code></div>
{content}
<script src="/escurieux/script.js"></script>
</body>
</html>
'''
        file = os.path.splitext(file)[0] + '.html'

    os.makedirs(os.path.dirname(
        './docs/' + file), exist_ok=True)
    handle = open('./docs/' + file, mode='w')
    handle.write(content)
    handle.close()
