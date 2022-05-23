const fs = require('fs');
const { exec } = require('child_process');

const config = JSON.parse(fs.readFileSync('config.json'));
const sokratesConfigPathAppender = '/_sokrates/config.json';
const sokratesJarFilePath = config.sokratesJarFilePath;
const PAT = config.PAT;
const gitBaseUrl = config.baseUrl;
const javaOptions = config.javaOptions;
const sokratesPortfolio = config.sokratesPortfolio
const sokratesLandscapes = config.landscapes

const ignoreFolders = config.ignoreFoldersForHistory;
const ignoreFiles = config.ignoreFilesForHistory;



const execHelper = function (command) {
    child = exec(command,
        function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
                return false;
            }
        });

    child.on('exit', function (code, signal) {
        console.log('child process exited with ' +
            `code ${code} and signal ${signal}`);
    });

    return true;

};

const sokratesExtractHistory = function (repoPath) {
    execHelper('cd ' + repoPath + ' && java -jar ' + sokratesJarFilePath + ' extractGitHistory');
};

const sokratesInit = function (repoPath) {
    if (!fs.existsSync(repoPath + sokratesConfigPathAppender)) {
        execHelper('cd ' + repoPath + ' && java -jar ' + sokratesJarFilePath + ' init');
    }
};

const sokratesGenerateReport = function (repoPath) {
    execHelper('cd ' + repoPath + ' && java -jar ' + javaOptions + ' ' + sokratesJarFilePath + ' generateeports');
};


const sokratesUpdateLandscape = function (landscape) {
    execHelper('cd ' + sokratesPortfolio + '/' + landscape + ' && java -jar ' + sokratesJarFilePath + ' updateLandscape')
};

const cleanFolderIgnores = function (repoPath) {
    for (const folder of ignoreFolders) {
        execHelper('cd ' + repoPath + ' && find . -type d -name "' + folder + '" -exec rm -rf {} +');
    }
};
const cleanFileIgnores = function (repoPath) {
    for (const file of ignoreFiles) {
        execHelper('cd ' + repoPath + ' && find . -type f -name "' + file + '" -delete');
    }
};
const optimizeForLandscape = function (repoPath, landscape) {
    cleanFolderIgnores(repoPath);
    cleanFileIgnores(repoPath);
};

const getSourceCode = function (repo, landscape) {
    let repoPath = sokratesPortfolio + '/' + landscape + '/' + repo.split('/').pop();
    if (!fs.existsSync(sokratesPortfolio + '/' + landscape)) {
        fs.mkdirSync(sokratesPortfolio + '/' + landscape);
    }

    if (!fs.existsSync(repoPath)) {
        let repository = 'https://' + PAT + '@' + gitBaseUrl + '/' + repo;
        execHelper('cd ' + sokratesPortfolio + '/' + landscape + ' && git clone ' + repository);
    } else {
        execHelper('cd ' + repoPath + ' && git pull');
    }
};

const updatePortfolio = function () {
    for (const landscape of sokratesLandscapes) {
        for (const repository of landscape.repositories) {
            let repoPath = sokratesPortfolio + '/' + landscape.name + '/' + repository.split('/').pop();
            console.log(repoPath);
            getSourceCode(repository, landscape.name);
            sokratesExtractHistory(repoPath);
            sokratesInit(repoPath);
            optimizeForLandscape(repoPath);
            sokratesGenerateReport(repoPath);
            sokratesUpdateLandscape(landscape.name)
        }
        sokratesUpdateLandscape("");
    }
}


updatePortfolio();
