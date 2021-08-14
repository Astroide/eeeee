#ifndef _ESCURIEUX_PARSER_H_
#define _ESCURIEUX_PARSER_H_
#include <stdbool.h>

typedef enum { STRING_LITERAL, NUMBER_LITERAL, IDENTIFIER } TokenType;
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