export default {

    preset: "ts-jest",

    testEnvironment: 'node',

    roots: ['<rootDir>/test'],

    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }],
        '\\.(glsl|vert|frag|txt|json)$': "<rootDir>/jest-raw-transformer.js"
    },

    moduleNameMapper: {
        '^(\\.{1,2}/.+|\\.\\./.+)\\.js$': '$1'
    },

    moduleFileExtensions: ['ts', 'js', 'json', 'glsl', 'vert', 'frag', 'txt'],

    moduleDirectories: [
        'node_modules'
    ],

};