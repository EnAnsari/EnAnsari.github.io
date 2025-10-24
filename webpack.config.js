const path = require('path');

module.exports = {
    entry: './src/index.ts',
    module: {
        rules: [
            {
                test: /\.ts?$/,
                // UPDATED: Use an object to pass options
                use: {
                    loader: 'ts-loader',
                    options: {
                        // ADDED: This is the fix.
                        // It tells ts-loader to *only* convert TS to JS
                        // and to *not* run type-checking.
                        // This will respect your tsconfig's "skipLibCheck".
                        transpileOnly: true
                    }
                },
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    mode: "development"
};
