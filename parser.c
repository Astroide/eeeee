#include "parser.h"

#include <stdbool.h>

char* source;
char* currentCharacterInSource;
int currentLine;

void setSource(char* sourceText) {
    source = sourceText;
    currentCharacterInSource = source;
    currentLine = 0;
}