const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');

// Detecta o sistema operacional padrão caso não seja especificado
const targetNodeVersion = 'node18';
const defaultTarget = (value) => {
    switch (value) {
        case 'win32': return `${targetNodeVersion}-win-x64`;
        case 'darwin': return `${targetNodeVersion}-mac-x64`;
        case 'linux': return `${targetNodeVersion}-linux-x64`;
        case 'all': return `${targetNodeVersion}-linux-x64,${targetNodeVersion}-win-x64,${targetNodeVersion}-mac-x64`;
        default: return `${targetNodeVersion}-linux-x64`;
    }
};

// Obtém argumentos da linha de comando
const args = process.argv.slice(2);
const userTarget = args.find(arg => arg.startsWith('--os='));
const selectedTarget = defaultTarget(userTarget ? userTarget.split('=')[1] : os.platform());

// Configurações
const config = {
    root: 'server/tiny-chat',
    inputFile: 'server/tiny-chat/index.js',       // Arquivo principal de entrada
    outputDir: 'dist',                            // Diretório de saída
    nodeModulesDir: 'node_modules',               // Diretório de node_modules
    babelSourceDir: 'server/tiny-chat',          // Diretório a ser transpile
    targets: selectedTarget,                      // Alvo para Pkg
};

// Função para copiar a pasta node_modules para o diretório de saída
const copyNodeModules = async () => {
    const sourceDir = path.resolve(config.nodeModulesDir);
    const destDir = path.resolve(`dist/${config.root}`, 'node_modules');

    if (!fs.existsSync(destDir)) {
        console.log('📂 Copying node_modules to the output directory...');
        await fs.copy(sourceDir, destDir, {
            overwrite: true,
            errorOnExist: false
        });
    }
};

// Função para executar o comando Babel
const transpileWithBabel = () => {
    console.log('🔨 Transpiling code with Babel...');
    execSync(`npx babel ${config.babelSourceDir} --out-dir ${config.outputDir}/${config.babelSourceDir} --copy-files`);
};

// Função para empacotar o aplicativo com Pkg
const packageWithPkg = () => {
    console.log(`📦 Packaging for target: ${config.targets}...`);
    execSync(`pkg dist/${config.inputFile} --targets ${config.targets} --output ${path.resolve(config.outputDir, 'bin/tiny-chat')} --config package.json`);
};

// Função principal
const buildApp = async () => {
    // Exibir informações sobre a execução
    console.log('🎯 Build Information:');
    console.log(`   - Input File: ${config.inputFile}`);
    console.log(`   - Output Directory: ${config.outputDir}`);
    console.log(`   - Target Platform: ${config.targets}`);

    // Copiar node_modules
    // await copyNodeModules();

    // Transpilar código com Babel
    transpileWithBabel();

    // Empacotar com Pkg
    packageWithPkg();

    console.log('🚀 Build completed successfully!');
};

// Executar a função de construção
buildApp();
