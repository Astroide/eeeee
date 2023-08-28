from errors import crash

class Span:
    def __init__(self, filename, text, start, end):
        self.filename = filename
        self.text = text
        self.start = start
        self.end = end
    
    def content(self):
        return self.text[self.start:self.end]
    