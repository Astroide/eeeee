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

Token getToken() {
    Token token = {.start = currentCharacterInSource,
                   .length = 0,
                   .line = currentLine,
                   .type = TOKEN_NONE};

    return token;
}