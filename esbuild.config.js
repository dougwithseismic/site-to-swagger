const esbuild = require('esbuild');

async function build() {
    // Common configurations
    const commonConfig = {
        bundle: true,
        outbase: 'src',
    };

    try {
        // Build the main application for Node.js
        await esbuild.build({
            ...commonConfig,
            entryPoints: ['src/server.ts'],
            platform: 'node',
            outdir: 'dist',
        });

    } catch (error) {
        console.error("An error occurred during the build process:", error);
        process.exit(1);
    }
}

build();
