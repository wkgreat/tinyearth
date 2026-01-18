export default {

    preset: "ts-jest",

    testEnvironment: 'jsdom',

    roots: ['<rootDir>/test'],

    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }],
        '\\.(glsl|vert|frag|txt|json|png|jpg)$': "<rootDir>/jest-raw-transformer.js"
    },

    moduleNameMapper: {
        '^(\\.{1,2}/.+|\\.\\./.+)\\.js$': '$1'
    },

    moduleFileExtensions: ['ts', 'js', 'json', 'glsl', 'vert', 'frag', 'txt'],

    moduleDirectories: [
        'node_modules'
    ],

    setupFiles: [
        "<rootDir>/jest.setup.js"
    ],

};