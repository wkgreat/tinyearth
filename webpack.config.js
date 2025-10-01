import { fileURLToPath } from 'url';
import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webpackPlugins = [
    new HtmlWebpackPlugin({
        template: './web/index.html'
    }),
    new CopyWebpackPlugin({
        patterns: [
            {
                from: 'assets',
                to: 'assets'
            }
        ]
    })
];

export default [{
    mode: 'development',
    context: __dirname,
    entry: './web/index.ts',
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'web/dist')
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
        extensionAlias: {
            '.js': ['.ts', '.js']
        },
    },
    devtool: 'eval',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options: {
                    configFile: 'tsconfig.web.json'
                },
            }, {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
            }, {
                test: /\.css$/,
                exclude: /node_modules/,
                use: ['style-loader', 'css-loader']
            }, {
                test: /\.(png|gif|jpg|jpeg|svg|xml)$/,
                exclude: /node_modules/,
                use: ['url-loader']
            }, {
                test: /\.(glsl|vs|fs|vert|frag)$/,
                exclude: /node_modules/,
                use: ['raw-loader']
            }, {
                test: /\.geojson$/,
                type: 'json'
            }
        ]
    },
    plugins: webpackPlugins,

    // development server options
    devServer: {
        static: {
            directory: path.join(__dirname, 'web/dist'),
        },
        compress: true,
        port: 9000
    }
}];
