// jest-raw-transformer.js
export default {
    process(src, filename) {
        return {
            code: `module.exports = ${JSON.stringify(src)};`,
        };
    },
};