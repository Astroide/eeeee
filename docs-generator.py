import os
import time
id = int(time.time())
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
    # end processing
    content = f'<!-- id: {id} -->\n' + content
    file = os.path.splitext(file)[0]
    os.makedirs(os.path.dirname(
        './docs/' + file), exist_ok=True)
    handle = open('./docs/' + file + '.html', mode='w')
    handle.write(content)
    handle.close()
