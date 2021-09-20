module.exports = {
    'env': {
        'es2021': true,
        'node': true
    },
    'ignorePatterns': [
        'expressions.ts'
    ],
    'extends': [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ],
    'parser': '@typescript-eslint/parser',
    'parserOptions': {
        'ecmaVersion': 12,
        'sourceType': 'module'
    },
    'plugins': [
        '@typescript-eslint'
    ],
    'rules': {
        'indent': [
            'error',
            4
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'quotes': [
            'error',
            'single'
        ],
        'semi': [
            'error',
            'always'
        ],
        '@typescript-eslint/no-this-alias': [
            'error',
            {
                'allowDestructuring': false, // Disallow `const { props, state } = this`; true by default
                'allowedNames': ['self'] // Allow `const self = this`; `[]` by default
            }
        ],
        'no-unused-vars': [
            'warning',
            {
                'varsIgnorePattern': '_[A-Za-z0-9_]*'
            }
        ]
    }
};
