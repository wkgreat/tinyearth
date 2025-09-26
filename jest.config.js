export default {
    transform: {
        '^.+\\.js$': 'babel-jest',
        '\\.(glsl|vert|frag|txt|json)$': "<rootDir>/jest-raw-transformer.js"
    },
    moduleNameMapper: {
        '\\.module\\.css$': 'identity-obj-proxy',     // 支持 CSS Modules
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
    },
    moduleFileExtensions: ['js', 'json', 'glsl', 'vert', 'frag', 'txt'],
    testEnvironment: 'jsdom'
};