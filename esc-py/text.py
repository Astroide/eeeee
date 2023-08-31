from errors import crash

class Span:
    def __init__(self, filename: str, text: str, start: int, end: int):
        self.filename = filename
        self.text     = text
        self.start    = start
        self.end      = end
    
    def content(self) -> str:
        return self.text[self.start:self.end]
    
def merge_spans(*spans) -> Span:
    if len(spans) == 0:
        crash('internal compiler error: Text.merge_spans() with no spans to merge')
    start = min(map(lambda x: x.start, spans))
    end = max(map(lambda x: x.end, spans))
    return Span(spans[0].filename, spans[0].text, start, end)