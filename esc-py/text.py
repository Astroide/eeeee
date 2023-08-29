from errors import crash

class Span:
    def __init__(self, filename: str, text: str, start: int, end: int):
        self.filename = filename
        self.text = text
        self.start = start
        self.end = end
    
    def content(self) -> str:
        return self.text[self.start:self.end]
    