ERROR       = '\x1B[31m'
WARN        = '\x1B[33m'
QUOTE       = '\x1B[34m'
HIGHLIGHT   = '\x1B[7m'
CLEAR_COLOR = '\x1B[39m'
CLEAR_ALL   = '\x1B[0m'
CYAN        = '\x1B[36m'
KEYWORD     = '\x1B[35m'

def unprintable_name(x):
    match x:
        case '\x00':
            return 'NUL'
        case '\x01':
            return 'SOH'
        case '\x02':
            return 'STX'
        case '\x03':
            return 'ETX'
        case '\x04':
            return 'EOT'
        case '\x05':
            return 'ENQ'
        case '\x06':
            return 'ACK'
        case '\x07':
            return 'BEL'
        case '\x08':
            return 'BS'
        case '\x09':
            return 'HT'
        case '\x0A':
            return 'You should not be seeing this.'
        case '\x0B':
            return 'VT'
        case '\x0C':
            return 'FF'
        case '\x0D':
            return 'CR'
        case '\x0E':
            return 'SO'
        case '\x0F':
            return 'SI'
        case '\x10':
            return 'DLE'
        case '\x11':
            return 'DC1'
        case '\x12':
            return 'DC2'
        case '\x13':
            return 'DC3'
        case '\x14':
            return 'DC4'
        case '\x15':
            return 'NAK'
        case '\x16':
            return 'SYN'
        case '\x17':
            return 'ETB'
        case '\x18':
            return 'CAN'
        case '\x19':
            return 'EM'
        case '\x1A':
            return 'SUB'
        case '\x1B':
            return 'ESC'
        case '\x1C':
            return 'FS'
        case '\x1D':
            return 'GS'
        case '\x1E':
            return 'RS'
        case '\x1F':
            return 'US'
        case '\x7F':
            return 'DEL'
        case _:
            return None

def safe(s):
    out = ''
    for c in s:
        if c.isprintable():
            out += c
        else:
            result = unprintable_name(c)
            if result is None:
                out += CYAN + '<0x' + str(ord(c)) + '>' + CLEAR_COLOR
            else:
                out += CYAN + '<' + result + '>' + CLEAR_COLOR
    return out

"""class S:
    def __init__(self, s):
        self.s = s
        items = []
        i = 0
        while True:
            if self.s[i] == '\x1B':
                acc = self.s[i]
                if self.s[i:i+5] == CYAN:
                    while self.s[i] != '>':
                        i += 1
                        acc += self.s[i]
                    i += 1
                    i += len(CLEAR_COLOR)
                    acc += CLEAR_COLOR
                while self.s[i] != 'm':
                    i += 1
                    acc += self.s[i]
                i += 1
                items.append(acc)
            else:
                items.append(self.s[i])
                i += 1
            if i == len(self.s):
                break
        self.items = items
    
    def __len__(self):
        return len(filter(lambda x: len(x) > 0), self.items)
    
    def __getitem__(self, key):
        if isinstance(key, slice):
            if key.step is not None:
                crash('non-default step is unsupported')
            start = 0
            step = 0
            if key.start is not None:
                start = key.start if key.start 
        else:
            crash('errrrrrrrr...')"""


def err(message, fatal=False):
    print(f'{ERROR}{"fatal " if fatal else ""}error:{CLEAR_ALL} {message}')

def warn(message):
    print(f'{WARN}warning:{CLEAR_ALL} {message}')

def info(message):
    print(f'{QUOTE}info:{CLEAR_ALL} {message}')

def crash(reason):
    err(reason, True)
    exit(1)

def ice(s):
    return ERROR + 'internal compiler error ' + CYAN + '(please report this): ' + WARN + s + CLEAR_COLOR

def transform(source, position):
    # print('transform(' + str(position) + ')')
    line_no = 0
    col_no = 0
    for char_idx, char in enumerate(source):
        if char_idx == position:
            return (line_no, col_no)
        if char == '\n':
            line_no += 1
            col_no = 0
        else:
            col_no += 1

    # print('overflow')
    return (line_no, col_no)
    # crash(f'internal compiler error: reached EOF while converting textual position to a (line, column) tuple. <source>\n{source}\n</source>\nposition: {position}')

error_counter = 0

def reset_error_count():
    global error_counter
    error_counter = 0

def error_count():
    global error_counter
    return error_counter

def error(error_message: str, *span_message_pairs):
    global error_counter
    error_counter += 1
    err(error_message)
    for span, message in span_message_pairs:
        span_with_message(span, message)
    print()

def warning(warning_message, *span_message_pairs):
    warn(warning_message)
    for span, message in span_message_pairs:
        span_with_message(span, message)
    print()

def span_with_message(span, message):
    # print('span_with_message //', span.start, span.end, '*' + span.content() + '*')
    # I # term_width = Os.get_terminal_size().columns
    start_line, start_col = transform(span.text, span.start)
    end_line, end_col     = transform(span.text, span.end)
    # print(f'start = ({start_line}; {start_col})\nend = ({end_line}; {end_col})')
    lines         = span.text.split('\n')
    visible_start = start_line - 3
    visible_end   = min(end_line + 3, len(lines))
    width         = max(len(str(visible_start)), len(str(visible_end)))
    # I # max_line_length = term_width - (width + 4)
    print(f'{QUOTE}= {span.filename}:{start_line + 1}:{start_col + 1}{CLEAR_ALL}')
    for idx, line in enumerate(lines):
        line = safe(line)
        if idx >= visible_start and idx < visible_end:
            if idx >= start_line and idx <= end_line:
                print(f'{QUOTE}{str(idx + 1).ljust(width + 1, " ")} | {CLEAR_ALL}', end='')
                if idx == start_line and idx == end_line:
                    # I # if len(line) < max_line_length:
                    # I #     # everything's alright
                    print(line[:start_col], end='')
                    print(f'{HIGHLIGHT}{line[start_col:end_col]}{CLEAR_ALL}', end='')
                    print(line[end_col:])
                    # I # else:
                    # I #     # aaaaaa
                    # I #     if start_col < max_line_length and end_col < max_line_length:
                    # I #         lyne = line[:start_col - 1] + f'{HIGHLIGHT}{line[start_col - 1:end_col - 1]}{CLEAR_ALL}' + line[end_col - 1:]
                    # I #         print(f'{lyne[:max_line_length - 4] + f" {QUOTE}..."}{CLEAR_ALL}')
                    # I #         # print(WARN + '|' + lyne + '|')

                elif idx == start_line:
                    # I # if len(line) < max_line_length:
                    print(line[:start_col], end='')
                    print(f'{HIGHLIGHT}{line[start_col:]}{CLEAR_ALL}')
                    # I # elif start_col < max_line_length:
                    # I #     print(line[:start_col - 1], end='')
                    # I #     print(f'{HIGHLIGHT}{line[start_col - 1:max_line_length - 4] + f" {QUOTE}..."}{CLEAR_ALL}')
                    # I # else:
                    # I #     offset = (max_line_length - start_col) - 10
                    # I #     lyne = QUOTE + '... ' + CLEAR_COLOR + line[-offset:]
                    # I #     print(lyne[:(start_col + offset) - 1], end='')
                    # I #     print(f'{HIGHLIGHT}{lyne[(start_col + offset) - 1:max_line_length - 4] + f" {QUOTE}..."}{CLEAR_ALL}')
                elif idx == end_line:
                    print(f'{HIGHLIGHT}{line[:end_col]}{CLEAR_ALL}', end='')
                    print(line[end_col:])
                else:
                    # I # print(f'{HIGHLIGHT}{line if len(line) < max_line_length else line[:max_line_length - 4] + f" {QUOTE}..."}{CLEAR_ALL}')
                    print(f'{HIGHLIGHT}{line}{CLEAR_ALL}')
            else:
                # I # print(f'{QUOTE}{str(idx).ljust(width + 1, " ")} | {CLEAR_ALL}{line if len(line) < max_line_length else line[:max_line_length - 4] + f" {QUOTE}...{CLEAR_ALL}"}')
                print(f'{QUOTE}{str(idx + 1).ljust(width + 1, " ")} | {CLEAR_ALL}{line}')
    if message != '':
        print(f'{QUOTE}{" " + "| ".rjust(width + 3, "*")}{message}{CLEAR_ALL}')
