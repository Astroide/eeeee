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
    # process the content...
    title = ''
    content = content.splitlines()
    if content[0].startswith('@!'):
        title = content[0][2:].strip()
        content = content[1:]

    for i in range(len(content)):
        if content[i].startswith('#'):
            hashes = len(content[i]) - len(content[i].lstrip('#'))
            if hashes > 6:
                print(f'Error : cannot have a <h7> (file {file})')
                exit(1)
            content[i] = f'<h{hashes}>{content[i].lstrip("# ")}</h{hashes}>'
    content = '\n'.join(content)
    # end processing
    id = int(time.time() * 1000)  # Unix time
    content = f'''<!DOCTYPE html>
<html>
<head>
<!-- Generated at Unix time {id * 1000} by the Escurieux Docs Generator. Copyright (c) 2020 Olie Auger. -->
    <title>{title}</title>
</head>
<body>
{content}
</body>
</html>
'''
    file = os.path.splitext(file)[0]
    os.makedirs(os.path.dirname(
        './docs/' + file), exist_ok=True)
    handle = open('./docs/' + file + '.html', mode='w')
    handle.write(content)
    handle.close()
