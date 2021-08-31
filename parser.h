#ifndef _ESCURIEUX_PARSER_H_
#define _ESCURIEUX_PARSER_H_
#include <stdbool.h>

typedef enum {
    TOKEN_NONE,
    TOKEN_STRING_LITERAL,
    TOKEN_NUMBER_LITERAL,
    TOKEN_IDENTIFIER
} TokenType;
typedef struct {
    TokenType type;
    char* start;
    int length;
    int line;
} Token;

extern char* source;
extern char* currentCharacterInSource;
extern int currentLine;

void setSource(char* sourceText);
Token getToken();
#endif /* _ESCURIEUX_PARSER_H_ */